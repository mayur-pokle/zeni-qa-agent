"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

/**
 * Right-side slide-over panel for short, focused tasks (create project,
 * edit settings, etc.) that should not navigate the user away from
 * their current page.
 *
 * Uses native <dialog> semantics via role="dialog" + aria-modal so it
 * works with screen readers without pulling in a focus-trap library.
 * Esc closes it; clicking the scrim closes it; clicking inside the
 * panel does not.
 */
export function SlideOver({
  open,
  onClose,
  title,
  description,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Close on Escape so keyboard users have a fast exit. Mounted only
  // while open to avoid global listener noise.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[2px]"
      />
      <aside
        className="relative flex h-full w-full max-w-[520px] flex-col bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line-2 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-ink-2">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}
