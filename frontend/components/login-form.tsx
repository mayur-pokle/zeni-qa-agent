"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";

export function LoginForm({ next }: { next?: string | null } = {}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email: String(formData.get("flowtest_email") ?? ""),
          password: String(formData.get("flowtest_password") ?? ""),
          rememberMe: formData.get("rememberMe") === "on"
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Login failed");
        return;
      }

      // Same-origin paths only — the server already validated this
      // when reading ?next, but we double-check here in case the prop
      // was ever sourced elsewhere.
      const destination =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.push(destination);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} autoComplete="off" className="grid gap-4">
      {/* Honeypots — see explanatory note in earlier version. */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-ink-2">Email</span>
        <input
          name="flowtest_email"
          type="email"
          autoComplete="off"
          spellCheck={false}
          placeholder="you@zeni.ai"
          data-1p-ignore="true"
          data-lpignore="true"
          className="h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-ink-2">Password</span>
        <div className="relative">
          <input
            name="flowtest_password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            data-1p-ignore="true"
            data-lpignore="true"
            className="h-10 w-full rounded-[8px] border border-line bg-surface px-3 pr-12 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          name="rememberMe"
          defaultChecked
          className="h-4 w-4 rounded accent-[#2563EB]"
        />
        Remember me for 30 days
      </label>

      {error ? (
        <p className="rounded-[8px] bg-tag-pink px-3 py-2 text-sm text-error">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-brand px-4 text-sm font-medium !text-white transition-colors hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
