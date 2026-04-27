import { QaRun } from "@prisma/client";
import { stringify } from "csv-stringify/sync";
import { getProject } from "@/lib/db";
import { formatDate } from "@/lib/utils";

type RunPayload = {
  pageResults?: Array<{
    url: string;
    status: string;
    issues?: string[];
    environment?: string;
    statusCode?: number | null;
    timestamp?: string;
    ctaCount?: number;
    formCount?: number;
    layoutShiftCount?: number;
    hubspotForm?: {
      found: boolean;
      embedKind?: "iframe" | "inline";
      visible?: boolean;
      attempted: boolean;
      succeeded: boolean;
      detail: string;
      missingFields?: string[];
    };
    linksChecked?: number;
    brokenLinks?: Array<{ url: string; status: number | null; reason?: string }>;
  }>;
  lighthouse?: {
    performanceScore?: number;
    seoScore?: number;
    accessibilityScore?: number;
    bestPracticesScore?: number;
  };
};

type HubspotFormCsv = {
  found: boolean;
  embedKind?: "iframe" | "inline";
  visible?: boolean;
  attempted: boolean;
  succeeded: boolean;
  detail: string;
  missingFields?: string[];
};

function hubspotFormStatusLabel(form?: HubspotFormCsv) {
  if (!form || !form.found) return "";
  if (form.attempted && form.succeeded) return "submitted-verified";
  if (form.attempted && !form.succeeded) return "submitted-no-success";
  if (form.visible === false) return "found-not-visible";
  return "found-visibility-only";
}

function buildLighthouseComment(payload: RunPayload, run: Pick<QaRun, "performanceScore" | "seoScore" | "accessibility">) {
  const performanceScore = payload.lighthouse?.performanceScore ?? run.performanceScore ?? 0;
  const seoScore = payload.lighthouse?.seoScore ?? run.seoScore ?? 0;
  const accessibilityScore = payload.lighthouse?.accessibilityScore ?? run.accessibility ?? 0;
  const bestPracticesScore = payload.lighthouse?.bestPracticesScore ?? 0;

  const notes = [
    performanceScore < 60 ? "Performance below threshold; investigate large assets, render-blocking scripts, and slow server responses." : "",
    seoScore < 70 ? "SEO below threshold; review title tags, meta descriptions, heading order, and crawlability." : "",
    accessibilityScore < 70 ? "Accessibility below threshold; review labels, contrast, semantic structure, and keyboard flows." : "",
    bestPracticesScore < 80 ? "Best Practices below target; review console noise, insecure requests, and browser compatibility warnings." : ""
  ].filter(Boolean);

  return notes.join(" | ") || "Lighthouse scores are within the configured target range.";
}

export function buildQaRunsCsv(runs: Array<Pick<QaRun, "id" | "environment" | "status" | "performanceScore" | "seoScore" | "accessibility" | "startedAt" | "completedAt" | "payload">>) {
  return stringify(
    runs.flatMap((run) => {
      const payload = (run.payload ?? {}) as RunPayload;
      const pageResults = payload.pageResults ?? [];
      const lighthouseComment = buildLighthouseComment(payload, run);
      const lighthousePerformance = payload.lighthouse?.performanceScore ?? run.performanceScore ?? "";
      const lighthouseSeo = payload.lighthouse?.seoScore ?? run.seoScore ?? "";
      const lighthouseAccessibility = payload.lighthouse?.accessibilityScore ?? run.accessibility ?? "";
      const lighthouseBestPractices = payload.lighthouse?.bestPracticesScore ?? "";

      return pageResults.length > 0
        ? pageResults.map((pageResult) => ({
            runId: run.id,
            environment: pageResult.environment ?? run.environment,
            runStatus: run.status,
            pageUrl: pageResult.url,
            pageStatus: pageResult.status,
            pageStatusCode: pageResult.statusCode ?? "",
            ctaCount: pageResult.ctaCount ?? "",
            formCount: pageResult.formCount ?? "",
            hubspotFormStatus: hubspotFormStatusLabel(pageResult.hubspotForm),
            hubspotFormEmbedKind: pageResult.hubspotForm?.embedKind ?? "",
            hubspotFormDetail: pageResult.hubspotForm?.detail ?? "",
            layoutShiftCount: pageResult.layoutShiftCount ?? "",
            linksChecked: pageResult.linksChecked ?? "",
            brokenLinksCount: pageResult.brokenLinks?.length ?? 0,
            brokenLinks: (pageResult.brokenLinks ?? [])
              .map((l) => `${l.url} [${l.status ?? l.reason ?? "?"}]`)
              .join(" | "),
            lighthousePerformance,
            lighthouseSeo,
            lighthouseAccessibility,
            lighthouseBestPractices,
            lighthouseComment,
            issues: (pageResult.issues ?? []).join(" | "),
            pageTimestamp: pageResult.timestamp ? formatDate(pageResult.timestamp) : "",
            startedAt: formatDate(run.startedAt),
            completedAt: formatDate(run.completedAt)
          }))
        : [
            {
              runId: run.id,
              environment: run.environment,
              runStatus: run.status,
              pageUrl: "",
              pageStatus: "",
              pageStatusCode: "",
              ctaCount: "",
              formCount: "",
              hubspotFormStatus: "",
              hubspotFormEmbedKind: "",
              hubspotFormDetail: "",
              layoutShiftCount: "",
              linksChecked: "",
              brokenLinksCount: 0,
              brokenLinks: "",
              lighthousePerformance,
              lighthouseSeo,
              lighthouseAccessibility,
              lighthouseBestPractices,
              lighthouseComment,
              issues: "",
              pageTimestamp: "",
              startedAt: formatDate(run.startedAt),
              completedAt: formatDate(run.completedAt)
            }
          ];
    }),
    { header: true }
  );
}

export async function buildCsvReport(projectId: string) {
  const project = await getProject(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  return buildQaRunsCsv(project.qaRuns);
}
