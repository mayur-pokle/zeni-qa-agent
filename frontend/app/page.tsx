import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Shell } from "@/components/shell";
import { EmptyState, SectionCard, StatCard } from "@/components/cards";
import { ProjectTable } from "@/components/project-table";
import { getConnectionStateForApp, listProjectsForApp } from "@/lib/app-data";
import { isAuthenticated } from "@/lib/session";
import TestAPIButton from "@/components/testapibutton";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // if (!(await isAuthenticated())) {
  //   return (
  //     <div className="min-h-screen bg-[#292524] text-[#f5f5f4]">
  //       <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
  //         <div className="grid w-full gap-8 border border-[#f5f5f4]/20 p-8">
  //           <div className="space-y-3">
  //             <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">QA Monitor</p>
  //             <h1 className="text-3xl uppercase tracking-[0.18em]">Sign In</h1>
  //             <p className="max-w-xl text-sm leading-6 text-[#f5f5f4]/72">
  //               Start in the control room, keep the session for 30 days if you want, then move into the connection setup flow before monitoring begins.
  //             </p>
  //           </div>
  //           <LoginForm />
  //         </div>
  //       </div>
  //     </div>
  //   );
  }

  // const connectionState = await getConnectionStateForApp();
  // if (!connectionState.isComplete) {
  //   redirect("/onboarding");
  // }

  const params = await searchParams;

  const projects = await listProjectsForApp({
    search: typeof params.search === "string" ? params.search : undefined,
    monitoring: typeof params.monitoring === "string" ? (params.monitoring as "all" | "active" | "inactive") : "all",
    issueState: typeof params.issueState === "string" ? (params.issueState as "all" | "issues" | "healthy") : "all",
    sort: typeof params.sort === "string" ? (params.sort as "lastRun" | "createdAt") : "lastRun"
  });

  const healthyCount = projects.filter((project) => project.status === "HEALTHY").length;
  const issueCount = projects.filter((project) => project.status !== "HEALTHY").length;
  const activeMonitoring = projects.filter((project) => project.monitoringActive).length;
  const avgPerformance =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + (project.performanceScore ?? 0), 0) / projects.length
        )
      : 0;

  return (
    <Shell
      title="Dashboard"
      description="Move each site through a clear process: connect services, register staging and production URLs, scan the sitemap, track run progress, and review uptime plus QA outcomes."
      actions={
        <Link
          href="/projects/new"
          className="ui-button"
        >
          Create Project
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Projects" value={projects.length} helper="Tracked on production only" />
        <StatCard label="Healthy" value={healthyCount} helper="No critical issues detected" />
        <StatCard label="Issues" value={issueCount} helper="Warnings or downtime active" />
        <StatCard label="Avg Perf" value={`${avgPerformance}%`} helper="Last Lighthouse aligned score" />
      </section>
<TestAPIButton />

      <section className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <SectionCard title="Process Filters">
          <form className="grid gap-4">
            <label className="grid gap-2 text-xs uppercase tracking-[0.28em]">
              Search
              <input
                name="search"
                defaultValue={typeof params.search === "string" ? params.search : ""}
                className="border border-[#f5f5f4]/20 bg-transparent px-3 py-3 text-sm"
                placeholder="Name or URL"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.28em]">
              Monitoring
              <select
                name="monitoring"
                defaultValue={typeof params.monitoring === "string" ? params.monitoring : "all"}
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
                defaultValue={typeof params.issueState === "string" ? params.issueState : "all"}
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
                defaultValue={typeof params.sort === "string" ? params.sort : "lastRun"}
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
              title="No projects yet"
              copy="Create your first production website to start uptime checks, sitemap-based QA runs, and performance tracking."
            />
          )}
        </SectionCard>
      </section>
    </Shell>
  );
}
