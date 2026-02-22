import type { Task, HistoryEntry } from "../types/index.js";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isDue(
  task: Task,
  lastRun: HistoryEntry | null,
  now: Date,
  heartbeatMs: number
): boolean {
  const schedule = task.schedule;

  if (schedule.type === "every-beat") {
    return true;
  }

  if (schedule.type === "interval") {
    if (!lastRun) return true;
    const elapsed = now.getTime() - new Date(lastRun.startedAt).getTime();
    return elapsed >= (schedule.intervalMs ?? heartbeatMs);
  }

  if (schedule.type === "daily") {
    if (!lastRun) return true;
    return !isSameDay(now, new Date(lastRun.startedAt));
  }

  if (schedule.type === "daily-at") {
    if (!schedule.atTime) return false;
    const [hours, minutes] = schedule.atTime.split(":").map(Number);
    const targetToday = new Date(now);
    targetToday.setHours(hours, minutes, 0, 0);

    // Not yet time today
    if (now < targetToday) return false;

    // Already ran today after target time
    if (lastRun) {
      const lastRunDate = new Date(lastRun.startedAt);
      if (isSameDay(now, lastRunDate) && lastRunDate >= targetToday) {
        return false;
      }
    }
    return true;
  }

  return false;
}

export function getDueTasks(
  tasks: Task[],
  lastRuns: Map<string, HistoryEntry>,
  now: Date,
  heartbeatMs: number
): Task[] {
  return tasks.filter((task) => {
    const lastRun = lastRuns.get(task.name) ?? null;
    return isDue(task, lastRun, now, heartbeatMs);
  });
}
