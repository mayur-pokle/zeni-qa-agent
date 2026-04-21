import { NextRequest, NextResponse } from "next/server";
import { runMonitoringPoll } from "@/lib/monitoring";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-monitor-secret");

  if (secret !== env.MONITOR_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMonitoringPoll();
  return NextResponse.json({ ok: true, count: result.length });
}
