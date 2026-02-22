import { loadTasks } from "../../core/task-parser.js";

export async function list(): Promise<void> {
  let tasks;
  try {
    tasks = await loadTasks();
  } catch {
    console.log("No tasks found. Run 'heartbeat init' first.");
    return;
  }

  if (tasks.length === 0) {
    console.log("No enabled tasks.");
    return;
  }

  console.log(`Tasks (${tasks.length}):\n`);
  for (const task of tasks) {
    const schedStr =
      task.schedule.type === "every-beat"
        ? "every beat"
        : task.schedule.type === "interval"
        ? `every ${(task.schedule.intervalMs! / 60_000).toFixed(0)}m`
        : task.schedule.type === "daily-at"
        ? `daily at ${task.schedule.atTime}`
        : "daily";
    console.log(`  ${task.name}`);
    console.log(`    schedule: ${schedStr}  |  timeout: ${task.timeout}  |  dir: ${task.dir}`);
    console.log(`    prompt: ${task.prompt.slice(0, 80)}${task.prompt.length > 80 ? "..." : ""}`);
    console.log();
  }
}
