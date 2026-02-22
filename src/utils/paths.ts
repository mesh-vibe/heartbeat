import { join } from "node:path";
import { homedir } from "node:os";

export const CONFIG_FILE = "config.md";
export const HISTORY_DIR = ".history";
export const DAEMON_FILE = ".daemon.json";
export const LOCK_FILE = ".lock";

let _heartbeatDirOverride: string | undefined;

export function setHeartbeatDirOverride(dir: string | undefined): void {
  _heartbeatDirOverride = dir;
}

export function heartbeatDir(): string {
  return _heartbeatDirOverride ?? globalHeartbeatDir();
}

export function configPath(): string {
  return join(heartbeatDir(), CONFIG_FILE);
}

export function historyDir(): string {
  return join(heartbeatDir(), HISTORY_DIR);
}

export function daemonPath(): string {
  return join(heartbeatDir(), DAEMON_FILE);
}

export function lockPath(): string {
  return join(heartbeatDir(), LOCK_FILE);
}

export function globalHeartbeatDir(): string {
  return join(homedir(), ".heartbeat");
}

export function launchAgentDir(): string {
  return join(homedir(), "Library", "LaunchAgents");
}
