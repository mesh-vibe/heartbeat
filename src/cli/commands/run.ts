import { loadConfig } from "../../core/config.js";
import { loadTasks } from "../../core/task-parser.js";
import { executeTask } from "../../core/executor.js";
import { HistoryManager } from "../../core/history-manager.js";
import { sendNotification } from "../../core/notify.js";

export async function run(taskName: string): Promise<void> {
  const config = await loadConfig();

  let tasks;
  try {
    tasks = await loadTasks();
  } catch {
    console.error("Failed to load tasks. Run 'heartbeat init' first.");
    process.exit(1);
  }

  // Also load disabled tasks for manual runs
  const task = tasks.find((t) => t.name === taskName);
  if (!task) {
    console.error(`Task not found: ${taskName}`);
    console.error(`Available tasks: ${tasks.map((t) => t.name).join(", ")}`);
    process.exit(1);
  }

  console.log(`Running task: ${task.name}...`);
  const { entry } = await executeTask(task, config);

  const historyManager = new HistoryManager();
  await historyManager.writeEntry(entry);
  await sendNotification(entry, config.notify);

  const dur = entry.durationMs < 1000
    ? `${entry.durationMs}ms`
    : `${(entry.durationMs / 1000).toFixed(1)}s`;
  const turnInfo = entry.turnsUsed !== undefined ? `, turns: ${entry.turnsUsed}` : "";
  const turnWarning = entry.maxTurnsReached ? " [MAX TURNS REACHED]" : "";
  console.log(`\nResult: ${entry.status} (${dur}${turnInfo})${turnWarning}`);
  if (entry.stdout) {
    console.log(`\n--- stdout ---\n${entry.stdout}`);
  }
  if (entry.stderr) {
    console.error(`\n--- stderr ---\n${entry.stderr}`);
  }
}
