import { env } from "@/lib/env";

export type ConnectionSettings = {
  uptimeRobotApiKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  alertEmail: string;
};

function normalizePassword(value: string | undefined) {
  return String(value ?? "").replace(/\s+/g, "");
}

function parseSecure(raw: string | undefined, port: number) {
  if (raw === undefined) {
    return port === 465;
  }
  const lowered = raw.toLowerCase();
  if (lowered === "true" || lowered === "1" || lowered === "yes") return true;
  if (lowered === "false" || lowered === "0" || lowered === "no") return false;
  return port === 465;
}

/**
 * Read all connection settings from environment variables.
 * The app no longer reads or writes these to the database —
 * they are now fully managed by the deployment environment
 * (Railway for the backend, local .env for development).
 */
export function readConnectionSettings(): ConnectionSettings {
  const smtpPort = Number(env.SMTP_PORT || "465") || 465;
  const smtpUser = (env.SMTP_USER ?? "").trim();

  return {
    uptimeRobotApiKey: (env.UPTIMEROBOT_API_KEY ?? "").trim(),
    smtpHost: (env.SMTP_HOST ?? "smtp.gmail.com").trim(),
    smtpPort: String(smtpPort),
    smtpSecure: parseSecure(env.SMTP_SECURE, smtpPort),
    smtpUser,
    smtpPassword: normalizePassword(env.SMTP_PASS),
    smtpFrom: (env.SMTP_FROM ?? "").trim(),
    alertEmail: (env.ALERT_EMAIL ?? smtpUser ?? env.DEMO_USER_EMAIL ?? "").trim()
  };
}

export function areConnectionsConfigured(settings: ConnectionSettings) {
  return Boolean(
    settings.uptimeRobotApiKey &&
      settings.smtpHost &&
      settings.smtpPort &&
      settings.smtpUser &&
      settings.smtpPassword &&
      settings.alertEmail
  );
}
