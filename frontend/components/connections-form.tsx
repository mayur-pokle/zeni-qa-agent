"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConnectionSettings } from "@/lib/app-settings";

export function ConnectionsForm({
  initialSettings,
  mode
}: {
  initialSettings: ConnectionSettings;
  mode: "onboarding" | "settings";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function submitSettings(formData: FormData, continueAfterSave = false) {
    setMessage("");

    const payload = {
      uptimeRobotApiKey: String(formData.get("uptimeRobotApiKey") ?? ""),
      smtpHost: String(formData.get("smtpHost") ?? ""),
      smtpPort: String(formData.get("smtpPort") ?? ""),
      smtpSecure: formData.get("smtpSecure") === "on",
      smtpUser: String(formData.get("smtpUser") ?? ""),
      smtpPassword: String(formData.get("smtpPassword") ?? ""),
      smtpFrom: String(formData.get("smtpFrom") ?? ""),
      alertEmail: String(formData.get("alertEmail") ?? "")
    };

    startTransition(async () => {
      const response = await fetch("/api/settings/connections", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(data?.error ?? "Unable to save connection settings");
        return;
      }

      setMessage("Connections saved.");
      if (continueAfterSave) {
        router.push("/");
      } else {
        router.refresh();
      }
    });
  }

  async function testConnection(formData: FormData, type: "uptime" | "email") {
    setMessage(type === "uptime" ? "Testing UptimeRobot..." : "Sending test email...");

    const payload = {
      uptimeRobotApiKey: String(formData.get("uptimeRobotApiKey") ?? ""),
      smtpHost: String(formData.get("smtpHost") ?? ""),
      smtpPort: String(formData.get("smtpPort") ?? ""),
      smtpSecure: formData.get("smtpSecure") === "on",
      smtpUser: String(formData.get("smtpUser") ?? ""),
      smtpPassword: String(formData.get("smtpPassword") ?? ""),
      smtpFrom: String(formData.get("smtpFrom") ?? ""),
      alertEmail: String(formData.get("alertEmail") ?? "")
    };

    const response = await fetch(
      type === "uptime" ? "/api/settings/test-uptime" : "/api/settings/test-email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json().catch(() => null);
    setMessage(data?.message ?? data?.error ?? "Connection test finished");
  }

  return (
    <form
      action={(formData) => submitSettings(formData, mode === "onboarding")}
      className="grid gap-6 border border-[#f5f5f4]/20 p-6"
    >
      <section className="grid gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Step 1</p>
          <h2 className="mt-2 text-lg uppercase tracking-[0.18em]">Connect UptimeRobot</h2>
        </div>
        <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
          UptimeRobot API Key
          <input
            name="uptimeRobotApiKey"
            defaultValue={initialSettings.uptimeRobotApiKey}
            className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none"
          />
        </label>
        <button type="button" onClick={(event) => testConnection(new FormData(event.currentTarget.form!), "uptime")} className="ui-button">
          Test Uptime Connection
        </button>
      </section>

      <section className="grid gap-4 border-t border-[#f5f5f4]/10 pt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#f5f5f4]/60">Step 2</p>
          <h2 className="mt-2 text-lg uppercase tracking-[0.18em]">Connect Gmail SMTP</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
            SMTP Host
            <input name="smtpHost" defaultValue={initialSettings.smtpHost} className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none" />
          </label>
          <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
            SMTP Port
            <input name="smtpPort" defaultValue={initialSettings.smtpPort} className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none" />
          </label>
          <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
            SMTP User
            <input name="smtpUser" defaultValue={initialSettings.smtpUser} className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none" />
          </label>
          <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
            Gmail App Password
            <input name="smtpPassword" type="password" defaultValue={initialSettings.smtpPassword} className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none" />
          </label>
          <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
            From Email
            <input name="smtpFrom" defaultValue={initialSettings.smtpFrom} className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none" />
          </label>
          <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
            Alert Email
            <input name="alertEmail" defaultValue={initialSettings.alertEmail} className="border border-[#f5f5f4]/20 bg-transparent px-4 py-3 text-sm outline-none" />
          </label>
        </div>
        <label className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-[#f5f5f4]/70">
          <input type="checkbox" name="smtpSecure" defaultChecked={initialSettings.smtpSecure} className="h-4 w-4 accent-[#f5f5f4]" />
          Use secure SMTP connection
        </label>
        <button type="button" onClick={(event) => testConnection(new FormData(event.currentTarget.form!), "email")} className="ui-button">
          Send Test Email
        </button>
      </section>

      {message ? <p className="text-sm text-[#f5f5f4]/80">{message}</p> : null}
      <button type="submit" disabled={isPending} className="ui-button">
        {isPending ? "Saving..." : mode === "onboarding" ? "Save And Continue" : "Save Settings"}
      </button>
    </form>
  );
}
