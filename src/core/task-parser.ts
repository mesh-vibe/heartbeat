import { readFile, readdir } from "node:fs/promises";
import { join, basename, extname, resolve } from "node:path";
import { homedir } from "node:os";
import matter from "gray-matter";
import type { Task, ClaudeConfig } from "../types/index.js";
import { parseSchedule } from "../utils/schedule-parser.js";
import { parseDuration } from "../utils/duration-parser.js";
import { heartbeatDir } from "../utils/paths.js";

function resolveDir(raw?: string): string {
  if (!raw) return homedir();
  if (raw.startsWith("~")) {
    return resolve(join(homedir(), raw.slice(1)));
  }
  return resolve(raw);
}

export async function parseTaskFile(filePath: string): Promise<Task> {
  const raw = await readFile(filePath, "utf-8");
  const { data, content } = matter(raw);

  const name = basename(filePath, extname(filePath));
  const schedule = parseSchedule(data.schedule ?? "every beat");
  const timeout = data.timeout ?? "10m";
  const timeoutMs = parseDuration(timeout);
  const enabled = data.enabled !== false;
  const prompt = content.trim();
  const dir = resolveDir(data.dir as string | undefined);

  const claude: Partial<ClaudeConfig> = {};
  if (data.claude) {
    if (data.claude.args) claude.args = data.claude.args;
    if (data.claude.max_turns != null) claude.max_turns = data.claude.max_turns;
    if (data.claude.command) claude.command = data.claude.command;
    if (data.claude.acknowledge_risks != null) claude.acknowledge_risks = data.claude.acknowledge_risks;
  }

  return { name, filePath, schedule, timeout, timeoutMs, enabled, prompt, dir, claude };
}

export async function loadTasks(): Promise<Task[]> {
  const dir = heartbeatDir();
  const entries = await readdir(dir);
  const taskFiles = entries.filter(
    (e) => e.endsWith(".md") && e !== "config.md" && !e.startsWith(".")
  );

  const tasks: Task[] = [];
  for (const file of taskFiles) {
    const task = await parseTaskFile(join(dir, file));
    if (task.enabled) {
      tasks.push(task);
    }
  }
  return tasks;
}
