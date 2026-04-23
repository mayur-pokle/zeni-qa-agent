"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { EmptyState, SectionCard, StatCard } from "@/components/cards";
import { ProjectTable } from "@/components/project-table";
import TestAPIButton from "@/components/testapibutton";
import type { ProjectWithRelations } from "@/lib/types";

type DashboardFilters = {
  search?: string;
  monitoring: "all" | "active" | "inactive";
  issueState: "all" | "issues" | "healthy";
  sort: "lastRun" | "createdAt";
};

function buildQuery(filters: DashboardFilters) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  params.set("monitoring", filters.monitoring);
  params.set("issueState", filters.issueState);
  params.set("sort", filters.sort);

  return params.toString();
}

export function DashboardClient({ initialFilters }: { initialFilters: DashboardFilters }) {
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    startTransition(async () => {
      try {
        setError("");
        const response = await fetch(`/api/projects?${buildQuery(initialFilters)}`, {
          cache: "no-store"
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error ?? `Backend returned HTTP ${response.status}`);
        }

        if (isMounted) {
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (isMounted) {
          setProjects([]);
          setError(loadError instanceof Error ? loadError.message : "Unable to load projects");
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialFilters.issueState, initialFilters.monitoring, initialFilters.search, initialFilters.sort]);

  const healthyCount = projects.filter((project) => project.status === "HEALTHY").length;
  const issueCount = projects.filter((project) => project.status !== "HEALTHY").length;
  const avgPerformance =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + (project.performanceScore ?? 0), 0) / projects.length
        )
      : 0;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Projects" value={projects.length} helper={isPending ? "Loading..." : "Tracked on production only"} />
        <StatCard label="Healthy" value={healthyCount} helper="No critical issues detected" />
        <StatCard label="Issues" value={issueCount} helper="Warnings or downtime active" />
        <StatCard label="Avg Perf" value={`${avgPerformance}%`} helper="Last Lighthouse aligned score" />
      </section>

      <TestAPIButton />

      {error ? (
        <div className="mt-6 border border-[#f5f5f4]/20 p-4 text-sm text-[#f5f5f4]/75">
          Backend connection issue: {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <SectionCard title="Process Filters">
          <form className="grid gap-4">
            <label className="grid gap-2 text-xs uppercase tracking-[0.28em]">
              Search
              <input
                name="search"
                defaultValue={initialFilters.search ?? ""}
                className="border border-[#f5f5f4]/20 bg-transparent px-3 py-3 text-sm"
                placeholder="Name or URL"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.28em]">
              Monitoring
              <select
                name="monitoring"
                defaultValue={initialFilters.monitoring}
                className="border border-[#f5f5f4]/20 bg-[#292524] px-3 py-3 text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.28em]">
              Status
              <select
                name="issueState"
                defaultValue={initialFilters.issueState}
                className="border border-[#f5f5f4]/20 bg-[#292524] px-3 py-3 text-sm"
              >
                <option value="all">All</option>
                <option value="issues">Issues detected</option>
                <option value="healthy">Healthy</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.28em]">
              Sort
              <select
                name="sort"
                defaultValue={initialFilters.sort}
                className="border border-[#f5f5f4]/20 bg-[#292524] px-3 py-3 text-sm"
              >
                <option value="lastRun">Last tested</option>
                <option value="createdAt">Created date</option>
              </select>
            </label>
            <button
              type="submit"
              className="ui-button"
            >
              Apply Filters
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Monitoring Queue">
          {projects.length > 0 ? (
            <ProjectTable projects={projects} />
          ) : (
            <EmptyState
              title={isPending ? "Loading projects" : "No projects yet"}
              copy={
                isPending
                  ? "Connecting to the Railway backend."
                  : "Create your first production website to start uptime checks, sitemap-based QA runs, and performance tracking."
              }
            />
          )}
        </SectionCard>
      </section>
    </>
  );
}
