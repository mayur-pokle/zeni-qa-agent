"use client";

import { cn } from "@/lib/utils";

/**
 * Filter chip row used above tables (e.g. All · Failed · Warning ·
 * Passed on Page Results). Active tab gets a brand underline and
 * stronger ink color; inactive tabs are muted with a hover background.
 *
 * Counts render as a soft chip next to the label. Empty counts hide.
 *
 * State is controlled — caller owns the active value. This keeps the
 * component reusable for non-status-driven filters too (e.g. environment
 * picker on the dashboard).
 */
export type FilterTab = {
  value: string;
  label: string;
  count?: number;
};

export function FilterTabs({
  tabs,
  active,
  onChange
}: {
  tabs: FilterTab[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line-2">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "text-ink" : "text-ink-2 hover:text-ink"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "rounded-[6px] px-1.5 py-0.5 text-xs font-medium",
                  isActive ? "bg-brand text-ink-inverse" : "bg-surface-2 text-ink-2"
                )}
              >
                {tab.count}
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute inset-x-2 bottom-[-1px] h-[2px] rounded-full bg-brand" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
