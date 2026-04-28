"use client";

import { useEffect, useState } from "react";

/**
 * Renders a date string formatted in the visitor's local timezone.
 *
 * SSR has no access to the browser's timezone, so the server renders a
 * stable fallback (UTC date+time, ISO-style). After hydration the
 * effect kicks in and replaces the text with the locale-aware version
 * using the browser's resolved timezone — so a viewer in IST sees IST,
 * and a viewer in PT sees PT, off the same SSR HTML.
 *
 * `suppressHydrationWarning` is intentional: the SSR text won't match
 * the client text by design, and we don't want React's mismatch warning
 * lighting up the console for every date on the page.
 */
export function LocalTime({
  value,
  fallback = "Never"
}: {
  value: string | Date | null | undefined;
  fallback?: string;
}) {
  const [text, setText] = useState<string>(() => initialServerText(value, fallback));

  useEffect(() => {
    setText(formatLocal(value, fallback));
  }, [value, fallback]);

  return <span suppressHydrationWarning>{text}</span>;
}

function initialServerText(value: string | Date | null | undefined, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === "string" ? value : fallback;
  }
  // Server-rendered baseline. The browser will replace this on
  // hydration with a locale-aware string. Use a compact ISO-like
  // representation so the SSR HTML is still legible if hydration is
  // delayed.
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(parsed) + " UTC";
}

function formatLocal(value: string | Date | null | undefined, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === "string" ? value : fallback;
  }
  // `undefined` locale + omitted `timeZone` means the browser's defaults
  // are used — which is exactly what we want.
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}
