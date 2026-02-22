#!/usr/bin/env node

import { Command } from "commander";
import { init } from "./commands/init.js";
import { start } from "./commands/start.js";
import { stop } from "./commands/stop.js";
import { status } from "./commands/status.js";
import { add } from "./commands/add.js";
import { list } from "./commands/list.js";
import { history } from "./commands/history.js";
import { run } from "./commands/run.js";
import { tick } from "./commands/tick.js";
import { installService } from "./commands/install-service.js";
import { uninstallService } from "./commands/uninstall-service.js";

const program = new Command();

program
  .name("heartbeat")
  .description("Global scheduled task runner for Claude Code (~/.heartbeat/)")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize ~/.heartbeat/ with config, example task, and Claude skill")
  .action(async () => {
    await init();
  });

program
  .command("start")
  .description("Start the heartbeat daemon")
  .option("-b, --background", "Run in background")
  .action(async (opts) => {
    await start({ background: opts.background });
  });

program
  .command("stop")
  .description("Stop the running heartbeat daemon")
  .action(async () => {
    await stop();
  });

program
  .command("status")
  .description("Show daemon status and task overview")
  .action(async () => {
    await status();
  });

program
  .command("add <prompt>")
  .description("Add a new task")
  .option("-s, --schedule <schedule>", "Schedule expression", "every beat")
  .option("-t, --timeout <duration>", "Timeout duration", "10m")
  .option("--task-dir <path>", "Working directory for task execution", "~")
  .action(async (prompt, opts) => {
    await add(prompt, { schedule: opts.schedule, timeout: opts.timeout, taskDir: opts.taskDir });
  });

program
  .command("list")
  .description("List all tasks")
  .action(async () => {
    await list();
  });

program
  .command("history")
  .description("Show task run history")
  .option("-t, --task <name>", "Filter by task name")
  .option("-l, --limit <n>", "Max entries to show", "20")
  .action(async (opts) => {
    await history({ task: opts.task, limit: parseInt(opts.limit, 10) });
  });

program
  .command("run <task-name>")
  .description("Manually run a specific task")
  .action(async (taskName) => {
    await run(taskName);
  });

program
  .command("tick")
  .description("Run a single heartbeat cycle")
  .action(async () => {
    await tick();
  });

program
  .command("install-service")
  .description("Install launchd service (macOS)")
  .action(async () => {
    await installService();
  });

program
  .command("uninstall-service")
  .description("Uninstall launchd service (macOS)")
  .action(async () => {
    await uninstallService();
  });

program.parse();
