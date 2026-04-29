"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Play, Copy, PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";

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
    }).finally(() => {
      setIsRunningQa(false);
    });
  }

  const secondaryClasses =
    "inline-flex h-10 items-center gap-2 rounded-[8px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-hover hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-60";

  const primaryClasses =
    "inline-flex h-10 items-center gap-2 rounded-[8px] bg-brand px-4 text-sm font-semibold !text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60";

  // Delete is destructive and must read as such even from a glance.
  // Solid red bg with white text and icon — same shape as the primary
  // CTA so size and rhythm stay consistent in the action row.
  const dangerClasses =
    "inline-flex h-10 items-center gap-2 rounded-[8px] bg-error px-4 text-sm font-semibold !text-white hover:bg-[#DC2626] active:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Monitoring toggle as a labeled switch */}
      <button
        type="button"
        onClick={() => runRequest(`/api/projects/${projectId}/toggle-monitoring`)}
        disabled={isPending}
        className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-line bg-surface px-4 text-sm font-semibold text-ink-2 hover:bg-hover"
        title={monitoringActive ? "Click to pause monitoring" : "Click to enable monitoring"}
      >
        <span
          className={`h-2 w-2 rounded-full ${monitoringActive ? "bg-success" : "bg-ink-3"}`}
        />
        Monitoring {monitoringActive ? "on" : "off"}
      </button>

      <button onClick={() => runQa("PRODUCTION")} disabled={isRunningQa} className={primaryClasses}>
        <Play className="h-4 w-4" />
        {isRunningQa ? "Running…" : "Run prod QA"}
      </button>

      {hasStaging ? (
        <button
          onClick={() => runQa("STAGING")}
          disabled={isRunningQa}
          className={secondaryClasses}
        >
          <Play className="h-4 w-4" />
          Run stage QA
        </button>
      ) : null}

      <button
        onClick={() => runRequest(`/api/projects/${projectId}/duplicate`)}
        disabled={isPending}
        className={secondaryClasses}
      >
        <Copy className="h-4 w-4" />
        Duplicate
      </button>

      <Link href={`/projects/${projectId}/edit`} className={secondaryClasses}>
        <PencilSimple className="h-4 w-4" />
        Edit
      </Link>

      <button
        onClick={() => {
          if (typeof window !== "undefined" && !window.confirm("Delete this project?")) return;
          runRequest(`/api/projects/${projectId}`, "DELETE");
        }}
        disabled={isPending}
        className={dangerClasses}
      >
        <Trash className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}
