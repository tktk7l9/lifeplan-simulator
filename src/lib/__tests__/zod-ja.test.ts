import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import "../zod-ja";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("zod-ja global config", () => {
  it("reports validation errors in Japanese", () => {
    const result = z.object({ age: z.number() }).safeParse({ age: "x" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/[぀-ヿ一-鿿]/);
  });

  it("runs Zod without its eval-based JIT, so the CSP (no 'unsafe-eval') reports nothing", () => {
    expect(z.config().jitless).toBe(true);
    // Building and parsing an object schema must never reach the Function constructor.
    const probe = vi.spyOn(globalThis, "Function");
    const schema = z.object({ income: z.number().min(0), expense: z.number() });
    expect(schema.parse({ income: 500, expense: 20 })).toEqual({ income: 500, expense: 20 });
    expect(probe).not.toHaveBeenCalled();
  });
});
