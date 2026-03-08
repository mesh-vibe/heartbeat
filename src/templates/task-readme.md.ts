export const TASK_README_TEMPLATE = `# Heartbeat Tasks

Scheduled task configs for the mesh-vibe heartbeat daemon. Each \`.md\` file is a task that runs on a schedule.

## Architecture

Heartbeat is a **dispatcher, not a worker**. Tasks should complete in under 1 minute. If the actual work takes longer, the task should queue a prompt via \`prompt-queue add\` and let the prompt-queue worker handle it.

### Two task patterns

**Direct execution** (< 1 minute):
- Run a quick CLI command and report the result
- Examples: \`dispatcher\`, \`anthropic-credit-monitor\`, \`prompt-supervisor\`, \`vibe-flow\`

**Queue and exit** (> 1 minute):
- Check if work is already queued (\`prompt-queue list | grep <keyword>\`)
- If not queued, add it via \`prompt-queue add "<prompt>"\`
- Exit immediately
- The prompt-queue worker picks it up and runs it with full time
- Examples: \`command-center\`, \`research-bot\`, \`news-bot\`, \`claudes-sandbox\`, \`security-scan-bot\`, \`standard-scan-bot\`, \`portuguese-tutor-bot\`

### Why queue?

- Heartbeat runs many tasks per beat with limited concurrency (currently 3)
- Long-running tasks block the beat and can timeout
- Queuing decouples scheduling from execution
- The prompt-queue worker has no timeout pressure — it runs until done

## Task file format

\`\`\`yaml
---
schedule: every beat | daily | daily at HH:MM | every Nm
timeout: 1m
dir: ~/some/directory
enabled: true
env:
  KEY: "value"           # plain value
  KEY: "vault://secret"  # fetched from macOS Keychain at runtime
claude:
  args: ["--dangerously-skip-permissions"]
  acknowledge_risks: true
---

Prompt text goes here. This is what Claude receives.
\`\`\`

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| \`schedule\` | yes | When to run: \`every beat\`, \`daily\`, \`daily at HH:MM\`, \`every Nm\` |
| \`timeout\` | yes | Max duration. Use \`1m\` for queue-and-exit tasks. |
| \`dir\` | yes | Working directory for the Claude session |
| \`enabled\` | yes | Set to \`false\` to disable without deleting |
| \`env\` | no | Environment variables. Use \`vault://\` prefix for secrets. |
| \`claude.args\` | no | Extra args passed to \`claude\` CLI |
| \`claude.acknowledge_risks\` | no | Required if using \`--dangerously-skip-permissions\` |

## Writing a queue-and-exit task

Template:

\`\`\`markdown
---
schedule: daily at 06:00
timeout: 1m
dir: ~
enabled: true
claude:
  args: ["--dangerously-skip-permissions"]
  acknowledge_risks: true
---

Queue the <task-name> for prompt-queue processing.

1. Run \\\`prompt-queue list\\\` and check if there's already a pending entry containing "<keyword>". If yes, output "Already queued" and exit.
2. If not, run:

\\\`\\\`\\\`bash
prompt-queue add "<full prompt text here>"
\\\`\\\`\\\`

3. Output "Queued <task-name>".
\`\`\`

### Key rules for queue-and-exit tasks

1. **Always check before queuing** — prevents duplicate entries piling up
2. **Include the full prompt** — the prompt-queue worker runs in a fresh session with no context from the heartbeat task
3. **Include security preambles** — if the work ingests external data, include the injection defense preamble in the queued prompt
4. **Keep env vars in the heartbeat task** — the prompt-queue worker inherits them from the heartbeat env block (e.g., \`ANTHROPIC_API_KEY: vault://...\`)
5. **Reference the heartbeat task for details** — for long prompts, put the detailed instructions in the heartbeat \`.md\` file and reference it: "See ~/mesh-vibe/heartbeat/<task>.md for full details"

## Adding a new task

1. Create a \`.md\` file in this directory following the format above
2. Choose the right pattern: direct execution for quick tasks, queue-and-exit for anything longer
3. Set \`timeout: 1m\` for queue-and-exit tasks
4. Include security preamble if the work touches external data
5. Set \`enabled: true\`
6. Heartbeat picks it up automatically on the next beat — no restart needed

## Config

Global settings are in \`config.md\` in this directory. See that file for heartbeat interval, concurrency, notification settings, and Claude CLI config.

## Data

- Task history: \`~/.heartbeat/history/\`
- Daemon state: \`~/.heartbeat/state.json\`
- PID file: \`~/mesh-vibe/heartbeat/heartbeat.pid\`
`;
