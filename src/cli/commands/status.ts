import { loadConfig } from "../../core/config.js";
import { loadTasks } from "../../core/task-parser.js";
import { HistoryManager } from "../../core/history-manager.js";
import { readDaemonState, isProcessRunning } from "../../utils/daemon.js";

export async function status(): Promise<void> {
  // Daemon status
  const daemon = await readDaemonState();
  if (daemon && isProcessRunning(daemon.pid)) {
    console.log(`Daemon: running (PID ${daemon.pid}, started ${daemon.startedAt})`);
  } else if (daemon) {
    console.log(`Daemon: not running (stale PID ${daemon.pid})`);
  } else {
    console.log("Daemon: not running");
  }

  // Config
  const config = await loadConfig();
  console.log(`Interval: ${config.heartbeat} | Concurrency: ${config.concurrency}`);

  // Tasks
  let tasks;
  try {
    tasks = await loadTasks();
  } catch {
    console.log("No tasks found. Run 'heartbeat init' first.");
    return;
  }

  const historyManager = new HistoryManager();
  const lastRuns = await historyManager.getLastRuns();

  console.log(`\nTasks (${tasks.length}):`);
  for (const task of tasks) {
    const lastRun = lastRuns.get(task.name);
    const schedStr =
      task.schedule.type === "every-beat"
        ? "every beat"
        : task.schedule.type === "interval"
        ? `every ${(task.schedule.intervalMs! / 60_000).toFixed(0)}m`
        : task.schedule.type === "daily-at"
        ? `daily at ${task.schedule.atTime}`
        : "daily";
    const lastStr = lastRun
      ? `last run: ${lastRun.startedAt} (${lastRun.status})`
      : "never run";
    console.log(`  ${task.name}  [${schedStr}]  dir: ${task.dir}  ${lastStr}`);
  }
}
