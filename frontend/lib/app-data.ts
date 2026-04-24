import { fetchBackendJson } from "@/lib/backend";
import type { ProjectListFilters, ProjectWithRelations } from "@/lib/types";

export type ConnectionStatus = {
  settings: {
    uptimeRobotApiKey: string;
    smtpHost: string;
    smtpPort: string;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
    smtpFrom: string;
    alertEmail: string;
    slackWebhookUrl: string;
    resendApiKey: string;
    resendFrom: string;
  };
  isComplete: boolean;
};

function buildQuery(filters: ProjectListFilters) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.monitoring) {
    params.set("monitoring", filters.monitoring);
  }

  if (filters.issueState) {
    params.set("issueState", filters.issueState);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listProjectsForApp(filters: ProjectListFilters = {}) {
  try {
    return await fetchBackendJson<ProjectWithRelations[]>(`/api/projects${buildQuery(filters)}`);
  } catch (error) {
    console.error("[frontend] unable to load projects", error);
    return [];
  }
}

export async function getProjectForApp(projectId: string) {
  return fetchBackendJson<ProjectWithRelations>(`/api/projects/${projectId}`);
}

/**
 * Reports whether the backend's environment is fully configured
 * (UptimeRobot + SMTP). Secrets are redacted server-side.
 */
export async function getConnectionStateForApp(): Promise<ConnectionStatus> {
  try {
    return await fetchBackendJson<ConnectionStatus>("/api/settings/connections");
  } catch (error) {
    console.error("[frontend] unable to load connection settings", error);
    return {
      settings: {
        uptimeRobotApiKey: "",
        smtpHost: "",
        smtpPort: "",
        smtpSecure: false,
        smtpUser: "",
        smtpPassword: "",
        smtpFrom: "",
        alertEmail: "",
        slackWebhookUrl: "",
        resendApiKey: "",
        resendFrom: ""
      },
      isComplete: false
    };
  }
}
