const nodemailer = require("nodemailer");

function stripSpaces(value) {
  return String(value || "").replace(/\s+/g, "");
}

function parseSecure(raw, port) {
  if (raw === undefined) return port === 465;
  const lowered = String(raw).toLowerCase();
  if (lowered === "true" || lowered === "1" || lowered === "yes") return true;
  if (lowered === "false" || lowered === "0" || lowered === "no") return false;
  return port === 465;
}

async function sendEmailAlert({ subject, text, attachments = [] }) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = parseSecure(process.env.SMTP_SECURE, port);
  const user = process.env.SMTP_USER;
  const pass = stripSpaces(process.env.SMTP_PASS);
  const to = process.env.ALERT_EMAIL || process.env.SMTP_USER || process.env.DEMO_USER_EMAIL;

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
    from: process.env.SMTP_FROM || user,
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
