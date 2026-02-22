import { spawn } from "node:child_process";
import pLimit from "p-limit";
import type { Task, HeartbeatConfig, HistoryEntry } from "../types/index.js";
import { sanitizeArgs } from "../utils/safety.js";
import { logger } from "../utils/logger.js";

export interface ExecutionResult {
  entry: HistoryEntry;
}

function mergeClaudeArgs(config: HeartbeatConfig, task: Task): string[] {
  const globalArgs = [...config.claude.args];
  const taskArgs = task.claude.args ? [...task.claude.args] : [];
  const merged = [...globalArgs, ...taskArgs];

  const acknowledgeRisks = task.claude.acknowledge_risks ?? config.claude.acknowledge_risks;
  return sanitizeArgs(merged, acknowledgeRisks);
}

export async function executeTask(
  task: Task,
  config: HeartbeatConfig
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const command = task.claude.command ?? config.claude.command;
  const maxTurns = task.claude.max_turns ?? config.claude.max_turns;
  const args = mergeClaudeArgs(config, task);

  const fullArgs = [
    "-p",
    task.prompt,
    ...(maxTurns > 0 ? ["--max-turns", String(maxTurns)] : []),
    ...args,
  ];

  logger.info(`Executing task: ${task.name}`, { command, maxTurns });

  return new Promise<ExecutionResult>((resolve) => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), task.timeoutMs);

    const child = spawn(command, fullArgs, {
      cwd: task.dir,
      signal: ac.signal,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      const finishedAt = new Date().toISOString();
      const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

      // Parse turn usage from Claude Code output
      const maxTurnsMatch = stdout.match(/Reached max turns \((\d+)\)/);
      const maxTurnsReached = maxTurnsMatch !== null;
      const turnsUsed = maxTurnsMatch ? parseInt(maxTurnsMatch[1], 10) : undefined;

      const entry: HistoryEntry = {
        taskName: task.name,
        startedAt,
        finishedAt,
        durationMs,
        status: code === 0 ? "success" : "error",
        exitCode: code,
        stdout: stdout.slice(-10_000), // Keep last 10k chars
        stderr: stderr.slice(-10_000),
        ...(turnsUsed !== undefined && { turnsUsed }),
        ...(maxTurnsReached && { maxTurnsReached }),
      };

      if (code === 0) {
        logger.info(`Task completed: ${task.name}`, { durationMs });
      } else {
        logger.error(`Task failed: ${task.name}`, { exitCode: code, durationMs });
      }

      resolve({ entry });
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      const finishedAt = new Date().toISOString();
      const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
      const isTimeout = ac.signal.aborted;

      const entry: HistoryEntry = {
        taskName: task.name,
        startedAt,
        finishedAt,
        durationMs,
        status: isTimeout ? "timeout" : "error",
        exitCode: null,
        stdout: stdout.slice(-10_000),
        stderr: isTimeout ? `Task timed out after ${task.timeout}` : err.message,
      };

      logger.error(`Task error: ${task.name}`, { error: err.message, isTimeout });
      resolve({ entry });
    });
  });
}

export async function executeTasks(
  tasks: Task[],
  config: HeartbeatConfig
): Promise<ExecutionResult[]> {
  const limit = pLimit(config.concurrency);
  const promises = tasks.map((task) =>
    limit(() => executeTask(task, config))
  );
  return Promise.all(promises);
}
