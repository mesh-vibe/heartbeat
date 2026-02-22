import { describe, it, expect } from "vitest";
import { parseDuration } from "../../src/utils/duration-parser.js";

describe("parseDuration", () => {
  it("parses milliseconds", () => {
    expect(parseDuration("500ms")).toBe(500);
  });

  it("parses seconds", () => {
    expect(parseDuration("30s")).toBe(30_000);
  });

  it("parses minutes", () => {
    expect(parseDuration("30m")).toBe(1_800_000);
  });

  it("parses hours", () => {
    expect(parseDuration("4h")).toBe(14_400_000);
  });

  it("parses days", () => {
    expect(parseDuration("7d")).toBe(604_800_000);
  });

  it("trims whitespace", () => {
    expect(parseDuration("  10m  ")).toBe(600_000);
  });

  it("throws on invalid format", () => {
    expect(() => parseDuration("abc")).toThrow("Invalid duration");
    expect(() => parseDuration("10x")).toThrow("Invalid duration");
    expect(() => parseDuration("")).toThrow("Invalid duration");
  });
});
