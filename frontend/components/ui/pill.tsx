import { cn } from "@/lib/utils";

/**
 * Status pill / soft chip. Sentence case, soft tag-* background, darker
 * tinted text. Replaces the uppercase outlined StatusPill from the
 * legacy design.
 *
 * Tones map to the project's status semantics:
 *   passed/healthy → success
 *   warning        → warning
 *   failed/down    → error
 *   running/info   → info
 *   neutral        → uses surface-2 tile for low-emphasis labels
 */
export type PillTone = "neutral" | "success" | "warning" | "error" | "info" | "purple";

const TONE_BG: Record<PillTone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  success: "bg-tag-green text-[#15803D]",
  warning: "bg-tag-orange text-[#B45309]",
  error: "bg-tag-pink text-[#BE123C]",
  info: "bg-tag-blue text-[#1D4ED8]",
  purple: "bg-[#EDE9FE] text-[#6D28D9]"
};

export function Pill({
  tone = "neutral",
  children,
  className
}: {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  // Title-case any plain-text children so callers can pass raw status
  // strings (PRODUCTION, FAILED, "submitted · verified") and get a
  // consistent "Production", "Failed", "Submitted · Verified" rendering
  // without having to .toLowerCase() everywhere upstream.
  const display = typeof children === "string" ? toTitleCase(children) : children;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-xs font-medium",
        TONE_BG[tone],
        className
      )}
    >
      {display}
    </span>
  );
}

function toTitleCase(input: string) {
  return input
    .toLowerCase()
    .split(/(\s+)/)
    .map((segment) =>
      /^\s+$/.test(segment)
        ? segment
        : segment
            .split("-")
            .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
            .join("-")
    )
    .join("");
}

/**
 * Map a project/run status string to a tone. Centralized so we don't
 * sprinkle `status === "..."` checks across components.
 */
export function statusTone(status: string): PillTone {
  const s = status.toLowerCase();
  if (s === "passed" || s === "healthy" || s === "up") return "success";
  if (s === "warning") return "warning";
  if (s === "failed" || s === "down" || s === "error") return "error";
  if (s === "running" || s === "queued") return "info";
  return "neutral";
}
