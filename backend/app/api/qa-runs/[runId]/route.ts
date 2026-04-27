import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns a single QA run alongside lightweight project context (name + URLs)
 * so the frontend run-detail page can render breadcrumbs and link back without
 * issuing a second round-trip. The full payload JSON is returned verbatim —
 * the page renders all of it (CSV columns + the bits the CSV omits like
 * cross-browser modules and console errors).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const run = await prisma.qaRun.findUnique({
    where: { id: runId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          stagingUrl: true,
          productionUrl: true
        }
      }
    }
  });

  if (!run) {
    return NextResponse.json({ error: "QA run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
