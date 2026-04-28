"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Search, FolderOpen, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { PageChrome } from "@/components/ui/page-chrome";
import { Card, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Pill, statusTone } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { FilterTabs, type FilterTab } from "@/components/ui/filter-tabs";
import { Input, Select } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { ProjectWithRelations } from "@/lib/types";

type DashboardFilters = {
  search?: string;
  monitoring: "all" | "active" | "inactive";
  issueState: "all" | "issues" | "healthy";
  sort: "lastRun" | "createdAt";
};

function buildQuery(filters: DashboardFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  params.set("monitoring", filters.monitoring);
  params.set("issueState", filters.issueState);
  params.set("sort", filters.sort);
  return params.toString();
}

export function DashboardClient({ initialFilters }: { initialFilters: DashboardFilters }) {
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [sort, setSort] = useState(initialFilters.sort);
  const [monitoring, setMonitoring] = useState(initialFilters.monitoring);

  useEffect(() => {
    let isMounted = true;
    const filters: DashboardFilters = {
      search: search || undefined,
      monitoring,
      issueState: "all",
      sort
    };

    startTransition(async () => {
      try {
        setError("");
        const response = await fetch(`/api/projects?${buildQuery(filters)}`, {
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
  }, [search, monitoring, sort]);

  const counts = useMemo(() => {
    const healthy = projects.filter((p) => p.status === "HEALTHY").length;
    const warning = projects.filter((p) => p.status === "WARNING").length;
    const down = projects.filter((p) => p.status === "DOWN").length;
    return { all: projects.length, healthy, warning, down, needsAttention: warning + down };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === "all") return projects;
    if (statusFilter === "healthy") return projects.filter((p) => p.status === "HEALTHY");
    if (statusFilter === "needsAttention") return projects.filter((p) => p.status === "WARNING" || p.status === "DOWN");
    if (statusFilter === "down") return projects.filter((p) => p.status === "DOWN");
    return projects;
  }, [projects, statusFilter]);

  const tabs: FilterTab[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "healthy", label: "Healthy", count: counts.healthy },
    { value: "needsAttention", label: "Needs attention", count: counts.needsAttention },
    { value: "down", label: "Down", count: counts.down }
  ];

  return (
    <PageChrome
      title="Dashboard"
      subtitle="Monitor every site you've registered. Healthy first, attention-needed second — fix what's broken."
      actions={
        <Button href="/projects/new" variant="primary">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      }
    >
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total projects"
          value={isPending ? "…" : counts.all}
          helper="Tracked across all environments"
          icon={<FolderOpen className="h-4 w-4" />}
        />
        <StatTile
          label="Healthy"
          value={counts.healthy}
          tone={counts.healthy > 0 ? "success" : "neutral"}
          helper="No critical issues detected"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatTile
          label="Needs attention"
          value={counts.needsAttention}
          tone={counts.needsAttention > 0 ? "warning" : "neutral"}
          helper={counts.needsAttention > 0 ? "Warnings or new failures" : "Nothing flagged"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatTile
          label="Down"
          value={counts.down}
          tone={counts.down > 0 ? "error" : "neutral"}
          helper={counts.down > 0 ? "Production unreachable" : "All sites online"}
          icon={<AlertOctagon className="h-4 w-4" />}
        />
      </section>

      {error ? (
        <div className="mt-6 rounded-[8px] bg-tag-pink px-4 py-3 text-[13px] text-error">
          Backend connection issue: {error}
        </div>
      ) : null}

      <section className="mt-6">
        <Card>
          <CardHeader title="Projects" />

          <div className="px-5 pb-2">
            <div className="flex flex-wrap items-center gap-3 pb-3">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or URL"
                  className="pl-9"
                />
              </div>
              <Select
                value={monitoring}
                onChange={(e) =>
                  setMonitoring(e.target.value as DashboardFilters["monitoring"])
                }
                className="w-[160px]"
              >
                <option value="all">All monitoring</option>
                <option value="active">Active only</option>
                <option value="inactive">Paused only</option>
              </Select>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as DashboardFilters["sort"])}
                className="w-[160px]"
              >
                <option value="lastRun">Last tested</option>
                <option value="createdAt">Created date</option>
              </Select>
            </div>
            <FilterTabs tabs={tabs} active={statusFilter} onChange={setStatusFilter} />
          </div>

          {filteredProjects.length === 0 ? (
            <EmptyProjects isPending={isPending} hasAnyProject={projects.length > 0} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] font-medium text-ink-3">
                    <th className="px-5 py-3 font-medium">Project</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Last tested</th>
                    <th className="px-3 py-3 font-medium">Uptime</th>
                    <th className="px-3 py-3 font-medium">Performance</th>
                    <th className="px-3 py-3 font-medium">Monitoring</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const latestUptime = project.uptimeLogs[0];
                    const latestLighthouse = project.lighthouseReports[0];
                    return (
                      <tr
                        key={project.id}
                        className="border-t border-line-2 align-top hover:bg-hover"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/projects/${project.id}`}
                            className="block font-medium text-ink hover:underline"
                          >
                            {project.name}
                          </Link>
                          <p className="mt-0.5 text-[12px] text-ink-3">
                            {project.productionUrl}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <Pill tone={statusTone(project.status)}>
                            {project.status[0] + project.status.slice(1).toLowerCase()}
                          </Pill>
                        </td>
                        <td className="px-3 py-3 text-ink-2">{formatDate(project.lastRunAt)}</td>
                        <td className="px-3 py-3 text-ink-2">
                          {latestUptime ? (
                            <span
                              className={
                                latestUptime.isUp
                                  ? "text-success"
                                  : "text-error"
                              }
                            >
                              {latestUptime.isUp ? "Up" : "Down"}
                            </span>
                          ) : (
                            <span className="text-ink-3">No logs</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-ink-2">
                          {latestLighthouse
                            ? `P ${latestLighthouse.performanceScore} · SEO ${latestLighthouse.seoScore}`
                            : project.performanceScore ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-ink-2">
                          {project.monitoringActive ? (
                            <span>
                              On · every {project.monitoringIntervalMinutes} min
                            </span>
                          ) : (
                            <span className="text-ink-3">Paused</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </PageChrome>
  );
}

function EmptyProjects({
  isPending,
  hasAnyProject
}: {
  isPending: boolean;
  hasAnyProject: boolean;
}) {
  if (isPending) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-ink-3">Loading…</div>
    );
  }
  if (hasAnyProject) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-ink-3">
        No projects match this filter.
      </div>
    );
  }
  return (
    <div className="grid gap-4 px-5 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-icon-bg text-icon">
        <FolderOpen className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[15px] font-medium text-ink">No projects yet</p>
        <p className="mt-1 text-[13px] text-ink-2">
          Add your first site to start uptime checks, sitemap QA, and performance tracking.
        </p>
      </div>
      <div>
        <Button href="/projects/new" variant="primary">
          <Plus className="h-4 w-4" />
          Create your first project
        </Button>
      </div>
    </div>
  );
}
