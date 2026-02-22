# Heartbeat — Design Document

## What is Heartbeat?

Heartbeat is a global scheduled task runner for Claude Code. Tasks live in `~/.heartbeat/` as Markdown files, and the daemon runs Claude Code prompts on configurable schedules. Each task specifies its own working directory via a `dir` field.

Designed for macOS first (launchd), expandable later.

## How It Works

### The Core Idea: Tick-Based Architecture

Everything revolves around a single concept: the **tick**. A tick is one heartbeat cycle that:

1. Loads the global config from `~/.heartbeat/config.md`
2. Reads all task `.md` files from `~/.heartbeat/`
3. Checks history to determine which tasks are due
4. Executes due tasks in parallel (with concurrency limits)
5. Writes history entries and sends notifications
6. Cleans up old history

This design makes heartbeat composable:

- `heartbeat tick` — run one cycle manually or from cron/launchd
- `heartbeat start` — loop over tick with a sleep interval
- `heartbeat install-service` — let launchd call tick on a timer

### Directory Layout

```
~/.heartbeat/
  config.md           # Global config (interval, concurrency, claude args, notify)
  every-beat.md       # Runs every heartbeat tick
  daily-review.md     # Runs once per day
  four-hour-check.md  # Runs every 4 hours
  .history/           # JSON run logs, rolling retention
  .daemon.json        # PID file when daemon is running
  .lock               # Lock file to prevent overlapping ticks

~/.claude/
  skills/
    heartbeat/
      SKILL.md        # Claude Code skill (created by init)
```

### Config Format

`~/.heartbeat/config.md` uses YAML frontmatter:

```yaml
---
heartbeat: 30m          # Tick interval
concurrency: 3          # Max parallel tasks
history_retention: 7d   # How long to keep history
notify:
  command: ""           # Shell command on errors (receives env vars)
  on: error             # "error" | "always" | "never"
claude:
  command: claude       # Path to Claude CLI
  args: []              # Default args for every invocation
  max_turns: 10         # Default max agentic turns
  acknowledge_risks: false  # Required for --dangerously-skip-permissions
---
```

### Task Format

Each `.md` file in `~/.heartbeat/` (except `config.md`) is a task:

```yaml
---
schedule: every 4 hours   # When to run
timeout: 10m              # Kill after this duration
dir: ~/my-project         # Working directory for Claude (defaults to ~)
enabled: true             # Set false to skip
claude:                   # Per-task overrides (merged with global)
  args: ["--verbose"]
  max_turns: 25
---

Your prompt for Claude goes here. This is the body text
that gets passed to `claude -p "..."`.
```

The `dir` field specifies the working directory where Claude Code runs for this task. It supports `~` expansion and absolute paths. If omitted, defaults to `~`.

### Schedule Types

| Expression              | Type       | Behavior                                    |
|-------------------------|------------|---------------------------------------------|
| `every beat`            | every-beat | Runs on every tick                          |
| `every N minutes/hours` | interval   | Runs when N time has elapsed since last run |
| `daily` / `every day`   | daily      | Runs once per calendar day                  |
| `daily at HH:MM`        | daily-at   | Runs once per day after the specified time  |

Catch-up behavior: missed runs fire immediately on the next tick.

## Architecture

### Module Layout

```
src/
  index.ts                  # Library re-exports
  types/index.ts            # All interfaces
  cli/
    index.ts                # CLI entry point (commander)
    commands/               # One file per command
  core/
    config.ts               # Load/validate config.md
    task-parser.ts           # Parse task .md files (gray-matter)
    scheduler.ts            # Determine which tasks are due
    executor.ts             # Spawn claude processes, p-limit concurrency
    history-manager.ts      # Read/write/cleanup .history/ JSON files
    notify.ts               # Shell out to notify command on error
  utils/
    schedule-parser.ts      # "every 4 hours" → Schedule object
    duration-parser.ts      # "30m" → milliseconds
    safety.ts               # Strip dangerous flags unless acknowledged
    paths.ts                # Path resolution helpers (global ~/.heartbeat/)
    logger.ts               # Timestamped console logger
    daemon.ts               # PID file management
    plist.ts                # launchd plist XML generation
  templates/
    config.md.ts            # Default config content
    example-task.md.ts      # Starter task file
    skill.md.ts             # Claude Code skill template
```

### Data Flow

```
heartbeat tick
  │
  ├─ loadConfig()        → HeartbeatConfig (from ~/.heartbeat/config.md)
  ├─ loadTasks()         → Task[] (from ~/.heartbeat/*.md)
  ├─ getLastRuns()       → Map<taskName, HistoryEntry>
  ├─ getDueTasks()       → Task[] (filtered by schedule + history)
  ├─ executeTasks()      → spawn claude -p "prompt" per task (cwd = task.dir)
  │   └─ p-limit          (concurrency control)
  ├─ writeEntry()        → JSON files in .history/
  ├─ sendNotification()  → shell out on error/always
  └─ cleanup()           → delete entries older than retention
```

### Key Design Decisions

**1. Global Storage, Per-Task Working Directory**

All tasks and config live in `~/.heartbeat/`. Each task specifies its execution directory via the `dir` frontmatter field, which defaults to `~`. This separates storage (always `~/.heartbeat/`) from execution context (per-task `dir`).

**2. History as Source of Truth**

There is no separate state file. Last-run times are derived from `.history/` JSON files. This means:
- State is always consistent with what actually ran
- You can inspect, delete, or manually add history entries
- No risk of state/reality drift

**3. Per-Task Config with Global Defaults**

Task frontmatter overrides `config.md`. Merge strategy: task wins on conflicts. This lets you set sensible defaults globally and customize per task.

**4. Safety Gate**

The `--dangerously-skip-permissions` flag (and similar) are stripped from args unless `acknowledge_risks: true` is set. This prevents accidental privilege escalation in task files. A warning is logged when flags are stripped.

**5. Lock File**

A `.lock` file prevents overlapping ticks. If a tick is already running, the next one skips. Stale locks (older than 30 minutes) are automatically removed.

**6. Pluggable Notifications**

Notifications are just a shell command string. The command receives task info via environment variables (`TASK_NAME`, `TASK_STATUS`, `TASK_STARTED_AT`, etc.). No email/SMTP built in — compose with whatever you want.

### Execution Model

Each task spawns a separate `claude -p "prompt" --max-turns N [args]` process with:
- `cwd` set to `task.dir` (the task's configured working directory)
- Timeout via `AbortController` (kills the process if it exceeds the task timeout)
- stdout/stderr captured (last 10k chars kept in history)
- Exit code tracked for success/error status

Concurrency is controlled by `p-limit` — at most `config.concurrency` tasks run simultaneously.

### Daemon Modes

**Foreground** (`heartbeat start`): Enters a loop — run tick, sleep until next clock-aligned boundary, repeat. Writes PID to `.daemon.json`. Handles SIGTERM/SIGINT for clean shutdown.

**Background** (`heartbeat start --background`): Spawns a detached child process running the foreground loop.

**launchd** (`heartbeat install-service`): Generates a plist that calls `heartbeat tick` on a schedule. When the interval divides evenly into 60 minutes (e.g., 15m, 30m, 60m), it uses `StartCalendarInterval` entries to fire at specific minutes of every hour. Otherwise, it falls back to `StartInterval`.

### Clock-Aligned Ticks

Ticks snap to clock boundaries rather than firing at arbitrary times relative to when the daemon started. A 30-minute interval fires at :00 and :30, a 15-minute interval fires at :00/:15/:30/:45, etc. Starting the daemon at 9:51 with a 30m interval means the first tick runs at 10:00, then 10:30, and so on.

This alignment is implemented in two places:
- **Daemon loop**: sleeps until the next clock-aligned boundary using `msUntilNextTick(intervalMs)` instead of a flat sleep
- **launchd plist**: uses `StartCalendarInterval` with specific minute values when possible

## Claude Code Integration

`heartbeat init` creates `~/.claude/skills/heartbeat/SKILL.md`. This follows the [Agent Skills](https://agentskills.io) open standard and lets Claude Code:

- Automatically discover heartbeat when users ask about task scheduling
- Provide contextual help for heartbeat commands
- Be invoked directly via `/heartbeat` in Claude Code

## CLI Reference

| Command                  | Description                                      |
|--------------------------|--------------------------------------------------|
| `heartbeat init`         | Scaffold `~/.heartbeat/` and Claude skill        |
| `heartbeat start`        | Start the daemon loop (`--background` to detach) |
| `heartbeat stop`         | Stop the running daemon                          |
| `heartbeat status`       | Show daemon state and task schedules             |
| `heartbeat add <prompt>` | Create a new task file (`--schedule`, `--timeout`, `--task-dir`) |
| `heartbeat list`         | List all enabled tasks                           |
| `heartbeat history`      | Show run history (`--task`, `--limit`)            |
| `heartbeat run <task>`   | Manually trigger a specific task                 |
| `heartbeat tick`         | Run a single heartbeat cycle                     |
| `heartbeat install-service`   | Install macOS launchd service               |
| `heartbeat uninstall-service` | Remove macOS launchd service                |

The `add` command accepts `--task-dir <path>` to set the working directory for the task (defaults to `~`).
