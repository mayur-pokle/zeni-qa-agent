import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Accept the historic "username" key as well so a stale browser cache
  // serving the old form doesn't 401 the user; the canonical field is
  // now "email".
  const submittedEmail = String(body.email ?? body.username ?? "").trim().toLowerCase();
  const submittedPassword = String(body.password ?? "");

  if (
    submittedEmail !== env.AUTH_EMAIL.toLowerCase() ||
    submittedPassword !== env.AUTH_PASSWORD
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookie(Boolean(body.rememberMe)));
  return response;
}
