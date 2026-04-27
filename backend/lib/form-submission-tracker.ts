import { Environment } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Daily-gate state for HubSpot form submissions.
 *
 * The model exists in `prisma/schema.prisma` as `FormSubmissionLog`.
 * `prisma generate` produces the typed client during the backend's
 * postinstall step on Railway, but the local sandbox can't reach
 * binaries.prisma.sh, so we narrow the cast here. At runtime in
 * production the cast resolves to the proper typed delegate.
 */

type FormSubmissionRow = {
  id: string;
  projectId: string;
  pageUrl: string;
  environment: Environment;
  status: string;
  detail: string | null;
  submittedAt: Date;
};

type FormSubmissionDelegate = {
  findFirst(args: {
    where: { projectId: string; submittedAt?: { gte: Date } };
    orderBy?: { submittedAt: "desc" | "asc" };
  }): Promise<FormSubmissionRow | null>;
  create(args: {
    data: {
      projectId: string;
      pageUrl: string;
      environment: Environment;
      status: string;
      detail?: string | null;
    };
  }): Promise<FormSubmissionRow>;
  deleteMany(args: {
    where: { projectId: string };
  }): Promise<{ count: number }>;
};

function delegate(): FormSubmissionDelegate {
  return (prisma as unknown as { formSubmissionLog: FormSubmissionDelegate })
    .formSubmissionLog;
}

// Floor on the gate window. Even on a tight monitoring interval we want
// at least a 15-minute cushion so a single QA run can't double-submit
// because two cron ticks raced.
const MIN_GATE_WINDOW_MS = 15 * 60 * 1000;
// Buffer subtracted from the configured monitoring interval to compute
// the gate window. Picking < interval guarantees the gate has cleared
// by the time the next scheduled scan starts.
const GATE_BUFFER_MS = 5 * 60 * 1000;

function gateWindowMs(intervalMinutes: number | null | undefined) {
  const intervalMs = (intervalMinutes && intervalMinutes > 0 ? intervalMinutes : 720) * 60 * 1000;
  return Math.max(MIN_GATE_WINDOW_MS, intervalMs - GATE_BUFFER_MS);
}

/**
 * Returns true if no form submission has been recorded for this project
 * within the gate window. The gate window auto-sizes to the project's
 * monitoring interval (interval minus a 5-minute buffer), so every
 * scheduled scan gets a fresh deep-submit while back-to-back manual
 * triggers within the same scan window are still blocked.
 */
export async function shouldDeepTestForm(
  projectId: string,
  intervalMinutes?: number | null
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - gateWindowMs(intervalMinutes));
    const recent = await delegate().findFirst({
      where: { projectId, submittedAt: { gte: cutoff } },
      orderBy: { submittedAt: "desc" }
    });
    return recent === null;
  } catch (err) {
    // If the table genuinely doesn't exist yet (e.g., the deploy that
    // adds the model hasn't run db:push), default to "skip the deep
    // test" so we never accidentally pollute HubSpot before the gate
    // is in place.
    console.warn(
      "[form-tracker] shouldDeepTestForm failed, skipping deep test:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

export async function recordFormSubmission(input: {
  projectId: string;
  pageUrl: string;
  environment: Environment;
  status: string;
  detail?: string;
}) {
  try {
    await delegate().create({
      data: {
        projectId: input.projectId,
        pageUrl: input.pageUrl,
        environment: input.environment,
        status: input.status,
        detail: input.detail ?? null
      }
    });
  } catch (err) {
    console.warn(
      "[form-tracker] recordFormSubmission failed:",
      err instanceof Error ? err.message : err
    );
  }
}

export async function getLastSubmission(projectId: string) {
  try {
    return await delegate().findFirst({
      where: { projectId },
      orderBy: { submittedAt: "desc" }
    });
  } catch {
    return null;
  }
}

/**
 * Wipes every FormSubmissionLog row for this project. Used by the
 * /api/qa/clear-form-gate admin endpoint to force the next QA run to
 * deep-submit without waiting for the natural gate window to clear.
 */
export async function clearFormSubmissionGate(projectId: string): Promise<number> {
  try {
    const { count } = await delegate().deleteMany({ where: { projectId } });
    return count;
  } catch (err) {
    console.warn(
      "[form-tracker] clearFormSubmissionGate failed:",
      err instanceof Error ? err.message : err
    );
    return 0;
  }
}
