"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
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
          // Server accepts either `email` or the legacy `username` key.
          // We send under a non-standard form-field name (see below) and
          // map it back here.
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

      router.push("/");
      router.refresh();
    });
  }

  return (
    // autoComplete="off" on the form + non-standard input names tell the
    // browser not to offer saved-username/password suggestions on this
    // page. Chrome respects this for fields that don't match its
    // username/password heuristics — hence `flowtest_email` instead of
    // `email`. data-1p-ignore / data-lpignore are honoured by 1Password
    // and LastPass.
    <form
      action={handleSubmit}
      autoComplete="off"
      className="grid gap-5 border border-[#f5f5f4]/20 p-6"
    >
      {/* Honeypot to absorb any aggressive autofill that ignores
          autoComplete="off" — Chrome occasionally fills the first
          email-shaped input regardless. */}
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

      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Email</label>
        <input
          name="flowtest_email"
          type="email"
          autoComplete="off"
          spellCheck={false}
          placeholder="you@zeni.ai"
          data-1p-ignore="true"
          data-lpignore="true"
          className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Password</label>
        <div className="relative flex items-center">
          <input
            name="flowtest_password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            data-1p-ignore="true"
            data-lpignore="true"
            className="flex-1 border border-[#f5f5f4]/20 bg-transparent px-4 py-3 pr-12 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 inline-flex h-9 w-9 items-center justify-center text-[#f5f5f4]/65 transition hover:text-[#f5f5f4]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <label className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-[#f5f5f4]/70">
        <input type="checkbox" name="rememberMe" defaultChecked className="h-4 w-4 accent-[#f5f5f4]" />
        Remember me for 30 days
      </label>
      {error ? <p className="text-sm text-[#f5f5f4]/80">{error}</p> : null}
      <button type="submit" disabled={isPending} className="ui-button">
        {isPending ? "Signing In..." : "Enter Control Room"}
      </button>
    </form>
  );
}
