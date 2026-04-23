import { NextResponse } from "next/server";
import { areConnectionsConfigured, readConnectionSettings } from "@/lib/app-settings";

/**
 * Returns the connection status derived from environment variables.
 * Values are sourced from the deployment env (Railway) and are not
 * editable from the UI — the POST handler has been removed.
 */
export async function GET() {
  const settings = readConnectionSettings();
  return NextResponse.json({
    settings: redactSecrets(settings),
    isComplete: areConnectionsConfigured(settings)
  });
}

function redactSecrets(settings: ReturnType<typeof readConnectionSettings>) {
  return {
    ...settings,
    uptimeRobotApiKey: settings.uptimeRobotApiKey ? "configured" : "",
    smtpPassword: settings.smtpPassword ? "configured" : ""
  };
}
