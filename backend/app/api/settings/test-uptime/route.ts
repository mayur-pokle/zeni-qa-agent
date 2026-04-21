import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.uptimeRobotApiKey) {
    return NextResponse.json({ error: "Enter an UptimeRobot API key first." }, { status: 400 });
  }

  const response = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      api_key: String(body.uptimeRobotApiKey),
      format: "json"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ error: `UptimeRobot returned HTTP ${response.status}` }, { status: 400 });
  }

  return NextResponse.json({ message: "UptimeRobot connection succeeded." });
}
