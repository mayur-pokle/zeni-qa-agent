import type { LighthouseReport, Project, QaRun, UptimeLog, ErrorLog } from "@prisma/client";

export type ProjectListFilters = {
  search?: string;
  monitoring?: "all" | "active" | "inactive";
  issueState?: "all" | "issues" | "healthy";
  sort?: "lastRun" | "createdAt";
};

export type ProjectWithRelations = Project & {
  qaRuns: QaRun[];
  lighthouseReports: LighthouseReport[];
  uptimeLogs: UptimeLog[];
  errorLogs?: ErrorLog[];
};

export type QaModuleResult = {
  name: string;
  status: "passed" | "failed" | "warning";
  details: string[];
};

export type QaExecutionPayload = {
  summary: {
    totalChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
  sitemap: {
    discoveredPages: number;
    testedPages: number;
  };
  pageResults: Array<{
    url: string;
    status: "passed" | "failed" | "warning";
    issues: string[];
    environment?: "STAGING" | "PRODUCTION";
    statusCode?: number | null;
    timestamp?: string;
    ctaCount?: number;
    formCount?: number;
    layoutShiftCount?: number;
  }>;
  modules: QaModuleResult[];
  environmentUrl: string;
  consoleErrors: string[];
};
