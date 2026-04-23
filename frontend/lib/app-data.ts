import type { ConnectionSettings } from "@/lib/app-settings";
import { fetchBackendJson } from "@/lib/backend";
import type { ProjectListFilters, ProjectWithRelations } from "@/lib/types";

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

export async function getConnectionStateForApp(): Promise<{
  settings: ConnectionSettings;
  isComplete: boolean;
}> {
  try {
    return await fetchBackendJson<{
      settings: ConnectionSettings;
      isComplete: boolean;
    }>("/api/settings/connections");
  } catch (error) {
    console.error("[frontend] unable to load connection settings", error);
    return {
      settings: {
        uptimeRobotApiKey: "",
        smtpHost: "smtp.gmail.com",
        smtpPort: "465",
        smtpSecure: true,
        smtpUser: "",
        smtpPassword: "",
        smtpFrom: "",
        alertEmail: ""
      },
      isComplete: false
    };
  }
}
