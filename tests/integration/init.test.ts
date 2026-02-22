import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { stat, rm, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { init } from "../../src/cli/commands/init.js";
import { setHeartbeatDirOverride } from "../../src/utils/paths.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), "heartbeat-test-init-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  // Don't create tmpDir itself — init should create it
  setHeartbeatDirOverride(tmpDir);
});

afterEach(async () => {
  setHeartbeatDirOverride(undefined);
  await rm(tmpDir, { recursive: true, force: true });
});

describe("init command", () => {
  it("scaffolds ~/.heartbeat/ directory with config and example task", async () => {
    await init();

    // Verify structure
    const hbStat = await stat(tmpDir);
    expect(hbStat.isDirectory()).toBe(true);

    const configContent = await readFile(join(tmpDir, "config.md"), "utf-8");
    expect(configContent).toContain("heartbeat: 30m");

    const taskContent = await readFile(join(tmpDir, "example-task.md"), "utf-8");
    expect(taskContent).toContain("schedule: every beat");
    expect(taskContent).toContain("dir: ~");

    const historyStat = await stat(join(tmpDir, ".history"));
    expect(historyStat.isDirectory()).toBe(true);
  });

  it("does not overwrite existing ~/.heartbeat/", async () => {
    await init();
    // Running init again should not error
    await init();
    // Should still have original content
    const content = await readFile(join(tmpDir, "config.md"), "utf-8");
    expect(content).toContain("heartbeat: 30m");
  });
});
