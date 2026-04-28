import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const SESSION_VALUE = "Mayur";

/**
 * Catches unauthenticated visits to protected pages and bounces them
 * to the login page with `?next=<original-path>`. The login flow reads
 * `next` and redirects there after a successful sign-in, so a Slack
 * deep link (`/projects/X/runs/Y`) survives the round-trip through
 * authentication.
 *
 * `/` itself hosts the login form; we never want to redirect into a
 * loop, so it's excluded. Static assets, API routes, and Next's
 * internals are excluded via the matcher below.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/") return NextResponse.next();

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionCookie === SESSION_VALUE) return NextResponse.next();

  const target = `${pathname}${search}`;
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/";
  loginUrl.search = `?next=${encodeURIComponent(target)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match every page route except static assets, API routes, and
  // Next.js internal paths. The login page lives at `/` and is
  // explicitly skipped inside the middleware function.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|flowtest-logo.svg).*)"]
};
