import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const updated = await updateProject(projectId, {
    monitoringActive: !project.monitoringActive
  });

  return NextResponse.json(updated);
}
