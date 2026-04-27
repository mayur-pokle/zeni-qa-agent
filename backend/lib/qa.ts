import { chromium, firefox, webkit, type BrowserType } from "playwright";
import { Environment, RunStatus } from "@prisma/client";
import type { QaExecutionPayload, QaModuleResult } from "@/lib/types";
import { getProject, storeQaRun } from "@/lib/db";
import { runLighthouseAudit } from "@/lib/lighthouse";
import { clearQaProgress, touchQaProgress, updateQaProgress } from "@/lib/progress";
import { testHubspotForm, type HubspotFormTestResult } from "@/lib/hubspot-form";
import { recordFormSubmission, shouldDeepTestForm } from "@/lib/form-submission-tracker";

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

// Some marketing pages pull in heavy third-party bundles (analytics, chat
// widgets, pixel trackers) that can push `domcontentloaded` past Playwright's
// default 30s. 45s is generous enough to survive those without letting a
// truly dead page hold up the whole run for minutes.
const PAGE_GOTO_TIMEOUT_MS = 45_000;

// Hard wall-clock timeout for the whole `inspectPage` call. Several
// Playwright APIs (`page.title`, `page.evaluate`) don't accept a timeout
// argument, and a runaway page script can hang them indefinitely — we
// hit this on a Webflow page with a buggy embed. This caps any single
// page at 2 minutes (45s goto + ~31s HubSpot deep submit + headroom).
const PAGE_INSPECT_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// How many `page.goto` calls we allow on a single Chromium tab before
// tearing it down and opening a fresh one. DOM, listeners, and internal
// caches accumulate per navigation, so on sitemaps with hundreds of URLs
// the tab steadily grows and eventually OOMs the dyno — we saw a Railway
// container get killed around page 30 with the previous 50 setting, so
// this is tuned lower to keep memory pressure under the platform's cap.
const PAGE_ROTATION_INTERVAL = 20;

async function inspectPage(
  page: import("playwright").Page,
  pageUrl: string,
  environment: Environment,
  options: { allowDeepFormSubmit: boolean }
) {
  const response = await page.goto(pageUrl, {
    waitUntil: "domcontentloaded",
    timeout: PAGE_GOTO_TIMEOUT_MS
  });

  const imagesWithoutAlt = await page.locator("img:not([alt])").count();
  const headingCount = await page.locator("h1, h2, h3").count();
  const ctaCount = await page
    .locator("a, button")
    .filter({ hasText: /get started|contact|book|demo|learn more|start|try|submit/i })
    .count();
  const hasTitle = (await page.title()).trim().length > 0;
  const layoutShiftCount = await page.evaluate(() =>
    performance.getEntries().filter((entry) => entry.entryType === "layout-shift").length
  );

  // We deliberately ignore non-HubSpot forms (Webflow, raw <form>,
  // custom). The HubSpot QA module is the source of truth for the
  // "is the lead-capture form working?" question.
  const hubspotForm = await testHubspotForm(page, {
    deep: options.allowDeepFormSubmit
  }).catch<HubspotFormTestResult>((err) => ({
    found: false,
    attempted: false,
    succeeded: false,
    detail: `HubSpot form check threw: ${err instanceof Error ? err.message : String(err)}`
  }));

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

  // HubSpot-specific form issue rules.
  // - submitted + verified → no issue
  // - found but not visible → warning
  // - submission attempted but no success state → failed (real broken form)
  // - reCAPTCHA / missing fields → warning (we can't fully test, but not broken)
  if (hubspotForm.found) {
    if (hubspotForm.visible === false) {
      issues.push(`HubSpot form not visible: ${hubspotForm.detail}`);
    } else if (hubspotForm.attempted && !hubspotForm.succeeded) {
      issues.push(`HubSpot form submission failed: ${hubspotForm.detail}`);
    } else if (!hubspotForm.attempted && options.allowDeepFormSubmit) {
      // We had budget for a deep test but couldn't run it
      // (reCAPTCHA, missing required field, etc.) — warning so the
      // user knows to extend the dummy data or accept the limitation.
      issues.push(`HubSpot form deep test skipped: ${hubspotForm.detail}`);
    }
  }

  if (layoutShiftCount > 0) {
    issues.push(`Layout shifts detected: ${layoutShiftCount}`);
  }

  // A submission failure (we clicked submit and HubSpot didn't show a
  // success state) escalates to "failed" — that's a real broken form.
  // Everything else is at most "warning".
  const isHardFailure =
    issues.some((issue) => issue.startsWith("HTTP")) ||
    issues.some((issue) => issue.startsWith("HubSpot form submission failed"));

  return {
    url: pageUrl,
    environment,
    status: isHardFailure ? "failed" : issues.length > 0 ? "warning" : "passed",
    issues: issues.length > 0 ? issues : ["Page passed core QA checks"],
    statusCode: response?.status() ?? null,
    timestamp: new Date().toISOString(),
    ctaCount,
    formCount: hubspotForm.found ? 1 : 0,
    layoutShiftCount,
    hubspotForm
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

  // Heartbeat: while executeQaRun is alive, refresh the progress file's
  // updatedAt every 30s. This keeps long Lighthouse / cross-browser /
  // form-render waits from tripping the staleness detector. Cleared in
  // the finally block below so a thrown error doesn't leak the timer.
  const heartbeat = setInterval(() => {
    void touchQaProgress(projectId);
  }, 30_000);
  // Don't keep the Node process alive just for the heartbeat.
  if (typeof heartbeat.unref === "function") heartbeat.unref();

  try {
    return await executeQaRunBody({
      projectId,
      environment,
      targetUrl,
      modules,
      consoleErrors,
      pageResults,
      sitemapUrls
    });
  } finally {
    clearInterval(heartbeat);
  }
}

type ExecuteQaRunBodyArgs = {
  projectId: string;
  environment: Environment;
  targetUrl: string;
  modules: QaModuleResult[];
  consoleErrors: string[];
  pageResults: QaExecutionPayload["pageResults"];
  sitemapUrls: string[];
};

async function executeQaRunBody({
  projectId,
  environment,
  targetUrl,
  modules,
  consoleErrors,
  pageResults,
  sitemapUrls
}: ExecuteQaRunBodyArgs) {
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

  // Factored out so we can rebuild the page mid-loop without duplicating
  // the console listener wiring. Each new page gets the same instrumentation.
  const openInstrumentedPage = async () => {
    const nextPage = await primaryContext.newPage();
    nextPage.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(`[Chromium] ${message.text()}`);
      }
    });
    return nextPage;
  };

  let primaryPage = await openInstrumentedPage();

  // Daily-gate: once per 24h per project, the first HubSpot form we
  // encounter on this run gets fully filled and submitted. Every
  // other form (this run or subsequent runs within 24h) is checked
  // for visibility only. This caps CRM pollution at ~1 row/day even
  // when the cron fires every 5 minutes.
  let deepTestBudget = await shouldDeepTestForm(projectId);

  let pageIndex = 0;
  for (const pageUrl of sitemapUrls) {
    pageIndex += 1;

    // Rotate the tab every PAGE_ROTATION_INTERVAL navigations. We close
    // the old page first so its memory is released before the new tab
    // allocates. pageIndex > 1 skips the very first iteration (the page
    // we already opened above).
    if (pageIndex > 1 && (pageIndex - 1) % PAGE_ROTATION_INTERVAL === 0) {
      await primaryPage.close().catch(() => undefined);
      primaryPage = await openInstrumentedPage();
    }
    await updateQaProgress(projectId, {
      phase: `QA page ${pageIndex} of ${sitemapUrls.length}`,
      percent: Math.min(75, 10 + Math.round((pageIndex / sitemapUrls.length) * 65)),
      totalPages: sitemapUrls.length,
      completedPages: pageIndex - 1,
      currentUrl: pageUrl,
      startedAt: new Date().toISOString(),
      status: "running"
    });

    // A single flaky page (timeout, SSL error, DNS hiccup, runaway JS
    // hanging page.evaluate) must not tear down the whole run — users
    // care about the aggregate QA signal, not about whether one page
    // loaded in under 45s. We catch per-page failures and record them
    // as "failed" page entries so they still surface in the final
    // report. On any error we also force a tab rotation: a hung
    // renderer can leak across navigations and we don't want page N+1
    // to inherit the broken state.
    try {
      const result = await withTimeout(
        inspectPage(primaryPage, pageUrl, environment, {
          allowDeepFormSubmit: deepTestBudget
        }),
        PAGE_INSPECT_TIMEOUT_MS,
        `inspectPage(${pageUrl})`
      );
      pageResults.push(result);

      // If we just spent the deep-test budget on this page (whether the
      // submit succeeded or threw mid-flight), persist the gate
      // immediately — we don't want a crash later in the run to leak
      // another submission on the next cron tick.
      if (deepTestBudget && result.hubspotForm?.attempted) {
        deepTestBudget = false;
        await recordFormSubmission({
          projectId,
          pageUrl,
          environment,
          status: result.hubspotForm.succeeded
            ? "submitted_verified"
            : "submitted_unverified",
          detail: result.hubspotForm.detail
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pageResults.push({
        url: pageUrl,
        environment,
        status: "failed",
        issues: [`Page inspection failed: ${message.slice(0, 200)}`],
        statusCode: null,
        timestamp: new Date().toISOString(),
        ctaCount: 0,
        formCount: 0,
        layoutShiftCount: 0
      });

      // Force a fresh tab. A timed-out inspectPage almost always means
      // the renderer is hung, and reusing the same Page would propagate
      // the hang to the next URL.
      await primaryPage.close().catch(() => undefined);
      primaryPage = await openInstrumentedPage();
    }
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

    // The "forms" module now mirrors the per-page HubSpot stats so the
    // cross-browser dashboard reflects real submission health rather
    // than a generic <form> tag count.
    const hubspotPagesFound = pageResults.filter((p) => p.hubspotForm?.found).length;
    const hubspotSubmitted = pageResults.filter(
      (p) => p.hubspotForm?.attempted && p.hubspotForm?.succeeded
    ).length;
    const hubspotBroken = pageResults.filter(
      (p) => p.hubspotForm?.attempted && !p.hubspotForm?.succeeded
    ).length;
    modules.push({
      name: `${browserEntry.name} forms (HubSpot)`,
      status:
        hubspotBroken > 0
          ? "failed"
          : hubspotPagesFound === 0
            ? "warning"
            : "passed",
      details: [
        hubspotPagesFound === 0
          ? "No HubSpot embed forms detected across scanned pages"
          : `Detected HubSpot forms on ${hubspotPagesFound} page(s); ${hubspotSubmitted} verified via deep submission, ${hubspotBroken} broken`
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
