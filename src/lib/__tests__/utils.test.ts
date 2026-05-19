import { describe, it, expect } from "vitest";
import { cn, formatManYen, formatYen } from "../utils";

describe("cn", () => {
  it("クラス文字列を結合する", () => {
    expect(cn("a", "b")).toContain("a");
    expect(cn("a", "b")).toContain("b");
  });
  it("falsy 値・オブジェクトをスキップ/反映する", () => {
    expect(cn("a", false, null, undefined, "b")).toContain("a");
    expect(cn({ foo: true, bar: false })).toContain("foo");
    expect(cn({ foo: true, bar: false })).not.toContain("bar");
  });
  it("Tailwind の衝突するクラスは後勝ち", () => {
    // p-2 と p-4 が両方あれば twMerge により後者だけ残る
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatManYen", () => {
  it("カンマ区切り＋万円サフィックス", () => {
    expect(formatManYen(1234)).toBe("1,234万円");
    expect(formatManYen(0)).toBe("0万円");
  });
  it("負数も処理", () => {
    expect(formatManYen(-500)).toBe("-500万円");
  });
});

describe("formatYen", () => {
  it("整数化＋カンマ区切り＋円サフィックス", () => {
    expect(formatYen(1234.7)).toBe("1,235円");
    expect(formatYen(0)).toBe("0円");
  });
  it("負数も整数化", () => {
    expect(formatYen(-1234.4)).toBe("-1,234円");
  });
});
