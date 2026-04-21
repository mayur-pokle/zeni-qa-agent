import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { readConnectionSettings } from "@/lib/app-settings";

export async function sendAlertEmail(input: {
  projectName: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}) {
  const settings = await readConnectionSettings();
  const host = settings.smtpHost || env.SMTP_HOST;
  const port = Number(settings.smtpPort || env.SMTP_PORT);
  const secure = Boolean(settings.smtpSecure) || port === 465;
  const userName = settings.smtpUser || env.SMTP_USER;
  const password = (settings.smtpPassword || env.SMTP_PASS || "").replace(/\s+/g, "");
  const to = settings.alertEmail || env.DEMO_USER_EMAIL;

  if (!host || !port || !userName || !password) {
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: userName,
      pass: password
    }
  });

  await transporter.verify();

  await transporter.sendMail({
    from: settings.smtpFrom || env.SMTP_FROM || userName,
    to,
    subject: input.subject,
    text: `${input.projectName}\n\n${input.body}`,
    attachments: input.attachments ?? []
  });

  return { skipped: false };
}
