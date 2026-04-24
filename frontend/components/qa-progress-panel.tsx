"use client";

import { useEffect, useState } from "react";

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

export function QaProgressPanel({ projectId }: { projectId: string }) {
  const [progress, setProgress] = useState<QaProgress>(null);

  useEffect(() => {
    let isMounted = true;

    async function poll() {
      const response = await fetch(`/api/qa/progress?projectId=${projectId}`, {
        cache: "no-store"
      });
      const data = await response.json().catch(() => null);
      if (isMounted) {
        setProgress(data?.progress ?? null);
      }
    }

    void poll();
    const interval = window.setInterval(poll, 2000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [projectId]);

  if (!progress) {
    return (
      <div className="border border-[#f5f5f4]/10 p-4 text-sm text-[#f5f5f4]/70">
        No QA process is running right now.
      </div>
    );
  }

  return (
    <div className="border border-[#f5f5f4]/10 p-4">
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.28em] text-[#f5f5f4]/60">
        <span>{progress.phase}</span>
        <span>{progress.percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden border border-[#f5f5f4]/20">
        <div className="h-full bg-[#f5f5f4]/60 transition-all duration-500" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="mt-3 grid gap-1 text-sm text-[#f5f5f4]/78">
        <div>
          Pages processed: {progress.completedPages}/{progress.totalPages}
        </div>
        <div className="break-all text-xs text-[#f5f5f4]/58">{progress.currentUrl}</div>
      </div>
    </div>
  );
}
