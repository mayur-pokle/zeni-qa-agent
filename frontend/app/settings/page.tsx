import { Shell } from "@/components/shell";
import { ConnectionsForm } from "@/components/connections-form";
import { getConnectionStateForApp } from "@/lib/app-data";
import { requireAuthenticatedRoute } from "@/lib/session";

export default async function SettingsPage() {
  await requireAuthenticatedRoute();
  const connectionState = await getConnectionStateForApp();

  return (
    <Shell
      title="Settings"
      description="UptimeRobot and Gmail defaults come from the backend environment. Override any field to test with different values — changes are not persisted."
    >
      <ConnectionsForm envDefaults={connectionState.settings} />
    </Shell>
  );
}
