import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { launchAgentDir } from "../../utils/paths.js";
import { plistLabel } from "../../utils/plist.js";

export async function uninstallService(): Promise<void> {
  const label = plistLabel();
  const plistPath = join(launchAgentDir(), `${label}.plist`);

  try {
    execSync(`launchctl unload "${plistPath}"`, { stdio: "inherit" });
    console.log(`Unloaded service: ${label}`);
  } catch {
    console.log("Service may not have been loaded.");
  }

  try {
    await unlink(plistPath);
    console.log(`Removed plist: ${plistPath}`);
  } catch {
    console.log(`Plist not found at: ${plistPath}`);
  }
}
