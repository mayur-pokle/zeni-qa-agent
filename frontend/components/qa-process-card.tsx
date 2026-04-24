"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type QaProgress = {
  phase: string;
  percent: number;
  totalPages: number;
  completedPages: number;
  currentUrl: string;
  startedAt: string;
  status: "queued" | "running" | "completed" | "failed";
  runId?: string;
  error?: string;
} | null;

export function QaProcessCard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState<QaProgress>(null);
  const lastStableProgress = useRef<QaProgress>(null);
  const lastCompletedRunId = useRef<string | null>(null);

  function isSameProgress(a: QaProgress, b: QaProgress) {
    return (
      a?.phase === b?.phase &&
      a?.percent === b?.percent &&
      a?.totalPages === b?.totalPages &&
      a?.completedPages === b?.completedPages &&
      a?.currentUrl === b?.currentUrl &&
      a?.status === b?.status &&
      a?.runId === b?.runId
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function poll() {
      try {
        const response = await fetch(`/api/qa/progress?projectId=${projectId}`, {
          cache: "no-store"
        });
        const data = await response.json().catch(() => null);
        const nextProgress = data?.progress ?? null;

        if (nextProgress) {
          lastStableProgress.current = nextProgress;
        }

        if (isMounted) {
          const resolvedProgress = nextProgress ?? lastStableProgress.current;
          setProgress((current) => (isSameProgress(current, resolvedProgress) ? current : resolvedProgress));
        }

        if (
          nextProgress?.status === "completed" &&
          nextProgress.runId &&
          lastCompletedRunId.current !== nextProgress.runId
        ) {
          lastCompletedRunId.current = nextProgress.runId;
          router.refresh();
        }
      } catch {
        if (isMounted) {
          setProgress((current) => (isSameProgress(current, lastStableProgress.current) ? current : lastStableProgress.current));
        }
      }
    }

    void poll();
    const interval = window.setInterval(poll, 2000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [projectId, router]);

  const isRunning = progress?.status === "running" || progress?.status === "queued";
  const hasFailed = progress?.status === "failed";

  return (
    <section className="border border-[#f5f5f4]/20 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm tracking-[0.01em]">QA Process</h2>
          {isRunning ? <span className="pixel-running-indicator" aria-label="QA running" /> : null}
        </div>
      </div>

      {!progress ? (
        <div className="border border-[#f5f5f4]/10 p-4 text-sm text-[#f5f5f4]/70">
          No QA process is running right now.
        </div>
      ) : (
        <div
          className={`border p-4 ${
            hasFailed ? "border-[#fca5a5]/40" : "border-[#f5f5f4]/10"
          }`}
        >
          <div className="flex items-center justify-between gap-3 text-xs text-[#f5f5f4]/60">
            <span>{progress.phase}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden border border-[#f5f5f4]/20">
            <div
              className={`h-full transition-all duration-500 ${
                hasFailed ? "bg-[#fca5a5]/70" : "bg-[#f5f5f4]/60"
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-3 grid gap-1 text-sm text-[#f5f5f4]/78">
            <div>
              Pages processed: {progress.completedPages}/{progress.totalPages}
            </div>
            <div className="break-all text-xs text-[#f5f5f4]/58">{progress.currentUrl}</div>
          </div>
          {hasFailed && progress.error ? (
            <div className="mt-3 border border-[#fca5a5]/30 p-3 text-xs leading-5 text-[#fecaca]">
              {progress.error}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
