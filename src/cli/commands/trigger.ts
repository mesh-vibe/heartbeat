import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import { join } from "node:path";
import { loadTasks } from "../../core/task-parser.js";
import { heartbeatDir } from "../../utils/paths.js";

const LOGS_DIR = ".logs";

function logsDir(): string {
  return join(heartbeatDir(), LOGS_DIR);
}

/** Env vars that cause Claude nesting issues when inherited. */
const CLAUDE_ENV_PREFIXES = [
  "CLAUDE_",
  "MCP_",
  "ANTHROPIC_",
];

function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (CLAUDE_ENV_PREFIXES.some((p) => key.startsWith(p))) {
      delete env[key];
    }
  }
  return env;
}

export async function trigger(taskName: string): Promise<void> {
  let tasks;
  try {
    tasks = await loadTasks();
  } catch {
    console.error("Failed to load tasks. Run 'heartbeat init' first.");
    process.exit(1);
  }

  const task = tasks.find((t) => t.name === taskName);
  if (!task) {
    console.error(`Task not found: ${taskName}`);
    console.error(`Available tasks: ${tasks.map((t) => t.name).join(", ")}`);
    process.exit(1);
  }

  // Ensure logs directory exists
  const dir = logsDir();
  await mkdir(dir, { recursive: true });

  // Open log file for this run
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = join(dir, `${taskName}_${timestamp}.log`);
  const logFd = await open(logPath, "w");

  // Resolve heartbeat binary path
  const heartbeatBin = process.argv[1];

  // Spawn detached: heartbeat run <task-name>
  const child = spawn(heartbeatBin, ["run", taskName], {
    detached: true,
    stdio: ["ignore", logFd.fd, logFd.fd],
    env: cleanEnv(),
  });

  child.unref();

  console.log(`Triggered task: ${taskName} (PID ${child.pid})`);
  console.log(`Log: ${logPath}`);
}
