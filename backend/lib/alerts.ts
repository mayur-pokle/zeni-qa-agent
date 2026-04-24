import nodemailer from "nodemailer";
import { readConnectionSettings } from "@/lib/app-settings";

// Minimal Block Kit shape. We only use what we need from
// https://api.slack.com/block-kit — headers, sections, fields, context,
// divider, and action buttons. Typed loosely as `unknown`-leaning objects
// so callers can assemble whichever blocks they need without us having
// to model the full Slack schema.
export type SlackBlock = Record<string, unknown>;

export async function sendSlackAlert(input: {
  projectName: string;
  title: string;
  body: string;
  blocks?: SlackBlock[];
  webhookUrl?: string;
}) {
  const settings = readConnectionSettings();
  const url = (input.webhookUrl ?? settings.slackWebhookUrl ?? "").trim();

  if (!url) {
    return { skipped: true, reason: "no webhook url" };
  }

  // Fallback text is what Slack shows in notifications and in clients
  // that can't render blocks. Keep it identical to the old format so
  // nothing regresses for users who only see the preview.
  const fallbackText = `*${input.title}*\n_${input.projectName}_\n${input.body}`;

  const payload = input.blocks
    ? { text: fallbackText, blocks: input.blocks }
    : { text: fallbackText };

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Slack webhook returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return { skipped: false };
}

/**
 * Send an email via Resend's HTTP API.
 * Resend works on Railway because it uses plain HTTPS rather than SMTP,
 * which is blocked by Railway's outbound firewall.
 */
async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}) {
  const attachments = (params.attachments ?? []).map((attachment) => ({
    filename: attachment.filename,
    content:
      attachment.content instanceof Buffer
        ? attachment.content.toString("base64")
        : Buffer.from(attachment.content).toString("base64")
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${params.apiKey}`
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        // Resend renders `html` when present, falling back to `text` for
        // plain-text clients and notification previews.
        ...(params.html ? { html: params.html } : {}),
        ...(attachments.length ? { attachments } : {})
      }),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Resend returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`
      );
    }

    return response.json().catch(() => ({}));
  } finally {
    clearTimeout(timer);
  }
}

export async function sendAlertEmail(input: {
  projectName: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}) {
  const settings = readConnectionSettings();
  const text = `${input.projectName}\n\n${input.body}`;

  // Prefer Resend when configured — works reliably on Railway.
  if (settings.resendApiKey && settings.alertEmail) {
    await sendViaResend({
      apiKey: settings.resendApiKey,
      // Resend requires the sender domain to be verified. Unless the user
      // explicitly sets RESEND_FROM to an address on a verified domain,
      // fall back to Resend's shared onboarding address (no DNS required).
      from: settings.resendFrom || "QA Monitor <onboarding@resend.dev>",
      to: settings.alertEmail,
      subject: input.subject,
      text,
      html: input.html,
      attachments: input.attachments
    });
    return { skipped: false, provider: "resend" as const };
  }

  const port = Number(settings.smtpPort);
  if (!settings.smtpHost || !port || !settings.smtpUser || !settings.smtpPassword || !settings.alertEmail) {
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000
  });

  await transporter.verify();

  await transporter.sendMail({
    from: settings.smtpFrom || settings.smtpUser,
    to: settings.alertEmail,
    subject: input.subject,
    text,
    html: input.html,
    attachments: input.attachments ?? []
  });

  return { skipped: false, provider: "smtp" as const };
}
