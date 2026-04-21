import { test } from "@playwright/test";
import { playAudit } from "playwright-lighthouse";

const targetUrl =
  process.env.LIGHTHOUSE_TARGET_URL ??
  process.env.PRODUCTION_URL ??
  process.env.APP_URL ??
  "http://127.0.0.1:3000";

const port = Number(process.env.LIGHTHOUSE_PORT ?? 9222);
const reportName = process.env.LIGHTHOUSE_REPORT_NAME ?? "lighthouse-production";

test("Lighthouse Audit", async ({ playwright }) => {
  const browser = await playwright.chromium.launch({
    args: [`--remote-debugging-port=${port}`]
  });

  const page = await browser.newPage();

  await page.goto(targetUrl, {
    waitUntil: "domcontentloaded"
  });

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
      directory: "./reports/lighthouse"
    }
  });

  await browser.close();
});
