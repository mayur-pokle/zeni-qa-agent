import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright/tests",
  fullyParallel: true,
  timeout: 90_000,
  retries: 2,
  outputDir: "playwright-results",
  snapshotPathTemplate: "playwright/__snapshots__/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: process.env.QA_TARGET_URL ?? process.env.APP_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ]
});
