import { Shell } from "@/components/shell";
import { ConnectionStatus } from "@/components/connection-status";
import { getConnectionStateForApp } from "@/lib/app-data";
import { requireAuthenticatedRoute } from "@/lib/session";

export default async function SettingsPage() {
  await requireAuthenticatedRoute();
  const connectionState = await getConnectionStateForApp();

  return (
    <Shell
      title="Settings"
      description="UptimeRobot and Gmail credentials are now managed through backend environment variables (Railway). This page shows the current status and lets you verify each integration."
    >
      <ConnectionStatus initialStatus={connectionState} />
    </Shell>
  );
}
