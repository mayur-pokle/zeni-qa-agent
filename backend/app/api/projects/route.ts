import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db";
import { projectFiltersSchema, projectSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = projectFiltersSchema.parse(searchParams);
  const projects = await listProjects(filters);
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = projectSchema.parse({
      ...body,
      monitoringIntervalMinutes:
        typeof body.monitoringIntervalMinutes === "number"
          ? body.monitoringIntervalMinutes
          : body.monitoringIntervalMinutes
            ? Number(body.monitoringIntervalMinutes)
            : undefined
    });
    const project = await createProject(payload);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create project" },
      { status: 400 }
    );
  }
}
