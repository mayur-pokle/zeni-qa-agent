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
    <section className="rounded-[12px] bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-medium text-ink">QA process</h3>
          {isRunning ? (
            <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-tag-blue px-2 py-0.5 text-[12px] font-medium text-[#1D4ED8]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
              Running
            </span>
          ) : null}
        </div>
      </div>

      {!progress ? (
        <div className="rounded-[8px] bg-surface-2 px-4 py-6 text-center text-[13px] text-ink-3">
          No QA run in progress.
        </div>
      ) : (
        <div
          className={
            hasFailed
              ? "rounded-[8px] border border-error/30 bg-tag-pink/30 p-4"
              : "rounded-[8px] bg-surface-2 p-4"
          }
        >
          <div className="flex items-center justify-between gap-3 text-[12px] text-ink-2">
            <span className="font-medium">{progress.phase}</span>
            <span className="tabular-nums">{progress.percent}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hasFailed ? "bg-error" : "bg-brand"
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-3 grid gap-1 text-[13px]">
            <div className="text-ink-2">
              Pages processed:{" "}
              <span className="font-medium text-ink">
                {progress.completedPages}/{progress.totalPages}
              </span>
            </div>
            {progress.currentUrl ? (
              <div className="break-all text-[12px] text-ink-3">{progress.currentUrl}</div>
            ) : null}
          </div>
          {hasFailed && progress.error ? (
            <div className="mt-3 rounded-[6px] bg-tag-pink px-3 py-2 text-[12px] leading-relaxed text-error">
              {progress.error}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
