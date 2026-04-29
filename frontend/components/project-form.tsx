"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ProjectFormProps = {
  mode: "create" | "edit";
  initialValues?: {
    id: string;
    name: string;
    stagingUrl?: string | null;
    productionUrl: string;
    monitoringActive: boolean;
    monitoringIntervalMinutes?: number;
    notifyOnCompletion?: boolean;
  };
  /**
   * Optional callback fired after a successful create/update. Used by
   * the dashboard slide-over to close itself; the standalone routes
   * can omit it and rely on the default redirect to the project page.
   */
  onSuccess?: (projectId: string) => void;
  /** Optional cancel callback for the slide-over. */
  onCancel?: () => void;
};

export function ProjectForm({ mode, initialValues, onSuccess, onCancel }: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);

    const payload = {
      name: String(formData.get("name") ?? ""),
      stagingUrl: String(formData.get("stagingUrl") ?? ""),
      productionUrl: String(formData.get("productionUrl") ?? ""),
      monitoringActive: formData.get("monitoringActive") === "on",
      monitoringIntervalMinutes: Number(formData.get("monitoringIntervalMinutes") ?? 720),
      notifyOnCompletion: formData.get("notifyOnCompletion") === "on"
    };

    startTransition(async () => {
      const response = await fetch(
        mode === "create" ? "/api/projects" : `/api/projects/${initialValues?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Unable to save project");
        return;
      }

      const data = await response.json();
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push(`/projects/${data.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-5">
      <Field label="Project name" required>
        <Input
          name="name"
          defaultValue={initialValues?.name}
          required
          placeholder="My marketing site"
        />
      </Field>

      <Field label="Production URL" required helper="Live customer-facing site, used as sitemap source.">
        <Input
          name="productionUrl"
          type="url"
          defaultValue={initialValues?.productionUrl}
          required
          placeholder="https://example.com"
        />
      </Field>

      <Field label="Staging URL" helper="Optional. Pre-release URL covered by scheduled QA runs.">
        <Input
          name="stagingUrl"
          type="url"
          defaultValue={initialValues?.stagingUrl ?? ""}
          placeholder="https://staging.example.com"
        />
      </Field>

      <Field label="Scan frequency" helper="How often the cron scheduler triggers a fresh QA run.">
        <Select
          name="monitoringIntervalMinutes"
          defaultValue={String(initialValues?.monitoringIntervalMinutes ?? 720)}
        >
          <option value="30">30 mins</option>
          <option value="60">1 hour</option>
          <option value="360">6 hours</option>
          <option value="720">12 hours (twice a day)</option>
          <option value="1440">1 day</option>
        </Select>
      </Field>

      <label className="flex items-center gap-3 rounded-[8px] border border-line bg-surface px-4 py-3 text-sm text-ink">
        <input
          type="checkbox"
          name="monitoringActive"
          defaultChecked={initialValues?.monitoringActive ?? true}
          className="h-4 w-4 rounded accent-[#2563EB]"
        />
        <span className="flex-1">Constant monitoring active</span>
        <span className="text-xs text-ink-3">Pause anytime from the project page</span>
      </label>

      <label className="flex items-center gap-3 rounded-[8px] border border-line bg-surface px-4 py-3 text-sm text-ink">
        <input
          type="checkbox"
          name="notifyOnCompletion"
          defaultChecked={initialValues?.notifyOnCompletion ?? true}
          className="h-4 w-4 rounded accent-[#2563EB]"
        />
        <span className="flex-1">Email CSV when scan completes</span>
        <span className="text-xs text-ink-3">Sent to ALERT_EMAIL</span>
      </label>

      {error ? (
        <p className="rounded-[8px] bg-tag-pink px-3 py-2 text-sm text-error">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancel
          </Button>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-brand px-4 text-sm font-semibold !text-white transition-colors hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
