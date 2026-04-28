import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  Calendar,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Gauge,
  Globe,
  Hash,
  PlayCircle
} from "lucide-react";
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

  // Counts for tab badges so the user can see at a glance how many
  // entries each tab holds without switching to it.
  const runCount = project.qaRuns.length;

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
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-ink-3">
              <RunColHeader icon={<PlayCircle className="h-3.5 w-3.5" />} label="Run" className="px-6" />
              <RunColHeader icon={<Activity className="h-3.5 w-3.5" />} label="Status" />
              <RunColHeader icon={<Gauge className="h-3.5 w-3.5" />} label="Performance" />
              <RunColHeader icon={<Hash className="h-3.5 w-3.5" />} label="SEO" />
              <RunColHeader icon={<Hash className="h-3.5 w-3.5" />} label="A11y" />
              <RunColHeader icon={<FileText className="h-3.5 w-3.5" />} label="Pages" />
              <RunColHeader icon={<FileText className="h-3.5 w-3.5" />} label="HubSpot" />
              <RunColHeader icon={<Calendar className="h-3.5 w-3.5" />} label="Started" />
              <th className="px-3 py-3" aria-label="Actions" />
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
                  className="group border-t border-line-2 align-middle hover:bg-hover"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/projects/${project.id}/runs/${run.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {run.environment}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-ink-3">{run.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={statusTone(run.status)}>{run.status}</Pill>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-ink-2">{run.performanceScore ?? "—"}</td>
                  <td className="px-3 py-3 tabular-nums text-ink-2">{run.seoScore ?? "—"}</td>
                  <td className="px-3 py-3 tabular-nums text-ink-2">{run.accessibility ?? "—"}</td>
                  <td className="px-3 py-3 tabular-nums text-ink-2">{payload.sitemap?.testedPages ?? "—"}</td>
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
                  <td className="px-3 py-3 tabular-nums text-ink-2">{formatDate(run.startedAt)}</td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/projects/${project.id}/runs/${run.id}`}
                      aria-label="View run report"
                      title="View"
                      className="inline-grid h-8 w-8 place-items-center rounded-[6px] text-ink-3 opacity-0 transition-opacity hover:bg-surface hover:text-ink group-hover:opacity-100"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RunColHeader({
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

