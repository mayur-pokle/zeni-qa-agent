"use client";

import { useState } from "react";
import type { ConnectionStatus as ConnectionStatusType } from "@/lib/app-data";

type Props = {
  initialStatus: ConnectionStatusType;
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        "inline-flex items-center gap-2 border px-3 py-1 text-xs uppercase tracking-[0.24em] " +
        (ok
          ? "border-[#86efac]/40 text-[#bbf7d0]"
          : "border-[#fca5a5]/40 text-[#fecaca]")
      }
    >
      <span
        aria-hidden
        className={"h-1.5 w-1.5 rounded-full " + (ok ? "bg-[#22c55e]" : "bg-[#ef4444]")}
      />
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#f5f5f4]/10 py-2 text-sm">
      <span className="uppercase tracking-[0.22em] text-[#f5f5f4]/60">{label}</span>
      <span className="font-mono text-[#f5f5f4]/90">{value || "—"}</span>
    </div>
  );
}

export function ConnectionStatus({ initialStatus }: Props) {
  const { settings, isComplete } = initialStatus;
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"uptime" | "email" | null>(null);

  const uptimeConfigured = Boolean(settings.uptimeRobotApiKey);
  const smtpConfigured = Boolean(
    settings.smtpHost &&
      settings.smtpPort &&
      settings.smtpUser &&
      settings.smtpPassword &&
      settings.alertEmail
  );

  async function runTest(type: "uptime" | "email") {
    setPending(type);
    setMessage(type === "uptime" ? "Testing UptimeRobot..." : "Sending test email...");
    try {
      const response = await fetch(
        type === "uptime" ? "/api/settings/test-uptime" : "/api/settings/test-email",
        { method: "POST" }
      );
      const data = await response.json().catch(() => null);
      setMessage(data?.message ?? data?.error ?? "Test finished.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="border border-[#f5f5f4]/20 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Overall</p>
            <h2 className="mt-1 text-lg uppercase tracking-[0.18em]">Integration Status</h2>
          </div>
          <StatusPill ok={isComplete} label={isComplete ? "All Connected" : "Incomplete"} />
        </header>
        <p className="mt-3 text-sm leading-6 text-[#f5f5f4]/72">
          Values are loaded from the backend environment. Update them on Railway (or in your local{" "}
          <code className="font-mono text-[#f5f5f4]">backend/.env</code>) and redeploy — no editing from this page.
        </p>
      </section>

      <section className="border border-[#f5f5f4]/20 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Integration</p>
            <h2 className="mt-1 text-lg uppercase tracking-[0.18em]">UptimeRobot</h2>
          </div>
          <StatusPill ok={uptimeConfigured} label={uptimeConfigured ? "Configured" : "Missing"} />
        </header>
        <div className="mt-4">
          <Row label="UPTIMEROBOT_API_KEY" value={uptimeConfigured ? "configured" : ""} />
        </div>
        <button
          type="button"
          onClick={() => runTest("uptime")}
          disabled={!uptimeConfigured || pending === "uptime"}
          className="ui-button mt-4 disabled:opacity-40"
        >
          {pending === "uptime" ? "Testing..." : "Test Uptime Connection"}
        </button>
      </section>

      <section className="border border-[#f5f5f4]/20 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Integration</p>
            <h2 className="mt-1 text-lg uppercase tracking-[0.18em]">Gmail SMTP</h2>
          </div>
          <StatusPill ok={smtpConfigured} label={smtpConfigured ? "Configured" : "Missing"} />
        </header>
        <div className="mt-4 grid gap-0">
          <Row label="SMTP_HOST" value={settings.smtpHost} />
          <Row label="SMTP_PORT" value={settings.smtpPort} />
          <Row label="SMTP_SECURE" value={settings.smtpSecure ? "true" : "false"} />
          <Row label="SMTP_USER" value={settings.smtpUser} />
          <Row label="SMTP_PASS" value={settings.smtpPassword ? "configured" : ""} />
          <Row label="SMTP_FROM" value={settings.smtpFrom} />
          <Row label="ALERT_EMAIL" value={settings.alertEmail} />
        </div>
        <button
          type="button"
          onClick={() => runTest("email")}
          disabled={!smtpConfigured || pending === "email"}
          className="ui-button mt-4 disabled:opacity-40"
        >
          {pending === "email" ? "Sending..." : "Send Test Email"}
        </button>
      </section>

      {message ? (
        <p className="border border-[#f5f5f4]/20 p-4 text-sm text-[#f5f5f4]/80">{message}</p>
      ) : null}
    </div>
  );
}
