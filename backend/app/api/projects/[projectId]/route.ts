import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/db";
import { projectSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const normalizedBody = {
      ...body,
      monitoringIntervalMinutes:
        typeof body.monitoringIntervalMinutes === "number"
          ? body.monitoringIntervalMinutes
          : body.monitoringIntervalMinutes
            ? Number(body.monitoringIntervalMinutes)
            : undefined
    };
    const payload = projectSchema.partial().parse(normalizedBody);
    const project = await updateProject(projectId, payload);
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update project" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  await deleteProject(projectId);
  return NextResponse.json({ ok: true });
}
