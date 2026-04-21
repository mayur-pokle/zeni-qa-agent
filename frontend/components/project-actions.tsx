"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ProjectActions({
  projectId,
  monitoringActive,
  hasStaging
}: {
  projectId: string;
  monitoringActive: boolean;
  hasStaging: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRunningQa, setIsRunningQa] = useState(false);

  async function runRequest(url: string, method = "POST", body?: unknown) {
    startTransition(async () => {
      await fetch(url, {
        method,
        headers: body
          ? {
              "content-type": "application/json"
            }
          : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      router.refresh();
    });
  }

  async function runQa(environment: "STAGING" | "PRODUCTION") {
    setIsRunningQa(true);
    fetch("/api/qa/run", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        projectId,
        environment
      })
    })
      .finally(() => {
        setIsRunningQa(false);
      });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-3 border border-[#f5f5f4]/20 px-4 py-2">
        <span className="text-xs uppercase tracking-[0.28em] text-[#f5f5f4]/65">Constant Monitoring</span>
        <button
          onClick={() => runRequest(`/api/projects/${projectId}/toggle-monitoring`)}
          disabled={isPending}
          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.28em] ${
            monitoringActive
              ? "border-[#f5f5f4]/70 bg-[#f5f5f4]/12"
              : "border-[#f5f5f4]/20 bg-transparent"
          }`}
        >
          {monitoringActive ? "On" : "Off"}
        </button>
      </div>
      <button
        onClick={() => runQa("PRODUCTION")}
        disabled={isRunningQa}
        className="ui-button"
      >
        {isRunningQa ? "QA Running..." : "Run Prod QA"}
      </button>
      {hasStaging ? (
        <button
          onClick={() => runQa("STAGING")}
          disabled={isRunningQa}
          className="ui-button"
        >
          {isRunningQa ? "QA Running..." : "Run Stage QA"}
        </button>
      ) : null}
      <button
        onClick={() => runRequest(`/api/projects/${projectId}/duplicate`)}
        disabled={isPending}
        className="ui-button"
      >
        Duplicate
      </button>
      <Link
        href={`/projects/${projectId}/edit`}
        className="ui-button"
      >
        Edit
      </Link>
      <button
        onClick={() => runRequest(`/api/projects/${projectId}`, "DELETE")}
        disabled={isPending}
        className="ui-button"
      >
        Delete
      </button>
    </div>
  );
}
