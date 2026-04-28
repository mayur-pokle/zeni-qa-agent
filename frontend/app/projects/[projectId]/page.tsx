import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Calendar, ExternalLink, FileDown, Globe } from "lucide-react";
import { PageChrome } from "@/components/ui/page-chrome";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Pill, statusTone } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ProjectActions } from "@/components/project-actions";
import { QaProcessCard } from "@/components/qa-process-card";
import { getProjectForApp } from "@/lib/app-data";
import { formatDate } from "@/lib/utils";
import { requireAuthenticatedRoute } from "@/lib/session";

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

  // Counts for tab badges so the user can see at a glance how many
  // entries each tab holds without switching to it.
  const runCount = project.qaRuns.length;
  const lighthouseCount = project.lighthouseReports.length;
  const uptimeCount = project.uptimeLogs.length;
  const errorCount = errorLogs.length;

  return (
    <PageChrome
      breadcrumb={
        <span>
          <Link href="/" className="hover:text-ink">
            Projects
          </Link>
          <span className="mx-1.5 text-ink-3">/</span>
          {project.name}
        </span>
      }
      title={
        <span className="inline-flex items-center gap-3">
          <span>{project.name}</span>
          <Pill tone={statusTone(project.status)}>
            {project.status[0] + project.status.slice(1).toLowerCase()}
          </Pill>
        </span>
      }
      subtitle={
        <span className="inline-flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-ink-3" />
          <a
            href={project.productionUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {project.productionUrl}
          </a>
          {project.stagingUrl ? (
            <span className="ml-3 text-ink-3">
              · staging{" "}
              <a
                href={project.stagingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-ink-2 hover:underline"
              >
                {project.stagingUrl}
              </a>
            </span>
          ) : null}
        </span>
      }
      actions={
        <ProjectActions
          projectId={project.id}
          monitoringActive={project.monitoringActive}
          hasStaging={Boolean(project.stagingUrl)}
        />
      }
    >
      {/* KPI row */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Status"
          value={
            project.status[0] + project.status.slice(1).toLowerCase()
          }
          tone={
            project.status === "HEALTHY"
              ? "success"
              : project.status === "DOWN"
                ? "error"
                : project.status === "WARNING"
                  ? "warning"
                  : "neutral"
          }
          helper={`Last run ${formatDate(project.lastRunAt)}`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatTile
          label="Health score"
          value={`${project.healthScore}%`}
          helper="Composite QA signal"
        />
        <StatTile
          label="Performance"
          value={project.performanceScore ?? "—"}
          helper="Latest Lighthouse score"
        />
        <StatTile
          label="Monitoring"
          value={project.monitoringActive ? "On" : "Paused"}
          tone={project.monitoringActive ? "success" : "neutral"}
          helper={`Every ${project.monitoringIntervalMinutes} min`}
          icon={<Calendar className="h-4 w-4" />}
        />
      </section>

      {/* Live progress card surfaces only when something's actually
          running; the empty-state copy lives inside it. */}
      <section className="mt-6">
        <QaProcessCard projectId={project.id} />
      </section>

      <section className="mt-6">
        <Tabs
          defaultValue="runs"
          tabs={[
            {
              value: "overview",
              label: "Overview",
              content: <OverviewTab project={project} />
            },
            {
              value: "runs",
              label: "QA Runs",
              count: runCount,
              content: <RunsTab project={project} />
            },
            {
              value: "lighthouse",
              label: "Lighthouse",
              count: lighthouseCount,
              content: <LighthouseTab project={project} />
            },
            {
              value: "uptime",
              label: "Uptime",
              count: uptimeCount,
              content: <UptimeTab project={project} />
            },
            {
              value: "errors",
              label: "Errors",
              count: errorCount,
              content: <ErrorsTab project={project} />
            }
          ]}
        />
      </section>
    </PageChrome>
  );
}

// ---------- Tab content ----------

type Project = NonNullable<Awaited<ReturnType<typeof getProjectForApp>>>;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-3">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Configuration" />
        <CardBody>
          <dl className="grid grid-cols-2 gap-4">
            <Field
              label="Production URL"
              value={
                <a
                  href={project.productionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-ink hover:underline"
                >
                  {project.productionUrl}
                  <ExternalLink className="h-3 w-3 text-ink-3" />
                </a>
              }
            />
            {project.stagingUrl ? (
              <Field
                label="Staging URL"
                value={
                  <a
                    href={project.stagingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-ink hover:underline"
                  >
                    {project.stagingUrl}
                    <ExternalLink className="h-3 w-3 text-ink-3" />
                  </a>
                }
              />
            ) : null}
            <Field label="Created" value={formatDate(project.createdAt)} />
            <Field label="Last run" value={formatDate(project.lastRunAt)} />
            <Field
              label="Schedule"
              value={`Every ${project.monitoringIntervalMinutes} min · ${project.monitoringActive ? "active" : "paused"}`}
            />
            <Field
              label="Email on completion"
              value={project.notifyOnCompletion ? "Enabled" : "Disabled"}
            />
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent activity" />
        <CardBody>
          {project.qaRuns.length === 0 ? (
            <p className="text-sm text-ink-3">
              No QA runs yet. Hit “Run prod QA” above to start the first one.
            </p>
          ) : (
            <ul className="divide-y divide-line-2">
              {project.qaRuns.slice(0, 5).map((run) => (
                <li key={run.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link
                    href={`/projects/${project.id}/runs/${run.id}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Pill tone={statusTone(run.status)}>{run.status}</Pill>
                    <span className="text-ink-2">{run.environment}</span>
                  </Link>
                  <span className="text-ink-3">{formatDate(run.startedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader
          title="Reports"
          actions={
            <Button href={`/api/reports/${project.id}`} variant="secondary" size="sm" download>
              <FileDown className="h-4 w-4" />
              Download CSV
            </Button>
          }
        />
        <CardBody>
          <p className="text-sm text-ink-2">
            Full per-page CSV with HubSpot form status, broken-link details, layout shifts, Lighthouse
            scores, and timestamps for every run.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function RunsTab({ project }: { project: Project }) {
  if (project.qaRuns.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink-3">No QA runs have been recorded yet.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-ink-3">
              <th className="px-5 py-3 font-medium">Run</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Performance</th>
              <th className="px-3 py-3 font-medium">SEO</th>
              <th className="px-3 py-3 font-medium">A11y</th>
              <th className="px-3 py-3 font-medium">Pages</th>
              <th className="px-3 py-3 font-medium">HubSpot</th>
              <th className="px-3 py-3 font-medium">Started</th>
            </tr>
          </thead>
          <tbody>
            {project.qaRuns.map((run) => {
              const payload = run.payload as {
                pageResults?: Array<{
                  hubspotForm?: { found?: boolean; attempted?: boolean; succeeded?: boolean };
                }>;
                sitemap?: { testedPages?: number };
              };
              const pageResults = payload.pageResults ?? [];
              const hubspotFound = pageResults.filter((p) => p.hubspotForm?.found).length;
              const hubspotOk = pageResults.filter(
                (p) => p.hubspotForm?.attempted && p.hubspotForm?.succeeded
              ).length;
              const hubspotBroken = pageResults.filter(
                (p) => p.hubspotForm?.attempted && !p.hubspotForm?.succeeded
              ).length;
              return (
                <tr
                  key={run.id}
                  className="border-t border-line-2 align-top hover:bg-hover"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/projects/${project.id}/runs/${run.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {run.environment}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-3">{run.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={statusTone(run.status)}>{run.status}</Pill>
                  </td>
                  <td className="px-3 py-3 text-ink-2">{run.performanceScore ?? "—"}</td>
                  <td className="px-3 py-3 text-ink-2">{run.seoScore ?? "—"}</td>
                  <td className="px-3 py-3 text-ink-2">{run.accessibility ?? "—"}</td>
                  <td className="px-3 py-3 text-ink-2">{payload.sitemap?.testedPages ?? "—"}</td>
                  <td className="px-3 py-3 text-ink-2">
                    {hubspotFound === 0 ? (
                      <span className="text-ink-3">—</span>
                    ) : (
                      <>
                        {hubspotFound} found
                        {hubspotOk > 0 ? (
                          <span className="text-success"> · {hubspotOk}✓</span>
                        ) : null}
                        {hubspotBroken > 0 ? (
                          <span className="text-error"> · {hubspotBroken}✗</span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ink-2">{formatDate(run.startedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LighthouseTab({ project }: { project: Project }) {
  if (project.lighthouseReports.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink-3">No Lighthouse audits captured yet.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {project.lighthouseReports.map((report) => {
        const tone =
          report.performanceScore < 60 || report.seoScore < 60 || report.accessibilityScore < 60
            ? "error"
            : report.performanceScore < 80 || report.seoScore < 80 || report.accessibilityScore < 80
              ? "warning"
              : "success";
        return (
          <Card key={report.id}>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <Pill tone={tone}>
                  {report.environment}
                </Pill>
                <span className="text-xs text-ink-3">
                  {formatDate(report.createdAt)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <ScoreCell label="Perf" value={report.performanceScore} />
                <ScoreCell label="SEO" value={report.seoScore} />
                <ScoreCell label="A11y" value={report.accessibilityScore} />
                <ScoreCell label="BP" value={report.bestPracticesScore} />
              </div>
              <a
                href={`/api/lighthouse-reports/${report.id}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-ink-2 hover:underline"
              >
                View full report
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  const tone =
    value < 60 ? "text-error" : value < 80 ? "text-warning" : "text-success";
  return (
    <div className="rounded-[8px] bg-surface-2 py-2">
      <div className={`text-lg font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-ink-3">{label}</div>
    </div>
  );
}

function UptimeTab({ project }: { project: Project }) {
  if (project.uptimeLogs.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink-3">No uptime checks recorded yet.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-ink-3">
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Environment</th>
              <th className="px-3 py-3 font-medium">HTTP</th>
              <th className="px-3 py-3 font-medium">Response</th>
              <th className="px-3 py-3 font-medium">Checked at</th>
              <th className="px-3 py-3 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {project.uptimeLogs.map((log) => (
              <tr key={log.id} className="border-t border-line-2 hover:bg-hover">
                <td className="px-5 py-3">
                  <Pill tone={log.isUp ? "success" : "error"}>
                    {log.isUp ? "Up" : "Down"}
                  </Pill>
                </td>
                <td className="px-3 py-3 text-ink-2">{log.environment}</td>
                <td className="px-3 py-3 text-ink-2">{log.statusCode ?? "—"}</td>
                <td className="px-3 py-3 text-ink-2">
                  {log.responseMs ? `${log.responseMs} ms` : "—"}
                </td>
                <td className="px-3 py-3 text-ink-2">{formatDate(log.checkedAt)}</td>
                <td className="px-3 py-3 text-ink-2">{log.errorDetails ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ErrorsTab({ project }: { project: Project }) {
  const errorLogs = project.errorLogs ?? [];
  if (errorLogs.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink-3">No error logs captured for this project yet.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {errorLogs.map((log) => (
        <Card key={log.id}>
          <CardBody className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Pill tone={log.severity.toLowerCase() === "error" ? "error" : "warning"}>
                {log.environment} · {log.severity}
              </Pill>
              <span className="text-xs text-ink-3">{formatDate(log.createdAt)}</span>
            </div>
            <p className="text-sm leading-relaxed text-ink">{log.message}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
