import { expect, test } from "@playwright/test";
import { assertPageTitle, clickAndValidate, getVisibleCta, openPage } from "./helpers/site";

test("homepage loads successfully @critical", async ({ page, browserName }) => {
  await openPage(page);
  await assertPageTitle(page);

  if (browserName === "chromium") {
    await expect(page).toHaveScreenshot("homepage.png", {
      fullPage: true
    });
  }
});

test("homepage CTA is visible and clickable @critical", async ({ page }) => {
  await openPage(page);
  const cta = await getVisibleCta(page);
  await clickAndValidate(cta);
});
