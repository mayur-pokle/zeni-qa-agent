import { NextRequest, NextResponse } from "next/server";
import { Environment } from "@prisma/client";
import { executeQaRun } from "@/lib/qa";
import { qaRunSchema } from "@/lib/validators";
import { sendAlertEmail, sendSlackAlert } from "@/lib/alerts";
import { getProject } from "@/lib/db";
import { buildQaRunsCsv } from "@/lib/reports";
import { slugify } from "@/lib/utils";
import { getQaProgress, updateQaProgress } from "@/lib/progress";

// Railway's per-request timeout (~100s) isn't enough for QA runs that scan
// hundreds of pages across three browsers, so this route kicks the work into
// a detached promise and returns 202 immediately. Progress is persisted to
// disk by `executeQaRun`, and the frontend already polls `/api/qa/progress`.
//
// The background task cannot be awaited by Next.js's request lifecycle, but
// the Node process is long-lived on Railway so the promise will finish as
// long as the container doesn't restart. If it does restart mid-run, the
// stale-progress check below lets a subsequent click start fresh.

const STALE_PROGRESS_MS = 30 * 60 * 1000; // 30 minutes

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
      const startedAt = Date.parse(existing.startedAt);
      const isStale =
        Number.isFinite(startedAt) && Date.now() - startedAt > STALE_PROGRESS_MS;
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
    await updateQaProgress(payload.projectId, {
      phase: "Queued",
      percent: 0,
      totalPages: 0,
      completedPages: 0,
      currentUrl: "",
      startedAt: new Date().toISOString(),
      status: "queued"
    });

    // Fire-and-forget. The floating promise is intentional — errors are
    // funneled into the progress doc so the UI can surface them.
    void runQaInBackground(payload.projectId, environment);

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

/**
 * Execute the QA run outside the HTTP request lifecycle. Notifications
 * (email + Slack) are best-effort and never cause the run to be marked
 * failed; the run itself has already succeeded by the time we get there.
 */
async function runQaInBackground(projectId: string, environment: Environment) {
  try {
    const run = await executeQaRun(projectId, environment);
    const project = await getProject(projectId);

    if (project && (run.status !== "PASSED" || project.notifyOnCompletion)) {
      const csv = buildQaRunsCsv([run]);
      const subject =
        run.status !== "PASSED"
          ? `[QA Alert] ${project.name} ${environment} ${run.status}`
          : `[QA Report] ${project.name} ${environment} completed`;
      const body = [
        `QA run finished with status ${run.status}.`,
        `Performance score: ${run.performanceScore ?? "N/A"}.`,
        `SEO score: ${run.seoScore ?? "N/A"}.`,
        `Accessibility score: ${run.accessibility ?? "N/A"}.`,
        project.notifyOnCompletion ? "CSV report attached." : ""
      ]
        .filter(Boolean)
        .join(" ");

      await sendAlertEmail({
        projectName: project.name,
        subject,
        body,
        attachments: project.notifyOnCompletion
          ? [
              {
                filename: `${slugify(project.name)}-${String(environment).toLowerCase()}-qa-report.csv`,
                content: csv
              }
            ]
          : []
      }).catch((err) => {
        console.warn("[email] alert failed:", err instanceof Error ? err.message : err);
      });

      // Fan out to Slack in parallel; never fail the run on Slack errors.
      sendSlackAlert({
        projectName: project.name,
        title: subject,
        body
      }).catch((err) => {
        console.warn("[slack] alert failed:", err instanceof Error ? err.message : err);
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[qa] background run failed:", message);

    // Preserve whatever progress we had so the user sees how far it got
    // before failing, then overlay the failure status.
    const current = await getQaProgress(projectId).catch(() => null);
    await updateQaProgress(projectId, {
      phase: `Failed: ${message.slice(0, 120)}`,
      percent: current?.percent ?? 0,
      totalPages: current?.totalPages ?? 0,
      completedPages: current?.completedPages ?? 0,
      currentUrl: current?.currentUrl ?? "",
      startedAt: current?.startedAt ?? new Date().toISOString(),
      status: "failed",
      error: message
    }).catch((err) => {
      console.error("[qa] failed to persist failure state:", err);
    });
  }
}
