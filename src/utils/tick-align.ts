/**
 * Calculate milliseconds until the next clock-aligned tick boundary.
 *
 * For a 30m interval, ticks align to :00 and :30.
 * For a 15m interval, ticks align to :00, :15, :30, :45.
 * Starting at 9:51 with a 30m interval → first tick at 10:00 (9 minutes).
 */
export function msUntilNextTick(intervalMs: number): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const msSinceMidnight = now.getTime() - midnight.getTime();
  const remainder = msSinceMidnight % intervalMs;
  if (remainder === 0) return 0;
  return intervalMs - remainder;
}
