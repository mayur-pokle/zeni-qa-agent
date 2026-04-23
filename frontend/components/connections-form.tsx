"use client";

import { useState } from "react";
import type { ConnectionStatus } from "@/lib/app-data";

type Settings = ConnectionStatus["settings"];

type Props = {
  envDefaults: Settings;
};

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  hint
}: {
  label: string;
  name: keyof Settings;
  value: string;
  onChange: (name: keyof Settings, value: string) => void;
  type?: "text" | "password" | "email" | "number";
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
      {label}
      <input
        name={String(name)}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#f5f5f4]/60"
      />
      {hint ? (
        <span className="text-[10px] normal-case tracking-wider text-[#f5f5f4]/50">{hint}</span>
      ) : null}
    </label>
  );
}

export function ConnectionsForm({ envDefaults }: Props) {
  const [form, setForm] = useState<Settings>(envDefaults);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"uptime" | "email" | null>(null);

  function update<K extends keyof Settings>(name: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetToEnv() {
    setForm(envDefaults);
    setMessage("Form reset to environment defaults.");
  }

  async function runTest(type: "uptime" | "email") {
    setPending(type);
    setMessage(type === "uptime" ? "Testing UptimeRobot..." : "Sending test email...");
    try {
      const response = await fetch(
        type === "uptime" ? "/api/settings/test-uptime" : "/api/settings/test-email",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form)
        }
      );
      const data = await response.json().catch(() => null);
      setMessage(data?.message ?? data?.error ?? "Test finished.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test failed.");
    } finally {
      setPending(null);
    }
  }

  const changedFromEnv =
    (Object.keys(form) as Array<keyof Settings>).some((key) => form[key] !== envDefaults[key]);

  return (
    <div className="grid gap-6 border border-[#f5f5f4]/20 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Connections</p>
          <h2 className="mt-2 text-lg uppercase tracking-[0.18em]">UptimeRobot &amp; Gmail SMTP</h2>
          <p className="mt-2 text-sm leading-6 text-[#f5f5f4]/72">
            Defaults are loaded from the backend environment (Railway / <code className="font-mono">backend/.env</code>).
            Override any field to test with different values — overrides are used for testing only and are not saved.
          </p>
        </div>
        <button
          type="button"
          onClick={resetToEnv}
          disabled={!changedFromEnv}
          className="ui-button disabled:opacity-40"
        >
          Reset To .env
        </button>
      </header>

      <section className="grid gap-4 border-t border-[#f5f5f4]/10 pt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Step 1</p>
          <h3 className="mt-2 text-lg uppercase tracking-[0.18em]">UptimeRobot</h3>
        </div>
        <Field
          label="UptimeRobot API Key"
          name="uptimeRobotApiKey"
          type="password"
          value={form.uptimeRobotApiKey}
          onChange={update}
          placeholder="ur1234567-abc..."
          hint="Main API key from uptimerobot.com → My Settings → API Settings"
        />
        <div>
          <button
            type="button"
            onClick={() => runTest("uptime")}
            disabled={pending === "uptime"}
            className="ui-button"
          >
            {pending === "uptime" ? "Testing..." : "Test Uptime Connection"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 border-t border-[#f5f5f4]/10 pt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Step 2</p>
          <h3 className="mt-2 text-lg uppercase tracking-[0.18em]">Gmail SMTP</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SMTP Host" name="smtpHost" value={form.smtpHost} onChange={update} placeholder="smtp.gmail.com" />
          <Field label="SMTP Port" name="smtpPort" type="number" value={form.smtpPort} onChange={update} placeholder="465" />
          <Field label="SMTP User" name="smtpUser" type="email" value={form.smtpUser} onChange={update} placeholder="you@example.com" />
          <Field
            label="Gmail App Password"
            name="smtpPassword"
            type="password"
            value={form.smtpPassword}
            onChange={update}
            hint="16-character app password — spaces are stripped automatically."
          />
          <Field label="From Email" name="smtpFrom" type="email" value={form.smtpFrom} onChange={update} />
          <Field label="Alert Email" name="alertEmail" type="email" value={form.alertEmail} onChange={update} />
        </div>
        <label className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-[#f5f5f4]/70">
          <input
            type="checkbox"
            checked={form.smtpSecure}
            onChange={(event) => setForm((prev) => ({ ...prev, smtpSecure: event.target.checked }))}
            className="h-4 w-4 accent-[#f5f5f4]"
          />
          Use secure SMTP connection (TLS)
        </label>
        <div>
          <button
            type="button"
            onClick={() => runTest("email")}
            disabled={pending === "email"}
            className="ui-button"
          >
            {pending === "email" ? "Sending..." : "Send Test Email"}
          </button>
        </div>
      </section>

      {message ? (
        <p className="border border-[#f5f5f4]/20 p-4 text-sm text-[#f5f5f4]/80">{message}</p>
      ) : null}
    </div>
  );
}
