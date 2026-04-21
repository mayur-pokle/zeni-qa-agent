const cron = require("node-cron");
const { runMonitoringCycle } = require("./runner");

cron.schedule("*/15 * * * *", async () => {
  try {
    const results = await runMonitoringCycle();
    console.log(`[scheduler] completed ${results.length} monitoring run(s) at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[scheduler] monitoring cycle failed", error);
  }
});

console.log("[scheduler] running every 15 minutes");
