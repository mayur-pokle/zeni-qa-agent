"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MagnifyingGlass,
  FolderOpen,
  CheckCircle,
  Warning,
  WarningOctagon,
  Eye,
  PencilSimple,
  Pulse,
  Calendar,
  Globe,
  Gauge
} from "@phosphor-icons/react";
import { PageChrome } from "@/components/ui/page-chrome";
import { Card, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Pill, statusTone } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { FilterTabs, type FilterTab } from "@/components/ui/filter-tabs";
import { Input, Select } from "@/components/ui/input";
import { SlideOver } from "@/components/ui/slide-over";
import { ProjectForm } from "@/components/project-form";
import { LocalTime } from "@/components/ui/local-time";
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

export function DashboardClient({
  initialFilters,
  userEmail
}: {
  initialFilters: DashboardFilters;
  userEmail?: string | null;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [sort, setSort] = useState(initialFilters.sort);
  const [monitoring, setMonitoring] = useState(initialFilters.monitoring);
  const [createOpen, setCreateOpen] = useState(false);

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
      userEmail={userEmail}
      actions={
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      }
    >
      <SlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create project"
        description="Register a site, attach it to monitoring, and prepare it for sitemap-based QA."
      >
        <ProjectForm
          mode="create"
          onCancel={() => setCreateOpen(false)}
          onSuccess={(projectId) => {
            setCreateOpen(false);
            router.push(`/projects/${projectId}`);
            router.refresh();
          }}
        />
      </SlideOver>
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
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <StatTile
          label="Needs attention"
          value={counts.needsAttention}
          tone={counts.needsAttention > 0 ? "warning" : "neutral"}
          helper={counts.needsAttention > 0 ? "Warnings or new failures" : "Nothing flagged"}
          icon={<Warning className="h-4 w-4" />}
        />
        <StatTile
          label="Down"
          value={counts.down}
          tone={counts.down > 0 ? "error" : "neutral"}
          helper={counts.down > 0 ? "Production unreachable" : "All sites online"}
          icon={<WarningOctagon className="h-4 w-4" />}
        />
      </section>

      {error ? (
        <div className="mt-6 rounded-[8px] bg-tag-pink px-4 py-3 text-sm text-error">
          Backend connection issue: {error}
        </div>
      ) : null}

      <section className="mt-6">
        <Card>
          <CardHeader title="Projects" />

          <div className="px-5 pb-2">
            <div className="flex flex-wrap items-center gap-3 pb-3">
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
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
            <EmptyProjects
              isPending={isPending}
              hasAnyProject={projects.length > 0}
              onCreate={() => setCreateOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <ColHeader icon={<FolderOpen className="h-3.5 w-3.5" />} label="Project" className="px-6" />
                    <ColHeader icon={<Pulse className="h-3.5 w-3.5" />} label="Status" />
                    <ColHeader icon={<Calendar className="h-3.5 w-3.5" />} label="Last tested" />
                    <ColHeader icon={<Globe className="h-3.5 w-3.5" />} label="Uptime" />
                    <ColHeader icon={<Gauge className="h-3.5 w-3.5" />} label="Performance" />
                    <ColHeader icon={<Calendar className="h-3.5 w-3.5" />} label="Monitoring" />
                    <th className="px-3 py-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const latestUptime = project.uptimeLogs[0];
                    const latestLighthouse = project.lighthouseReports[0];
                    return (
                      <tr
                        key={project.id}
                        className="group border-t border-line-2 align-middle hover:bg-hover"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <ProjectAvatar name={project.name} status={project.status} />
                            <div className="min-w-0">
                              <Link
                                href={`/projects/${project.id}`}
                                className="block truncate font-medium text-ink hover:underline"
                              >
                                {project.name}
                              </Link>
                              <p className="mt-0.5 truncate text-xs text-ink-3">
                                {project.productionUrl}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Pill tone={statusTone(project.status)}>
                            {project.status[0] + project.status.slice(1).toLowerCase()}
                          </Pill>
                        </td>
                        <td className="px-3 py-3 text-ink-2 tabular-nums"><LocalTime value={project.lastRunAt} /></td>
                        <td className="px-3 py-3">
                          {latestUptime ? (
                            <span
                              className={
                                latestUptime.isUp
                                  ? "inline-flex items-center gap-1.5 text-success"
                                  : "inline-flex items-center gap-1.5 text-error"
                              }
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${latestUptime.isUp ? "bg-success" : "bg-error"}`} />
                              {latestUptime.isUp ? "Up" : "Down"}
                            </span>
                          ) : (
                            <span className="text-ink-3">No logs</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-ink-2 tabular-nums">
                          {latestLighthouse
                            ? `P ${latestLighthouse.performanceScore} · SEO ${latestLighthouse.seoScore}`
                            : project.performanceScore ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-ink-2">
                          {project.monitoringActive ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-success" />
                              On · every {project.monitoringIntervalMinutes} min
                            </span>
                          ) : (
                            <span className="text-ink-3">Paused</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link
                              href={`/projects/${project.id}`}
                              className="grid h-8 w-8 place-items-center rounded-[6px] text-ink-3 hover:bg-surface hover:text-ink"
                              aria-label="View project"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/projects/${project.id}/edit`}
                              className="grid h-8 w-8 place-items-center rounded-[6px] text-ink-3 hover:bg-surface hover:text-ink"
                              aria-label="Edit project"
                              title="Edit"
                            >
                              <PencilSimple className="h-4 w-4" />
                            </Link>
                          </div>
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

function ColHeader({
  icon,
  label,
  className
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <th className={`px-3 py-3 font-medium ${className ?? ""}`}>
      <span className="inline-flex items-center gap-1.5 text-ink-3">
        <span className="text-ink-3">{icon}</span>
        {label}
      </span>
    </th>
  );
}

const AVATAR_PALETTE = [
  { bg: "bg-tag-blue", fg: "text-[#1D4ED8]" },
  { bg: "bg-tag-green", fg: "text-[#15803D]" },
  { bg: "bg-tag-orange", fg: "text-[#B45309]" },
  { bg: "bg-tag-pink", fg: "text-[#BE123C]" },
  { bg: "bg-[#EDE9FE]", fg: "text-[#6D28D9]" }
];

function ProjectAvatar({ name, status }: { name: string; status: string }) {
  // Pick a stable palette index based on the project name so the avatar
  // colour stays consistent across re-renders. Failing/down projects get
  // a rose tint regardless so the dashboard reads "needs attention" at
  // a glance.
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const fallbackIndex =
    name.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_PALETTE.length;
  const palette =
    status === "DOWN"
      ? AVATAR_PALETTE[3]
      : status === "WARNING"
        ? AVATAR_PALETTE[2]
        : AVATAR_PALETTE[fallbackIndex];

  return (
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${palette.bg} ${palette.fg}`}
      aria-hidden="true"
    >
      {initials || "•"}
    </div>
  );
}

function EmptyProjects({
  isPending,
  hasAnyProject,
  onCreate
}: {
  isPending: boolean;
  hasAnyProject: boolean;
  onCreate: () => void;
}) {
  if (isPending) {
    return (
      <div className="px-5 py-12 text-center text-sm text-ink-3">Loading…</div>
    );
  }
  if (hasAnyProject) {
    return (
      <div className="px-5 py-12 text-center text-sm text-ink-3">
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
        <p className="text-base font-medium text-ink">No projects yet</p>
        <p className="mt-1 text-sm text-ink-2">
          Add your first site to start uptime checks, sitemap QA, and performance tracking.
        </p>
      </div>
      <div>
        <Button variant="primary" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Create your first project
        </Button>
      </div>
    </div>
  );
}
