const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function readSettings() {
  const email = process.env.DEMO_USER_EMAIL || "owner@example.com";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email }
  });

  const settings = await prisma.alertSettings.findUnique({
    where: { userId: user.id }
  });

  if (!settings) {
    return {};
  }

  return {
    uptimeRobotApiKey: settings.uptimeRobotApiKey || "",
    smtpHost: settings.smtpHost || "",
    smtpPort: String(settings.smtpPort || 465),
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser || "",
    smtpPassword: settings.smtpPassword || "",
    smtpFrom: settings.smtpFrom || "",
    alertEmail: settings.alertEmail || ""
  };
}

async function sendEmailAlert({ subject, text, attachments = [] }) {
  const settings = await readSettings();
  const host = settings.smtpHost || process.env.SMTP_HOST;
  const port = Number(settings.smtpPort || process.env.SMTP_PORT || 465);
  const secure = Boolean(settings.smtpSecure) || port === 465;
  const user = settings.smtpUser || process.env.SMTP_USER;
  const pass = String(settings.smtpPassword || process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const to = settings.alertEmail || process.env.DEMO_USER_EMAIL;

  if (!host || !user || !pass || !to) {
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  await transporter.verify();

  await transporter.sendMail({
    from: settings.smtpFrom || process.env.SMTP_FROM || user,
    to,
    subject,
    text,
    attachments
  });

  return { skipped: false };
}

module.exports = {
  sendEmailAlert
};
