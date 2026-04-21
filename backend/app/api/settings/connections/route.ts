import { NextRequest, NextResponse } from "next/server";
import { areConnectionsConfigured, readConnectionSettings, writeConnectionSettings } from "@/lib/app-settings";

export async function GET() {
  const settings = await readConnectionSettings();
  return NextResponse.json({
    settings,
    isComplete: areConnectionsConfigured(settings)
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const settings = await writeConnectionSettings({
    uptimeRobotApiKey: String(body.uptimeRobotApiKey ?? ""),
    smtpHost: String(body.smtpHost ?? "smtp.gmail.com"),
    smtpPort: String(body.smtpPort ?? "465"),
    smtpSecure: Boolean(body.smtpSecure),
    smtpUser: String(body.smtpUser ?? ""),
    smtpPassword: String(body.smtpPassword ?? ""),
    smtpFrom: String(body.smtpFrom ?? ""),
    alertEmail: String(body.alertEmail ?? "")
  });

  return NextResponse.json({
    settings,
    isComplete: areConnectionsConfigured(settings)
  });
}
