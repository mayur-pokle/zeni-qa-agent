import Link from "next/link";
import { Shell } from "@/components/shell";
import { DashboardClient } from "@/components/dashboard-client";
import { LoginForm } from "@/components/login-form";
import { isAuthenticated } from "@/lib/session";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAuthenticated())) {
    return (
      <div className="min-h-screen bg-[#292524] text-[#f5f5f4]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
          <div className="grid w-full gap-8 border border-[#f5f5f4]/20 p-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">QA Monitor</p>
              <h1 className="text-3xl uppercase tracking-[0.18em]">Sign In</h1>
              <p className="max-w-xl text-sm leading-6 text-[#f5f5f4]/72">
                Start in the control room, keep the session for 30 days if you want, then move straight into the dashboard.
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const initialFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    monitoring: typeof params.monitoring === "string" ? (params.monitoring as "all" | "active" | "inactive") : "all",
    issueState: typeof params.issueState === "string" ? (params.issueState as "all" | "issues" | "healthy") : "all",
    sort: typeof params.sort === "string" ? (params.sort as "lastRun" | "createdAt") : "lastRun"
  };

  return (
    <Shell
      title="Dashboard"
      description="Move each site through a clear process: register staging and production URLs, scan the sitemap, track run progress, and review uptime plus QA outcomes."
      actions={
        <Link
          href="/projects/new"
          className="ui-button"
        >
          Create Project
        </Link>
      }
    >
      <DashboardClient initialFilters={initialFilters} />
    </Shell>
  );
}
