import type { Schedule } from "../types/index.js";

export function parseSchedule(input: string): Schedule {
  const s = input.trim().toLowerCase();

  // "every beat" or "every heartbeat"
  if (s === "every beat" || s === "every heartbeat") {
    return { type: "every-beat" };
  }

  // "every N minutes" or "every N hours"
  const intervalMatch = s.match(/^every\s+(\d+)\s+(minutes?|hours?)$/);
  if (intervalMatch) {
    const value = parseInt(intervalMatch[1], 10);
    const unit = intervalMatch[2].startsWith("hour") ? 3_600_000 : 60_000;
    return { type: "interval", intervalMs: value * unit };
  }

  // "every day at HH:MM" or "daily at HH:MM"
  const dailyAtMatch = s.match(/^(?:every\s+day|daily)\s+at\s+(\d{1,2}):(\d{2})$/);
  if (dailyAtMatch) {
    const hours = parseInt(dailyAtMatch[1], 10);
    const minutes = parseInt(dailyAtMatch[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time in schedule: "${input}"`);
    }
    const atTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return { type: "daily-at", atTime };
  }

  // "every day" or "daily"
  if (s === "every day" || s === "daily") {
    return { type: "daily" };
  }

  throw new Error(
    `Invalid schedule: "${input}". Expected: "every beat", "every N hours", "daily", or "daily at HH:MM".`
  );
}
