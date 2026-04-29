"use client";

import { useEffect } from "react";

/**
 * Modal confirm dialog. Used for destructive actions like sign out
 * and project delete. Dismisses on Esc, scrim click, or either action
 * button.
 *
 * Visual: centered card on dimmed scrim, primary action tinted by
 * `tone` (primary blue / error rose), secondary cancel beside it.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  busy = false
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "error";
  busy?: boolean;
}) {
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

  const confirmClasses =
    tone === "error"
      ? "inline-flex h-10 items-center justify-center rounded-[8px] bg-error px-4 text-sm font-semibold !text-white transition-colors hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex h-10 items-center justify-center rounded-[8px] bg-brand px-4 text-sm font-semibold !text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center px-4"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[2px]"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[12px] bg-surface p-6 shadow-[0_8px_24px_rgba(15,23,42,0.16)]"
      >
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{description}</p>
        ) : null}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-hover hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className={confirmClasses}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
