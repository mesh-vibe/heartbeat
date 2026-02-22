const UNITS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDuration(input: string): number {
  const match = input.trim().match(/^(\d+)\s*(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration: "${input}". Expected format like "30m", "4h", "7d".`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return value * UNITS[unit];
}
