import { NextRequest, NextResponse } from "next/server";
import { getQaProgress } from "@/lib/progress";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const progress = await getQaProgress(projectId);
  return NextResponse.json({ progress });
}
