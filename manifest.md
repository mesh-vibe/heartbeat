---
name: heartbeat
description: Directory-scoped scheduled task runner for Claude Code
cli: heartbeat
version: 0.1.0
health_check: heartbeat status
depends_on:
  - vault
---

Heartbeat runs scheduled Claude Code tasks from `~/mesh-vibe/heartbeat/`. Tasks are Markdown files with YAML frontmatter defining schedule, timeout, and environment variables.
