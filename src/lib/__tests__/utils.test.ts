import { describe, it, expect } from "vitest";
import { cn, formatManYen, formatYen } from "../utils";

describe("cn", () => {
  it("joins class strings", () => {
    expect(cn("a", "b")).toContain("a");
    expect(cn("a", "b")).toContain("b");
  });
  it("skips falsy values and applies objects", () => {
    expect(cn("a", false, null, undefined, "b")).toContain("a");
    expect(cn({ foo: true, bar: false })).toContain("foo");
    expect(cn({ foo: true, bar: false })).not.toContain("bar");
  });
  it("later Tailwind class wins on conflict", () => {
    // With both p-2 and p-4, twMerge keeps only the latter
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatManYen", () => {
  it("adds thousands separators and the 万円 suffix", () => {
    expect(formatManYen(1234)).toBe("1,234万円");
    expect(formatManYen(0)).toBe("0万円");
  });
  it("handles negative numbers", () => {
    expect(formatManYen(-500)).toBe("-500万円");
  });
});

describe("formatYen", () => {
  it("rounds to an integer, adds thousands separators and the 円 suffix", () => {
    expect(formatYen(1234.7)).toBe("1,235円");
    expect(formatYen(0)).toBe("0円");
  });
  it("rounds negative numbers too", () => {
    expect(formatYen(-1234.4)).toBe("-1,234円");
  });
});
