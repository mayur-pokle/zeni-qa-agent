export type ProjectStatus = "HEALTHY" | "WARNING" | "DOWN";
export type RunStatus = "PASSED" | "FAILED" | "WARNING" | "RUNNING";
export type Environment = "STAGING" | "PRODUCTION";

export type ProjectListFilters = {
  search?: string;
  monitoring?: "all" | "active" | "inactive";
  issueState?: "all" | "issues" | "healthy";
  sort?: "lastRun" | "createdAt";
};

export type QaRunRecord = {
  id: string;
  projectId: string;
  environment: Environment;
  status: RunStatus;
  startedAt: string | Date;
  completedAt?: string | Date | null;
  performanceScore?: number | null;
  seoScore?: number | null;
  accessibility?: number | null;
  payload: unknown;
};

export type LighthouseReportRecord = {
  id: string;
  projectId: string;
  environment: Environment;
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  reportPath: string;
  createdAt: string | Date;
};

export type UptimeLogRecord = {
  id: string;
  projectId: string;
  environment: Environment;
  isUp: boolean;
  statusCode?: number | null;
  responseMs?: number | null;
  checkedAt: string | Date;
  errorDetails?: string | null;
};

export type ErrorLogRecord = {
  id: string;
  projectId: string;
  environment: Environment;
  source: string;
  severity: string;
  message: string;
  createdAt: string | Date;
};

export type ProjectWithRelations = {
  id: string;
  name: string;
  slug: string;
  stagingUrl?: string | null;
  productionUrl: string;
  monitoringActive: boolean;
  monitoringIntervalMinutes: number;
  notifyOnCompletion: boolean;
  status: ProjectStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastRunAt?: string | Date | null;
  performanceScore?: number | null;
  healthScore: number;
  userId: string;
  qaRuns: QaRunRecord[];
  lighthouseReports: LighthouseReportRecord[];
  uptimeLogs: UptimeLogRecord[];
  errorLogs?: ErrorLogRecord[];
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
  modules: QaModuleResult[];
  environmentUrl: string;
  consoleErrors: string[];
  lighthouse?: {
    performanceScore?: number;
    seoScore?: number;
    accessibilityScore?: number;
    bestPracticesScore?: number;
  };
};

export type QaRunDetail = QaRunRecord & {
  project: {
    id: string;
    name: string;
    stagingUrl?: string | null;
    productionUrl: string;
  };
};
