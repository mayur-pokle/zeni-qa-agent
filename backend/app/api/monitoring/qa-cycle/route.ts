import { NextRequest, NextResponse } from "next/server";
import { Environment } from "@prisma/client";
import { env } from "@/lib/env";
import { listProjects, getProject } from "@/lib/db";
import { getQaProgress } from "@/lib/progress";
import { executeQaWithAlerts, seedQueuedProgress } from "@/lib/qa-orchestrator";

/**
 * Cron-driven QA cycle.
 *
 * Intended to be invoked by an external scheduler (Railway Cron, a
 * cron-job.org hook, GitHub Actions, etc.) every few minutes, e.g.:
 *
 *   curl -X POST \
 *     -H "x-monitor-secret: $MONITOR_CRON_SECRET" \
 *     "$APP_URL/api/monitoring/qa-cycle"
 *
 * For each active project, checks whether it's due relative to its
 * `monitoringIntervalMinutes`. Due projects are queued into a single
 * serialized background pipeline so we never run two Playwright
 * sessions concurrently on the same container (the main backend is
 * memory-bound and already rotates tabs aggressively).
 *
 * Returns immediately with a summary of what was queued vs skipped;
 * the actual runs happen in a detached promise that keeps writing
 * progress files and eventually fires Slack/email alerts.
 */

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-monitor-secret");
  if (secret !== env.MONITOR_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await listProjects({
    monitoring: "active",
    sort: "lastRun"
  });

  const now = Date.now();
  const due: string[] = [];
  const skipped: Array<{ projectId: string; reason: string }> = [];

  for (const project of projects) {
    const lastRunAt = project.lastRunAt ? new Date(project.lastRunAt).getTime() : 0;
    const intervalMs = (project.monitoringIntervalMinutes ?? 360) * 60 * 1000;

    // Never-run projects always qualify; otherwise require the full
    // interval to have elapsed since the last run.
    if (lastRunAt && now - lastRunAt < intervalMs) {
      skipped.push({ projectId: project.id, reason: "not-due" });
      continue;
    }

    // Defer to the existing progress state as the source of truth for
    // "is a run already in flight?" getQaProgress already translates a
    // stale heartbeat into "failed", so anything still reported as
    // queued/running here is genuinely active.
    const existing = await getQaProgress(project.id);
    if (existing && (existing.status === "queued" || existing.status === "running")) {
      skipped.push({ projectId: project.id, reason: "already-running" });
      continue;
    }

    due.push(project.id);
  }

  if (due.length > 0) {
    // Serialize all due runs behind a single background promise so we
    // never double up Playwright sessions. The HTTP request returns
    // without waiting — the scheduler just needs to know its trigger
    // was accepted.
    void processDueProjects(due);
  }

  return NextResponse.json({
    checkedAt: new Date(now).toISOString(),
    totalActive: projects.length,
    queued: due,
    skipped
  });
}

/**
 * Walk the due list sequentially. Each project runs staging (if
 * configured) then production; on to the next project only after both
 * envs finish. Any single project throwing is caught so the rest of
 * the cycle still proceeds.
 */
async function processDueProjects(projectIds: string[]) {
  for (const projectId of projectIds) {
    try {
      // Re-check progress at the top of each iteration. Another cron
      // tick (fired while we were still chewing through earlier
      // projects) may have already started this one.
      const current = await getQaProgress(projectId);
      if (current && (current.status === "queued" || current.status === "running")) {
        continue;
      }

      const project = await getProject(projectId);
      if (!project) continue;

      const envs: Environment[] = project.stagingUrl
        ? [Environment.STAGING, Environment.PRODUCTION]
        : [Environment.PRODUCTION];

      for (const environment of envs) {
        // Seed per-env so the UI transitions from "queued" → "running"
        // cleanly between staging and production legs.
        await seedQueuedProgress(projectId);
        await executeQaWithAlerts(projectId, environment);
      }
    } catch (error) {
      console.error(
        `[qa-cycle] project ${projectId} failed outside executeQaWithAlerts:`,
        error
      );
    }
  }
}
