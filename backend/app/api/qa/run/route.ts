import { NextRequest, NextResponse } from "next/server";
import { Environment } from "@prisma/client";
import { qaRunSchema } from "@/lib/validators";
import { executeQaWithAlerts, seedQueuedProgress } from "@/lib/qa-orchestrator";
import { getQaProgress, STALE_PROGRESS_THRESHOLD_MS } from "@/lib/progress";

// Railway's per-request timeout (~100s) isn't enough for QA runs that scan
// hundreds of pages across three browsers, so this route kicks the work into
// a detached promise and returns 202 immediately. Progress is persisted to
// disk by `executeQaRun`, and the frontend already polls `/api/qa/progress`.
//
// The background task cannot be awaited by Next.js's request lifecycle, but
// the Node process is long-lived on Railway so the promise will finish as
// long as the container doesn't restart. If it does restart mid-run, the
// stale-progress check below lets a subsequent click start fresh.

// Note: getQaProgress() already translates a stale "running"/"queued"
// state into "failed" using STALE_PROGRESS_THRESHOLD_MS (3 min), so the
// branch below will never see a stale active status in practice. The
// explicit check here remains as a belt-and-suspenders guard in case a
// future change skips getQaProgress's translation.

export async function POST(request: NextRequest) {
  try {
    const searchProjectId = request.nextUrl.searchParams.get("projectId");
    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : {};

    const payload = qaRunSchema.parse({
      projectId: body.projectId ?? searchProjectId,
      environment:
        body.environment ?? request.nextUrl.searchParams.get("environment") ?? "PRODUCTION"
    });

    const environment = (payload.environment ?? "PRODUCTION") as Environment;

    // Guard against double-submits: if a run is already active for this
    // project, don't start another one. We treat progress older than
    // STALE_PROGRESS_MS as abandoned (e.g. the container restarted mid-run).
    const existing = await getQaProgress(payload.projectId);
    if (existing && (existing.status === "queued" || existing.status === "running")) {
      const lastTouch = Date.parse(existing.updatedAt ?? existing.startedAt);
      const isStale =
        Number.isFinite(lastTouch) &&
        Date.now() - lastTouch > STALE_PROGRESS_THRESHOLD_MS;
      if (!isStale) {
        return NextResponse.json(
          {
            error: "A QA run is already in progress for this project.",
            progress: existing
          },
          { status: 409 }
        );
      }
    }

    // Seed progress as "queued" so subsequent polls see state immediately,
    // even before `executeQaRun` has done any work.
    await seedQueuedProgress(payload.projectId);

    // Fire-and-forget. The floating promise is intentional — errors are
    // funneled into the progress doc so the UI can surface them.
    void executeQaWithAlerts(payload.projectId, environment);

    return NextResponse.json(
      {
        queued: true,
        projectId: payload.projectId,
        environment
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to queue QA run" },
      { status: 400 }
    );
  }
}

