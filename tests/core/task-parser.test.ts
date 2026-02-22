import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { parseTaskFile, loadTasks } from "../../src/core/task-parser.js";
import { setHeartbeatDirOverride } from "../../src/utils/paths.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), "heartbeat-test-tasks-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  await mkdir(tmpDir, { recursive: true });
  setHeartbeatDirOverride(tmpDir);
});

afterEach(async () => {
  setHeartbeatDirOverride(undefined);
  await rm(tmpDir, { recursive: true, force: true });
});

describe("parseTaskFile", () => {
  it("parses a task file with frontmatter", async () => {
    const dir = join(tmpDir, "parse");
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, "my-task.md");
    await writeFile(
      filePath,
      `---
schedule: every 4 hours
timeout: 15m
dir: /tmp/my-project
enabled: true
claude:
  args: ["--verbose"]
  max_turns: 25
---

Review the git log and summarize changes.
`
    );

    const task = await parseTaskFile(filePath);
    expect(task.name).toBe("my-task");
    expect(task.schedule).toEqual({ type: "interval", intervalMs: 14_400_000 });
    expect(task.timeoutMs).toBe(900_000);
    expect(task.enabled).toBe(true);
    expect(task.prompt).toBe("Review the git log and summarize changes.");
    expect(task.dir).toBe("/tmp/my-project");
    expect(task.claude.args).toEqual(["--verbose"]);
    expect(task.claude.max_turns).toBe(25);
  });

  it("applies defaults for missing fields", async () => {
    const dir = join(tmpDir, "defaults");
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, "simple.md");
    await writeFile(filePath, "Just do something.\n");

    const task = await parseTaskFile(filePath);
    expect(task.name).toBe("simple");
    expect(task.schedule).toEqual({ type: "every-beat" });
    expect(task.timeoutMs).toBe(600_000);
    expect(task.enabled).toBe(true);
    expect(task.dir).toBe(homedir());
  });

  it("resolves ~ in dir field", async () => {
    const dir = join(tmpDir, "tilde");
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, "tilde-task.md");
    await writeFile(
      filePath,
      `---
dir: ~/my-project
---

Do something.
`
    );

    const task = await parseTaskFile(filePath);
    expect(task.dir).toBe(join(homedir(), "my-project"));
  });

  it("resolves absolute paths in dir field", async () => {
    const dir = join(tmpDir, "abs");
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, "abs-task.md");
    await writeFile(
      filePath,
      `---
dir: /usr/local/project
---

Do something.
`
    );

    const task = await parseTaskFile(filePath);
    expect(task.dir).toBe("/usr/local/project");
  });
});

describe("loadTasks", () => {
  it("loads enabled tasks from the heartbeat directory", async () => {
    await writeFile(
      join(tmpDir, "config.md"),
      "---\nheartbeat: 30m\n---\n"
    );
    await writeFile(
      join(tmpDir, "active.md"),
      "---\nschedule: daily\nenabled: true\n---\nDo things.\n"
    );
    await writeFile(
      join(tmpDir, "disabled.md"),
      "---\nschedule: daily\nenabled: false\n---\nSkip me.\n"
    );

    const tasks = await loadTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe("active");
  });
});
