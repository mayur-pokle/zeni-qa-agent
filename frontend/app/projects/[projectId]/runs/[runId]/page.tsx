import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, AlertTriangle, Globe, Activity, FileText } from "lucide-react";
import { PageChrome } from "@/components/ui/page-chrome";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Pill, statusTone } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { PageResultsTable } from "@/components/run-report/page-results-table";
import { getQaRunForApp } from "@/lib/app-data";
import { formatDate } from "@/lib/utils";
import { requireAuthenticatedRoute } from "@/lib/session";
import type { QaExecutionPayload } from "@/lib/types";

function durationLabel(startedAt: string | Date, completedAt?: string | Date | null) {
  if (!completedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${mins}m` : `${mins}m ${rem}s`;
}

export default async function QaRunDetailPage({
  params
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const { projectId, runId } = await params;
  await requireAuthenticatedRoute();
  const run = await getQaRunForApp(runId);

  if (!run || run.project.id !== projectId) {
    notFound();
  }

  const payload = (run.payload ?? {}) as Partial<QaExecutionPayload>;
  const pageResults = payload.pageResults ?? [];
  const modules = payload.modules ?? [];
  const consoleErrors = payload.consoleErrors ?? [];
  const summary = payload.summary;
  const sitemap = payload.sitemap;
  const lighthouse = payload.lighthouse;

  const lighthousePerformance = lighthouse?.performanceScore ?? run.performanceScore ?? null;
  const lighthouseSeo = lighthouse?.seoScore ?? run.seoScore ?? null;
  const lighthouseAccessibility = lighthouse?.accessibilityScore ?? run.accessibility ?? null;
  const lighthouseBestPractices = lighthouse?.bestPracticesScore ?? null;

  const passedPages = pageResults.filter((p) => p.status === "passed").length;
  const warnedPages = pageResults.filter((p) => p.status === "warning").length;
  const failedPages = pageResults.filter((p) => p.status === "failed").length;
  const totalPagesTested = pageResults.length;

  const hubspotPagesFound = pageResults.filter((p) => p.hubspotForm?.found).length;
  const hubspotSubmittedOk = pageResults.filter(
    (p) => p.hubspotForm?.attempted && p.hubspotForm?.succeeded
  ).length;
  const hubspotSubmittedFailed = pageResults.filter(
    (p) => p.hubspotForm?.attempted && !p.hubspotForm?.succeeded
  ).length;
  const hubspotInvisible = pageResults.filter(
    (p) => p.hubspotForm?.found && p.hubspotForm?.visible === false
  ).length;

  const totalBrokenLinks = pageResults.reduce(
    (sum, p) => sum + (p.brokenLinks?.length ?? 0),
    0
  );
  const pagesWithBroken = pageResults.filter((p) => (p.brokenLinks?.length ?? 0) > 0).length;

  const envUrl =
    run.environment === "PRODUCTION"
      ? run.project.productionUrl
      : run.project.stagingUrl ?? run.project.productionUrl;

  return (
    <PageChrome
      breadcrumb={
        <span>
          <Link href={`/projects/${run.project.id}`} className="hover:text-ink">
            {run.project.name}
          </Link>
          <span className="mx-1.5 text-ink-3">/</span>
          QA Runs
        </span>
      }
      title={
        <span className="inline-flex items-center gap-3">
          <span>QA Run</span>
          <Pill tone={statusTone(run.status)}>{run.status}</Pill>
          <Pill tone="info">{run.environment}</Pill>
        </span>
      }
      subtitle={
        <span>
          Started {formatDate(run.startedAt)} · Duration {durationLabel(run.startedAt, run.completedAt)} · {envUrl}
        </span>
      }
      actions={
        <>
          <Button href={`/projects/${run.project.id}`} variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Button>
          <Button href={`/api/reports/${run.project.id}`} variant="primary" download>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </>
      }
    >
      {/* Top KPI row: the four numbers a triage user needs first. */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Pages tested"
          value={totalPagesTested}
          helper={`${sitemap?.discoveredPages ?? "?"} discovered`}
          icon={<Globe className="h-4 w-4" />}
        />
        <StatTile
          label="Failed pages"
          value={failedPages}
          tone={failedPages > 0 ? "error" : "neutral"}
          helper={failedPages > 0 ? "Need immediate attention" : "All clear"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatTile
          label="Warnings"
          value={warnedPages}
          tone={warnedPages > 0 ? "warning" : "neutral"}
          helper={warnedPages > 0 ? "Worth a look" : "Nothing flagged"}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatTile
          label="Broken links"
          value={totalBrokenLinks}
          tone={totalBrokenLinks > 0 ? "error" : "neutral"}
          helper={`Across ${pagesWithBroken} page${pagesWithBroken === 1 ? "" : "s"}`}
          icon={<FileText className="h-4 w-4" />}
        />
      </section>

      {/* Pass/warn/fail at-a-glance bar. Replaces the old "passed/warning/
          failed" prose row from the legacy design. */}
      <section className="mt-4">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between text-[13px] text-ink-2">
              <span>Page health</span>
              <span>
                {passedPages} passed · {warnedPages} warning · {failedPages} failed
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-line-2">
              {totalPagesTested > 0 ? (
                <>
                  <span
                    className="bg-success"
                    style={{ width: `${(passedPages / totalPagesTested) * 100}%` }}
                  />
                  <span
                    className="bg-warning"
                    style={{ width: `${(warnedPages / totalPagesTested) * 100}%` }}
                  />
                  <span
                    className="bg-error"
                    style={{ width: `${(failedPages / totalPagesTested) * 100}%` }}
                  />
                </>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Page Results — the centerpiece. Filter chips + table. */}
      <section className="mt-6">
        <Card>
          <CardHeader title={`Page Results (${pageResults.length})`} />
          <PageResultsTable rows={pageResults} />
        </Card>
      </section>

      {/* Lighthouse + HubSpot side by side */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Lighthouse" />
          <CardBody className="grid grid-cols-2 gap-3">
            <LighthouseTile label="Performance" value={lighthousePerformance} threshold={60} />
            <LighthouseTile label="SEO" value={lighthouseSeo} threshold={70} />
            <LighthouseTile label="Accessibility" value={lighthouseAccessibility} threshold={70} />
            <LighthouseTile label="Best Practices" value={lighthouseBestPractices} threshold={80} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="HubSpot Forms" />
          <CardBody>
            {hubspotPagesFound === 0 ? (
              <p className="text-[13px] text-ink-3">
                No HubSpot embed forms detected on tested pages.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <MetricLine label="Pages with form" value={hubspotPagesFound} />
                <MetricLine
                  label="Submitted, verified"
                  value={hubspotSubmittedOk}
                  tone={hubspotSubmittedOk > 0 ? "success" : "neutral"}
                />
                <MetricLine
                  label="Submitted, no success"
                  value={hubspotSubmittedFailed}
                  tone={hubspotSubmittedFailed > 0 ? "error" : "neutral"}
                />
                <MetricLine
                  label="Found, not visible"
                  value={hubspotInvisible}
                  tone={hubspotInvisible > 0 ? "warning" : "neutral"}
                />
              </div>
            )}
            {pageResults.some((p) => p.hubspotForm?.found) ? (
              <details className="mt-4 border-t border-line-2 pt-3 text-[13px]">
                <summary className="cursor-pointer text-ink-2 hover:text-ink">
                  Per-page detail
                </summary>
                <ul className="mt-3 space-y-3">
                  {pageResults
                    .filter((p) => p.hubspotForm?.found)
                    .map((page, index) => {
                      const form = page.hubspotForm!;
                      const tone = form.attempted && form.succeeded
                        ? "success"
                        : form.attempted && !form.succeeded
                          ? "error"
                          : form.visible === false
                            ? "warning"
                            : "neutral";
                      return (
                        <li key={index} className="rounded-[8px] bg-surface-2 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <a href={page.url} target="_blank" rel="noreferrer" className="text-ink hover:underline">
                              {page.url}
                            </a>
                            <Pill tone={tone}>
                              {form.attempted && form.succeeded
                                ? "Verified"
                                : form.attempted
                                  ? "Unverified"
                                  : form.visible === false
                                    ? "Not visible"
                                    : "Found"}
                            </Pill>
                          </div>
                          <p className="mt-2 text-ink-2">{form.detail}</p>
                          {form.missingFields && form.missingFields.length > 0 ? (
                            <p className="mt-1 text-warning">
                              Missing/unmatched fields: {form.missingFields.join(", ")}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              </details>
            ) : null}
          </CardBody>
        </Card>
      </section>

      {/* Cross-browser modules + Console errors side by side */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Cross-browser modules (${modules.length})`} />
          <CardBody>
            {modules.length === 0 ? (
              <p className="text-[13px] text-ink-3">
                No cross-browser modules ran for this QA cycle.
              </p>
            ) : (
              <ul className="space-y-2 text-[13px]">
                {modules.map((module, index) => (
                  <li
                    key={`${module.name}-${index}`}
                    className="flex items-start justify-between gap-3 rounded-[8px] bg-surface-2 p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-ink">{module.name}</div>
                      {module.details.length > 0 ? (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-2">
                          {module.details.map((detail, i) => (
                            <li key={i}>{detail}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <Pill tone={statusTone(module.status)}>{module.status}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Console errors (${consoleErrors.length})`} />
          <CardBody>
            {consoleErrors.length === 0 ? (
              <p className="text-[13px] text-ink-3">
                No browser console errors captured during this run.
              </p>
            ) : (
              <ul className="space-y-2">
                {consoleErrors.map((line, index) => (
                  <li
                    key={index}
                    className="rounded-[8px] bg-surface-2 p-3 font-mono text-[12px] leading-relaxed text-ink-2"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      {/* Raw payload — last resort, collapsed by default. */}
      <section className="mt-6">
        <Card>
          <CardHeader title="Raw payload" />
          <CardBody>
            <details>
              <summary className="cursor-pointer text-[13px] font-medium text-ink-2 hover:text-ink">
                Show JSON
              </summary>
              <pre className="mt-3 max-h-[480px] overflow-auto rounded-[8px] bg-surface-2 p-3 font-mono text-[12px] leading-relaxed text-ink-2">
                {JSON.stringify(run.payload, null, 2)}
              </pre>
            </details>
          </CardBody>
        </Card>
      </section>
    </PageChrome>
  );
}

function LighthouseTile({
  label,
  value,
  threshold
}: {
  label: string;
  value: number | null;
  threshold: number;
}) {
  const tone =
    value === null
      ? "neutral"
      : value < threshold
        ? "error"
        : value < threshold + 15
          ? "warning"
          : "success";
  return (
    <div className="rounded-[8px] bg-surface-2 p-3">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={
            tone === "error"
              ? "text-[24px] font-semibold text-error"
              : tone === "warning"
                ? "text-[24px] font-semibold text-warning"
                : tone === "success"
                  ? "text-[24px] font-semibold text-success"
                  : "text-[24px] font-semibold text-ink"
          }
        >
          {value ?? "—"}
        </span>
        {value !== null ? <span className="text-[12px] text-ink-3">/ 100</span> : null}
      </div>
    </div>
  );
}

function MetricLine({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "error";
}) {
  const colorClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "error"
          ? "text-error"
          : "text-ink";
  return (
    <div className="rounded-[8px] bg-surface-2 p-3">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className={`mt-1 text-[24px] font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}
