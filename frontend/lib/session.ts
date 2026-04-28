import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "qa_monitor_session";
export const USER_COOKIE = "qa_monitor_user";
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

/**
 * Returns the email of the currently signed-in user, or null if not
 * authenticated. Used by PageChrome to render the avatar + profile
 * menu.
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const store = await cookies();
  if (store.get(SESSION_COOKIE)?.value !== SESSION_VALUE) return null;
  const email = store.get(USER_COOKIE)?.value;
  return email && email.includes("@") ? email : null;
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

/**
 * Companion cookie storing the signed-in user's email so the UI can
 * personalise the avatar + profile menu. Same lifetime as the session
 * cookie. Not httpOnly — the email is non-sensitive and we need it
 * available to server components rendering the chrome.
 */
export function getUserCookie(email: string, rememberMe: boolean) {
  return {
    name: USER_COOKIE,
    value: email,
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {})
  };
}
