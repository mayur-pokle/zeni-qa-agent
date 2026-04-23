import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "flowtest-backend",
    timestamp: new Date().toISOString()
  });
}
