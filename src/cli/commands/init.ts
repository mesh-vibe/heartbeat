import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { heartbeatDir, historyDir } from "../../utils/paths.js";
import { CONFIG_TEMPLATE } from "../../templates/config.md.js";
import { EXAMPLE_TASK_TEMPLATE } from "../../templates/example-task.md.js";
import { SKILL_TEMPLATE } from "../../templates/skill.md.js";
import { logger } from "../../utils/logger.js";

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function init(): Promise<void> {
  const hbDir = heartbeatDir();
  const histDir = historyDir();

  if (await exists(hbDir)) {
    logger.info("~/.heartbeat/ directory already exists, skipping scaffold");
    return;
  }

  // Create directories
  await mkdir(hbDir, { recursive: true });
  await mkdir(histDir, { recursive: true });

  // Write config
  await writeFile(join(hbDir, "config.md"), CONFIG_TEMPLATE);
  logger.info("Created ~/.heartbeat/config.md");

  // Write example task
  await writeFile(join(hbDir, "example-task.md"), EXAMPLE_TASK_TEMPLATE);
  logger.info("Created ~/.heartbeat/example-task.md");

  // Create Claude skill
  const skillDir = join(homedir(), ".claude", "skills", "heartbeat");
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, "SKILL.md"), SKILL_TEMPLATE);
  logger.info("Created ~/.claude/skills/heartbeat/SKILL.md");

  console.log(`\nInitialized heartbeat in ${hbDir}`);
  console.log(`  ~/.heartbeat/config.md       — global configuration`);
  console.log(`  ~/.heartbeat/example-task.md  — starter task (edit or delete)`);
  console.log(`  ~/.claude/skills/heartbeat/   — Claude Code skill`);
  console.log(`\nNext steps:`);
  console.log(`  Edit ~/.heartbeat/example-task.md or add new tasks with:`);
  console.log(`    heartbeat add "Your prompt" --schedule "every 4 hours"`);
  console.log(`  Then start the daemon:`);
  console.log(`    heartbeat start`);
}
