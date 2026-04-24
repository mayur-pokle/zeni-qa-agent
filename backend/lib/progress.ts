import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type QaProgress = {
  phase: string;
  percent: number;
  totalPages: number;
  completedPages: number;
  currentUrl: string;
  startedAt: string;
  // Wall-clock time of the last write to this file. Used to detect a
  // dead worker (e.g. container restarted mid-run) so the UI doesn't
  // spin forever on a "running" status that will never advance.
  updatedAt: string;
  // "queued": request accepted, background worker hasn't started yet.
  // "running": executeQaRun is actively making progress.
  // "completed": run finished; runId is populated.
  // "failed": background worker threw; `error` has the message.
  status: "queued" | "running" | "completed" | "failed";
  runId?: string;
  error?: string;
};

// If the progress file hasn't been touched for this long while its status
// is still "running" or "queued", we consider the worker dead (almost
// always a Railway container restart). 3 minutes is loose enough to
// absorb slow pages — the per-page goto timeout is 45s — without leaving
// the UI hanging indefinitely.
export const STALE_PROGRESS_THRESHOLD_MS = 3 * 60 * 1000;

function progressDir() {
  return path.join(process.cwd(), "data", "qa-progress");
}

function progressFile(projectId: string) {
  return path.join(progressDir(), `${projectId}.json`);
}

export async function updateQaProgress(
  projectId: string,
  progress: Omit<QaProgress, "updatedAt"> & { updatedAt?: string }
) {
  await mkdir(progressDir(), { recursive: true });
  // Stamp every write with the current time so readers can tell when the
  // worker last made forward progress. Callers don't need to thread
  // updatedAt through by hand.
  const stamped: QaProgress = {
    ...progress,
    updatedAt: new Date().toISOString()
  };
  await writeFile(progressFile(projectId), JSON.stringify(stamped, null, 2), "utf8");
  return stamped;
}

/**
 * Returns the current progress, translating a stale "running"/"queued"
 * state into a terminal "failed" state so the UI unsticks itself within
 * STALE_PROGRESS_THRESHOLD_MS of the worker dying. This never rewrites
 * the file — we only patch the returned object — so a worker that
 * resumes after a long pause can still transition it to "completed".
 */
export async function getQaProgress(projectId: string): Promise<QaProgress | null> {
  try {
    const raw = await readFile(progressFile(projectId), "utf8");
    const parsed = JSON.parse(raw) as QaProgress;

    const isActive = parsed.status === "running" || parsed.status === "queued";
    if (!isActive) return parsed;

    // Fall back to startedAt for older progress files that were written
    // before updatedAt was introduced.
    const lastTouch = Date.parse(parsed.updatedAt ?? parsed.startedAt);
    if (!Number.isFinite(lastTouch)) return parsed;

    if (Date.now() - lastTouch > STALE_PROGRESS_THRESHOLD_MS) {
      return {
        ...parsed,
        status: "failed",
        phase: "Failed: worker stopped responding (likely container restart)",
        error:
          parsed.error ??
          "Background QA run stopped updating — the Railway container most likely restarted mid-run. Click Run QA to retry."
      };
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function clearQaProgress(projectId: string) {
  await rm(progressFile(projectId), { force: true });
}
