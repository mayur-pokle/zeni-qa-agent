import { NextResponse } from "next/server";
import { readConnectionSettings } from "@/lib/app-settings";

export async function POST() {
  const { uptimeRobotApiKey } = readConnectionSettings();

  if (!uptimeRobotApiKey) {
    return NextResponse.json(
      { error: "UPTIMEROBOT_API_KEY is not set in the backend environment." },
      { status: 400 }
    );
  }

  const response = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      api_key: uptimeRobotApiKey,
      format: "json"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ error: `UptimeRobot returned HTTP ${response.status}` }, { status: 400 });
  }

  const payload = await response.json().catch(() => null);
  if (payload?.stat !== "ok") {
    return NextResponse.json(
      { error: `UptimeRobot rejected the API key: ${payload?.error?.message ?? "unknown error"}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: "UptimeRobot connection succeeded." });
}
