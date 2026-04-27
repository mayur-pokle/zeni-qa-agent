"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
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
    <form action={handleSubmit} className="grid gap-5 border border-[#f5f5f4]/20 p-6">
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Email</label>
        <input
          name="email"
          type="email"
          autoComplete="username"
          defaultValue="mayur.pokle@zeni.ai"
          className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Password</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none"
        />
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
