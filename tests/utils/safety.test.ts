import { describe, it, expect } from "vitest";
import { sanitizeArgs } from "../../src/utils/safety.js";

describe("sanitizeArgs", () => {
  it("strips dangerous flags when not acknowledged", () => {
    const args = ["--verbose", "--dangerously-skip-permissions"];
    const result = sanitizeArgs(args, false);
    expect(result).toEqual(["--verbose"]);
  });

  it("keeps dangerous flags when acknowledged", () => {
    const args = ["--verbose", "--dangerously-skip-permissions"];
    const result = sanitizeArgs(args, true);
    expect(result).toEqual(["--verbose", "--dangerously-skip-permissions"]);
  });

  it("passes through safe args unchanged", () => {
    const args = ["--verbose", "--json"];
    const result = sanitizeArgs(args, false);
    expect(result).toEqual(["--verbose", "--json"]);
  });
});
