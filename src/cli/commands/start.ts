import { spawn } from "node:child_process";
import { loadConfig } from "../../core/config.js";
import { tick } from "./tick.js";
import { writeDaemonState, readDaemonState, isProcessRunning, clearDaemonState } from "../../utils/daemon.js";
import { logger } from "../../utils/logger.js";
import { msUntilNextTick } from "../../utils/tick-align.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function start(
  opts: { background?: boolean }
): Promise<void> {
  // Check if already running
  const existing = await readDaemonState();
  if (existing && isProcessRunning(existing.pid)) {
    console.log(`Daemon already running (PID ${existing.pid})`);
    return;
  }

  if (opts.background) {
    // Spawn detached process
    const child = spawn(
      process.argv[0],
      [process.argv[1], "start"],
      {
        detached: true,
        stdio: "ignore",
      }
    );
    child.unref();
    console.log(`Daemon started in background (PID ${child.pid})`);
    return;
  }

  const config = await loadConfig();

  await writeDaemonState({
    pid: process.pid,
    startedAt: new Date().toISOString(),
  });

  const waitMs = msUntilNextTick(config.heartbeatMs);
  const nextTick = new Date(Date.now() + waitMs);
  console.log(`Daemon started (PID ${process.pid}), interval: ${config.heartbeat}, next tick: ${nextTick.toLocaleTimeString()}`);

  // Handle shutdown signals
  let running = true;
  const shutdown = async () => {
    running = false;
    logger.info("Shutting down daemon...");
    await clearDaemonState();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Main loop
  while (running) {
    try {
      await tick();
    } catch (err) {
      logger.error("Tick failed", { error: (err as Error).message });
    }
    await sleep(msUntilNextTick(config.heartbeatMs));
  }
}
