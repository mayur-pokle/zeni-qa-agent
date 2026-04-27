import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clearFormSubmissionGate } from "@/lib/form-submission-tracker";

/**
 * Force-clears the HubSpot form-submission gate for a project so the
 * next QA run will deep-submit immediately. Useful for verifying the
 * submission flow without waiting for the natural gate window.
 *
 * Auth: same `x-monitor-secret` header used by the cron endpoint, so
 * the same env var doubles as an admin token.
 *
 *   curl -X POST \
 *     -H "x-monitor-secret: $MONITOR_CRON_SECRET" \
 *     "$APP_URL/api/qa/clear-form-gate/<projectId>"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const secret = request.headers.get("x-monitor-secret");
  if (secret !== env.MONITOR_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const cleared = await clearFormSubmissionGate(projectId);

  return NextResponse.json({
    projectId,
    clearedRows: cleared,
    message:
      cleared > 0
        ? `Cleared ${cleared} submission log entr${cleared === 1 ? "y" : "ies"}; the next QA run will deep-submit.`
        : "No prior submission log entries to clear; the next QA run will already deep-submit."
  });
}
