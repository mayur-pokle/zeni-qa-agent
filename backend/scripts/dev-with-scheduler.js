const { spawn } = require("node:child_process");

const mode = process.argv[2] === "start" ? "start" : "dev";
const nextCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const schedulerCommand = process.execPath;
const schedulerArgs = ["monitoring/scheduler.js"];
const nextArgs = ["next", mode];

function spawnChild(command, args, name) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${name}] exited with signal ${signal}`);
      return;
    }

    if (typeof code === "number" && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exit(code);
    }
  });

  return child;
}

const scheduler = spawnChild(schedulerCommand, schedulerArgs, "scheduler");
const next = spawnChild(nextCommand, nextArgs, "next");

function shutdown(signal) {
  scheduler.kill(signal);
  next.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
