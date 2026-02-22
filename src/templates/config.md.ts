export const CONFIG_TEMPLATE = `---
heartbeat: 30m
concurrency: 3
history_retention: 7d
notify:
  command: ""
  on: error
claude:
  command: claude
  args: []
  max_turns: 10
  acknowledge_risks: false
---

# Heartbeat Configuration

This file configures the global heartbeat daemon (~/.heartbeat/).

- **heartbeat**: How often the daemon ticks (e.g., "30m", "1h")
- **concurrency**: Maximum number of tasks running in parallel
- **history_retention**: How long to keep history entries (e.g., "7d", "30d")
- **notify.command**: Shell command to run on errors (receives TASK_NAME, TASK_STATUS env vars)
- **claude.command**: Path to the Claude CLI
- **claude.args**: Default args passed to every Claude invocation
- **claude.max_turns**: Default max agentic turns per task
- **claude.acknowledge_risks**: Set to true to allow --dangerously-skip-permissions
`;
