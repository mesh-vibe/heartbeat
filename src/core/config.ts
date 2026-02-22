import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import type { HeartbeatConfig } from "../types/index.js";
import { configPath } from "../utils/paths.js";
import { parseDuration } from "../utils/duration-parser.js";

const DEFAULTS: HeartbeatConfig = {
  heartbeat: "30m",
  heartbeatMs: 1_800_000,
  concurrency: 3,
  history_retention: "7d",
  history_retentionMs: 604_800_000,
  notify: { command: "", on: "error" },
  claude: {
    command: "claude",
    args: [],
    max_turns: 10,
    acknowledge_risks: false,
  },
};

export async function loadConfig(): Promise<HeartbeatConfig> {
  const path = configPath();
  let data: Record<string, unknown> = {};

  try {
    const raw = await readFile(path, "utf-8");
    const parsed = matter(raw);
    data = parsed.data;
  } catch {
    // Use defaults if no config file
  }

  const heartbeat = (data.heartbeat as string) ?? DEFAULTS.heartbeat;
  const heartbeatMs = parseDuration(heartbeat);

  const history_retention = (data.history_retention as string) ?? DEFAULTS.history_retention;
  const history_retentionMs = parseDuration(history_retention);

  const concurrency = (data.concurrency as number) ?? DEFAULTS.concurrency;

  const notifyData = (data.notify as Record<string, unknown>) ?? {};
  const notify = {
    command: (notifyData.command as string) ?? DEFAULTS.notify.command,
    on: (notifyData.on as "error" | "always" | "never") ?? DEFAULTS.notify.on,
  };

  const claudeData = (data.claude as Record<string, unknown>) ?? {};
  const claude = {
    command: (claudeData.command as string) ?? DEFAULTS.claude.command,
    args: (claudeData.args as string[]) ?? [...DEFAULTS.claude.args],
    max_turns: (claudeData.max_turns as number) ?? DEFAULTS.claude.max_turns,
    acknowledge_risks: (claudeData.acknowledge_risks as boolean) ?? DEFAULTS.claude.acknowledge_risks,
  };

  return { heartbeat, heartbeatMs, concurrency, history_retention, history_retentionMs, notify, claude };
}
