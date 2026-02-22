export interface Schedule {
  type: "every-beat" | "interval" | "daily" | "daily-at";
  intervalMs?: number;
  atTime?: string; // "HH:MM"
}

export interface ClaudeConfig {
  command: string;
  args: string[];
  max_turns: number;
  acknowledge_risks: boolean;
}

export interface NotifyConfig {
  command: string;
  on: "error" | "always" | "never";
}

export interface HeartbeatConfig {
  heartbeat: string;
  heartbeatMs: number;
  concurrency: number;
  history_retention: string;
  history_retentionMs: number;
  notify: NotifyConfig;
  claude: ClaudeConfig;
}

export interface Task {
  name: string;
  filePath: string;
  schedule: Schedule;
  timeout: string;
  timeoutMs: number;
  enabled: boolean;
  prompt: string;
  dir: string;
  claude: Partial<ClaudeConfig>;
}

export interface HistoryEntry {
  taskName: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "success" | "error" | "timeout";
  exitCode: number | null;
  stdout: string;
  stderr: string;
  turnsUsed?: number;
  maxTurnsReached?: boolean;
}

export interface DaemonState {
  pid: number;
  startedAt: string;
}
