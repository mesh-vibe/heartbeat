import { writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { heartbeatDir } from "../../utils/paths.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function add(
  prompt: string,
  opts: { schedule?: string; timeout?: string; taskDir?: string }
): Promise<void> {
  const hbDir = heartbeatDir();
  const schedule = opts.schedule ?? "every beat";
  const timeout = opts.timeout ?? "10m";
  const dir = opts.taskDir ?? "~";

  const slug = slugify(prompt) || "task";
  let filename = `${slug}.md`;
  let filePath = join(hbDir, filename);

  // Avoid overwrites
  let counter = 1;
  while (true) {
    try {
      await stat(filePath);
      filename = `${slug}-${++counter}.md`;
      filePath = join(hbDir, filename);
    } catch {
      break;
    }
  }

  const content = `---
schedule: ${schedule}
timeout: ${timeout}
dir: ${dir}
enabled: true
---

${prompt}
`;

  await writeFile(filePath, content);
  console.log(`Created task: ${filename}`);
}
