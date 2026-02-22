import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { HistoryManager } from "../../src/core/history-manager.js";
import { setHeartbeatDirOverride } from "../../src/utils/paths.js";
import type { HistoryEntry } from "../../src/types/index.js";

let tmpDir: string;

function makeEntry(taskName: string, startedAt: string): HistoryEntry {
  return {
    taskName,
    startedAt,
    finishedAt: new Date(new Date(startedAt).getTime() + 5000).toISOString(),
    durationMs: 5000,
    status: "success",
    exitCode: 0,
    stdout: "ok",
    stderr: "",
  };
}

beforeEach(async () => {
  tmpDir = join(tmpdir(), "heartbeat-test-history-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  await mkdir(tmpDir, { recursive: true });
  setHeartbeatDirOverride(tmpDir);
});

afterEach(async () => {
  setHeartbeatDirOverride(undefined);
  await rm(tmpDir, { recursive: true, force: true });
});

describe("HistoryManager", () => {
  let manager: HistoryManager;

  beforeEach(() => {
    manager = new HistoryManager();
  });

  it("writes and reads a history entry", async () => {
    const entry = makeEntry("my-task", "2025-01-01T12:00:00.000Z");
    await manager.writeEntry(entry);
    const last = await manager.getLastRun("my-task");
    expect(last).not.toBeNull();
    expect(last!.taskName).toBe("my-task");
    expect(last!.status).toBe("success");
  });

  it("returns null for task with no history", async () => {
    const last = await manager.getLastRun("nonexistent");
    expect(last).toBeNull();
  });

  it("returns history entries sorted newest first", async () => {
    await manager.writeEntry(makeEntry("task-a", "2025-01-01T10:00:00.000Z"));
    await manager.writeEntry(makeEntry("task-a", "2025-01-01T12:00:00.000Z"));
    await manager.writeEntry(makeEntry("task-a", "2025-01-01T11:00:00.000Z"));

    const entries = await manager.getHistory({ task: "task-a" });
    expect(entries).toHaveLength(3);
    expect(entries[0].startedAt).toBe("2025-01-01T12:00:00.000Z");
    expect(entries[2].startedAt).toBe("2025-01-01T10:00:00.000Z");
  });

  it("respects limit", async () => {
    await manager.writeEntry(makeEntry("t", "2025-01-01T10:00:00.000Z"));
    await manager.writeEntry(makeEntry("t", "2025-01-01T11:00:00.000Z"));
    await manager.writeEntry(makeEntry("t", "2025-01-01T12:00:00.000Z"));

    const entries = await manager.getHistory({ limit: 2 });
    expect(entries).toHaveLength(2);
  });

  it("getLastRuns returns map of latest per task", async () => {
    await manager.writeEntry(makeEntry("a", "2025-01-01T10:00:00.000Z"));
    await manager.writeEntry(makeEntry("b", "2025-01-01T11:00:00.000Z"));
    await manager.writeEntry(makeEntry("a", "2025-01-01T12:00:00.000Z"));

    const map = await manager.getLastRuns();
    expect(map.size).toBe(2);
    expect(map.get("a")!.startedAt).toBe("2025-01-01T12:00:00.000Z");
    expect(map.get("b")!.startedAt).toBe("2025-01-01T11:00:00.000Z");
  });

  it("cleans up old entries", async () => {
    const old = new Date(Date.now() - 86_400_000 * 10).toISOString(); // 10 days ago
    const recent = new Date().toISOString();

    await manager.writeEntry(makeEntry("old-task", old));
    await manager.writeEntry(makeEntry("new-task", recent));

    const removed = await manager.cleanup(86_400_000 * 7); // 7 day retention
    expect(removed).toBe(1);

    const remaining = await manager.getHistory({});
    expect(remaining).toHaveLength(1);
    expect(remaining[0].taskName).toBe("new-task");
  });
});
