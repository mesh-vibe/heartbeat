import { homedir } from "node:os";
import { heartbeatDir } from "./paths.js";

export function plistLabel(): string {
  return "com.heartbeat.agent";
}

function generateScheduleEntries(intervalSeconds: number): string {
  const intervalMinutes = intervalSeconds / 60;

  // Use StartCalendarInterval when the interval divides evenly into 60 minutes
  if (intervalMinutes >= 1 && intervalMinutes <= 60 && 60 % intervalMinutes === 0) {
    const minutes: number[] = [];
    for (let m = 0; m < 60; m += intervalMinutes) {
      minutes.push(m);
    }

    if (minutes.length === 1) {
      // Single entry (e.g., 60m → minute 0)
      return `  <key>StartCalendarInterval</key>
  <dict>
    <key>Minute</key>
    <integer>${minutes[0]}</integer>
  </dict>`;
    }

    // Multiple entries (e.g., 30m → 0, 30; 15m → 0, 15, 30, 45)
    const entries = minutes
      .map(
        (m) => `    <dict>
      <key>Minute</key>
      <integer>${m}</integer>
    </dict>`
      )
      .join("\n");

    return `  <key>StartCalendarInterval</key>
  <array>
${entries}
  </array>`;
  }

  // Fallback: use StartInterval for non-clock-divisible intervals
  return `  <key>StartInterval</key>
  <integer>${intervalSeconds}</integer>`;
}

export function generatePlist(
  heartbeatBin: string,
  intervalSeconds: number
): string {
  const label = plistLabel();
  const hbDir = heartbeatDir();
  const home = homedir();
  const scheduleBlock = generateScheduleEntries(intervalSeconds);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${heartbeatBin}</string>
    <string>tick</string>
  </array>
${scheduleBlock}
  <key>WorkingDirectory</key>
  <string>${home}</string>
  <key>StandardOutPath</key>
  <string>${hbDir}/.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${hbDir}/.stderr.log</string>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
`;
}
