import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type QaProgress = {
  phase: string;
  percent: number;
  totalPages: number;
  completedPages: number;
  currentUrl: string;
  startedAt: string;
  // "queued": request accepted, background worker hasn't started yet.
  // "running": executeQaRun is actively making progress.
  // "completed": run finished; runId is populated.
  // "failed": background worker threw; `error` has the message.
  status: "queued" | "running" | "completed" | "failed";
  runId?: string;
  error?: string;
};

function progressDir() {
  return path.join(process.cwd(), "data", "qa-progress");
}

function progressFile(projectId: string) {
  return path.join(progressDir(), `${projectId}.json`);
}

export async function updateQaProgress(projectId: string, progress: QaProgress) {
  await mkdir(progressDir(), { recursive: true });
  await writeFile(progressFile(projectId), JSON.stringify(progress, null, 2), "utf8");
  return progress;
}

export async function getQaProgress(projectId: string): Promise<QaProgress | null> {
  try {
    const raw = await readFile(progressFile(projectId), "utf8");
    return JSON.parse(raw) as QaProgress;
  } catch {
    return null;
  }
}

export async function clearQaProgress(projectId: string) {
  await rm(progressFile(projectId), { force: true });
}
