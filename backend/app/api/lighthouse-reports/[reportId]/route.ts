import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const report = await prisma.lighthouseReport.findUnique({
    where: { id: reportId }
  });

  if (!report) {
    return NextResponse.json({ error: "Lighthouse report not found" }, { status: 404 });
  }

  try {
    const html = await readFile(report.reportPath, "utf8");
    return new NextResponse(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Unable to read report file: ${error.message}`
            : "Unable to read report file"
      },
      { status: 500 }
    );
  }
}
