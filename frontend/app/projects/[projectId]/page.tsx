import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { ProjectActions } from "@/components/project-actions";
import { SectionCard, StatCard, StatusPill } from "@/components/cards";
import { QaProcessCard } from "@/components/qa-process-card";
import { getProjectForApp } from "@/lib/app-data";
import { formatDate } from "@/lib/utils";
import { requireAuthenticatedRoute } from "@/lib/session";

const RUNS_PREVIEW = 5;
const LIGHTHOUSE_PREVIEW = 4;
const UPTIME_PREVIEW = 10;
const ERRORS_PREVIEW = 10;

const NAV_ITEMS: Array<{ id: string; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "qa-process", label: "QA Process" },
  { id: "runs", label: "QA Runs" },
  { id: "lighthouse", label: "Lighthouse" },
  { id: "uptime", label: "Uptime" },
  { id: "errors", label: "Errors" }
];

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await requireAuthenticatedRoute();
  const project = await getProjectForApp(projectId);

  if (!project) {
    notFound();
  }

  const errorLogs = project.errorLogs ?? [];
  const visibleRuns = project.qaRuns.slice(0, RUNS_PREVIEW);
  const moreRuns = Math.max(0, project.qaRuns.length - visibleRuns.length);
  const visibleLighthouse = project.lighthouseReports.slice(0, LIGHTHOUSE_PREVIEW);
  const moreLighthouse = Math.max(0, project.lighthouseReports.length - visibleLighthouse.length);
  const visibleUptime = project.uptimeLogs.slice(0, UPTIME_PREVIEW);
  const moreUptime = Math.max(0, project.uptimeLogs.length - visibleUptime.length);
  const visibleErrors = errorLogs.slice(0, ERRORS_PREVIEW);
  const moreErrors = Math.max(0, errorLogs.length - visibleErrors.length);

  return (
    <Shell
      title={project.name}
      description={
        <span>
          {project.productionUrl}
          {project.stagingUrl ? ` · staging ${project.stagingUrl}` : ""}
        </span>
      }
      actions={<ProjectActions projectId={project.id} monitoringActive={project.monitoringActive} hasStaging={Boolean(project.stagingUrl)} />}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Status" value={project.status} helper={`Last run ${formatDate(project.lastRunAt)}`} />
        <StatCard label="Health" value={`${project.healthScore}%`} helper="Composite QA signal" />
        <StatCard label="Performance" value={project.performanceScore ?? "N/A"} helper="Latest audit" />
        <StatCard label="Monitoring" value={project.monitoringActive ? "ON" : "OFF"} helper={`Every ${project.monitoringIntervalMinutes} min`} />
      </section>

      <nav className="sticky top-0 z-20 mt-6 -mx-6 flex flex-wrap gap-1 border-b border-[#f5f5f4]/15 bg-[#292524]/92 px-6 py-3 text-[10px] uppercase tracking-[0.28em] backdrop-blur">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="border border-transparent px-3 py-1.5 text-[#f5f5f4]/70 transition hover:border-[#f5f5f4]/30 hover:text-[#f5f5f4]"
          >
            {item.label}
          </a>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <a
            href={`/api/reports/${project.id}`}
            download
            className="border border-[#f5f5f4]/30 px-3 py-1.5 text-[#f5f5f4]/85 transition hover:bg-[#f5f5f4]/10"
          >
            Download CSV
          </a>
        </span>
      </nav>

      <section id="overview" className="mt-6 scroll-mt-20">
        <SectionCard title="Overview">
          <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            <Field label="Production URL" value={<a href={project.productionUrl} target="_blank" rel="noreferrer" className="underline">{project.productionUrl}</a>} />
            {project.stagingUrl ? (
              <Field label="Staging URL" value={<a href={project.stagingUrl} target="_blank" rel="noreferrer" className="underline">{project.stagingUrl}</a>} />
            ) : null}
            <Field label="Created" value={formatDate(project.createdAt)} />
            <Field label="Last Run" value={formatDate(project.lastRunAt)} />
            <Field label="Schedule" value={`Every ${project.monitoringIntervalMinutes} min · ${project.monitoringActive ? "active" : "paused"}`} />
            <Field label="Email on completion" value={project.notifyOnCompletion ? "Enabled" : "Disabled"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.24em]">
            <Link
              href={`/projects/${project.id}/edit`}
              className="border border-[#f5f5f4]/30 px-3 py-1.5 hover:bg-[#f5f5f4]/10"
            >
              Edit
            </Link>
            <Link
              href={`/projects/new?duplicateFrom=${project.id}`}
              className="border border-[#f5f5f4]/30 px-3 py-1.5 hover:bg-[#f5f5f4]/10"
            >
              Duplicate
            </Link>
          </div>
        </SectionCard>
      </section>

      <section id="qa-process" className="mt-6 scroll-mt-20">
        <QaProcessCard projectId={project.id} />
      </section>

      <section id="runs" className="mt-6 scroll-mt-20">
        <SectionCard title={`QA Runs (${project.qaRuns.length})`}>
          {project.qaRuns.length === 0 ? (
            <p className="text-sm text-[#f5f5f4]/65">No QA runs have been recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {visibleRuns.map((run) => {
                const payload = run.payload as {
                  pageResults?: Array<{
                    ctaCount?: number;
                    layoutShiftCount?: number;
                    hubspotForm?: { found?: boolean; attempted?: boolean; succeeded?: boolean };
                  }>;
                  sitemap?: { testedPages?: number };
                };
                const pageResults = payload.pageResults ?? [];
                const hubspotFound = pageResults.filter((page) => page.hubspotForm?.found).length;
                const hubspotOk = pageResults.filter(
                  (page) => page.hubspotForm?.attempted && page.hubspotForm?.succeeded
                ).length;
                const hubspotBroken = pageResults.filter(
                  (page) => page.hubspotForm?.attempted && !page.hubspotForm?.succeeded
                ).length;

                return (
                  <Link
                    key={run.id}
                    href={`/projects/${project.id}/runs/${run.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 border border-[#f5f5f4]/10 px-4 py-3 text-sm transition hover:border-[#f5f5f4]/30"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusPill label={`${run.environment} ${run.status}`} />
                      <span className="text-xs text-[#f5f5f4]/60">{formatDate(run.startedAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#f5f5f4]/75">
                      <span>P {run.performanceScore ?? "—"}</span>
                      <span>SEO {run.seoScore ?? "—"}</span>
                      <span>A11y {run.accessibility ?? "—"}</span>
                      <span>Pages {payload.sitemap?.testedPages ?? "—"}</span>
                      <span>
                        HS {hubspotFound}
                        {hubspotOk > 0 ? `·${hubspotOk}✓` : ""}
                        {hubspotBroken > 0 ? `·${hubspotBroken}✗` : ""}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {moreRuns > 0 ? (
                <p className="pt-2 text-xs text-[#f5f5f4]/55">
                  Showing latest {visibleRuns.length} of {project.qaRuns.length} runs. Open a run to see all details.
                </p>
              ) : null}
            </div>
          )}
        </SectionCard>
      </section>

      <section id="lighthouse" className="mt-6 scroll-mt-20">
        <SectionCard title={`Lighthouse Audits (${project.lighthouseReports.length})`}>
          {visibleLighthouse.length === 0 ? (
            <p className="text-sm text-[#f5f5f4]/65">No Lighthouse audits captured yet.</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {visibleLighthouse.map((report) => {
                  const status =
                    report.performanceScore < 60 || report.seoScore < 60 || report.accessibilityScore < 60
                      ? "Critical"
                      : report.performanceScore < 80 || report.seoScore < 80 || report.accessibilityScore < 80
                        ? "Warning"
                        : "Good";

                  return (
                    <div key={report.id} className="border border-[#f5f5f4]/10 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <StatusPill label={`${report.environment} ${status}`} />
                        <span className="text-xs text-[#f5f5f4]/60">{formatDate(report.createdAt)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#f5f5f4]/80">
                        <span>P {report.performanceScore}</span>
                        <span>SEO {report.seoScore}</span>
                        <span>A11y {report.accessibilityScore}</span>
                        <span>BP {report.bestPracticesScore}</span>
                      </div>
                      <a href={`/api/lighthouse-reports/${report.id}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs underline">
                        View report
                      </a>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-[#f5f5f4]/65">
                Trend (latest {project.lighthouseReports.length}):{" "}
                {project.lighthouseReports.map((r) => r.performanceScore).join(" → ")}
                {moreLighthouse > 0 ? ` · ${moreLighthouse} older not shown` : ""}
              </p>
            </>
          )}
        </SectionCard>
      </section>

      <section id="uptime" className="mt-6 scroll-mt-20">
        <SectionCard title={`Uptime Logs (${project.uptimeLogs.length})`}>
          {visibleUptime.length === 0 ? (
            <p className="text-sm text-[#f5f5f4]/65">No uptime checks recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-xs">
                <thead>
                  <tr className="text-left uppercase tracking-[0.22em] text-[#f5f5f4]/55">
                    <th className="border-b border-[#f5f5f4]/15 px-2 py-2">Status</th>
                    <th className="border-b border-[#f5f5f4]/15 px-2 py-2">Env</th>
                    <th className="border-b border-[#f5f5f4]/15 px-2 py-2">HTTP</th>
                    <th className="border-b border-[#f5f5f4]/15 px-2 py-2">Response</th>
                    <th className="border-b border-[#f5f5f4]/15 px-2 py-2">Checked at</th>
                    <th className="border-b border-[#f5f5f4]/15 px-2 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUptime.map((log) => (
                    <tr key={log.id} className="border-b border-[#f5f5f4]/8">
                      <td className={`px-2 py-2 uppercase tracking-[0.2em] ${log.isUp ? "text-emerald-300" : "text-rose-300"}`}>
                        {log.isUp ? "UP" : "DOWN"}
                      </td>
                      <td className="px-2 py-2">{log.environment}</td>
                      <td className="px-2 py-2">{log.statusCode ?? "—"}</td>
                      <td className="px-2 py-2">{log.responseMs ?? "—"} ms</td>
                      <td className="px-2 py-2 text-[#f5f5f4]/70">{formatDate(log.checkedAt)}</td>
                      <td className="px-2 py-2 text-[#f5f5f4]/75">{log.errorDetails ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {moreUptime > 0 ? (
                <p className="pt-3 text-xs text-[#f5f5f4]/55">
                  Showing latest {visibleUptime.length} of {project.uptimeLogs.length} checks.
                </p>
              ) : null}
            </div>
          )}
        </SectionCard>
      </section>

      <section id="errors" className="mt-6 scroll-mt-20">
        <SectionCard title={`Error Logs (${errorLogs.length})`}>
          {visibleErrors.length === 0 ? (
            <p className="text-sm text-[#f5f5f4]/70">No error logs captured for this project yet.</p>
          ) : (
            <div className="space-y-2">
              {visibleErrors.map((log) => (
                <div key={log.id} className="border border-[#f5f5f4]/10 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusPill label={`${log.environment} ${log.severity}`} />
                    <span className="text-xs text-[#f5f5f4]/60">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="mt-2 leading-6 text-[#f5f5f4]/85">{log.message}</p>
                </div>
              ))}
              {moreErrors > 0 ? (
                <p className="pt-2 text-xs text-[#f5f5f4]/55">
                  Showing latest {visibleErrors.length} of {errorLogs.length} entries.
                </p>
              ) : null}
            </div>
          )}
        </SectionCard>
      </section>
    </Shell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-[10px] uppercase tracking-[0.26em] text-[#f5f5f4]/55">{label}</dt>
      <dd className="text-[#f5f5f4]/90">{value}</dd>
    </div>
  );
}
