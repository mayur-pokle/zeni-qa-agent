const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { PrismaClient, Environment, RunStatus } = require("@prisma/client");
const { chromium } = require("playwright");
const { playAudit } = require("playwright-lighthouse");
const { stringify } = require("csv-stringify/sync");
const { sendEmailAlert } = require("../alerts/email");
const { sendSlackAlert } = require("../alerts/slack");

const prisma = new PrismaClient();

function artifactDir(projectId, environment) {
  return path.join(process.cwd(), "monitoring", "artifacts", projectId, environment.toLowerCase(), String(Date.now()));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fetchSitemapUrls(baseUrl) {
  try {
    const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
    const response = await fetch(sitemapUrl, { cache: "no-store" });
    if (!response.ok) {
      return [baseUrl];
    }

    const xml = await response.text();
    const urls = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gim))
      .map((match) => match[1]?.trim())
      .filter(Boolean);

    return urls.length ? Array.from(new Set(urls)) : [baseUrl];
  } catch {
    return [baseUrl];
  }
}

async function scanPages(targetUrl, environment) {
  const urls = await fetchSitemapUrls(targetUrl);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const networkLogs = [];
  const pageResults = [];

  page.on("response", (response) => {
    if (response.status() >= 400) {
      networkLogs.push({
        url: response.url(),
        status: response.status(),
        timestamp: new Date().toISOString(),
        environment
      });
    }
  });

  for (const url of urls) {
    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    const statusCode = response ? response.status() : null;
    const issues = [];
    const ctaCount = await page
      .locator("a, button")
      .filter({ hasText: /get started|contact|book|demo|learn more|start|try|submit/i })
      .count();
    const formCount = await page.locator("form").count();
    const layoutShiftCount = await page.evaluate(() =>
      performance.getEntries().filter((entry) => entry.entryType === "layout-shift").length
    );

    if (!statusCode || statusCode >= 400) {
      issues.push(`HTTP ${statusCode ?? "unknown"}`);
    }

    if (ctaCount === 0) {
      issues.push("No CTA detected");
    }

    if (formCount === 0) {
      issues.push("No form detected");
    } else {
      issues.push("Form detected - refer to Playwright suite for submission result");
    }

    if (layoutShiftCount > 0) {
      issues.push(`Layout shifts detected: ${layoutShiftCount}`);
    }

    pageResults.push({
      url,
      environment,
      status: issues.some((issue) => issue.startsWith("HTTP")) ? "failed" : issues.length ? "warning" : "passed",
      issues: issues.length ? issues : ["Page loaded successfully"],
      statusCode,
      timestamp: new Date().toISOString(),
      ctaCount,
      formCount,
      layoutShiftCount
    });
  }

  await browser.close();
  return { urls, networkLogs, pageResults };
}

async function runLighthouseAudit(project, environment, targetUrl, outputDir) {
  const reportName = `${project.id}-${environment.toLowerCase()}-${Date.now()}`;
  const reportDirectory = path.join(process.cwd(), "reports", "lighthouse");
  const port = environment === Environment.STAGING ? 9223 : 9222;

  await ensureDir(reportDirectory);

  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${port}`]
  });
  const page = await browser.newPage();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  try {
    await playAudit({
      page,
      port,
      thresholds: {
        performance: 70,
        accessibility: 80,
        bestPractices: 80,
        seo: 80
      },
      reports: {
        formats: {
          html: true,
          json: true
        },
        name: reportName,
        directory: reportDirectory
      }
    });
  } finally {
    await browser.close();
  }

  const reportJsonPath = path.join(reportDirectory, `${reportName}.report.json`);
  const reportHtmlPath = path.join(reportDirectory, `${reportName}.report.html`);
  const rawReport = JSON.parse(await fs.readFile(reportJsonPath, "utf8"));

  const scores = {
    performanceScore: Math.round((rawReport.categories?.performance?.score ?? 0) * 100),
    seoScore: Math.round((rawReport.categories?.seo?.score ?? 0) * 100),
    accessibilityScore: Math.round((rawReport.categories?.accessibility?.score ?? 0) * 100),
    bestPracticesScore: Math.round((rawReport.categories?.["best-practices"]?.score ?? 0) * 100),
    reportPath: reportHtmlPath
  };

  await prisma.lighthouseReport.create({
    data: {
      projectId: project.id,
      environment,
      performanceScore: scores.performanceScore,
      seoScore: scores.seoScore,
      accessibilityScore: scores.accessibilityScore,
      bestPracticesScore: scores.bestPracticesScore,
      reportPath: reportHtmlPath
    }
  });

  await fs.copyFile(reportJsonPath, path.join(outputDir, path.basename(reportJsonPath)));
  await fs.copyFile(reportHtmlPath, path.join(outputDir, path.basename(reportHtmlPath)));

  return scores;
}

function runPlaywrightSuites(targetUrl, outputDir) {
  return new Promise((resolve, reject) => {
    const reportPath = path.join(outputDir, "playwright-report.json");
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["playwright", "test", "playwright/tests", "--config=playwright.config.ts", "--reporter=json", `--output=${outputDir}`],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          QA_TARGET_URL: targetUrl
        }
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", async (code) => {
      try {
        await fs.writeFile(reportPath, stdout || "{}", "utf8");
        const report = stdout ? JSON.parse(stdout) : {};
        resolve({
          code,
          stderr,
          report,
          reportPath,
          outputDir
        });
      } catch (error) {
        reject(error);
      }
    });

    child.on("error", reject);
  });
}

function collectErrors(report, stderr) {
  const errors = [];
  const suites = report?.suites ?? [];

  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          for (const error of result.errors ?? []) {
            errors.push(error.message || error.value || "Unknown Playwright error");
          }
        }
      }
    }
  }

  if (stderr) {
    errors.push(stderr.trim());
  }

  return errors.filter(Boolean);
}

function hasVisualRegression(errors) {
  return errors.some((error) => /screenshot|snapshot|pixel/i.test(error));
}

function buildLighthouseComment(lighthouse, run) {
  const performanceScore = lighthouse?.performanceScore ?? run.performanceScore ?? 0;
  const seoScore = lighthouse?.seoScore ?? run.seoScore ?? 0;
  const accessibilityScore = lighthouse?.accessibilityScore ?? run.accessibility ?? 0;
  const bestPracticesScore = lighthouse?.bestPracticesScore ?? 0;

  const notes = [
    performanceScore < 60 ? "Performance below threshold; investigate large assets, render-blocking scripts, and slow server responses." : "",
    seoScore < 70 ? "SEO below threshold; review title tags, meta descriptions, heading order, and crawlability." : "",
    accessibilityScore < 70 ? "Accessibility below threshold; review labels, contrast, semantic structure, and keyboard flows." : "",
    bestPracticesScore < 80 ? "Best Practices below target; review console noise, insecure requests, and browser compatibility warnings." : ""
  ].filter(Boolean);

  return notes.join(" | ") || "Lighthouse scores are within the configured target range.";
}

function buildRunCsv(run) {
  const payload = run.payload ?? {};
  const pageResults = payload.pageResults ?? [];
  const lighthouse = payload.lighthouse ?? {};
  const lighthouseComment = buildLighthouseComment(lighthouse, run);
  const lighthousePerformance = lighthouse.performanceScore ?? run.performanceScore ?? "";
  const lighthouseSeo = lighthouse.seoScore ?? run.seoScore ?? "";
  const lighthouseAccessibility = lighthouse.accessibilityScore ?? run.accessibility ?? "";
  const lighthouseBestPractices = lighthouse.bestPracticesScore ?? "";

  return stringify(
    (pageResults.length > 0 ? pageResults : [{}]).map((pageResult) => ({
      runId: run.id,
      environment: pageResult.environment ?? run.environment,
      runStatus: run.status,
      pageUrl: pageResult.url ?? "",
      pageStatus: pageResult.status ?? "",
      pageStatusCode: pageResult.statusCode ?? "",
      ctaCount: pageResult.ctaCount ?? "",
      formCount: pageResult.formCount ?? "",
      layoutShiftCount: pageResult.layoutShiftCount ?? "",
      lighthousePerformance,
      lighthouseSeo,
      lighthouseAccessibility,
      lighthouseBestPractices,
      lighthouseComment,
      issues: (pageResult.issues ?? []).join(" | "),
      pageTimestamp: pageResult.timestamp ?? "",
      startedAt: run.startedAt?.toISOString?.() ?? "",
      completedAt: run.completedAt?.toISOString?.() ?? ""
    })),
    { header: true }
  );
}

async function persistRun({ project, environment, runStatus, errors, screenshotPath, pageResults, networkLogs, reportPath, lighthouse }) {
  const run = await prisma.qaRun.create({
    data: {
      projectId: project.id,
      environment,
      status: runStatus,
      performanceScore: lighthouse.performanceScore,
      seoScore: lighthouse.seoScore,
      accessibility: lighthouse.accessibilityScore,
      completedAt: new Date(),
      payload: {
        summary: {
          totalChecks: pageResults.length,
          failedChecks: pageResults.filter((page) => page.status === "failed").length,
          warningChecks: 0
        },
        sitemap: {
          discoveredPages: pageResults.length,
          testedPages: pageResults.length
        },
        pageResults,
        networkLogs,
        errors,
        screenshotPath,
        reportPath,
        lighthouse
      }
    }
  });

  await prisma.project.update({
    where: { id: project.id },
    data: {
      lastRunAt: new Date(),
      performanceScore: lighthouse.performanceScore,
      healthScore: Math.round(
        (lighthouse.performanceScore +
          lighthouse.seoScore +
          lighthouse.accessibilityScore +
          lighthouse.bestPracticesScore) / 4
      )
    }
  });

  return run;
}

async function runForTarget(project, environment, targetUrl) {
  const outputDir = artifactDir(project.id, environment);
  await ensureDir(outputDir);

  const { networkLogs, pageResults } = await scanPages(targetUrl, environment);
  const testResult = await runPlaywrightSuites(targetUrl, outputDir);
  const lighthouse = await runLighthouseAudit(project, environment, targetUrl, outputDir);
  const errors = collectErrors(testResult.report, testResult.stderr);
  const lighthouseDrop =
    lighthouse.performanceScore < 60 ||
    lighthouse.seoScore < 70 ||
    lighthouse.accessibilityScore < 70;
  const criticalFailure = errors.length > 0 || networkLogs.some((log) => log.status >= 500) || lighthouseDrop;
  const visualRegression = hasVisualRegression(errors);

  const run = await persistRun({
    project,
    environment,
    runStatus: criticalFailure ? RunStatus.FAILED : RunStatus.PASSED,
    errors,
    screenshotPath: outputDir,
    pageResults,
    networkLogs,
    reportPath: testResult.reportPath,
    lighthouse
  });

  const csvContent = buildRunCsv(run);

  if (criticalFailure || visualRegression || project.notifyOnCompletion) {
    const message = [
      `Project: ${project.name}`,
      `Environment: ${environment}`,
      `Status: ${criticalFailure ? "FAILED" : "PASSED"}`,
      `Errors: ${errors.join(" | ") || "None"}`,
      `Network failures: ${networkLogs.length}`,
      `Lighthouse: P ${lighthouse.performanceScore}, SEO ${lighthouse.seoScore}, A11Y ${lighthouse.accessibilityScore}, BP ${lighthouse.bestPracticesScore}`,
      `Artifacts: ${outputDir}`
    ].join("\n");

    await sendEmailAlert({
      subject: `[QA Runner] ${project.name} ${environment} ${criticalFailure ? "completed with issues" : "completed"}`,
      text: message,
      attachments: project.notifyOnCompletion
        ? [
            {
              filename: `${project.slug}-${environment.toLowerCase()}-qa-report.csv`,
              content: csvContent
            }
          ]
        : []
    }).catch((error) => {
      console.error("[runner] email alert failed", error);
    });

    if (criticalFailure || visualRegression || lighthouseDrop) {
      await sendSlackAlert(message).catch((error) => {
        console.error("[runner] slack alert failed", error);
      });
    }
  }

  return run;
}

async function runMonitoringCycle() {
  const projects = await prisma.project.findMany({
    where: {
      monitoringActive: true
    }
  });

  const results = [];

  for (const project of projects) {
    const lastRunAt = project.lastRunAt ? new Date(project.lastRunAt).getTime() : 0;
    const intervalMs = (project.monitoringIntervalMinutes ?? 360) * 60 * 1000;

    if (lastRunAt && Date.now() - lastRunAt < intervalMs) {
      continue;
    }

    if (project.stagingUrl) {
      results.push(await runForTarget(project, Environment.STAGING, project.stagingUrl));
    }

    results.push(await runForTarget(project, Environment.PRODUCTION, project.productionUrl));
  }

  return results;
}

if (require.main === module) {
  runMonitoringCycle()
    .then(async (results) => {
      console.log(`Stored ${results.length} monitoring run(s).`);
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = {
  runMonitoringCycle
};
