import Image from "next/image";
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
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
          <div className="w-full">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/flowtest-logo.svg"
                alt="Flowtest"
                width={132}
                height={24}
                className="h-6 w-auto"
                priority
              />
            </div>
            <div className="rounded-[12px] bg-surface p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.08)]">
              <div className="space-y-2">
                <h1 className="text-[22px] font-semibold text-ink">Sign in</h1>
                <p className="text-[13px] text-ink-2">
                  Use your Flowtest credentials to access the QA monitor.
                </p>
              </div>
              <div className="mt-6">
                <LoginForm />
              </div>
            </div>
            <p className="mt-4 text-center text-[12px] text-ink-3">
              Trouble signing in? Contact your team admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const initialFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    monitoring:
      typeof params.monitoring === "string"
        ? (params.monitoring as "all" | "active" | "inactive")
        : "all",
    issueState:
      typeof params.issueState === "string"
        ? (params.issueState as "all" | "issues" | "healthy")
        : "all",
    sort:
      typeof params.sort === "string"
        ? (params.sort as "lastRun" | "createdAt")
        : "lastRun"
  };

  return <DashboardClient initialFilters={initialFilters} />;
}
