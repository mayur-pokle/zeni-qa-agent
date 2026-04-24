import { Environment } from "@prisma/client";
import { executeQaRun } from "@/lib/qa";
import { getProject } from "@/lib/db";
import { getQaProgress, updateQaProgress } from "@/lib/progress";
import { sendAlertEmail, sendSlackAlert } from "@/lib/alerts";
import { buildQaAlert } from "@/lib/notifications";
import { buildQaRunsCsv } from "@/lib/reports";
import { slugify } from "@/lib/utils";

/**
 * Shared QA orchestration used by both:
 *   - POST /api/qa/run        (user-triggered, fire-and-forget)
 *   - POST /api/monitoring/qa-cycle (cron-triggered, awaited in loop)
 *
 * Keeping both callers on the same function ensures manual and scheduled
 * runs produce identical progress semantics, alert payloads, and failure
 * handling.
 */

/**
 * Write a "queued" progress doc so the UI sees state immediately, even
 * before `executeQaRun` has started doing real work. Every call stamps
 * a fresh `startedAt`, which also resets the staleness heartbeat.
 */
export async function seedQueuedProgress(projectId: string) {
  await updateQaProgress(projectId, {
    phase: "Queued",
    percent: 0,
    totalPages: 0,
    completedPages: 0,
    currentUrl: "",
    startedAt: new Date().toISOString(),
    status: "queued"
  });
}

export type QaOrchestrationResult =
  | { ok: true; runId: string; status: string }
  | { ok: false; error: string };

/**
 * Run a full QA scan and fan out email + Slack alerts. Alerts are
 * best-effort — a failure to notify never marks the run as failed,
 * because the run itself has already been persisted successfully by
 * the time we get here.
 *
 * Resolves to a result object rather than throwing, so cron-style
 * loops can iterate through projects without a single bad run
 * aborting the rest of the cycle.
 */
export async function executeQaWithAlerts(
  projectId: string,
  environment: Environment
): Promise<QaOrchestrationResult> {
  try {
    const run = await executeQaRun(projectId, environment);
    const project = await getProject(projectId);

    if (project && (run.status !== "PASSED" || project.notifyOnCompletion)) {
      const { subject, slackBlocks, slackFallback, emailHtml, emailText } = buildQaAlert({
        run,
        project,
        environment
      });
      const csv = buildQaRunsCsv([run]);

      // Email is awaited so we know it went out before moving on.
      await sendAlertEmail({
        projectName: project.name,
        subject,
        body: emailText,
        html: emailHtml,
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

      // Slack is fire-and-forget-with-catch — the webhook is fast but
      // we don't want a Slack outage to serialize behind it.
      sendSlackAlert({
        projectName: project.name,
        title: subject,
        body: slackFallback,
        blocks: slackBlocks
      }).catch((err) => {
        console.warn("[slack] alert failed:", err instanceof Error ? err.message : err);
      });
    }

    return { ok: true, runId: run.id, status: run.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[qa] run failed:", message);

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

    return { ok: false, error: message };
  }
}
