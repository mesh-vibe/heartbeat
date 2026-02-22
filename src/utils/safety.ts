import { logger } from "./logger.js";

const DANGEROUS_FLAGS = [
  "--dangerously-skip-permissions",
];

export function sanitizeArgs(args: string[], acknowledgeRisks: boolean): string[] {
  if (acknowledgeRisks) return args;

  const filtered = args.filter((arg) => {
    if (DANGEROUS_FLAGS.includes(arg)) {
      logger.warn(
        `Stripped dangerous flag "${arg}" — set acknowledge_risks: true in config to allow this.`
      );
      return false;
    }
    return true;
  });
  return filtered;
}
