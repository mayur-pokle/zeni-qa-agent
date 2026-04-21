import { runMonitoringPoll } from "@/lib/monitoring";

async function main() {
  const result = await runMonitoringPoll();
  console.log(`Stored ${result.length} uptime checks`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
