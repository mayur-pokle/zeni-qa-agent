import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "qa_monitor_session";
const SESSION_VALUE = "Mayur";

export async function isAuthenticated() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export async function requireAuthenticatedRoute() {
  if (!(await isAuthenticated())) {
    redirect("/");
  }
}

export function getSessionCookie(rememberMe: boolean) {
  return {
    name: SESSION_COOKIE,
    value: SESSION_VALUE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {})
  };
}
