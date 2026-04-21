import { redirect } from "next/navigation";
import { ConnectionsForm } from "@/components/connections-form";
import { Shell } from "@/components/shell";
import { getConnectionStateForApp } from "@/lib/app-data";
import { requireAuthenticatedRoute } from "@/lib/session";

export default async function OnboardingPage() {
  await requireAuthenticatedRoute();
  const connectionState = await getConnectionStateForApp();

  if (connectionState.isComplete) {
    redirect("/");
  }

  return (
    <Shell
      title="Connect Services"
      description="Step through the integrations before project monitoring starts. First verify UptimeRobot, then verify Gmail alerts, then continue into the dashboard."
    >
      <ConnectionsForm initialSettings={connectionState.settings} mode="onboarding" />
    </Shell>
  );
}
