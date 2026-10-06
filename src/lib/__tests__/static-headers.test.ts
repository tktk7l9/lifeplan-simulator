import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// public/_headers is applied by Workers Assets to files it serves directly
// (/_next/static/*), which bypass headers() in next.config.ts. Pin the two
// headers so a rewrite of the file cannot silently drop them.
const rules = readFileSync(path.resolve(__dirname, "../../../public/_headers"), "utf8");

function block(rulePath: string): string {
  const lines = rules.split("\n");
  const start = lines.indexOf(rulePath);
  expect(start, `rule block for ${rulePath}`).toBeGreaterThanOrEqual(0);
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("  ")) break;
    body.push(line.trim());
  }
  return body.join("\n");
}

describe("public/_headers", () => {
  it("caches hashed Next.js assets as immutable", () => {
    expect(block("/_next/static/*")).toContain("Cache-Control: public, max-age=31536000, immutable");
  });

  it("keeps nosniff on assets served without the Worker's headers", () => {
    expect(block("/_next/static/*")).toContain("X-Content-Type-Options: nosniff");
  });
});
