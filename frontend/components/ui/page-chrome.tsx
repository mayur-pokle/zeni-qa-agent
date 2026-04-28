import Link from "next/link";
import Image from "next/image";
import { LightLogoutButton } from "@/components/ui/light-logout-button";

/**
 * Light-mode page wrapper for redesigned pages. Mirrors what `Shell`
 * does for the dark legacy theme: full-bleed canvas background, top
 * bar with logo + nav, content slot, footer.
 *
 * Phase 2 only redesigns the run report, so this chrome stays minimal.
 * Phase 3 will expand the top bar with a project switcher + nav tabs
 * (Dashboard / Projects / Settings). Until then, the chrome carries
 * just the logo, a back link to the parent project, and the user's
 * sign-out control.
 *
 * The component sets `bg-canvas` on its own root to override the dark
 * `--background` body color from globals.css. That way a redesigned
 * page can sit alongside dark legacy pages without leaking dark space
 * around the gutters.
 */
export function PageChrome({
  breadcrumb,
  title,
  subtitle,
  actions,
  children
}: {
  breadcrumb?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line-2 bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/flowtest-logo.svg"
              alt="Flowtest"
              width={132}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-9 items-center px-3 text-[13px] font-medium text-ink-2 hover:text-ink"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="inline-flex h-9 items-center px-3 text-[13px] font-medium text-ink-2 hover:text-ink"
            >
              Settings
            </Link>
            <LightLogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {breadcrumb ? (
              <div className="mb-2 text-[12px] text-ink-3">{breadcrumb}</div>
            ) : null}
            <h1 className="text-[22px] font-semibold leading-tight text-ink">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
