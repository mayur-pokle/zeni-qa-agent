import { Environment } from "@prisma/client";
import { listProjects, storeUptimeLog } from "@/lib/db";

export async function runMonitoringPoll() {
  const projects = await listProjects({
    monitoring: "active",
    sort: "lastRun"
  });

  const results = [];

  for (const project of projects) {
    const targets = [
      ...(project.stagingUrl
        ? [{ environment: Environment.STAGING, url: project.stagingUrl }]
        : []),
      { environment: Environment.PRODUCTION, url: project.productionUrl }
    ];

    for (const target of targets) {
      const startedAt = Date.now();

      try {
        const response = await fetch(target.url, {
          method: "GET",
          headers: {
            "user-agent": "qa-monitor-bot/1.0"
          },
          cache: "no-store"
        });

        results.push(
          await storeUptimeLog({
            projectId: project.id,
            environment: target.environment,
            isUp: response.ok,
            statusCode: response.status,
            responseMs: Date.now() - startedAt,
            errorDetails: response.ok ? undefined : `HTTP ${response.status}`
          })
        );
      } catch (error) {
        results.push(
          await storeUptimeLog({
            projectId: project.id,
            environment: target.environment,
            isUp: false,
            responseMs: Date.now() - startedAt,
            errorDetails: error instanceof Error ? error.message : "Unknown monitoring error"
          })
        );
      }
    }
  }

  return results;
}
