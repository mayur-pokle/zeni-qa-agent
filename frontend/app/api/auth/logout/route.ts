import { NextResponse } from "next/server";
import { SESSION_COOKIE, USER_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of [SESSION_COOKIE, USER_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      maxAge: 0,
      path: "/"
    });
  }
  return response;
}
