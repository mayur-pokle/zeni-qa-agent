import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { Environment } from "@prisma/client";
import { storeLighthouseReport } from "@/lib/db";

type LighthouseScores = {
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  reportPath: string;
  htmlReportPath: string;
  jsonReportPath: string;
};

function getReportDirectory() {
  return path.join(process.cwd(), "reports", "lighthouse");
}

function buildReportName(projectId: string, environment: Environment) {
  return `${projectId}-${environment.toLowerCase()}-${Date.now()}`;
}

async function resolveReportFiles(directory: string, reportName: string) {
  const files = await readdir(directory);
  const jsonReport = files.find((file) => file.startsWith(reportName) && file.endsWith(".report.json"));
  const htmlReport = files.find((file) => file.startsWith(reportName) && file.endsWith(".report.html"));

  if (!jsonReport || !htmlReport) {
    throw new Error("Lighthouse report files were not generated.");
  }

  return {
    jsonReportPath: path.join(directory, jsonReport),
    htmlReportPath: path.join(directory, htmlReport)
  };
}

function scoreFromCategory(value: unknown) {
  if (typeof value !== "number") {
    return 0;
  }

  return Math.round(value * 100);
}

export async function runLighthouseAudit(
  url: string,
  projectId: string,
  environment: Environment
): Promise<LighthouseScores> {
  const directory = getReportDirectory();
  const reportName = buildReportName(projectId, environment);
  const port = environment === Environment.STAGING ? 9223 : 9222;

  await mkdir(directory, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [`--remote-debugging-port=${port}`]
  });

  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: "domcontentloaded"
  });

  let auditError: Error | null = null;

  try {
    const { playAudit } = await import("playwright-lighthouse");
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
        directory
      }
    });
  } catch (error) {
    auditError = error instanceof Error ? error : new Error("Lighthouse audit failed");
  } finally {
    await browser.close();
  }

  const { jsonReportPath, htmlReportPath } = await resolveReportFiles(directory, reportName);
  const rawReport = JSON.parse(await readFile(jsonReportPath, "utf8")) as {
    categories?: {
      performance?: { score?: number };
      seo?: { score?: number };
      accessibility?: { score?: number };
      "best-practices"?: { score?: number };
    };
  };

  const result = {
    performanceScore: scoreFromCategory(rawReport.categories?.performance?.score),
    seoScore: scoreFromCategory(rawReport.categories?.seo?.score),
    accessibilityScore: scoreFromCategory(rawReport.categories?.accessibility?.score),
    bestPracticesScore: scoreFromCategory(rawReport.categories?.["best-practices"]?.score),
    reportPath: htmlReportPath,
    htmlReportPath,
    jsonReportPath
  };

  await storeLighthouseReport({
    projectId,
    environment,
    performanceScore: result.performanceScore,
    seoScore: result.seoScore,
    accessibilityScore: result.accessibilityScore,
    bestPracticesScore: result.bestPracticesScore,
    reportPath: htmlReportPath
  });

  if (auditError) {
    throw auditError;
  }

  return result;
}
