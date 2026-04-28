import Link from "next/link";
import Image from "next/image";
import { ProfileMenu } from "@/components/ui/profile-menu";

/**
 * Light-mode page wrapper. The Dashboard / Settings nav links moved
 * into the profile dropdown so the top bar stays clean — just a
 * clickable logo (back to dashboard) on the left and the avatar on
 * the right.
 *
 * `userEmail` is passed in by each parent page (server-side via
 * `getCurrentUserEmail()`) so the avatar's initials are personalised.
 * Kept as a prop instead of read inline so this component can be used
 * inside both server pages and client components like DashboardClient.
 */
export function PageChrome({
  breadcrumb,
  title,
  subtitle,
  actions,
  children,
  userEmail
}: {
  breadcrumb?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line-2 bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-[6px] outline-none focus:ring-2 focus:ring-brand/30"
            aria-label="Flowtest dashboard"
          >
            <Image
              src="/flowtest-logo.svg"
              alt="Flowtest"
              width={132}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </Link>
          {userEmail ? <ProfileMenu email={userEmail} /> : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {breadcrumb ? (
              <div className="mb-2 text-xs text-ink-3">{breadcrumb}</div>
            ) : null}
            <h1 className="text-2xl font-semibold leading-tight text-ink">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
