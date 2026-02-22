import { describe, it, expect } from "vitest";
import { parseSchedule } from "../../src/utils/schedule-parser.js";

describe("parseSchedule", () => {
  it("parses 'every beat'", () => {
    expect(parseSchedule("every beat")).toEqual({ type: "every-beat" });
  });

  it("parses 'every heartbeat'", () => {
    expect(parseSchedule("every heartbeat")).toEqual({ type: "every-beat" });
  });

  it("parses 'every 4 hours'", () => {
    expect(parseSchedule("every 4 hours")).toEqual({
      type: "interval",
      intervalMs: 14_400_000,
    });
  });

  it("parses 'every 1 hour'", () => {
    expect(parseSchedule("every 1 hour")).toEqual({
      type: "interval",
      intervalMs: 3_600_000,
    });
  });

  it("parses 'every 30 minutes'", () => {
    expect(parseSchedule("every 30 minutes")).toEqual({
      type: "interval",
      intervalMs: 1_800_000,
    });
  });

  it("parses 'daily'", () => {
    expect(parseSchedule("daily")).toEqual({ type: "daily" });
  });

  it("parses 'every day'", () => {
    expect(parseSchedule("every day")).toEqual({ type: "daily" });
  });

  it("parses 'daily at 08:00'", () => {
    expect(parseSchedule("daily at 08:00")).toEqual({
      type: "daily-at",
      atTime: "08:00",
    });
  });

  it("parses 'every day at 14:30'", () => {
    expect(parseSchedule("every day at 14:30")).toEqual({
      type: "daily-at",
      atTime: "14:30",
    });
  });

  it("is case insensitive", () => {
    expect(parseSchedule("Every Beat")).toEqual({ type: "every-beat" });
    expect(parseSchedule("DAILY")).toEqual({ type: "daily" });
  });

  it("throws on invalid schedule", () => {
    expect(() => parseSchedule("")).toThrow("Invalid schedule");
    expect(() => parseSchedule("sometimes")).toThrow("Invalid schedule");
    expect(() => parseSchedule("weekly")).toThrow("Invalid schedule");
  });

  it("throws on invalid time", () => {
    expect(() => parseSchedule("daily at 25:00")).toThrow("Invalid time");
  });
});
