import { expect, type Locator, type Page } from "@playwright/test";

export function getTargetUrl() {
  return process.env.QA_TARGET_URL ?? process.env.APP_URL ?? "http://127.0.0.1:3000";
}

export async function openPage(page: Page, path = "/") {
  const url = new URL(path, getTargetUrl()).toString();
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  expect(response, `No response received for ${url}`).not.toBeNull();
  expect(response!.status()).toBeLessThan(400);
  return response!;
}

export async function getVisibleCta(page: Page) {
  const candidates = [
    page.getByRole("link", { name: /get started|contact|book|demo|learn more|start|try/i }).first(),
    page.getByRole("button", { name: /get started|contact|book|demo|learn more|start|try|submit/i }).first(),
    page.locator("main a, main button").first()
  ];

  for (const candidate of candidates) {
    if (await candidate.count()) {
      await expect(candidate).toBeVisible();
      return candidate;
    }
  }

  throw new Error("No clickable CTA was found on the page.");
}

export async function clickAndValidate(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();

  const href = await locator.getAttribute("href");
  if (href && !href.startsWith("#")) {
    await locator.click();
    return;
  }

  await locator.click();
}

export async function getNavigationLinks(page: Page) {
  const links = await page.locator("nav a[href]").evaluateAll((anchors) =>
    anchors
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href): href is string => typeof href === "string" && !href.startsWith("#"))
  );

  return Array.from(new Set(links)).slice(0, 6);
}

export async function submitFirstForm(page: Page) {
  const form = page.locator("form").first();
  await expect(form).toBeVisible();

  const textInput = form.locator("input[type='text'], input:not([type]), textarea").first();
  if (await textInput.count()) {
    await textInput.fill("Mayur QA");
  }

  const emailInput = form.locator("input[type='email']").first();
  if (await emailInput.count()) {
    await emailInput.fill("mayur@example.com");
  }

  const telInput = form.locator("input[type='tel']").first();
  if (await telInput.count()) {
    await telInput.fill("9999999999");
  }

  const submitButton = form.getByRole("button").last();
  await expect(submitButton).toBeVisible();

  const beforeUrl = page.url();
  await submitButton.click();
  await page.waitForLoadState("networkidle");

  const bodyText = await page.locator("body").innerText();
  const afterUrl = page.url();
  const looksSuccessful =
    beforeUrl !== afterUrl ||
    /thank you|success|submitted|received|done/i.test(bodyText);

  expect(looksSuccessful).toBeTruthy();
}

export async function assertPageTitle(page: Page) {
  const title = await page.title();
  expect(title.trim().length).toBeGreaterThan(0);
}
