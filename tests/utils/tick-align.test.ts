import { describe, it, expect, vi, afterEach } from "vitest";
import { msUntilNextTick } from "../../src/utils/tick-align.js";

describe("msUntilNextTick", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setTime(hour: number, minute: number, second = 0, ms = 0): void {
    const date = new Date();
    date.setHours(hour, minute, second, ms);
    vi.useFakeTimers({ now: date });
  }

  it("at 9:51 with 30m interval → 9 minutes until 10:00", () => {
    setTime(9, 51);
    expect(msUntilNextTick(30 * 60_000)).toBe(9 * 60_000);
  });

  it("at 10:00 with 30m interval → 0 (on boundary)", () => {
    setTime(10, 0);
    expect(msUntilNextTick(30 * 60_000)).toBe(0);
  });

  it("at 10:29 with 30m interval → 1 minute until 10:30", () => {
    setTime(10, 29);
    expect(msUntilNextTick(30 * 60_000)).toBe(1 * 60_000);
  });

  it("at 14:45 with 60m interval → 15 minutes until 15:00", () => {
    setTime(14, 45);
    expect(msUntilNextTick(60 * 60_000)).toBe(15 * 60_000);
  });

  it("at 14:00 with 15m interval → 0 (on boundary)", () => {
    setTime(14, 0);
    expect(msUntilNextTick(15 * 60_000)).toBe(0);
  });

  it("at 0:07 with 15m interval → 8 minutes until 0:15", () => {
    setTime(0, 7);
    expect(msUntilNextTick(15 * 60_000)).toBe(8 * 60_000);
  });

  it("at midnight with any interval → 0 (on boundary)", () => {
    setTime(0, 0);
    expect(msUntilNextTick(30 * 60_000)).toBe(0);
  });
});
