"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
};

export function ProjectForm({ mode, initialValues }: ProjectFormProps) {
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
      monitoringIntervalMinutes: Number(formData.get("monitoringIntervalMinutes") ?? 360),
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
      router.push(`/projects/${data.id}`);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-5 border border-[#f5f5f4]/20 p-6">
      <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
        Project Name
        <input
          name="name"
          defaultValue={initialValues?.name}
          required
          className="border border-[#f5f5f4]/20 bg-transparent px-3 py-3 text-sm outline-none"
        />
      </label>
      <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
        Staging URL
        <input
          name="stagingUrl"
          type="url"
          defaultValue={initialValues?.stagingUrl ?? ""}
          className="border border-[#f5f5f4]/20 bg-transparent px-3 py-3 text-sm outline-none"
          placeholder="Optional"
        />
      </label>
      <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
        Production URL
        <input
          name="productionUrl"
          type="url"
          defaultValue={initialValues?.productionUrl}
          required
          className="border border-[#f5f5f4]/20 bg-transparent px-3 py-3 text-sm outline-none"
        />
      </label>
      <label className="flex items-center gap-3 border border-[#f5f5f4]/20 px-3 py-3 text-sm uppercase tracking-[0.24em]">
        <input
          type="checkbox"
          name="monitoringActive"
          defaultChecked={initialValues?.monitoringActive ?? true}
          className="h-4 w-4 accent-[#f5f5f4]"
        />
        Monitoring active
      </label>
      <label className="grid gap-2 text-sm uppercase tracking-[0.24em]">
        Scan Frequency
        <select
          name="monitoringIntervalMinutes"
          defaultValue={String(initialValues?.monitoringIntervalMinutes ?? 360)}
          className="border border-[#f5f5f4]/20 bg-[#292524] px-3 py-3 text-sm outline-none"
        >
          <option value="30">30 mins</option>
          <option value="60">1 hour</option>
          <option value="360">6 hours</option>
          <option value="1440">1 day</option>
        </select>
      </label>
      <label className="flex items-center gap-3 border border-[#f5f5f4]/20 px-3 py-3 text-sm uppercase tracking-[0.24em]">
        <input
          type="checkbox"
          name="notifyOnCompletion"
          defaultChecked={initialValues?.notifyOnCompletion ?? true}
          className="h-4 w-4 accent-[#f5f5f4]"
        />
        Email CSV when scan completes
      </label>
      {error ? <p className="text-sm">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="ui-button disabled:opacity-50"
      >
        {isPending ? "Saving..." : mode === "create" ? "Create Project" : "Update Project"}
      </button>
    </form>
  );
}
