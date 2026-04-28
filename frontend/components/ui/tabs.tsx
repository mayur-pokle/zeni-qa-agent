"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Section tabs for swapping between views on a single page (e.g.
 * Overview / QA Runs / Lighthouse on the project detail page).
 *
 * Visual: same FilterTabs pattern (active brand underline + count
 * badge), but with bigger padding for primary navigation rather than
 * inline filter usage.
 *
 * Renders all tab panels but hides inactive ones with `hidden`. This
 * keeps SSR-rendered content available for screen readers and avoids
 * loss of internal state when switching tabs.
 */
export type TabDef = {
  value: string;
  label: string;
  count?: number;
  content: React.ReactNode;
};

export function Tabs({
  tabs,
  defaultValue
}: {
  tabs: TabDef[];
  defaultValue?: string;
}) {
  const [active, setActive] = useState<string>(defaultValue ?? tabs[0]?.value ?? "");

  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap items-center gap-1 border-b border-line-2"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.value)}
              className={cn(
                "relative inline-flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors",
                isActive ? "text-ink" : "text-ink-2 hover:text-ink"
              )}
            >
              {tab.label}
              {typeof tab.count === "number" ? (
                <span
                  className={cn(
                    "rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium",
                    isActive ? "bg-brand text-ink-inverse" : "bg-surface-2 text-ink-2"
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
              {isActive ? (
                <span className="absolute inset-x-3 bottom-[-1px] h-[2px] rounded-full bg-brand" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        {tabs.map((tab) => (
          <div
            key={tab.value}
            role="tabpanel"
            hidden={tab.value !== active}
            aria-hidden={tab.value !== active}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
