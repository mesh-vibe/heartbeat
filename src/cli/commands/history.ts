import { HistoryManager } from "../../core/history-manager.js";

export async function history(
  opts: { task?: string; limit?: number }
): Promise<void> {
  const manager = new HistoryManager();
  const entries = await manager.getHistory({
    task: opts.task,
    limit: opts.limit ?? 20,
  });

  if (entries.length === 0) {
    console.log("No history entries found.");
    return;
  }

  console.log(`History (${entries.length} entries):\n`);
  for (const entry of entries) {
    const dur = entry.durationMs < 1000
      ? `${entry.durationMs}ms`
      : `${(entry.durationMs / 1000).toFixed(1)}s`;
    const statusIcon = entry.status === "success" ? "OK" : entry.status === "timeout" ? "TIMEOUT" : "ERR";
    const turnInfo = entry.turnsUsed !== undefined ? `  turns: ${entry.turnsUsed}` : "";
    const turnWarning = entry.maxTurnsReached ? " [MAX TURNS]" : "";
    console.log(
      `  [${statusIcon}] ${entry.taskName}  ${entry.startedAt}  (${dur}${turnInfo})${turnWarning}`
    );
  }
}
