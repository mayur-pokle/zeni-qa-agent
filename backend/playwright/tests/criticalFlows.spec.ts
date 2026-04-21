import { expect, test } from "@playwright/test";
import { openPage } from "./helpers/site";

async function getSitemapPages(pageUrl: string) {
  const sitemapUrl = new URL("/sitemap.xml", pageUrl).toString();
  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    return [pageUrl];
  }

  const xml = await response.text();
  const urls = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gim))
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));

  return urls.length > 0 ? urls.slice(0, 10) : [pageUrl];
}

test("critical sitemap pages load without server errors @critical", async ({ page }) => {
  await openPage(page);
  const urls = await getSitemapPages(page.url());

  for (const url of urls) {
    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    expect(response, `Missing response for ${url}`).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
  }
});
