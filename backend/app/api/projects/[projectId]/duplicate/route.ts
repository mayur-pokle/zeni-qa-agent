import { NextResponse } from "next/server";
import { duplicateProject } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await duplicateProject(projectId);
  return NextResponse.json(project, { status: 201 });
}
