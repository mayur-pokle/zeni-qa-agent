import nodemailer from "nodemailer";
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
  const settings = readConnectionSettings();
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
    }
  });

  await transporter.verify();

  await transporter.sendMail({
    from: settings.smtpFrom || settings.smtpUser,
    to: settings.alertEmail,
    subject: input.subject,
    text: `${input.projectName}\n\n${input.body}`,
    attachments: input.attachments ?? []
  });

  return { skipped: false };
}
