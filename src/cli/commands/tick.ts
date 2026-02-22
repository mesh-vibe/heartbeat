import { writeFile, unlink, stat } from "node:fs/promises";
import { loadConfig } from "../../core/config.js";
import { loadTasks } from "../../core/task-parser.js";
import { getDueTasks } from "../../core/scheduler.js";
import { executeTasks } from "../../core/executor.js";
import { HistoryManager } from "../../core/history-manager.js";
import { sendNotification } from "../../core/notify.js";
import { lockPath } from "../../utils/paths.js";
import { logger } from "../../utils/logger.js";

async function acquireLock(): Promise<boolean> {
  const lp = lockPath();
  try {
    // Check if lock file exists and is stale (older than 30 minutes)
    try {
      const s = await stat(lp);
      const age = Date.now() - s.mtimeMs;
      if (age < 1_800_000) {
        return false; // Lock is fresh, another tick is running
      }
      logger.warn("Stale lock file detected, removing");
    } catch {
      // No existing lock — good
    }
    await writeFile(lp, String(process.pid), { flag: "wx" }).catch(async () => {
      // File might have been created between stat and write — overwrite if stale
      await writeFile(lp, String(process.pid));
    });
    return true;
  } catch {
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    await unlink(lockPath());
  } catch {
    // Already gone
  }
}

export async function tick(): Promise<void> {
  if (!(await acquireLock())) {
    logger.warn("Another tick is already running, skipping");
    return;
  }

  try {
    const config = await loadConfig();
    const tasks = await loadTasks();

    if (tasks.length === 0) {
      logger.info("No enabled tasks found");
      return;
    }

    const historyManager = new HistoryManager();
    const lastRuns = await historyManager.getLastRuns();
    const now = new Date();

    const dueTasks = getDueTasks(tasks, lastRuns, now, config.heartbeatMs);

    if (dueTasks.length === 0) {
      logger.info("No tasks due this tick");
      return;
    }

    logger.info(`Running ${dueTasks.length} due task(s)`, {
      tasks: dueTasks.map((t) => t.name),
    });

    const results = await executeTasks(dueTasks, config);

    for (const { entry } of results) {
      await historyManager.writeEntry(entry);
      await sendNotification(entry, config.notify);
    }

    const cleaned = await historyManager.cleanup(config.history_retentionMs);
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old history entries`);
    }
  } finally {
    await releaseLock();
  }
}
