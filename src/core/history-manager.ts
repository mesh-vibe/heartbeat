import { readFile, writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { HistoryEntry } from "../types/index.js";
import { historyDir } from "../utils/paths.js";

export class HistoryManager {
  private dir: string;

  constructor() {
    this.dir = historyDir();
  }

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async writeEntry(entry: HistoryEntry): Promise<string> {
    await this.init();
    const ts = entry.startedAt.replace(/[:.]/g, "-");
    const filename = `${ts}_${entry.taskName}.json`;
    const filePath = join(this.dir, filename);
    await writeFile(filePath, JSON.stringify(entry, null, 2));
    return filePath;
  }

  async getLastRun(taskName: string): Promise<HistoryEntry | null> {
    const entries = await this.getHistory({ task: taskName, limit: 1 });
    return entries[0] ?? null;
  }

  async getLastRuns(): Promise<Map<string, HistoryEntry>> {
    const all = await this.getHistory({});
    const map = new Map<string, HistoryEntry>();
    // Entries are sorted newest-first, so first occurrence per task is the latest
    for (const entry of all) {
      if (!map.has(entry.taskName)) {
        map.set(entry.taskName, entry);
      }
    }
    return map;
  }

  async getHistory(opts: { task?: string; limit?: number }): Promise<HistoryEntry[]> {
    let files: string[];
    try {
      files = await readdir(this.dir);
    } catch {
      return [];
    }

    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

    const entries: HistoryEntry[] = [];
    for (const file of jsonFiles) {
      if (opts.task) {
        // Quick filter by filename before parsing
        if (!file.includes(`_${opts.task}.json`)) continue;
      }
      try {
        const raw = await readFile(join(this.dir, file), "utf-8");
        const entry: HistoryEntry = JSON.parse(raw);
        if (opts.task && entry.taskName !== opts.task) continue;
        entries.push(entry);
        if (opts.limit && entries.length >= opts.limit) break;
      } catch {
        // Skip corrupt files
      }
    }
    return entries;
  }

  async cleanup(retentionMs: number): Promise<number> {
    let files: string[];
    try {
      files = await readdir(this.dir);
    } catch {
      return 0;
    }

    const cutoff = Date.now() - retentionMs;
    let removed = 0;

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(this.dir, file), "utf-8");
        const entry: HistoryEntry = JSON.parse(raw);
        if (new Date(entry.startedAt).getTime() < cutoff) {
          await unlink(join(this.dir, file));
          removed++;
        }
      } catch {
        // Skip
      }
    }
    return removed;
  }
}
