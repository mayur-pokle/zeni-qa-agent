import type { Page, FrameLocator, Locator } from "playwright";

/**
 * HubSpot embed form QA.
 *
 * This module knows nothing about CRM gating — it just answers: given a
 * page, is there a HubSpot form on it, is it visible, and (optionally)
 * does the full fill + submit + verify flow succeed?
 *
 * The caller (executeQaRun) decides whether to run the deep submit by
 * threading `deep: true` exactly once per 24h via `shouldDeepTestForm`.
 *
 * Two embed shapes are supported:
 *  - iframe: HubSpot's modern v2 embed renders into
 *    `<iframe id="hs-form-iframe-N" src="...forms.hsforms.com...">`.
 *    We drive it via Playwright's frameLocator so cross-origin doesn't
 *    matter — we're in browser-driver land, not making fetches.
 *  - inline: legacy embed renders the form inline with class `hs-form`.
 *
 * Non-HubSpot forms (raw <form>, Webflow, custom) are ignored by design.
 */

// Field values shared with the user. Keys here are the canonical group
// keys; alias names that HubSpot actually uses for the input element
// live in FIELD_ALIASES below. Two layers of indirection so we can
// add new aliases (HubSpot portal-specific custom property names)
// without touching values.
const HUBSPOT_FORM_DUMMY_DATA: Record<string, string> = {
  firstname: "QA",
  lastname: "Monitor",
  email: "qa-monitor@zeni.ai",
  company: "Zeni QA Test",
  phone: "999-0000",
  jobtitle: "QA Automation",
  companysize: "1-10",
  country: "United States",
  message: "Automated QA check — please ignore"
};

const FIELD_ALIASES: Record<string, string[]> = {
  firstname: ["firstname", "first_name", "first-name"],
  lastname: ["lastname", "last_name", "last-name"],
  email: ["email"],
  company: ["company", "company_name", "company_0"],
  phone: ["phone", "mobilephone", "phone_number"],
  jobtitle: ["jobtitle", "job_title", "title"],
  companysize: [
    "numemployees",
    "company_size",
    "company_size_dropdown",
    "employees",
    "employee_count"
  ],
  country: ["country", "country_region", "country_dropdown"],
  message: [
    "message",
    "description",
    "comments",
    "tell_us_what_you_need",
    "what_do_you_need_help_with",
    "how_can_we_help"
  ]
};

const FORM_RENDER_TIMEOUT_MS = 10_000;
const SUBMIT_VERIFY_TIMEOUT_MS = 15_000;

type FormHandle =
  | { kind: "iframe"; frame: FrameLocator; iframeLocator: Locator }
  | { kind: "inline"; root: Locator };

export type HubspotFormTestResult = {
  found: boolean;
  embedKind?: "iframe" | "inline";
  visible?: boolean;
  attempted: boolean;
  succeeded: boolean;
  detail: string;
  missingFields?: string[];
};

export async function testHubspotForm(
  page: Page,
  options: { deep: boolean }
): Promise<HubspotFormTestResult> {
  // Fast path: most pages don't have a HubSpot embed at all. Skip the
  // 10s wait below by checking for the loader script or any form node
  // already in the DOM.
  if (!(await pageHasHubspotIndicator(page))) {
    return {
      found: false,
      attempted: false,
      succeeded: false,
      detail: "No HubSpot embed detected on this page"
    };
  }

  const handle = await locateHubspotForm(page);
  if (!handle) {
    return {
      found: false,
      attempted: false,
      succeeded: false,
      detail: "HubSpot script present but no form rendered within timeout"
    };
  }

  const visible = await isFormVisible(handle);
  if (!visible) {
    return {
      found: true,
      embedKind: handle.kind,
      visible: false,
      attempted: false,
      succeeded: false,
      detail:
        "HubSpot form embed present but not visible (display:none, hidden, or zero-size)"
    };
  }

  if (await hasRecaptcha(page, handle)) {
    return {
      found: true,
      embedKind: handle.kind,
      visible: true,
      attempted: false,
      succeeded: false,
      detail:
        "HubSpot form gated by reCAPTCHA — automated submission not attempted"
    };
  }

  if (!options.deep) {
    return {
      found: true,
      embedKind: handle.kind,
      visible: true,
      attempted: false,
      succeeded: false,
      detail: "Form visible (deep submission skipped — already submitted in last 24h)"
    };
  }

  try {
    const fillResult = await fillHubspotForm(handle);
    if (fillResult.missingRequired.length > 0) {
      return {
        found: true,
        embedKind: handle.kind,
        visible: true,
        attempted: false,
        succeeded: false,
        detail: `Required field(s) we don't have a value for: ${fillResult.missingRequired.join(", ")}`,
        missingFields: fillResult.missingRequired
      };
    }

    await submitForm(handle);
    const success = await verifySubmissionSuccess(handle);
    if (!success) {
      return {
        found: true,
        embedKind: handle.kind,
        visible: true,
        attempted: true,
        succeeded: false,
        detail:
          "Submitted but no success state appeared within 15s — possible HubSpot validation error or outage"
      };
    }

    return {
      found: true,
      embedKind: handle.kind,
      visible: true,
      attempted: true,
      succeeded: true,
      detail: `Form submitted (${fillResult.filledFields.length} field(s) filled) and success state verified`
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      found: true,
      embedKind: handle.kind,
      visible: true,
      // We can't tell from the error whether the click actually fired
      // off a network request — assume it did so the gate fires and we
      // don't retry on the next cron tick (CRM-pollution safety bias).
      attempted: true,
      succeeded: false,
      detail: `Submission threw: ${message.slice(0, 200)}`
    };
  }
}

// ---------- internals ----------

async function pageHasHubspotIndicator(page: Page): Promise<boolean> {
  const count = await page
    .locator(
      [
        'script[src*="hsforms.net"]',
        'script[src*="hsforms.com"]',
        'script[src*="js.hsforms.net"]',
        'iframe[id^="hs-form-iframe-"]',
        'iframe[src*="forms.hsforms.com"]',
        'iframe[src*="forms-na1.hsforms.com"]',
        "form.hs-form",
        'form[id^="hsForm_"]',
        ".hs-form",
        ".hbspt-form"
      ].join(", ")
    )
    .count()
    .catch(() => 0);
  return count > 0;
}

async function locateHubspotForm(page: Page): Promise<FormHandle | null> {
  const iframeSelector =
    'iframe[id^="hs-form-iframe-"], iframe[src*="forms.hsforms.com"], iframe[src*="forms-na1.hsforms.com"]';
  const inlineSelector = 'form.hs-form, form[id^="hsForm_"]';

  const start = Date.now();
  while (Date.now() - start < FORM_RENDER_TIMEOUT_MS) {
    const iframeCount = await page.locator(iframeSelector).count().catch(() => 0);
    if (iframeCount > 0) {
      const iframeLocator = page.locator(iframeSelector).first();
      const frame = page.frameLocator(iframeSelector).first();
      // Wait for the form inside the iframe to render before we hand
      // back the handle. Without this, the very first selectOption can
      // race the iframe's React mount.
      await frame
        .locator("form, .hs-form, input, select")
        .first()
        .waitFor({ state: "visible", timeout: 6_000 })
        .catch(() => undefined);
      return { kind: "iframe", frame, iframeLocator };
    }

    const inlineCount = await page.locator(inlineSelector).count().catch(() => 0);
    if (inlineCount > 0) {
      return { kind: "inline", root: page.locator(inlineSelector).first() };
    }

    await page.waitForTimeout(400);
  }

  return null;
}

async function isFormVisible(handle: FormHandle): Promise<boolean> {
  try {
    if (handle.kind === "iframe") {
      // The iframe element's own visibility — does it have non-zero
      // size and a parent that isn't display:none?
      return await handle.iframeLocator.isVisible();
    }
    return await handle.root.isVisible();
  } catch {
    return false;
  }
}

async function hasRecaptcha(page: Page, handle: FormHandle): Promise<boolean> {
  // Outer-page reCAPTCHA badge
  const outer = await page
    .locator(
      'iframe[src*="recaptcha"], .grecaptcha-badge, .g-recaptcha, iframe[src*="hcaptcha"]'
    )
    .count()
    .catch(() => 0);
  if (outer > 0) return true;

  // Some HubSpot embeds load their own captcha inside the form iframe
  if (handle.kind === "iframe") {
    const inner = await handle.frame
      .locator('iframe[src*="recaptcha"], .grecaptcha-badge, iframe[src*="hcaptcha"]')
      .count()
      .catch(() => 0);
    if (inner > 0) return true;
  }
  return false;
}

function scopeFromHandle(handle: FormHandle): Locator | FrameLocator {
  return handle.kind === "iframe" ? handle.frame : handle.root;
}

async function fillHubspotForm(
  handle: FormHandle
): Promise<{ filledFields: string[]; missingRequired: string[] }> {
  const scope = scopeFromHandle(handle);
  const filled: string[] = [];

  for (const groupKey of Object.keys(HUBSPOT_FORM_DUMMY_DATA)) {
    const value = HUBSPOT_FORM_DUMMY_DATA[groupKey];
    const aliases = FIELD_ALIASES[groupKey] ?? [groupKey];
    const ok = await fillByAlias(scope, aliases, value);
    if (ok) filled.push(groupKey);
  }

  // Tick any consent / terms checkboxes — HubSpot uses
  // `legal_consent.subscription_*` and similar. Without these checked,
  // submission silently fails.
  await checkConsentBoxes(scope);

  const missingRequired = await findMissingRequiredFields(scope);
  return { filledFields: filled, missingRequired };
}

async function fillByAlias(
  scope: Locator | FrameLocator,
  aliases: string[],
  value: string
): Promise<boolean> {
  for (const name of aliases) {
    const candidates = scope.locator(`[name="${name}"]`);
    const count = await candidates.count().catch(() => 0);
    if (count === 0) continue;

    const first = candidates.first();
    const tagName = await first
      .evaluate((el) => el.tagName)
      .catch(() => "INPUT");

    if (tagName === "SELECT") {
      // 1. exact label
      let ok = await first
        .selectOption({ label: value })
        .then(() => true)
        .catch(() => false);
      if (ok) return true;
      // 2. exact value
      ok = await first
        .selectOption(value)
        .then(() => true)
        .catch(() => false);
      if (ok) return true;
      // 3. partial label match (e.g. user said "1-10", form has "1-5")
      const optionTexts = await first.locator("option").allInnerTexts().catch(() => []);
      const lowered = value.toLowerCase();
      let matched = optionTexts.find(
        (opt) =>
          opt.toLowerCase().includes(lowered) ||
          lowered.includes(opt.toLowerCase().trim())
      );
      // 4. for company size: if no match, take the first non-placeholder option
      // that starts with "1" (smallest team), to avoid surprising a sales rep.
      if (!matched && /-/.test(value)) {
        matched = optionTexts.find((opt) => /^\s*1[\s\-]/.test(opt));
      }
      if (matched) {
        const ok2 = await first
          .selectOption({ label: matched })
          .then(() => true)
          .catch(() => false);
        if (ok2) return true;
      }
      return false;
    }

    if (tagName === "TEXTAREA" || tagName === "INPUT") {
      await first.fill(value).catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function checkConsentBoxes(scope: Locator | FrameLocator) {
  // HubSpot's GDPR consent checkboxes — names look like
  // `LEGAL_CONSENT.subscription_type_<id>` or end with `_legitimate_interest`
  const boxes = scope.locator(
    'input[type="checkbox"][name*="LEGAL_CONSENT"], input[type="checkbox"][name*="consent"], input[type="checkbox"][name*="subscription"]'
  );
  const total = await boxes.count().catch(() => 0);
  for (let i = 0; i < total; i += 1) {
    const cb = boxes.nth(i);
    const checked = await cb.isChecked().catch(() => true);
    if (!checked) {
      await cb.check({ force: true }).catch(() => undefined);
    }
  }
}

async function findMissingRequiredFields(
  scope: Locator | FrameLocator
): Promise<string[]> {
  // HubSpot marks required fields a couple of different ways depending
  // on the embed version — collect them all and de-dupe by name.
  const requiredHandles = await scope
    .locator(
      [
        '[aria-required="true"]',
        ".hs-form-required input",
        ".hs-form-required textarea",
        ".hs-form-required select",
        '.hs-fieldtype-text.required input',
        ".hs-input[required]"
      ].join(", ")
    )
    .all()
    .catch(() => []);

  const seen = new Set<string>();
  const missing: string[] = [];
  for (const handle of requiredHandles) {
    const name = await handle.getAttribute("name").catch(() => null);
    const key = name ?? "<unnamed>";
    if (seen.has(key)) continue;
    seen.add(key);

    // Try inputValue first; falls back to checkbox/radio "checked" state.
    let value = "";
    try {
      value = await handle.inputValue();
    } catch {
      const checked = await handle
        .evaluate((el) => (el as HTMLInputElement).checked)
        .catch(() => true);
      if (checked) continue;
    }
    if (!value) missing.push(key);
  }
  return missing;
}

async function submitForm(handle: FormHandle) {
  const scope = scopeFromHandle(handle);
  const submit = scope.locator('input[type="submit"], button[type="submit"]').first();
  const exists = await submit.count().catch(() => 0);
  if (exists > 0) {
    await submit.scrollIntoViewIfNeeded().catch(() => undefined);
    await submit.click();
    return;
  }
  // Fallback for forms whose submit is rendered as a generic button.
  const fallback = scope
    .locator("button, input[type='button']")
    .filter({ hasText: /submit|send|continue|get started|book|request/i })
    .first();
  await fallback.scrollIntoViewIfNeeded().catch(() => undefined);
  await fallback.click();
}

async function verifySubmissionSuccess(handle: FormHandle): Promise<boolean> {
  const scope = scopeFromHandle(handle);
  const successSelectors = [
    ".submitted-message",
    ".hs-form__success-message",
    ".hbspt-form .submitted-message",
    '[data-test-id="submission-success"]',
    ".hs-form-thank-you"
  ];

  const start = Date.now();
  while (Date.now() - start < SUBMIT_VERIFY_TIMEOUT_MS) {
    for (const sel of successSelectors) {
      const visible = await scope
        .locator(sel)
        .first()
        .isVisible()
        .catch(() => false);
      if (visible) return true;
    }

    // Some HubSpot success states navigate the iframe (or page) to a
    // thank-you URL. If the original input fields are gone, treat that
    // as success too.
    const stillHasFields = await scope
      .locator('input[name="email"], input[name="firstname"]')
      .count()
      .catch(() => 1);
    if (stillHasFields === 0) return true;

    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
