import { redirect } from "next/navigation";
import { ConnectionsForm } from "@/components/connections-form";
import { Shell } from "@/components/shell";
import { getConnectionStateForApp } from "@/lib/app-data";
import { requireAuthenticatedRoute } from "@/lib/session";

export default async function SettingsPage() {
  await requireAuthenticatedRoute();
  const connectionState = await getConnectionStateForApp();

  if (!connectionState.isComplete) {
    redirect("/onboarding");
  }

  return (
    <Shell
      title="Settings"
      description="Update UptimeRobot and Gmail integrations, retest the connections, and keep alerting credentials under your control."
    >
      <ConnectionsForm initialSettings={connectionState.settings} mode="settings" />
    </Shell>
  );
}
