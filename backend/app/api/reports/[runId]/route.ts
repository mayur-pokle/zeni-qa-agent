import { NextResponse } from "next/server";
import { buildCsvReport } from "@/lib/reports";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId: projectId } = await params;
  const csv = await buildCsvReport(projectId);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="qa-report-${projectId}.csv"`
    }
  });
}
