export const SKILL_TEMPLATE = `---
name: heartbeat
description: Manage heartbeat scheduled tasks. Use when the user wants to check task status, run tasks, view history, or manage the heartbeat daemon.
---

# Heartbeat — Scheduled Task Runner

Heartbeat runs scheduled Claude Code tasks from \`~/.heartbeat/\`.

## Available commands

- \`heartbeat status\` — show daemon state and task schedules
- \`heartbeat list\` — list all configured tasks
- \`heartbeat history\` — show recent task run history
- \`heartbeat run <task-name>\` — manually trigger a specific task
- \`heartbeat tick\` — run a single heartbeat cycle (execute all due tasks)
- \`heartbeat start\` — start the daemon loop
- \`heartbeat stop\` — stop the running daemon
- \`heartbeat add "<prompt>" --schedule "every 4 hours" --task-dir ~/my-project\` — add a new task

## Task files

Tasks are Markdown files in \`~/.heartbeat/\` with YAML frontmatter:

\`\`\`markdown
---
schedule: every 4 hours
timeout: 10m
dir: ~/my-project
enabled: true
---

Your prompt for Claude goes here.
\`\`\`

The \`dir\` field specifies the working directory where Claude runs. Defaults to \`~\`.

## Configuration

Global config lives in \`~/.heartbeat/config.md\`. Key settings:
- **heartbeat**: tick interval (e.g., "30m")
- **concurrency**: max parallel tasks
- **claude.max_turns**: default max turns per task
`;
