import { test } from "@playwright/test";
import { openPage, submitFirstForm } from "./helpers/site";

test("first visible form submits successfully @critical", async ({ page }) => {
  await openPage(page);
  await submitFirstForm(page);
});
