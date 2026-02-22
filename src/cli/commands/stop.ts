import { readDaemonState, isProcessRunning, clearDaemonState } from "../../utils/daemon.js";
import { logger } from "../../utils/logger.js";

export async function stop(): Promise<void> {
  const state = await readDaemonState();

  if (!state) {
    console.log("No daemon state found. Is the daemon running?");
    return;
  }

  if (!isProcessRunning(state.pid)) {
    console.log(`Daemon (PID ${state.pid}) is not running. Cleaning up stale state.`);
    await clearDaemonState();
    return;
  }

  try {
    process.kill(state.pid, "SIGTERM");
    console.log(`Sent SIGTERM to daemon (PID ${state.pid})`);
  } catch (err) {
    logger.error("Failed to stop daemon", { error: (err as Error).message });
  }

  await clearDaemonState();
}
