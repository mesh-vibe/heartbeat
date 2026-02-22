import { exec } from "node:child_process";
import type { HistoryEntry, NotifyConfig } from "../types/index.js";
import { logger } from "../utils/logger.js";

export async function sendNotification(
  entry: HistoryEntry,
  notifyConfig: NotifyConfig
): Promise<void> {
  if (!notifyConfig.command) return;

  const shouldNotify =
    notifyConfig.on === "always" ||
    (notifyConfig.on === "error" && entry.status !== "success");

  if (!shouldNotify) return;

  logger.info(`Sending notification for task: ${entry.taskName}`, { status: entry.status });

  return new Promise<void>((resolve) => {
    exec(notifyConfig.command, {
      timeout: 30_000,
      env: {
        ...process.env,
        TASK_NAME: entry.taskName,
        TASK_STATUS: entry.status,
        TASK_STARTED_AT: entry.startedAt,
        TASK_FINISHED_AT: entry.finishedAt,
        TASK_DURATION_MS: String(entry.durationMs),
        TASK_EXIT_CODE: entry.exitCode != null ? String(entry.exitCode) : "",
      },
    }, (err) => {
      if (err) {
        logger.error(`Notification command failed`, { error: err.message });
      }
      resolve();
    });
  });
}
