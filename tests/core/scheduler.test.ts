import { describe, it, expect } from "vitest";
import { isDue, getDueTasks } from "../../src/core/scheduler.js";
import type { Task, HistoryEntry, Schedule } from "../../src/types/index.js";
import { homedir } from "node:os";

function makeTask(schedule: Schedule, name = "test"): Task {
  return {
    name,
    filePath: `/fake/${name}.md`,
    schedule,
    timeout: "10m",
    timeoutMs: 600_000,
    enabled: true,
    prompt: "test",
    dir: homedir(),
    claude: {},
  };
}

function makeHistory(taskName: string, startedAt: string): HistoryEntry {
  return {
    taskName,
    startedAt,
    finishedAt: new Date(new Date(startedAt).getTime() + 1000).toISOString(),
    durationMs: 1000,
    status: "success",
    exitCode: 0,
    stdout: "",
    stderr: "",
  };
}

describe("isDue", () => {
  const heartbeatMs = 1_800_000; // 30m

  describe("every-beat", () => {
    it("is always due", () => {
      const task = makeTask({ type: "every-beat" });
      expect(isDue(task, null, new Date(), heartbeatMs)).toBe(true);
      expect(
        isDue(task, makeHistory("test", new Date().toISOString()), new Date(), heartbeatMs)
      ).toBe(true);
    });
  });

  describe("interval", () => {
    it("is due when never run", () => {
      const task = makeTask({ type: "interval", intervalMs: 3_600_000 });
      expect(isDue(task, null, new Date(), heartbeatMs)).toBe(true);
    });

    it("is due when interval elapsed", () => {
      const task = makeTask({ type: "interval", intervalMs: 3_600_000 });
      const twoHoursAgo = new Date(Date.now() - 7_200_000).toISOString();
      expect(isDue(task, makeHistory("test", twoHoursAgo), new Date(), heartbeatMs)).toBe(true);
    });

    it("is not due when interval not elapsed", () => {
      const task = makeTask({ type: "interval", intervalMs: 3_600_000 });
      const tenMinAgo = new Date(Date.now() - 600_000).toISOString();
      expect(isDue(task, makeHistory("test", tenMinAgo), new Date(), heartbeatMs)).toBe(false);
    });
  });

  describe("daily", () => {
    it("is due when never run", () => {
      const task = makeTask({ type: "daily" });
      expect(isDue(task, null, new Date(), heartbeatMs)).toBe(true);
    });

    it("is not due when run today", () => {
      const task = makeTask({ type: "daily" });
      const now = new Date();
      expect(isDue(task, makeHistory("test", now.toISOString()), now, heartbeatMs)).toBe(false);
    });

    it("is due when last run was yesterday", () => {
      const task = makeTask({ type: "daily" });
      const now = new Date("2025-06-15T10:00:00.000Z");
      const yesterday = "2025-06-14T10:00:00.000Z";
      expect(isDue(task, makeHistory("test", yesterday), now, heartbeatMs)).toBe(true);
    });
  });

  describe("daily-at", () => {
    it("is due when never run and past target time", () => {
      const task = makeTask({ type: "daily-at", atTime: "08:00" });
      const now = new Date("2025-06-15T10:00:00.000Z");
      // Adjust for local timezone — use local 10am
      const local10am = new Date();
      local10am.setHours(10, 0, 0, 0);
      const taskLocal = makeTask({ type: "daily-at", atTime: "08:00" });
      expect(isDue(taskLocal, null, local10am, heartbeatMs)).toBe(true);
    });

    it("is not due before target time", () => {
      const task = makeTask({ type: "daily-at", atTime: "14:00" });
      const now = new Date();
      now.setHours(10, 0, 0, 0);
      expect(isDue(task, null, now, heartbeatMs)).toBe(false);
    });

    it("is not due when already ran today after target", () => {
      const task = makeTask({ type: "daily-at", atTime: "08:00" });
      const now = new Date();
      now.setHours(10, 0, 0, 0);
      const ranAt9 = new Date();
      ranAt9.setHours(9, 0, 0, 0);
      expect(isDue(task, makeHistory("test", ranAt9.toISOString()), now, heartbeatMs)).toBe(false);
    });
  });
});

describe("getDueTasks", () => {
  it("filters to only due tasks", () => {
    const tasks = [
      makeTask({ type: "every-beat" }, "always"),
      makeTask({ type: "interval", intervalMs: 3_600_000 }, "not-yet"),
    ];
    const lastRuns = new Map<string, HistoryEntry>();
    lastRuns.set("not-yet", makeHistory("not-yet", new Date().toISOString()));

    const due = getDueTasks(tasks, lastRuns, new Date(), 1_800_000);
    expect(due).toHaveLength(1);
    expect(due[0].name).toBe("always");
  });
});
