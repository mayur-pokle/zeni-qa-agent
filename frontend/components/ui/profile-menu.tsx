"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Gear, SignOut } from "@phosphor-icons/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Avatar + dropdown menu in the top-right of every redesigned page.
 * Avatar shows the user's initials derived from their email. Click
 * opens a dropdown with the user's full email + Gear + Sign out.
 * Sign out triggers a confirm dialog before actually clearing the
 * session.
 */
export function ProfileMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click. Skipped while the confirm dialog is open
  // because that dialog has its own scrim and we don't want the menu's
  // outside-click to fight with it.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
      setConfirmOpen(false);
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={email}
        className="grid h-9 w-9 place-items-center rounded-full bg-tag-blue text-xs font-semibold text-[#1D4ED8] outline-none transition-shadow hover:ring-2 hover:ring-brand/15 focus:ring-2 focus:ring-brand/30"
      >
        {initialsFor(email)}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 overflow-hidden rounded-[12px] border border-line-2 bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        >
          <div className="border-b border-line-2 px-4 py-3">
            <div className="text-xs font-medium text-ink-3">Signed in as</div>
            <div className="mt-0.5 truncate text-sm text-ink" title={email}>
              {email}
            </div>
          </div>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-hover"
          >
            <Gear className="h-4 w-4 text-icon" />
            Gear
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setConfirmOpen(true);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-t border-line-2 px-4 py-2.5 text-left text-sm text-error hover:bg-tag-pink/40"
          >
            <SignOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={signOut}
        busy={signingOut}
        tone="error"
        title="Sign out?"
        description={`You'll be signed out of ${email} on this device. You can sign back in anytime.`}
        confirmLabel="Sign out"
        cancelLabel="Cancel"
      />
    </div>
  );
}

function initialsFor(email: string): string {
  // mayur.pokle@zeni.ai → "MP" (first letters of first/last name parts)
  // marketing@zeni.ai   → "M"
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (local[0] ?? "?").toUpperCase();
}
