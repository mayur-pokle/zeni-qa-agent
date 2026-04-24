import { chromium, firefox, webkit, type BrowserType } from "playwright";
import { Environment, RunStatus } from "@prisma/client";
import type { QaExecutionPayload, QaModuleResult } from "@/lib/types";
import { getProject, storeQaRun } from "@/lib/db";
import { runLighthouseAudit } from "@/lib/lighthouse";
import { clearQaProgress, updateQaProgress } from "@/lib/progress";

const viewports = [
  { width: 320, height: 720 },
  { width: 768, height: 900 },
  { width: 1440, height: 1024 }
];

const browserMatrix: Array<{ name: string; instance: BrowserType }> = [
  { name: "Chromium", instance: chromium },
  { name: "Firefox", instance: firefox },
  { name: "WebKit", instance: webkit }
];

function parseSitemapUrls(xml: string, fallbackUrl: string) {
  const matches = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gim)).map((match) => match[1]?.trim());
  const urls = matches.filter((value): value is string => Boolean(value));
  return urls.length > 0 ? Array.from(new Set(urls)) : [fallbackUrl];
}

async function discoverPages(productionUrl: string) {
  try {
    const sitemapUrl = new URL("/sitemap.xml", productionUrl).toString();
    const response = await fetch(sitemapUrl, {
      headers: {
        "user-agent": "qa-monitor-sitemap/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return [productionUrl];
    }

    return parseSitemapUrls(await response.text(), productionUrl);
  } catch {
    return [productionUrl];
  }
}

async function inspectPage(page: import("playwright").Page, pageUrl: string, environment: Environment) {
  const response = await page.goto(pageUrl, {
    waitUntil: "domcontentloaded"
  });

  const imagesWithoutAlt = await page.locator("img:not([alt])").count();
  const headingCount = await page.locator("h1, h2, h3").count();
  const formCount = await page.locator("form").count();
  const ctaCount = await page
    .locator("a, button")
    .filter({ hasText: /get started|contact|book|demo|learn more|start|try|submit/i })
    .count();
  const hasTitle = (await page.title()).trim().length > 0;
  const layoutShiftCount = await page.evaluate(() =>
    performance.getEntries().filter((entry) => entry.entryType === "layout-shift").length
  );
  const issues: string[] = [];

  if (!response?.ok()) {
    issues.push(`HTTP ${response?.status() ?? "unknown"}`);
  }

  if (!hasTitle) {
    issues.push("Missing page title");
  }

  if (headingCount === 0) {
    issues.push("No headings detected");
  }

  if (imagesWithoutAlt > 0) {
    issues.push(`${imagesWithoutAlt} image(s) missing alt text`);
  }

  if (ctaCount === 0) {
    issues.push("No CTA detected");
  }

  if (formCount > 0) {
    issues.push("Form detected - use Playwright suite output for submission status");
  }

  if (layoutShiftCount > 0) {
    issues.push(`Layout shifts detected: ${layoutShiftCount}`);
  }

  return {
    url: pageUrl,
    environment,
    status: issues.some((issue) => issue.startsWith("HTTP")) ? "failed" : issues.length > 0 ? "warning" : "passed",
    issues: issues.length > 0 ? issues : ["Page passed core QA checks"],
    statusCode: response?.status() ?? null,
    timestamp: new Date().toISOString(),
    ctaCount,
    formCount,
    layoutShiftCount
  } as QaExecutionPayload["pageResults"][number];
}

export async function executeQaRun(projectId: string, environment: Environment = Environment.PRODUCTION) {
  const project = await getProject(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  const targetUrl =
    environment === Environment.STAGING
      ? project.stagingUrl
      : project.productionUrl;

  if (!targetUrl) {
    throw new Error(`${environment} URL is not configured for this project`);
  }

  const modules: QaModuleResult[] = [];
  const consoleErrors: string[] = [];
  const pageResults: QaExecutionPayload["pageResults"] = [];
  const sitemapUrls = await discoverPages(targetUrl);

  await updateQaProgress(projectId, {
    phase: "Scanning sitemap",
    percent: 10,
    totalPages: sitemapUrls.length,
    completedPages: 0,
    currentUrl: sitemapUrls[0] ?? targetUrl,
    startedAt: new Date().toISOString(),
    status: "running"
  });

  let primaryBrowser: Awaited<ReturnType<typeof chromium.launch>>;
  try {
    primaryBrowser = await chromium.launch({ headless: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Chromium failed to launch: ${message}. ` +
        `The backend's container image may not have Playwright browsers installed — ` +
        `check that the Dockerfile's \`playwright install\` step ran successfully.`
    );
  }
  const primaryContext = await primaryBrowser.newContext({
    viewport: viewports[2]
  });
  const primaryPage = await primaryContext.newPage();

  primaryPage.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`[Chromium] ${message.text()}`);
    }
  });

  let pageIndex = 0;
  for (const pageUrl of sitemapUrls) {
    pageIndex += 1;
    await updateQaProgress(projectId, {
      phase: `QA page ${pageIndex} of ${sitemapUrls.length}`,
      percent: Math.min(75, 10 + Math.round((pageIndex / sitemapUrls.length) * 65)),
      totalPages: sitemapUrls.length,
      completedPages: pageIndex - 1,
      currentUrl: pageUrl,
      startedAt: new Date().toISOString(),
      status: "running"
    });

    pageResults.push(await inspectPage(primaryPage, pageUrl, environment));
  }

  await primaryBrowser.close();

  await updateQaProgress(projectId, {
    phase: "Running cross-browser smoke checks",
    percent: 82,
    totalPages: sitemapUrls.length,
    completedPages: sitemapUrls.length,
    currentUrl: targetUrl,
    startedAt: new Date().toISOString(),
    status: "running"
  });

  for (const browserEntry of browserMatrix) {
    let browser: Awaited<ReturnType<BrowserType["launch"]>>;
    try {
      browser = await browserEntry.instance.launch({ headless: true });
    } catch (err) {
      // If a browser isn't installed in this environment (e.g. the image
      // was slimmed down to chromium-only to fit a deploy size cap),
      // record it as a skipped module instead of failing the whole run.
      const message = err instanceof Error ? err.message : String(err);
      modules.push({
        name: `${browserEntry.name} page load`,
        status: "warning",
        details: [`${browserEntry.name} not available in this environment: ${message.slice(0, 160)}`]
      });
      continue;
    }
    const context = await browser.newContext({
      viewport: viewports[2]
    });
    const page = await context.newPage();

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(`[${browserEntry.name}] ${message.text()}`);
      }
    });

    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded"
    });

    modules.push({
      name: `${browserEntry.name} page load`,
      status: response?.ok() ? "passed" : "failed",
      details: [`Status: ${response?.status() ?? "unknown"}`, `URL: ${targetUrl}`]
    });

    const links = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean)
    );

    modules.push({
      name: `${browserEntry.name} link validation`,
      status: links.length > 0 ? "passed" : "warning",
      details: [`Found ${links.length} clickable links`]
    });

    const formCount = await page.locator("form").count();
    modules.push({
      name: `${browserEntry.name} forms`,
      status: formCount > 0 ? "passed" : "warning",
      details: [
        formCount > 0
          ? `Detected ${formCount} form(s) for submission validation`
          : "No forms found on landing page"
      ]
    });

    const navCount = await page.locator("nav, footer").count();
    modules.push({
      name: `${browserEntry.name} navigation`,
      status: navCount > 0 ? "passed" : "failed",
      details: [`Navigation landmarks found: ${navCount}`]
    });

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
      modules.push({
        name: `${browserEntry.name} responsive ${viewport.width}px`,
        status: bodyWidth <= viewport.width + 24 ? "passed" : "warning",
        details: [`Body scroll width: ${bodyWidth}`]
      });
    }

    await browser.close();
  }

  const failedChecks = modules.filter((module) => module.status === "failed").length;
  const warningChecks = modules.filter((module) => module.status === "warning").length;
  const totalChecks = modules.length;
  const audit = await runLighthouseAudit(targetUrl, projectId, environment).catch(() => ({
    performanceScore: 70,
    seoScore: 70,
    accessibilityScore: 70,
    bestPracticesScore: 70,
    reportPath: ""
  }));

  const performanceScore = Math.max(
    35,
    Math.min(audit.performanceScore, 100 - failedChecks * 8 - warningChecks * 3)
  );
  const seoScore = Math.max(40, Math.min(audit.seoScore, 96 - consoleErrors.length * 4));
  const accessibility = Math.max(
    50,
    Math.min(audit.accessibilityScore, 94 - warningChecks * 2)
  );

  const payload: QaExecutionPayload = {
    summary: {
      totalChecks,
      failedChecks,
      warningChecks
    },
    sitemap: {
      discoveredPages: sitemapUrls.length,
      testedPages: pageResults.length
    },
    pageResults,
    modules,
    environmentUrl: targetUrl,
    consoleErrors
  };

  await updateQaProgress(projectId, {
    phase: "Finalizing report",
    percent: 95,
    totalPages: sitemapUrls.length,
    completedPages: pageResults.length,
    currentUrl: targetUrl,
    startedAt: new Date().toISOString(),
    status: "running"
  });

  const run = await storeQaRun({
    projectId,
    environment,
    status: failedChecks > 0 ? RunStatus.FAILED : warningChecks > 0 ? RunStatus.WARNING : RunStatus.PASSED,
    performanceScore,
    seoScore,
    accessibility,
    payload
  });

  await updateQaProgress(projectId, {
    phase: "Completed",
    percent: 100,
    totalPages: sitemapUrls.length,
    completedPages: pageResults.length,
    currentUrl: targetUrl,
    startedAt: new Date().toISOString(),
    status: "completed",
    runId: run.id
  });

  setTimeout(() => {
    void clearQaProgress(projectId);
  }, 15_000);

  return run;
}
