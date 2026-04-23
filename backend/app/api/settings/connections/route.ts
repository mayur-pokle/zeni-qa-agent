import { NextResponse } from "next/server";
import { areConnectionsConfigured, readConnectionSettings } from "@/lib/app-settings";

/**
 * Returns the connection settings sourced from environment variables.
 * The settings page uses this to pre-fill the form with the canonical
 * defaults from .env. Overrides entered into the form are ephemeral
 * (passed straight into the /test-uptime and /test-email endpoints)
 * and are never persisted server-side.
 */
export async function GET() {
  const settings = readConnectionSettings();
  return NextResponse.json({
    settings,
    isComplete: areConnectionsConfigured(settings)
  });
}
