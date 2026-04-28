import { NextRequest, NextResponse } from "next/server";
import { loginCredentials } from "@/lib/env";
import { getSessionCookie, getUserCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Accept the historic "username" key as well so a stale browser cache
  // serving the old form doesn't 401 the user; the canonical field is
  // now "email".
  const submittedEmail = String(body.email ?? body.username ?? "").trim().toLowerCase();
  const submittedPassword = String(body.password ?? "");

  const expectedPassword = loginCredentials[submittedEmail];
  if (!expectedPassword || submittedPassword !== expectedPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const remember = Boolean(body.rememberMe);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookie(remember));
  response.cookies.set(getUserCookie(submittedEmail, remember));
  return response;
}
