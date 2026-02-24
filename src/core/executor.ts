import { spawn, execFileSync } from "node:child_process";
import pLimit from "p-limit";
import type { Task, HeartbeatConfig, HistoryEntry } from "../types/index.js";
import { sanitizeArgs } from "../utils/safety.js";
import { logger } from "../utils/logger.js";

export interface ExecutionResult {
  entry: HistoryEntry;
}

async function resolveEnv(
  env: Record<string, string> | undefined
): Promise<Record<string, string>> {
  if (!env) return {};

  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value.startsWith("vault://")) {
      const secretKey = value.slice("vault://".length);
      try {
        resolved[key] = execFileSync("vault", ["get", secretKey], {
          encoding: "utf-8",
          timeout: 5_000,
        }).trim();
        logger.info(`Resolved env ${key} from Vault`);
      } catch (err) {
        throw new Error(
          `Failed to resolve env ${key} from Vault: ${(err as Error).message}`
        );
      }
    } else if (value.startsWith("op://")) {
      try {
        resolved[key] = execFileSync("op", ["read", value], {
          encoding: "utf-8",
          timeout: 10_000,
        }).trim();
        logger.info(`Resolved env ${key} from 1Password`);
      } catch (err) {
        throw new Error(
          `Failed to resolve env ${key} from 1Password: ${(err as Error).message}`
        );
      }
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
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

  let taskEnv: Record<string, string>;
  try {
    taskEnv = await resolveEnv(task.env);
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    logger.error(`Task aborted: ${task.name}`, { error: (err as Error).message });
    return {
      entry: {
        taskName: task.name,
        startedAt,
        finishedAt,
        durationMs,
        status: "error",
        exitCode: null,
        stdout: "",
        stderr: (err as Error).message,
      },
    };
  }

  return new Promise<ExecutionResult>((resolve) => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), task.timeoutMs);

    const child = spawn(command, fullArgs, {
      cwd: task.dir,
      signal: ac.signal,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CLAUDECODE: undefined, ...taskEnv },
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
