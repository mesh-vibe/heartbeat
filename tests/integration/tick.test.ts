import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { tick } from "../../src/cli/commands/tick.js";
import { setHeartbeatDirOverride } from "../../src/utils/paths.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), "heartbeat-test-tick-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  await mkdir(join(tmpDir, ".history"), { recursive: true });
  setHeartbeatDirOverride(tmpDir);
});

afterEach(async () => {
  setHeartbeatDirOverride(undefined);
  await rm(tmpDir, { recursive: true, force: true });
});

describe("tick command", () => {
  it("runs due tasks and creates history entries", async () => {
    // Write config
    await writeFile(
      join(tmpDir, "config.md"),
      `---
heartbeat: 30m
concurrency: 2
history_retention: 7d
claude:
  command: echo
  args: []
  max_turns: 1
  acknowledge_risks: false
---
`
    );

    // Write a task that uses 'echo' as the command (for testing)
    await writeFile(
      join(tmpDir, "echo-task.md"),
      `---
schedule: every beat
timeout: 10s
dir: ${homedir()}
enabled: true
claude:
  command: echo
---

hello from heartbeat
`
    );

    await tick();

    // Check that history was written
    const historyFiles = await readdir(join(tmpDir, ".history"));
    const jsonFiles = historyFiles.filter((f) => f.endsWith(".json"));
    expect(jsonFiles.length).toBeGreaterThanOrEqual(1);
    expect(jsonFiles[0]).toContain("echo-task");
  });

  it("skips tick when no tasks are due", async () => {
    await writeFile(
      join(tmpDir, "config.md"),
      `---
heartbeat: 30m
claude:
  command: echo
---
`
    );

    // No task files
    await tick();
    // Should complete without error
  });
});
