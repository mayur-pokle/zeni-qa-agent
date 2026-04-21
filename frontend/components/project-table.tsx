import Link from "next/link";
import type { ProjectWithRelations } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { StatusPill } from "@/components/cards";

export function ProjectTable({ projects }: { projects: ProjectWithRelations[] }) {
  return (
    <div className="overflow-x-auto border border-[#f5f5f4]/20">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="border-b border-[#f5f5f4]/20 text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">
          <tr>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last QA</th>
            <th className="px-4 py-3">Uptime</th>
            <th className="px-4 py-3">Performance</th>
            <th className="px-4 py-3">Monitoring</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const latestUptime = project.uptimeLogs[0];
            const latestLighthouse = project.lighthouseReports[0];
            return (
              <tr key={project.id} className="border-b border-[#f5f5f4]/10">
                <td className="px-4 py-4 align-top">
                  <Link href={`/projects/${project.id}`} className="block uppercase tracking-[0.14em] underline-offset-4 hover:underline">
                    {project.name}
                  </Link>
                  <p className="mt-2 text-xs text-[#f5f5f4]/55">{project.productionUrl}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusPill label={project.status} />
                </td>
                <td className="px-4 py-4 align-top">{formatDate(project.lastRunAt)}</td>
                <td className="px-4 py-4 align-top">
                  {latestUptime ? (
                    <div className="space-y-1">
                      <div>{latestUptime.isUp ? "UP" : "DOWN"}</div>
                      <div className="text-xs text-[#f5f5f4]/55">{formatDate(latestUptime.checkedAt)}</div>
                    </div>
                  ) : (
                    "No logs"
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  {latestLighthouse ? (
                    <div className="space-y-1">
                      <div>P {latestLighthouse.performanceScore}</div>
                      <div className="text-xs text-[#f5f5f4]/55">SEO {latestLighthouse.seoScore} / A11Y {latestLighthouse.accessibilityScore}</div>
                    </div>
                  ) : (
                    project.performanceScore ?? "N/A"
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  <div>{project.monitoringActive ? "ON" : "OFF"}</div>
                  <div className="text-xs text-[#f5f5f4]/55">{project.monitoringIntervalMinutes} mins</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
