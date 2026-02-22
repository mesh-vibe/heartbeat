import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { loadConfig } from "../../core/config.js";
import { launchAgentDir } from "../../utils/paths.js";
import { generatePlist, plistLabel } from "../../utils/plist.js";

export async function installService(): Promise<void> {
  const config = await loadConfig();
  const intervalSec = Math.round(config.heartbeatMs / 1000);

  // Find heartbeat binary path
  const heartbeatBin = process.argv[1];

  const label = plistLabel();
  const plistContent = generatePlist(heartbeatBin, intervalSec);
  const agentDir = launchAgentDir();
  const plistPath = join(agentDir, `${label}.plist`);

  await mkdir(agentDir, { recursive: true });
  await writeFile(plistPath, plistContent);

  try {
    execSync(`launchctl load "${plistPath}"`, { stdio: "inherit" });
    console.log(`Installed launchd service: ${label}`);
    console.log(`Plist: ${plistPath}`);
    console.log(`Interval: ${intervalSec}s (${config.heartbeat})`);
    console.log(`\nThe service will run 'heartbeat tick' at the configured interval.`);
  } catch (err) {
    console.error(`Failed to load service. Plist written to: ${plistPath}`);
    console.error("You may need to load it manually:");
    console.error(`  launchctl load "${plistPath}"`);
  }
}
