"use client";

import { useMemo, useState } from "react";
import { Pill, statusTone } from "@/components/ui/pill";
import { FilterTabs, type FilterTab } from "@/components/ui/filter-tabs";
import type { QaExecutionPayload } from "@/lib/types";

type PageResult = QaExecutionPayload["pageResults"][number];

function hubspotFormStatusLabel(form?: PageResult["hubspotForm"]) {
  if (!form || !form.found) return "—";
  if (form.attempted && form.succeeded) return "Submitted · verified";
  if (form.attempted && !form.succeeded) return "Submitted · unverified";
  if (form.visible === false) return "Found · hidden";
  return "Found";
}

/**
 * Page Results table with filter chips above. Default view is "Failed"
 * — the rows the user came here to triage. The All / Warning / Passed
 * tabs are one click away and show running counts.
 */
export function PageResultsTable({ rows }: { rows: PageResult[] }) {
  const counts = useMemo(() => {
    const failed = rows.filter((r) => r.status === "failed").length;
    const warning = rows.filter((r) => r.status === "warning").length;
    const passed = rows.filter((r) => r.status === "passed").length;
    return { all: rows.length, failed, warning, passed };
  }, [rows]);

  const initialTab = counts.failed > 0 ? "failed" : counts.warning > 0 ? "warning" : "all";
  const [active, setActive] = useState<string>(initialTab);

  const filtered = useMemo(() => {
    if (active === "all") return rows;
    return rows.filter((r) => r.status === active);
  }, [rows, active]);

  const tabs: FilterTab[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "failed", label: "Failed", count: counts.failed },
    { value: "warning", label: "Warning", count: counts.warning },
    { value: "passed", label: "Passed", count: counts.passed }
  ];

  return (
    <div>
      <FilterTabs tabs={tabs} active={active} onChange={setActive} />

      {filtered.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-ink-3">
          No pages with this status.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-ink-3">
                <th className="px-5 py-3 font-medium">URL</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">HTTP</th>
                <th className="px-3 py-3 font-medium">CTAs</th>
                <th className="px-3 py-3 font-medium">HubSpot</th>
                <th className="px-3 py-3 font-medium">Layout shifts</th>
                <th className="px-3 py-3 font-medium">Broken links</th>
                <th className="px-3 py-3 font-medium">Issues</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((page, index) => {
                const broken = page.brokenLinks ?? [];
                const linksChecked = page.linksChecked ?? 0;
                return (
                  <tr
                    key={`${page.url}-${index}`}
                    className="border-t border-line-2 align-top hover:bg-hover"
                  >
                    <td className="max-w-[280px] truncate px-5 py-3">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink hover:underline"
                        title={page.url}
                      >
                        {page.url}
                      </a>
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={statusTone(page.status)}>
                        {page.status[0].toUpperCase() + page.status.slice(1)}
                      </Pill>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{page.statusCode ?? "—"}</td>
                    <td className="px-3 py-3 text-ink-2">{page.ctaCount ?? "—"}</td>
                    <td className="px-3 py-3 text-ink-2">{hubspotFormStatusLabel(page.hubspotForm)}</td>
                    <td className="px-3 py-3 text-ink-2">{page.layoutShiftCount ?? "—"}</td>
                    <td className="max-w-[260px] px-3 py-3">
                      {broken.length === 0 ? (
                        <span className="text-ink-3">{linksChecked > 0 ? `0 / ${linksChecked}` : "—"}</span>
                      ) : (
                        <details>
                          <summary className="cursor-pointer text-error">
                            {broken.length} / {linksChecked}
                          </summary>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink-2">
                            {broken.slice(0, 10).map((link, i) => (
                              <li key={i} className="break-all">
                                <a href={link.url} target="_blank" rel="noreferrer" className="hover:underline">
                                  {link.url}
                                </a>{" "}
                                <span className="text-error">[{link.status ?? link.reason ?? "?"}]</span>
                              </li>
                            ))}
                            {broken.length > 10 ? (
                              <li className="text-ink-3">+ {broken.length - 10} more</li>
                            ) : null}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="max-w-[340px] px-3 py-3 text-ink-2">
                      {page.issues && page.issues.length > 0 ? (
                        <ul className="list-disc space-y-0.5 pl-4">
                          {page.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-line-2 px-5 py-3 text-xs text-ink-3">
        Showing {filtered.length} of {rows.length} pages.
        <span className="ml-2">
          Timestamps in your local timezone — page-level checked-at available in CSV.
        </span>
      </div>
    </div>
  );
}
