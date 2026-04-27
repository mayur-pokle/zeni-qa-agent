import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { SectionCard, StatCard, StatusPill, TimelineRow } from "@/components/cards";
import { getQaRunForApp } from "@/lib/app-data";
import { formatDate } from "@/lib/utils";
import { requireAuthenticatedRoute } from "@/lib/session";
import type { QaExecutionPayload } from "@/lib/types";

type PageResult = QaExecutionPayload["pageResults"][number];

function hubspotFormStatusLabel(form?: PageResult["hubspotForm"]) {
  if (!form || !form.found) return "Not detected";
  if (form.attempted && form.succeeded) return "Submitted • verified";
  if (form.attempted && !form.succeeded) return "Submitted • unverified";
  if (form.visible === false) return "Found • not visible";
  return "Found • visibility only";
}

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

  const hubspotPagesFound = pageResults.filter((p) => p.hubspotForm?.found).length;
  const hubspotSubmittedOk = pageResults.filter((p) => p.hubspotForm?.attempted && p.hubspotForm?.succeeded).length;
  const hubspotSubmittedFailed = pageResults.filter((p) => p.hubspotForm?.attempted && !p.hubspotForm?.succeeded).length;
  const hubspotInvisible = pageResults.filter((p) => p.hubspotForm?.found && p.hubspotForm?.visible === false).length;

  return (
    <Shell
      title={`QA Run · ${run.environment}`}
      description={
        <span>
          <Link href={`/projects/${run.project.id}`} className="underline">
            {run.project.name}
          </Link>
          {" · "}
          Started {formatDate(run.startedAt)} · Duration {durationLabel(run.startedAt, run.completedAt)}
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${run.project.id}`}
            className="inline-flex border border-[#f5f5f4]/30 px-4 py-2 text-xs uppercase tracking-[0.28em]"
          >
            Back to project
          </Link>
          <a
            href={`/api/reports/${run.project.id}`}
            className="inline-flex border border-[#f5f5f4]/30 px-4 py-2 text-xs uppercase tracking-[0.28em]"
            download
          >
            Download CSV
          </a>
        </div>
      }
    >
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Status" value={run.status} helper={`Run ID ${run.id.slice(0, 8)}…`} />
        <StatCard label="Environment" value={run.environment} helper={run.environment === "PRODUCTION" ? run.project.productionUrl : (run.project.stagingUrl ?? run.project.productionUrl)} />
        <StatCard label="Pages tested" value={sitemap?.testedPages ?? pageResults.length} helper={`${sitemap?.discoveredPages ?? "?"} discovered`} />
        <StatCard label="Failed checks" value={summary?.failedChecks ?? failedPages} helper={`${summary?.warningChecks ?? warnedPages} warnings`} />
      </section>

      <nav className="sticky top-0 z-20 mt-6 -mx-6 flex flex-wrap items-center gap-1 border-b border-[#f5f5f4]/15 bg-[#292524]/92 px-6 py-3 text-[10px] uppercase tracking-[0.28em] backdrop-blur">
        {[
          { id: "overview", label: "Overview" },
          { id: "lighthouse", label: "Lighthouse" },
          { id: "hubspot", label: "HubSpot" },
          { id: "pages", label: `Pages (${pageResults.length})` },
          { id: "modules", label: "Modules" },
          { id: "console", label: `Console (${consoleErrors.length})` },
          { id: "raw", label: "Raw" }
        ].map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="border border-transparent px-3 py-1.5 text-[#f5f5f4]/70 transition hover:border-[#f5f5f4]/30 hover:text-[#f5f5f4]"
          >
            {item.label}
          </a>
        ))}
        <a
          href="#top"
          className="ml-auto border border-[#f5f5f4]/20 px-3 py-1.5 text-[#f5f5f4]/70 transition hover:border-[#f5f5f4]/40 hover:text-[#f5f5f4]"
        >
          Top ↑
        </a>
      </nav>
      <span id="top" className="sr-only" aria-hidden="true" />

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div id="overview" className="scroll-mt-20">
          <SectionCard title="Run Overview">
            <TimelineRow label="Started" value={run.startedAt} formatAsDate />
            <TimelineRow label="Completed" value={run.completedAt ?? "—"} formatAsDate />
            <TimelineRow label="Duration" value={durationLabel(run.startedAt, run.completedAt)} />
            <TimelineRow label="Environment URL" value={payload.environmentUrl ?? "—"} />
            <TimelineRow
              label="Pages"
              value={
                <span>
                  <span className="text-emerald-300">{passedPages} passed</span>{" · "}
                  <span className="text-amber-300">{warnedPages} warning</span>{" · "}
                  <span className="text-rose-300">{failedPages} failed</span>
                </span>
              }
            />
            {summary ? (
              <TimelineRow
                label="Total checks"
                value={`${summary.totalChecks} executed (${summary.failedChecks} failed, ${summary.warningChecks} warnings)`}
              />
            ) : null}
          </SectionCard>
        </div>

        <div id="lighthouse" className="scroll-mt-20">
          <SectionCard title="Lighthouse">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border border-[#f5f5f4]/10 p-3">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/55">Performance</div>
                <div className="mt-1 text-2xl">{lighthousePerformance ?? "—"}</div>
              </div>
              <div className="border border-[#f5f5f4]/10 p-3">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/55">SEO</div>
                <div className="mt-1 text-2xl">{lighthouseSeo ?? "—"}</div>
              </div>
              <div className="border border-[#f5f5f4]/10 p-3">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/55">Accessibility</div>
                <div className="mt-1 text-2xl">{lighthouseAccessibility ?? "—"}</div>
              </div>
              <div className="border border-[#f5f5f4]/10 p-3">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/55">Best Practices</div>
                <div className="mt-1 text-2xl">{lighthouseBestPractices ?? "—"}</div>
              </div>
            </div>
          </SectionCard>
        </div>
      </section>

      <section id="hubspot" className="mt-6 scroll-mt-20">
        <SectionCard title="HubSpot Forms">
          {hubspotPagesFound === 0 ? (
            <p className="text-sm text-[#f5f5f4]/65">No HubSpot embed forms detected on tested pages.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="border border-[#f5f5f4]/10 p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/55">Pages with form</div>
                <div className="mt-1 text-2xl">{hubspotPagesFound}</div>
              </div>
              <div className="border border-[#f5f5f4]/10 p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/55">Submitted &amp; verified</div>
                <div className="mt-1 text-2xl text-emerald-300">{hubspotSubmittedOk}</div>
              </div>
              <div className="border border-[#f5f5f4]/10 p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/55">Submitted, no success</div>
                <div className="mt-1 text-2xl text-rose-300">{hubspotSubmittedFailed}</div>
              </div>
              <div className="border border-[#f5f5f4]/10 p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/55">Found, not visible</div>
                <div className="mt-1 text-2xl text-amber-300">{hubspotInvisible}</div>
              </div>
            </div>
          )}
        </SectionCard>
      </section>

      <section id="pages" className="mt-6 scroll-mt-20">
        <SectionCard title={`Page Results (${pageResults.length})`}>
          {pageResults.length === 0 ? (
            <p className="text-sm text-[#f5f5f4]/65">No pages were captured for this run.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#f5f5f4]/15 text-left uppercase tracking-[0.22em] text-[#f5f5f4]/55">
                    <th className="px-2 py-2">URL</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">HTTP</th>
                    <th className="px-2 py-2">CTAs</th>
                    <th className="px-2 py-2">Forms</th>
                    <th className="px-2 py-2">HubSpot</th>
                    <th className="px-2 py-2">Embed</th>
                    <th className="px-2 py-2">Layout shifts</th>
                    <th className="px-2 py-2">Checked at</th>
                    <th className="px-2 py-2">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {pageResults.map((page, index) => {
                    const statusColor =
                      page.status === "failed"
                        ? "text-rose-300"
                        : page.status === "warning"
                          ? "text-amber-300"
                          : "text-emerald-300";
                    return (
                      <tr key={`${page.url}-${index}`} className="border-b border-[#f5f5f4]/8 align-top">
                        <td className="max-w-[260px] truncate px-2 py-2">
                          <a href={page.url} target="_blank" rel="noreferrer" className="underline" title={page.url}>
                            {page.url}
                          </a>
                        </td>
                        <td className={`px-2 py-2 uppercase tracking-[0.22em] ${statusColor}`}>{page.status}</td>
                        <td className="px-2 py-2">{page.statusCode ?? "—"}</td>
                        <td className="px-2 py-2">{page.ctaCount ?? "—"}</td>
                        <td className="px-2 py-2">{page.formCount ?? "—"}</td>
                        <td className="px-2 py-2">{hubspotFormStatusLabel(page.hubspotForm)}</td>
                        <td className="px-2 py-2">{page.hubspotForm?.embedKind ?? "—"}</td>
                        <td className="px-2 py-2">{page.layoutShiftCount ?? "—"}</td>
                        <td className="px-2 py-2 text-[#f5f5f4]/70">
                          {page.timestamp ? formatDate(page.timestamp) : "—"}
                        </td>
                        <td className="max-w-[320px] px-2 py-2">
                          {page.issues && page.issues.length > 0 ? (
                            <ul className="list-disc pl-4 leading-5 text-[#f5f5f4]/80">
                              {page.issues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[#f5f5f4]/55">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>

      {pageResults.some((p) => p.hubspotForm?.found) ? (
        <section className="mt-6">
          <SectionCard title="HubSpot Form Detail">
            <div className="space-y-3">
              {pageResults
                .filter((p) => p.hubspotForm?.found)
                .map((page, index) => {
                  const form = page.hubspotForm!;
                  return (
                    <div key={`hf-${index}`} className="border border-[#f5f5f4]/10 p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <a href={page.url} target="_blank" rel="noreferrer" className="underline" title={page.url}>
                          {page.url}
                        </a>
                        <StatusPill label={hubspotFormStatusLabel(form)} />
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div>Embed kind: {form.embedKind ?? "—"}</div>
                        <div>Visible: {form.visible === undefined ? "—" : form.visible ? "yes" : "no"}</div>
                        <div>Submit attempted: {form.attempted ? "yes" : "no"}</div>
                        <div>Success verified: {form.succeeded ? "yes" : "no"}</div>
                      </div>
                      <div className="mt-3 text-[#f5f5f4]/80">{form.detail}</div>
                      {form.missingFields && form.missingFields.length > 0 ? (
                        <div className="mt-2 text-amber-300">
                          Missing/unmatched fields: {form.missingFields.join(", ")}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </SectionCard>
        </section>
      ) : null}

      <section id="modules" className="mt-6 scroll-mt-20">
        <SectionCard title={`Cross-browser Modules (${modules.length})`}>
          {modules.length === 0 ? (
            <p className="text-sm text-[#f5f5f4]/65">No cross-browser modules ran for this QA cycle.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {modules.map((module, index) => {
                const color =
                  module.status === "failed"
                    ? "text-rose-300"
                    : module.status === "warning"
                      ? "text-amber-300"
                      : "text-emerald-300";
                return (
                  <div key={`${module.name}-${index}`} className="border border-[#f5f5f4]/10 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="uppercase tracking-[0.22em]">{module.name}</div>
                      <span className={`text-xs uppercase tracking-[0.22em] ${color}`}>{module.status}</span>
                    </div>
                    {module.details.length > 0 ? (
                      <ul className="mt-3 list-disc pl-4 leading-6 text-[#f5f5f4]/80">
                        {module.details.map((detail, i) => (
                          <li key={i}>{detail}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-[#f5f5f4]/55">No additional notes.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </section>

      <section id="console" className="mt-6 scroll-mt-20">
        <SectionCard title={`Console Errors (${consoleErrors.length})`}>
          {consoleErrors.length === 0 ? (
            <p className="text-sm text-[#f5f5f4]/65">No browser console errors captured during this run.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {consoleErrors.map((line, index) => (
                <li key={index} className="border border-[#f5f5f4]/10 p-3 font-mono text-xs leading-5 text-[#f5f5f4]/85">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      <section id="raw" className="mt-6 scroll-mt-20">
        <SectionCard title="Raw Payload">
          <details>
            <summary className="cursor-pointer text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/65">
              Show JSON
            </summary>
            <pre className="mt-3 max-h-[480px] overflow-auto border border-[#f5f5f4]/10 p-3 font-mono text-[11px] leading-5 text-[#f5f5f4]/85">
              {JSON.stringify(run.payload, null, 2)}
            </pre>
          </details>
        </SectionCard>
      </section>
    </Shell>
  );
}
