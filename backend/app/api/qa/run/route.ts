import { NextRequest, NextResponse } from "next/server";
import { Environment } from "@prisma/client";
import { executeQaRun } from "@/lib/qa";
import { qaRunSchema } from "@/lib/validators";
import { sendAlertEmail, sendSlackAlert } from "@/lib/alerts";
import { getProject } from "@/lib/db";
import { buildQaRunsCsv } from "@/lib/reports";
import { slugify } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const searchProjectId = request.nextUrl.searchParams.get("projectId");
    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : {};

    const payload = qaRunSchema.parse({
      projectId: body.projectId ?? searchProjectId,
      environment: body.environment ?? request.nextUrl.searchParams.get("environment") ?? "PRODUCTION"
    });

    const run = await executeQaRun(payload.projectId, payload.environment as Environment);
    const project = await getProject(payload.projectId);

    if (project && (run.status !== "PASSED" || project.notifyOnCompletion)) {
      const csv = buildQaRunsCsv([run]);
      const subject =
        run.status !== "PASSED"
          ? `[QA Alert] ${project.name} ${payload.environment} ${run.status}`
          : `[QA Report] ${project.name} ${payload.environment} completed`;
      const body = [
        `QA run finished with status ${run.status}.`,
        `Performance score: ${run.performanceScore ?? "N/A"}.`,
        `SEO score: ${run.seoScore ?? "N/A"}.`,
        `Accessibility score: ${run.accessibility ?? "N/A"}.`,
        project.notifyOnCompletion ? "CSV report attached." : ""
      ]
        .filter(Boolean)
        .join(" ");

      await sendAlertEmail({
        projectName: project.name,
        subject,
        body,
        attachments: project.notifyOnCompletion
          ? [
              {
                filename: `${slugify(project.name)}-${String(payload.environment).toLowerCase()}-qa-report.csv`,
                content: csv
              }
            ]
          : []
      });

      // Fan out to Slack in parallel; never fail the run on Slack errors.
      sendSlackAlert({
        projectName: project.name,
        title: subject,
        body
      }).catch((err) => {
        console.warn("[slack] alert failed:", err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to execute QA run" },
      { status: 400 }
    );
  }
}
