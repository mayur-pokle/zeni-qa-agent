import { PageChrome } from "@/components/ui/page-chrome";
import { ConnectionsForm } from "@/components/connections-form";
import { getConnectionStateForApp } from "@/lib/app-data";
import { getCurrentUserEmail, requireAuthenticatedRoute } from "@/lib/session";

export default async function SettingsPage() {
  await requireAuthenticatedRoute();
  const [connectionState, userEmail] = await Promise.all([
    getConnectionStateForApp(),
    getCurrentUserEmail()
  ]);

  return (
    <PageChrome
      userEmail={userEmail}
      title="Settings"
      subtitle="UptimeRobot, Email, and Slack defaults come from the backend environment. Override any field to test — overrides are not persisted."
    >
      <ConnectionsForm envDefaults={connectionState.settings} />
    </PageChrome>
  );
}
