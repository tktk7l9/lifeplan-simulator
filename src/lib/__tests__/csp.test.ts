import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { BEACON_REPORT_ORIGIN, BEACON_SCRIPT_ORIGIN, contentSecurityPolicy } from "../csp";

describe("contentSecurityPolicy", () => {
  const prod = contentSecurityPolicy();

  it("does not include a nonce (worker.ts adds one per HTML response, src/lib/csp-nonce.ts)", () => {
    expect(prod).not.toContain("nonce-");
  });

  it("keeps 'unsafe-inline' in script-src as the token the Worker swaps for a nonce", () => {
    // Pinned with the trailing ; so a loose source appended later (e.g. https: or *) fails here.
    expect(prod).toContain(`script-src 'self' 'unsafe-inline' ${BEACON_SCRIPT_ORIGIN};`);
  });

  it("never includes 'strict-dynamic' (it would block runtime-inserted scripts that carry no nonce)", () => {
    expect(prod).not.toContain("strict-dynamic");
    expect(contentSecurityPolicy({ dev: true })).not.toContain("strict-dynamic");
  });

  it("does not emit 'unsafe-eval' in production", () => {
    expect(prod).not.toContain("unsafe-eval");
  });

  it("adds 'unsafe-eval' only in dev for the Next overlay / HMR", () => {
    expect(contentSecurityPolicy({ dev: true })).toContain(
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${BEACON_SCRIPT_ORIGIN};`,
    );
  });

  it("allows both origins the Cloudflare Web Analytics beacon needs", () => {
    // Missing either one blocks only the beacon while the page still looks fine.
    expect(BEACON_SCRIPT_ORIGIN).toBe("https://static.cloudflareinsights.com");
    expect(BEACON_REPORT_ORIGIN).toBe("https://cloudflareinsights.com");
    expect(prod).toContain(`connect-src 'self' ${BEACON_REPORT_ORIGIN};`);
  });

  it("locks down the remaining directives unchanged", () => {
    for (const directive of [
      "default-src 'self';",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data: blob:;",
      "font-src 'self';",
      "frame-ancestors 'none';",
      "base-uri 'self';",
      "form-action 'self';",
    ]) {
      expect(prod).toContain(directive);
    }
    expect(prod.endsWith("object-src 'none'")).toBe(true);
  });

  it("separates directives with '; ' and has no empty directive", () => {
    expect(prod).not.toContain(";;");
    expect(prod.split("; ").every((d) => d.trim().length > 0)).toBe(true);
  });
});

describe("next.config.ts headers()", () => {
  it("serves the static policy from src/lib/csp.ts on every route", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((rule) => rule.source === "/(.*)");
    const csp = all?.headers.filter((h) => h.key === "Content-Security-Policy") ?? [];
    expect(csp).toHaveLength(1);
    expect(csp[0].value).toBe(contentSecurityPolicy());
  });
});
