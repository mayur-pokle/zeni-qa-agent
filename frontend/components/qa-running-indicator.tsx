"use client";

import { useEffect, useState } from "react";

export function QaRunningIndicator({ projectId }: { projectId: string }) {
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function poll() {
      const response = await fetch(`/api/qa/progress?projectId=${projectId}`, {
        cache: "no-store"
      });
      const data = await response.json().catch(() => null);

      if (isMounted) {
        const status = data?.progress?.status;
        setIsRunning(status === "running" || status === "queued");
      }
    }

    void poll();
    const interval = window.setInterval(poll, 2000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [projectId]);

  if (!isRunning) {
    return null;
  }

  return <span className="pixel-running-indicator" aria-label="QA running" />;
}
