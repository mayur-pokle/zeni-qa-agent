import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.username !== "Mayur" || body.password !== "1234") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookie(Boolean(body.rememberMe)));
  return response;
}
