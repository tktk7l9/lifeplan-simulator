import { describe, expect, it } from "vitest";
import { BEACON_SRC, BEACON_TOKEN } from "../analytics";
import { BEACON_SCRIPT_ORIGIN, contentSecurityPolicy } from "../csp";

describe("analytics beacon", () => {
  it("loads from the origin the CSP allows in script-src", () => {
    expect(new URL(BEACON_SRC).origin).toBe(BEACON_SCRIPT_ORIGIN);
    expect(contentSecurityPolicy()).toMatch(new RegExp(`script-src [^;]*${BEACON_SCRIPT_ORIGIN}`));
  });

  it("has a 32-digit hex site token", () => {
    expect(BEACON_TOKEN).toMatch(/^[0-9a-f]{32}$/);
  });
});
