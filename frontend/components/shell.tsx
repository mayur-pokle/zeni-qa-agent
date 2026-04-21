import Link from "next/link";
import Image from "next/image";
import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

export function Shell({
  title,
  description,
  children,
  actions
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#292524] text-[#f5f5f4]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-6 border border-[#f5f5f4]/20 p-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/flowtest-logo.svg"
                alt="Flowtest"
                width={152}
                height={28}
                className="h-7 w-auto"
                priority
              />
            </Link>
            <div>
              <h1 className="text-3xl uppercase tracking-[0.18em]">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f5f5f4]/72">{description}</p>
            </div>
          </div>
          <div className={cn("flex flex-wrap gap-3", actions ? "items-center" : "hidden md:flex")}>
            <Link href="/" className="ui-button">
              Dashboard
            </Link>
            <Link href="/settings" className="ui-button">
              Settings
            </Link>
            <LogoutButton />
            {actions}
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="flex items-center gap-2 border border-[#f5f5f4]/20 px-4 py-3 text-xs uppercase tracking-[0.25em] text-[#f5f5f4]/60">
          <FolderKanban className="h-3.5 w-3.5" />
          Multi-project Webflow QA monitoring MVP
        </footer>
      </div>
    </div>
  );
}
