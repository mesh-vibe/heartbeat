import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../../src/core/config.js";
import { setHeartbeatDirOverride } from "../../src/utils/paths.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), "heartbeat-test-config-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  await mkdir(tmpDir, { recursive: true });
  setHeartbeatDirOverride(tmpDir);
});

afterEach(async () => {
  setHeartbeatDirOverride(undefined);
  await rm(tmpDir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("loads config from config.md", async () => {
    await writeFile(
      join(tmpDir, "config.md"),
      `---
heartbeat: 1h
concurrency: 5
history_retention: 14d
notify:
  command: "echo error"
  on: always
claude:
  command: /usr/local/bin/claude
  args: ["--verbose"]
  max_turns: 20
  acknowledge_risks: true
---
`
    );

    const config = await loadConfig();
    expect(config.heartbeat).toBe("1h");
    expect(config.heartbeatMs).toBe(3_600_000);
    expect(config.concurrency).toBe(5);
    expect(config.history_retention).toBe("14d");
    expect(config.history_retentionMs).toBe(1_209_600_000);
    expect(config.notify.command).toBe("echo error");
    expect(config.notify.on).toBe("always");
    expect(config.claude.command).toBe("/usr/local/bin/claude");
    expect(config.claude.args).toEqual(["--verbose"]);
    expect(config.claude.max_turns).toBe(20);
    expect(config.claude.acknowledge_risks).toBe(true);
  });

  it("returns defaults when no config file exists", async () => {
    // Point to a dir with no config.md
    const emptyDir = join(tmpdir(), "heartbeat-test-noconfig-" + Date.now());
    await mkdir(emptyDir, { recursive: true });
    setHeartbeatDirOverride(emptyDir);

    const config = await loadConfig();
    expect(config.heartbeat).toBe("30m");
    expect(config.heartbeatMs).toBe(1_800_000);
    expect(config.concurrency).toBe(3);
    expect(config.claude.command).toBe("claude");

    await rm(emptyDir, { recursive: true, force: true });
  });
});
