import { expect, test } from "@playwright/test";
import { getNavigationLinks, openPage } from "./helpers/site";

test("navigation links respond successfully @critical", async ({ page }) => {
  await openPage(page);
  const links = await getNavigationLinks(page);

  expect(links.length).toBeGreaterThan(0);

  for (const href of links) {
    const targetUrl = new URL(href, page.url()).toString();
    const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    expect(response, `No response for navigation target ${targetUrl}`).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
  }
});
