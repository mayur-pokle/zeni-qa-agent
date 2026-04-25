import type { QaRun, Project, Environment } from "@prisma/client";
import type { QaExecutionPayload } from "@/lib/types";
import type { SlackBlock } from "@/lib/alerts";
import { env } from "@/lib/env";

/**
 * Assembles the structured content we send to Slack and email after a QA
 * run finishes. The goal is to give someone scanning their inbox or
 * Slack feed enough signal to decide "do I need to dig in?" without
 * opening the app — clear status, Lighthouse scores, page-level issue
 * counts, and a link back to the full report (and CSV).
 */

type QaAlertInputs = {
  run: QaRun;
  project: Project;
  environment: Environment;
};

type QaAlertContent = {
  subject: string;
  slackBlocks: SlackBlock[];
  slackFallback: string;
  emailHtml: string;
  emailText: string;
  csvDownloadUrl: string;
  reportPageUrl: string;
};

const STATUS_EMOJI: Record<string, string> = {
  PASSED: ":white_check_mark:",
  WARNING: ":large_yellow_circle:",
  FAILED: ":red_circle:"
};

function scoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return "N/A";
  return `${score}/100`;
}

function appBaseUrl() {
  // Strip trailing slash so we don't produce `//api/...`.
  return (env.APP_URL ?? "").replace(/\/+$/, "");
}

/**
 * Boils the run payload down to the handful of aggregate counts that are
 * worth including in a one-screen alert. We compute these on the fly
 * rather than storing them because the underlying arrays are small and
 * the run may have been stored by an older code path that didn't.
 */
function summarize(payload: QaExecutionPayload | null | undefined) {
  const pageResults = payload?.pageResults ?? [];
  const modules = payload?.modules ?? [];
  const consoleErrors = payload?.consoleErrors ?? [];

  const pagesScanned = payload?.sitemap?.testedPages ?? pageResults.length;
  const pagesDiscovered = payload?.sitemap?.discoveredPages ?? pagesScanned;
  const pagesFailed = pageResults.filter((page) => page.status === "failed").length;
  const pagesWithWarnings = pageResults.filter((page) => page.status === "warning").length;

  const pagesMissingCta = pageResults.filter((page) => (page.ctaCount ?? 0) === 0).length;
  const pagesWithForms = pageResults.filter((page) => (page.formCount ?? 0) > 0).length;
  const pagesWithLayoutShifts = pageResults.filter(
    (page) => (page.layoutShiftCount ?? 0) > 0
  ).length;

  // HubSpot-specific stats: from how many pages a HubSpot embed form
  // was detected, how many got the deep submission this run, and how
  // many submissions broke (clicked submit, no success state).
  const hubspotPagesFound = pageResults.filter((p) => p.hubspotForm?.found).length;
  const hubspotSubmittedOk = pageResults.filter(
    (p) => p.hubspotForm?.attempted && p.hubspotForm?.succeeded
  ).length;
  const hubspotSubmittedFailed = pageResults.filter(
    (p) => p.hubspotForm?.attempted && !p.hubspotForm?.succeeded
  ).length;
  const hubspotInvisible = pageResults.filter(
    (p) => p.hubspotForm?.found && p.hubspotForm?.visible === false
  ).length;
  const hubspotSubmittedUrl =
    pageResults.find((p) => p.hubspotForm?.attempted)?.url ?? null;

  const modulesFailed = modules.filter((module) => module.status === "failed").length;
  const modulesWarning = modules.filter((module) => module.status === "warning").length;
  const modulesPassed = modules.filter((module) => module.status === "passed").length;

  return {
    pagesDiscovered,
    pagesScanned,
    pagesFailed,
    pagesWithWarnings,
    pagesMissingCta,
    pagesWithForms,
    pagesWithLayoutShifts,
    hubspotPagesFound,
    hubspotSubmittedOk,
    hubspotSubmittedFailed,
    hubspotInvisible,
    hubspotSubmittedUrl,
    modulesFailed,
    modulesWarning,
    modulesPassed,
    consoleErrorCount: consoleErrors.length
  };
}

export function buildQaAlert({ run, project, environment }: QaAlertInputs): QaAlertContent {
  const payload = (run.payload ?? null) as QaExecutionPayload | null;
  const stats = summarize(payload);
  const envLabel = String(environment);
  const targetUrl =
    payload?.environmentUrl ??
    (environment === "STAGING" ? project.stagingUrl : project.productionUrl) ??
    "";

  const statusEmoji = STATUS_EMOJI[run.status] ?? "";
  const subject =
    run.status !== "PASSED"
      ? `[QA Alert] ${project.name} ${envLabel} ${run.status}`
      : `[QA Report] ${project.name} ${envLabel} completed`;

  const base = appBaseUrl();
  // /api/reports/[runId] is confusingly parameterised — it treats the path
  // param as a *project* id (see backend/app/api/reports/[runId]/route.ts)
  // and returns all runs for that project as a CSV. We thread the project
  // id through to match.
  const csvDownloadUrl = `${base}/api/reports/${project.id}`;
  const reportPageUrl = `${base}/projects/${project.id}`;

  // ---------- Email (HTML + plain text) ----------
  const emailText = [
    `${project.name} — ${envLabel}`,
    `Status: ${run.status}`,
    `Target URL: ${targetUrl}`,
    `Run started: ${run.startedAt.toISOString?.() ?? String(run.startedAt)}`,
    "",
    "Lighthouse scores",
    `  Performance:   ${scoreLabel(run.performanceScore)}`,
    `  SEO:           ${scoreLabel(run.seoScore)}`,
    `  Accessibility: ${scoreLabel(run.accessibility)}`,
    "",
    "Page-level findings",
    `  Pages scanned:           ${stats.pagesScanned} of ${stats.pagesDiscovered} discovered`,
    `  Pages failed:            ${stats.pagesFailed}`,
    `  Pages with warnings:     ${stats.pagesWithWarnings}`,
    `  Pages missing a CTA:     ${stats.pagesMissingCta}`,
    `  Pages with HubSpot forms:${stats.hubspotPagesFound}`,
    `  Pages with layout shift: ${stats.pagesWithLayoutShifts}`,
    "",
    "HubSpot form check",
    `  Forms detected:          ${stats.hubspotPagesFound}`,
    `  Deep submission today:   ${stats.hubspotSubmittedOk > 0 ? "verified" : stats.hubspotSubmittedFailed > 0 ? "submitted but no success state" : "not run"}`,
    `  Submitted on:            ${stats.hubspotSubmittedUrl ?? "(no submission today)"}`,
    `  Forms broken (clicked submit, no success): ${stats.hubspotSubmittedFailed}`,
    `  Forms found but invisible: ${stats.hubspotInvisible}`,
    "",
    "Cross-browser modules",
    `  Passed:   ${stats.modulesPassed}`,
    `  Warning:  ${stats.modulesWarning}`,
    `  Failed:   ${stats.modulesFailed}`,
    "",
    `Console errors collected: ${stats.consoleErrorCount}`,
    "",
    `Full report: ${reportPageUrl}`,
    `CSV download: ${csvDownloadUrl}`
  ].join("\n");

  const emailHtml = renderEmailHtml({
    project,
    run,
    environment: envLabel,
    targetUrl,
    stats,
    csvDownloadUrl,
    reportPageUrl
  });

  // ---------- Slack Block Kit ----------
  const slackBlocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${statusEmoji ? `${statusEmoji} ` : ""}${subject}`.trim(),
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${project.name}* — <${targetUrl}|${targetUrl}>`
      }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Status*\n${run.status}` },
        { type: "mrkdwn", text: `*Environment*\n${envLabel}` },
        {
          type: "mrkdwn",
          text: `*Pages scanned*\n${stats.pagesScanned} / ${stats.pagesDiscovered}`
        },
        { type: "mrkdwn", text: `*Pages failed*\n${stats.pagesFailed}` }
      ]
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Performance*\n${scoreLabel(run.performanceScore)}` },
        { type: "mrkdwn", text: `*SEO*\n${scoreLabel(run.seoScore)}` },
        { type: "mrkdwn", text: `*Accessibility*\n${scoreLabel(run.accessibility)}` },
        { type: "mrkdwn", text: `*Console errors*\n${stats.consoleErrorCount}` }
      ]
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Pages missing CTA*\n${stats.pagesMissingCta}` },
        { type: "mrkdwn", text: `*Pages w/ HubSpot forms*\n${stats.hubspotPagesFound}` },
        {
          type: "mrkdwn",
          text: `*Pages w/ layout shifts*\n${stats.pagesWithLayoutShifts}`
        },
        {
          type: "mrkdwn",
          text: `*Modules passed / warn / fail*\n${stats.modulesPassed} / ${stats.modulesWarning} / ${stats.modulesFailed}`
        }
      ]
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*HubSpot deep submit*\n${stats.hubspotSubmittedOk > 0 ? "✅ verified" : stats.hubspotSubmittedFailed > 0 ? "❌ failed" : "—"}`
        },
        {
          type: "mrkdwn",
          text: `*HubSpot submit page*\n${stats.hubspotSubmittedUrl ? `<${stats.hubspotSubmittedUrl}|${truncateUrl(stats.hubspotSubmittedUrl)}>` : "none today"}`
        },
        {
          type: "mrkdwn",
          text: `*HubSpot broken*\n${stats.hubspotSubmittedFailed}`
        },
        {
          type: "mrkdwn",
          text: `*HubSpot invisible*\n${stats.hubspotInvisible}`
        }
      ]
    },
    { type: "divider" },
    {
      // Slack webhooks can't attach files, so we surface two buttons the
      // recipient can click instead: the full in-app report and a direct
      // CSV download. APP_URL needs to be set for these to resolve.
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View full report", emoji: true },
          url: reportPageUrl,
          style: run.status === "FAILED" ? "danger" : "primary"
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Download CSV", emoji: true },
          url: csvDownloadUrl
        }
      ]
    }
  ];

  const slackFallback = [
    `${subject}`,
    `${project.name} — ${envLabel}`,
    `Status: ${run.status} | Perf ${scoreLabel(run.performanceScore)}, SEO ${scoreLabel(run.seoScore)}, A11y ${scoreLabel(run.accessibility)}`,
    `Pages: ${stats.pagesScanned}/${stats.pagesDiscovered} scanned, ${stats.pagesFailed} failed`,
    `CSV: ${csvDownloadUrl}`
  ].join("\n");

  return {
    subject,
    slackBlocks,
    slackFallback,
    emailHtml,
    emailText,
    csvDownloadUrl,
    reportPageUrl
  };
}

/**
 * Keep the inline CSS extremely simple — email clients (Outlook in
 * particular) strip or ignore most modern CSS. We stick to tables,
 * inline styles, and safe colors.
 */
function renderEmailHtml(input: {
  project: Project;
  run: QaRun;
  environment: string;
  targetUrl: string;
  stats: ReturnType<typeof summarize>;
  csvDownloadUrl: string;
  reportPageUrl: string;
}) {
  const { project, run, environment, targetUrl, stats, csvDownloadUrl, reportPageUrl } = input;
  const statusColor =
    run.status === "FAILED" ? "#b91c1c" : run.status === "WARNING" ? "#b45309" : "#047857";

  const row = (label: string, value: string | number) => `
    <tr>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#374151;font-weight:600;">${escapeHtml(label)}</td>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#111827;">${escapeHtml(String(value))}</td>
    </tr>`;

  const section = (title: string, rows: string) => `
    <h3 style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;text-transform:uppercase;letter-spacing:0.08em;color:#4b5563;margin:24px 0 8px;">${escapeHtml(title)}</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;">${rows}</table>`;

  return `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
  <div style="border-left:4px solid ${statusColor};padding:4px 12px;margin-bottom:16px;">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">${escapeHtml(environment)} · ${escapeHtml(run.status)}</div>
    <div style="font-size:20px;font-weight:700;margin-top:4px;">${escapeHtml(project.name)}</div>
    <div style="font-size:14px;color:#4b5563;margin-top:2px;"><a href="${escapeHtml(targetUrl)}" style="color:#4b5563;text-decoration:underline;">${escapeHtml(targetUrl)}</a></div>
  </div>

  ${section(
    "Lighthouse scores",
    row("Performance", scoreLabel(run.performanceScore)) +
      row("SEO", scoreLabel(run.seoScore)) +
      row("Accessibility", scoreLabel(run.accessibility))
  )}

  ${section(
    "Page-level findings",
    row("Pages scanned", `${stats.pagesScanned} of ${stats.pagesDiscovered} discovered`) +
      row("Pages failed", stats.pagesFailed) +
      row("Pages with warnings", stats.pagesWithWarnings) +
      row("Pages missing a CTA", stats.pagesMissingCta) +
      row("Pages with HubSpot forms", stats.hubspotPagesFound) +
      row("Pages with layout shifts", stats.pagesWithLayoutShifts)
  )}

  ${section(
    "HubSpot form check",
    row(
      "Deep submission today",
      stats.hubspotSubmittedOk > 0
        ? "Verified"
        : stats.hubspotSubmittedFailed > 0
          ? "Submitted but no success state"
          : "Not run (already submitted in last 24h or no form encountered)"
    ) +
      row("Submitted on", stats.hubspotSubmittedUrl ?? "—") +
      row("Forms broken (no success state)", stats.hubspotSubmittedFailed) +
      row("Forms found but invisible", stats.hubspotInvisible)
  )}

  ${section(
    "Cross-browser modules",
    row("Passed", stats.modulesPassed) +
      row("Warning", stats.modulesWarning) +
      row("Failed", stats.modulesFailed)
  )}

  ${section("Console", row("Errors collected", stats.consoleErrorCount))}

  <div style="margin-top:24px;">
    <a href="${escapeHtml(reportPageUrl)}" style="display:inline-block;padding:10px 16px;background:${statusColor};color:#ffffff;font-weight:600;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;text-decoration:none;margin-right:8px;">View full report</a>
    <a href="${escapeHtml(csvDownloadUrl)}" style="display:inline-block;padding:10px 16px;background:#111827;color:#ffffff;font-weight:600;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;text-decoration:none;">Download CSV</a>
  </div>

  <p style="margin-top:24px;color:#6b7280;font-size:12px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">The attached CSV contains the complete per-page breakdown.</p>
</div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateUrl(url: string, max = 50) {
  if (url.length <= max) return url;
  // Strip protocol for compactness, then truncate.
  const stripped = url.replace(/^https?:\/\//, "");
  return stripped.length <= max ? stripped : stripped.slice(0, max - 1) + "…";
}
