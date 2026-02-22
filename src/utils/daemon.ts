import { readFile, writeFile, unlink } from "node:fs/promises";
import type { DaemonState } from "../types/index.js";
import { daemonPath } from "./paths.js";

export async function writeDaemonState(state: DaemonState): Promise<void> {
  await writeFile(daemonPath(), JSON.stringify(state, null, 2));
}

export async function readDaemonState(): Promise<DaemonState | null> {
  try {
    const raw = await readFile(daemonPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearDaemonState(): Promise<void> {
  try {
    await unlink(daemonPath());
  } catch {
    // Already gone
  }
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
