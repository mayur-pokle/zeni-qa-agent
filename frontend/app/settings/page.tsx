import { PageChrome } from "@/components/ui/page-chrome";
import { ConnectionsForm } from "@/components/connections-form";
import { getConnectionStateForApp } from "@/lib/app-data";
import { requireAuthenticatedRoute } from "@/lib/session";

export default async function SettingsPage() {
  await requireAuthenticatedRoute();
  const connectionState = await getConnectionStateForApp();

  return (
    <PageChrome
      title="Settings"
      subtitle="UptimeRobot, Email, and Slack defaults come from the backend environment. Override any field to test — overrides are not persisted."
    >
      <ConnectionsForm envDefaults={connectionState.settings} />
    </PageChrome>
  );
}
