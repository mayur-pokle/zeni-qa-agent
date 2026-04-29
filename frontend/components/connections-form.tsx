"use client";

import { useState } from "react";
import { Pulse, Bell, Envelope } from "@phosphor-icons/react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import type { ConnectionStatus } from "@/lib/app-data";

type Settings = ConnectionStatus["settings"];

type Props = {
  envDefaults: Settings;
};

const ENV_NAME: Record<keyof Settings, string> = {
  uptimeRobotApiKey: "UPTIMEROBOT_API_KEY",
  smtpHost: "SMTP_HOST",
  smtpPort: "SMTP_PORT",
  smtpSecure: "SMTP_SECURE",
  smtpUser: "SMTP_USER",
  smtpPassword: "SMTP_PASS",
  smtpFrom: "SMTP_FROM",
  alertEmail: "ALERT_EMAIL",
  slackWebhookUrl: "SLACK_WEBHOOK_URL",
  resendApiKey: "RESEND_API_KEY",
  resendFrom: "RESEND_FROM"
};

function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 6) return "•".repeat(value.length);
  return value.slice(0, 3) + "•".repeat(Math.max(4, value.length - 6)) + value.slice(-3);
}

function ConnectionField({
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
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink-2">{label}</span>
        <span className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink-3">
          {envName}
        </span>
        {overridden ? (
          <Pill tone="warning">Overridden</Pill>
        ) : envPresent ? (
          <Pill tone="success">From .env</Pill>
        ) : (
          <Pill tone="error">Missing</Pill>
        )}
      </div>
      <Input
        name={String(name)}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
      />
      <span className="flex items-center gap-1 text-xs text-ink-3">
        <span>.env →</span>
        <span className="font-mono break-all">{envDisplay}</span>
      </span>
    </div>
  );
}

export function ConnectionsForm({ envDefaults }: Props) {
  const [form, setForm] = useState<Settings>(envDefaults);
  const [message, setMessage] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<"uptime" | "email" | "slack" | null>(null);

  function update<K extends keyof Settings>(name: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetToEnv() {
    setForm(envDefaults);
    setMessage({ tone: "info", text: "Form reset to .env values." });
  }

  async function runTest(type: "uptime" | "email" | "slack") {
    setPending(type);
    setMessage({
      tone: "info",
      text:
        type === "uptime"
          ? "Testing UptimeRobot…"
          : type === "email"
            ? "Sending test email…"
            : "Posting test Slack message…"
    });
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
      const text = data?.message ?? data?.error ?? "Test finished.";
      setMessage({
        tone: response.ok ? "success" : "error",
        text
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Test failed."
      });
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

  const primaryBtn =
    "inline-flex h-9 items-center gap-2 rounded-[8px] bg-brand px-3 text-sm font-medium !text-white transition-colors hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryBtn =
    "inline-flex h-9 items-center gap-2 rounded-[8px] border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-hover hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="grid gap-4">
      {/* Top summary banner */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Alerts &amp; integrations</h2>
            <p className="mt-1 text-sm text-ink-2">
              {envSetCount} of {keys.length} env vars present. Edit any field below to test with an
              override.
            </p>
          </div>
          <button
            type="button"
            onClick={resetToEnv}
            disabled={!changedFromEnv}
            className={secondaryBtn}
          >
            Reset to .env
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Pulse className="h-4 w-4 text-icon" />
              UptimeRobot
            </span>
          }
          subtitle="Optional. Mirrors Flowtest's internal monitoring with UptimeRobot's separate uptime checks."
        />
        <CardBody className="grid gap-4">
          <ConnectionField
            label="UptimeRobot API key"
            name="uptimeRobotApiKey"
            type="password"
            secret
            value={form.uptimeRobotApiKey}
            envValue={envDefaults.uptimeRobotApiKey}
            onChange={update}
            placeholder="ur1234567-abc…"
          />
          <div>
            <button
              type="button"
              onClick={() => runTest("uptime")}
              disabled={pending === "uptime"}
              className={primaryBtn}
            >
              {pending === "uptime" ? "Testing…" : "Test connection"}
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Envelope className="h-4 w-4 text-icon" />
              Email alerts
            </span>
          }
          subtitle="Resend (HTTP API) is preferred when set; Gmail SMTP is the local-only fallback."
        />
        <CardBody className="grid gap-4">
          <ConnectionField
            label="Resend API key (recommended)"
            name="resendApiKey"
            type="password"
            secret
            value={form.resendApiKey}
            envValue={envDefaults.resendApiKey}
            onChange={update}
            placeholder="re_…"
          />
          <ConnectionField
            label="Resend From"
            name="resendFrom"
            type="email"
            value={form.resendFrom}
            envValue={envDefaults.resendFrom}
            onChange={update}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <ConnectionField
              label="SMTP host"
              name="smtpHost"
              value={form.smtpHost}
              envValue={envDefaults.smtpHost}
              onChange={update}
            />
            <ConnectionField
              label="SMTP port"
              name="smtpPort"
              type="number"
              value={form.smtpPort}
              envValue={envDefaults.smtpPort}
              onChange={update}
            />
            <ConnectionField
              label="SMTP user"
              name="smtpUser"
              type="email"
              value={form.smtpUser}
              envValue={envDefaults.smtpUser}
              onChange={update}
            />
            <ConnectionField
              label="Gmail app password"
              name="smtpPassword"
              type="password"
              secret
              value={form.smtpPassword}
              envValue={envDefaults.smtpPassword}
              onChange={update}
            />
            <ConnectionField
              label="From email"
              name="smtpFrom"
              type="email"
              value={form.smtpFrom}
              envValue={envDefaults.smtpFrom}
              onChange={update}
            />
            <ConnectionField
              label="Alert email"
              name="alertEmail"
              type="email"
              value={form.alertEmail}
              envValue={envDefaults.alertEmail}
              onChange={update}
            />
          </div>

          <label className="flex items-center gap-3 rounded-[8px] border border-line bg-surface px-4 py-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.smtpSecure}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, smtpSecure: event.target.checked }))
              }
              className="h-4 w-4 rounded accent-[#2563EB]"
            />
            <span className="flex-1">Use secure SMTP connection (TLS)</span>
            <span className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink-3">
              SMTP_SECURE
            </span>
          </label>

          <div>
            <button
              type="button"
              onClick={() => runTest("email")}
              disabled={pending === "email"}
              className={primaryBtn}
            >
              {pending === "email" ? "Sending…" : "Send test email"}
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Bell className="h-4 w-4 text-icon" />
              Slack
            </span>
          }
          subtitle="Optional. Posts QA-completion alerts to an Incoming Webhook URL."
        />
        <CardBody className="grid gap-4">
          <ConnectionField
            label="Slack webhook URL"
            name="slackWebhookUrl"
            type="password"
            secret
            value={form.slackWebhookUrl}
            envValue={envDefaults.slackWebhookUrl}
            onChange={update}
            placeholder="https://hooks.slack.com/services/…"
          />
          <div>
            <button
              type="button"
              onClick={() => runTest("slack")}
              disabled={pending === "slack"}
              className={primaryBtn}
            >
              {pending === "slack" ? "Posting…" : "Send test Slack message"}
            </button>
          </div>
        </CardBody>
      </Card>

      {message ? (
        <div
          className={
            message.tone === "success"
              ? "rounded-[8px] bg-tag-green px-4 py-3 text-sm text-success"
              : message.tone === "error"
                ? "rounded-[8px] bg-tag-pink px-4 py-3 text-sm text-error"
                : "rounded-[8px] bg-tag-blue px-4 py-3 text-sm text-info"
          }
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
