import { prisma } from "@/lib/prisma";

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

function normalizeValue(value: unknown) {
  return String(value ?? "").trim();
}

function normalizePassword(value: unknown) {
  return String(value ?? "").replace(/\s+/g, "");
}

const defaultSettings: ConnectionSettings = {
  uptimeRobotApiKey: "",
  smtpHost: "smtp.gmail.com",
  smtpPort: "465",
  smtpSecure: true,
  smtpUser: "",
  smtpPassword: "",
  smtpFrom: "",
  alertEmail: ""
};

async function getOrCreateSettingsUser() {
  const email = process.env.DEMO_USER_EMAIL ?? "owner@example.com";

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email }
  });
}

export async function readConnectionSettings(): Promise<ConnectionSettings> {
  const user = await getOrCreateSettingsUser();
  const settings = await prisma.alertSettings.findUnique({
    where: { userId: user.id }
  });

  if (!settings) {
    return defaultSettings;
  }

  return {
    uptimeRobotApiKey: settings.uptimeRobotApiKey ?? "",
    smtpHost: settings.smtpHost,
    smtpPort: String(settings.smtpPort),
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    smtpPassword: settings.smtpPassword,
    smtpFrom: settings.smtpFrom ?? "",
    alertEmail: settings.alertEmail
  };
}

export async function writeConnectionSettings(settings: ConnectionSettings) {
  const normalizedSettings: ConnectionSettings = {
    uptimeRobotApiKey: normalizeValue(settings.uptimeRobotApiKey),
    smtpHost: normalizeValue(settings.smtpHost) || defaultSettings.smtpHost,
    smtpPort: normalizeValue(settings.smtpPort) || defaultSettings.smtpPort,
    smtpSecure: Boolean(settings.smtpSecure),
    smtpUser: normalizeValue(settings.smtpUser),
    smtpPassword: normalizePassword(settings.smtpPassword),
    smtpFrom: normalizeValue(settings.smtpFrom),
    alertEmail: normalizeValue(settings.alertEmail)
  };

  const user = await getOrCreateSettingsUser();

  await prisma.alertSettings.upsert({
    where: { userId: user.id },
    update: {
      uptimeRobotApiKey: normalizedSettings.uptimeRobotApiKey,
      alertEmail: normalizedSettings.alertEmail,
      smtpHost: normalizedSettings.smtpHost,
      smtpPort: Number(normalizedSettings.smtpPort || 465),
      smtpSecure: normalizedSettings.smtpSecure,
      smtpUser: normalizedSettings.smtpUser,
      smtpPassword: normalizedSettings.smtpPassword,
      smtpFrom: normalizedSettings.smtpFrom || null
    },
    create: {
      userId: user.id,
      uptimeRobotApiKey: normalizedSettings.uptimeRobotApiKey,
      alertEmail: normalizedSettings.alertEmail,
      smtpHost: normalizedSettings.smtpHost,
      smtpPort: Number(normalizedSettings.smtpPort || 465),
      smtpSecure: normalizedSettings.smtpSecure,
      smtpUser: normalizedSettings.smtpUser,
      smtpPassword: normalizedSettings.smtpPassword,
      smtpFrom: normalizedSettings.smtpFrom || null
    }
  });

  return normalizedSettings;
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
