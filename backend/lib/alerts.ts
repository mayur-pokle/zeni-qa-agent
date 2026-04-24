import nodemailer from "nodemailer";
import { readConnectionSettings } from "@/lib/app-settings";

export async function sendSlackAlert(input: {
  projectName: string;
  title: string;
  body: string;
  webhookUrl?: string;
}) {
  const settings = readConnectionSettings();
  const url = (input.webhookUrl ?? settings.slackWebhookUrl ?? "").trim();

  if (!url) {
    return { skipped: true, reason: "no webhook url" };
  }

  const text = `*${input.title}*\n_${input.projectName}_\n${input.body}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
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
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}) {
  const settings = readConnectionSettings();

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
      text: `${input.projectName}\n\n${input.body}`,
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
    text: `${input.projectName}\n\n${input.body}`,
    attachments: input.attachments ?? []
  });

  return { skipped: false, provider: "smtp" as const };
}
