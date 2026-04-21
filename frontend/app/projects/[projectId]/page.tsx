import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { ProjectActions } from "@/components/project-actions";
import { SectionCard, StatCard, StatusPill, TimelineRow } from "@/components/cards";
import { QaProcessCard } from "@/components/qa-process-card";
import { getConnectionStateForApp, getProjectForApp } from "@/lib/app-data";
import { formatDate } from "@/lib/utils";
import { requireAuthenticatedRoute } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await requireAuthenticatedRoute();
  const connectionState = await getConnectionStateForApp();
  if (!connectionState.isComplete) {
    redirect("/onboarding");
  }
  const project = await getProjectForApp(projectId);

  if (!project) {
    notFound();
  }

  const errorLogs = project.errorLogs ?? [];

  return (
    <Shell
      title={project.name}
      description="Follow the monitoring process from live uptime, through sitemap QA execution, into timestamped logs and report exports."
      actions={<ProjectActions projectId={project.id} monitoringActive={project.monitoringActive} hasStaging={Boolean(project.stagingUrl)} />}
    >
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Status" value={project.status} helper={`Last run ${formatDate(project.lastRunAt)}`} />
        <StatCard label="Health Score" value={`${project.healthScore}%`} helper="Composite QA signal" />
        <StatCard label="Performance" value={project.performanceScore ?? "N/A"} helper="Latest audit score" />
        <StatCard label="Monitoring" value={project.monitoringActive ? "ON" : "OFF"} helper={`Every ${project.monitoringIntervalMinutes} mins`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Overview">
          <div className="space-y-1 border-b border-[#f5f5f4]/10 pb-3">
            <StatusPill label={project.status} />
          </div>
          <TimelineRow label="Created" value={project.createdAt} formatAsDate />
          <TimelineRow label="Last Run" value={project.lastRunAt} formatAsDate />
          {project.stagingUrl ? (
            <TimelineRow label="Staging URL" value={project.stagingUrl} detail="Pre-release environment for scheduled runner coverage" />
          ) : null}
          <TimelineRow label="Production URL" value={project.productionUrl} detail="Live customer-facing environment and sitemap source" />
          <TimelineRow
            label="Report Export"
            value={
              <Link href={`/api/reports/${project.id}`} className="underline">
                Download CSV report
              </Link>
            }
          />
        </SectionCard>

        <SectionCard title="Settings">
          <div className="space-y-3">
            <p className="text-sm leading-6 text-[#f5f5f4]/72">
              Monitoring polls the production site every five minutes through the cron endpoint. QA scans the sitemap and works page by page so the current run always feels traceable instead of opaque.
            </p>
            <div className="space-y-2 border border-[#f5f5f4]/10 p-4 text-sm">
              <div>Constant monitoring: {project.monitoringActive ? "Enabled" : "Disabled"}</div>
              <div>Schedule: every {project.monitoringIntervalMinutes} minutes</div>
              <div>Completion email with CSV: {project.notifyOnCompletion ? "Enabled" : "Disabled"}</div>
            </div>
            <Link
              href={`/projects/new?duplicateFrom=${project.id}`}
              className="inline-flex border border-[#f5f5f4]/30 px-4 py-2 text-xs uppercase tracking-[0.28em]"
            >
              Create Similar Project
            </Link>
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <QaProcessCard projectId={project.id} />

        <SectionCard title="QA Reports">
          <div className="space-y-3">
            {project.qaRuns.map((run) => (
              <div key={run.id} className="border border-[#f5f5f4]/10 p-4">
                {(() => {
                  const payload = run.payload as {
                    pageResults?: Array<{
                      issues?: string[];
                      ctaCount?: number;
                      formCount?: number;
                      layoutShiftCount?: number;
                    }>;
                    lighthouse?: {
                      bestPracticesScore?: number;
                    };
                  };
                  const pageResults = payload.pageResults ?? [];
                  const missingCtas = pageResults.filter((page) => (page.ctaCount ?? 0) === 0).length;
                  const pagesWithForms = pageResults.filter((page) => (page.formCount ?? 0) > 0).length;
                  const layoutShiftPages = pageResults.filter((page) => (page.layoutShiftCount ?? 0) > 0).length;

                  return (
                    <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusPill label={`${run.environment} ${run.status}`} />
                  <span className="text-xs text-[#f5f5f4]/60">{formatDate(run.startedAt)}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <div>Performance: {run.performanceScore ?? "N/A"}</div>
                  <div>SEO: {run.seoScore ?? "N/A"}</div>
                  <div>Accessibility: {run.accessibility ?? "N/A"}</div>
                  <div>Best Practices: {payload.lighthouse?.bestPracticesScore ?? "N/A"}</div>
                  <div>
                    Pages scanned: {((run.payload as { sitemap?: { testedPages?: number } }).sitemap?.testedPages ?? "N/A")}
                  </div>
                  <div>Pages missing CTA: {missingCtas}</div>
                  <div>Pages with forms: {pagesWithForms}</div>
                  <div>Pages with layout shifts: {layoutShiftPages}</div>
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard title="Lighthouse Audits">
          <div className="grid gap-4 md:grid-cols-2">
            {project.lighthouseReports.map((report) => {
              const status =
                report.performanceScore < 60 || report.seoScore < 60 || report.accessibilityScore < 60
                  ? "Critical"
                  : report.performanceScore < 80 || report.seoScore < 80 || report.accessibilityScore < 80
                    ? "Warning"
                    : "Good";

              return (
                <div key={report.id} className="border border-[#f5f5f4]/10 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <StatusPill label={`${report.environment} ${status}`} />
                    <span className="text-xs text-[#f5f5f4]/60">{formatDate(report.createdAt)}</span>
                  </div>
                  <div className="mt-3 grid gap-1">
                    <div>Performance: {report.performanceScore}</div>
                    <div>SEO: {report.seoScore}</div>
                    <div>Accessibility: {report.accessibilityScore}</div>
                    <div>Best Practices: {report.bestPracticesScore}</div>
                  </div>
                  <Link href={`/api/lighthouse-reports/${report.id}`} target="_blank" className="mt-3 inline-flex underline">
                    View Report
                  </Link>
                </div>
              );
            })}
          </div>
          {project.lighthouseReports.length > 0 ? (
            <p className="mt-4 text-sm text-[#f5f5f4]/65">
              Trend, latest 5 runs: {project.lighthouseReports.map((report) => report.performanceScore).join(" → ")}
            </p>
          ) : (
            <p className="mt-4 text-sm text-[#f5f5f4]/65">No Lighthouse audits captured yet.</p>
          )}
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard title="Uptime Logs">
          <div className="space-y-3">
            {project.uptimeLogs.map((log) => (
              <div key={log.id} className="border border-[#f5f5f4]/10 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusPill label={`${log.environment} ${log.isUp ? "UP" : "DOWN"}`} />
                  <span className="text-xs text-[#f5f5f4]/60">{formatDate(log.checkedAt)}</span>
                </div>
                <div className="mt-3 grid gap-1">
                  <div>Status code: {log.statusCode ?? "N/A"}</div>
                  <div>Response: {log.responseMs ?? "N/A"} ms</div>
                  {log.errorDetails ? <div>Error: {log.errorDetails}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard title="Error Logs">
          <div className="space-y-3">
            {errorLogs.length > 0 ? (
              errorLogs.map((log) => (
                <div key={log.id} className="border border-[#f5f5f4]/10 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusPill label={`${log.environment} ${log.severity}`} />
                    <span className="text-xs text-[#f5f5f4]/60">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="mt-3 leading-6">{log.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#f5f5f4]/70">No error logs captured for this project yet.</p>
            )}
          </div>
        </SectionCard>
      </section>
    </Shell>
  );
}
