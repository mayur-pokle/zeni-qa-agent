"use client";

import { useRouter } from "next/navigation";

/**
 * Light-themed logout control for the redesigned page chrome. Mirrors
 * the legacy components/logout-button but uses the new token classes.
 * Both will coexist until every page has been ported off the dark
 * Shell, after which the legacy button can be removed.
 */
export function LightLogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="inline-flex h-9 items-center rounded-[8px] border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:bg-hover"
    >
      Log out
    </button>
  );
}
