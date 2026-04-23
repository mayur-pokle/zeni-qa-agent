"use client";

import { useState } from "react";
import type { ConnectionStatus } from "@/lib/app-data";

type Settings = ConnectionStatus["settings"];

type Props = {
  envDefaults: Settings;
};

// Environment variable name shown next to each field
const ENV_NAME: Record<keyof Settings, string> = {
  uptimeRobotApiKey: "UPTIMEROBOT_API_KEY",
  smtpHost: "SMTP_HOST",
  smtpPort: "SMTP_PORT",
  smtpSecure: "SMTP_SECURE",
  smtpUser: "SMTP_USER",
  smtpPassword: "SMTP_PASS",
  smtpFrom: "SMTP_FROM",
  alertEmail: "ALERT_EMAIL",
  slackWebhookUrl: "SLACK_WEBHOOK_URL"
};

function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 6) return "•".repeat(value.length);
  return value.slice(0, 3) + "•".repeat(Math.max(4, value.length - 6)) + value.slice(-3);
}

function Field({
  label,
  name,
  value,
  envValue,
  onChange,
  type = "text",
  placeholder,
  secret = false
}: {
  label: string;
  name: keyof Settings;
  value: string;
  envValue: string;
  onChange: (name: keyof Settings, value: string) => void;
  type?: "text" | "password" | "email" | "number";
  placeholder?: string;
  secret?: boolean;
}) {
  const envName = ENV_NAME[name];
  const envPresent = Boolean(envValue);
  const overridden = value !== envValue;

  const envDisplay = envPresent
    ? secret
      ? maskSecret(envValue)
      : envValue
    : "(not set in .env)";

  return (
    <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
      <span className="flex flex-wrap items-center gap-2">
        {label}
        <span className="rounded border border-[#f5f5f4]/20 px-2 py-0.5 font-mono text-[10px] normal-case tracking-wide text-[#f5f5f4]/60">
          {envName}
        </span>
        {overridden ? (
          <span className="rounded border border-[#fbbf24]/40 px-2 py-0.5 text-[10px] normal-case tracking-wide text-[#fbbf24]">
            overridden
          </span>
        ) : envPresent ? (
          <span className="rounded border border-[#86efac]/40 px-2 py-0.5 text-[10px] normal-case tracking-wide text-[#bbf7d0]">
            from .env
          </span>
        ) : (
          <span className="rounded border border-[#fca5a5]/40 px-2 py-0.5 text-[10px] normal-case tracking-wide text-[#fecaca]">
            missing in .env
          </span>
        )}
      </span>
      <input
        name={String(name)}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#f5f5f4]/60"
      />
      <span className="flex items-center gap-2 text-[10px] normal-case tracking-wider text-[#f5f5f4]/50">
        <span className="text-[#f5f5f4]/40">.env →</span>
        <span className="font-mono text-[#f5f5f4]/70">{envDisplay}</span>
      </span>
    </label>
  );
}

export function ConnectionsForm({ envDefaults }: Props) {
  const [form, setForm] = useState<Settings>(envDefaults);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"uptime" | "email" | "slack" | null>(null);

  function update<K extends keyof Settings>(name: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetToEnv() {
    setForm(envDefaults);
    setMessage("Form reset to .env values.");
  }

  async function runTest(type: "uptime" | "email" | "slack") {
    setPending(type);
    setMessage(
      type === "uptime"
        ? "Testing UptimeRobot..."
        : type === "email"
          ? "Sending test email..."
          : "Posting test Slack message..."
    );
    try {
      const endpoint =
        type === "uptime"
          ? "/api/settings/test-uptime"
          : type === "email"
            ? "/api/settings/test-email"
            : "/api/settings/test-slack";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => null);
      setMessage(data?.message ?? data?.error ?? "Test finished.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test failed.");
    } finally {
      setPending(null);
    }
  }

  const keys = Object.keys(envDefaults) as Array<keyof Settings>;
  const changedFromEnv = keys.some((key) => form[key] !== envDefaults[key]);
  const envSetCount = keys.filter((key) => {
    const value = envDefaults[key];
    if (typeof value === "boolean") return true;
    return Boolean(value);
  }).length;

  return (
    <div className="grid gap-6 border border-[#f5f5f4]/20 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Connections</p>
          <h2 className="mt-2 text-lg uppercase tracking-[0.18em]">UptimeRobot &amp; Gmail SMTP</h2>
          <p className="mt-2 text-sm leading-6 text-[#f5f5f4]/72">
            Values are loaded from the backend environment (<code className="font-mono text-[#f5f5f4]/90">backend/.env</code> locally, Railway variables in production).
            Edit any field to test with an override — overrides are not persisted.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#f5f5f4]/50">
            {envSetCount} of {keys.length} variables present in environment
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
          secret
          value={form.uptimeRobotApiKey}
          envValue={envDefaults.uptimeRobotApiKey}
          onChange={update}
          placeholder="ur1234567-abc..."
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
          <Field
            label="SMTP Host"
            name="smtpHost"
            value={form.smtpHost}
            envValue={envDefaults.smtpHost}
            onChange={update}
          />
          <Field
            label="SMTP Port"
            name="smtpPort"
            type="number"
            value={form.smtpPort}
            envValue={envDefaults.smtpPort}
            onChange={update}
          />
          <Field
            label="SMTP User"
            name="smtpUser"
            type="email"
            value={form.smtpUser}
            envValue={envDefaults.smtpUser}
            onChange={update}
          />
          <Field
            label="Gmail App Password"
            name="smtpPassword"
            type="password"
            secret
            value={form.smtpPassword}
            envValue={envDefaults.smtpPassword}
            onChange={update}
          />
          <Field
            label="From Email"
            name="smtpFrom"
            type="email"
            value={form.smtpFrom}
            envValue={envDefaults.smtpFrom}
            onChange={update}
          />
          <Field
            label="Alert Email"
            name="alertEmail"
            type="email"
            value={form.alertEmail}
            envValue={envDefaults.alertEmail}
            onChange={update}
          />
        </div>
        <label className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-[#f5f5f4]/70">
          <input
            type="checkbox"
            checked={form.smtpSecure}
            onChange={(event) => setForm((prev) => ({ ...prev, smtpSecure: event.target.checked }))}
            className="h-4 w-4 accent-[#f5f5f4]"
          />
          Use secure SMTP connection (TLS)
          <span className="ml-2 rounded border border-[#f5f5f4]/20 px-2 py-0.5 font-mono text-[10px] normal-case tracking-wide text-[#f5f5f4]/60">
            SMTP_SECURE
          </span>
          <span className="font-mono text-[10px] normal-case tracking-wide text-[#f5f5f4]/50">
            .env → {String(envDefaults.smtpSecure)}
          </span>
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

      <section className="grid gap-4 border-t border-[#f5f5f4]/10 pt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Step 3</p>
          <h3 className="mt-2 text-lg uppercase tracking-[0.18em]">Slack</h3>
          <p className="mt-2 text-sm leading-6 text-[#f5f5f4]/72">
            Optional. When set, alerts are also posted to the Slack Incoming Webhook URL.
          </p>
        </div>
        <Field
          label="Slack Webhook URL"
          name="slackWebhookUrl"
          type="password"
          secret
          value={form.slackWebhookUrl}
          envValue={envDefaults.slackWebhookUrl}
          onChange={update}
          placeholder="https://hooks.slack.com/services/..."
        />
        <div>
          <button
            type="button"
            onClick={() => runTest("slack")}
            disabled={pending === "slack"}
            className="ui-button"
          >
            {pending === "slack" ? "Posting..." : "Send Test Slack Message"}
          </button>
        </div>
      </section>

      {message ? (
        <p className="border border-[#f5f5f4]/20 p-4 text-sm text-[#f5f5f4]/80">{message}</p>
      ) : null}
    </div>
  );
}
