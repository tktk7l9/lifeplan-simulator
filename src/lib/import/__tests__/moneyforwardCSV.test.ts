import { describe, it, expect } from "vitest";
import { parseMFCSV, readFileAsText } from "../moneyforwardCSV";

describe("parseMFCSV — monthly asset trend format", () => {
  it("basic case: splits deposits, securities and crypto into categories", () => {
    const csv = [
      "日付,合計（円）,預貯金（円）,証券(運用)（円）,仮想通貨（円）,その他（円）,ポイント（円）",
      "2025/04/01,10000000,5000000,3000000,1000000,1000000,500",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.updateDate).toBe("2025/04/01");
    expect(r.accounts.length).toBeGreaterThan(0);
    expect(r.totalDeposit).toBeGreaterThan(0);
    expect(r.totalInvestment).toBeGreaterThan(0);
  });

  it("skips columns that are 0 yen", () => {
    const csv = [
      "日付,合計（円）,預貯金（円）,証券(運用)（円）",
      "2025/04/01,1000000,1000000,0",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.find((a) => a.category === "investment")).toBeUndefined();
  });

  it("warns when there are no data rows", () => {
    const csv = [
      "日付,合計（円）,預貯金（円）",
      "2025-aaa,nonsense",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.warnings.some((w) => w.includes("資産推移"))).toBe(true);
  });

  it("category detection: crypto assets map to crypto", () => {
    const csv = [
      "日付,合計（円）,暗号資産（円）",
      "2025/04/01,1000000,1000000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.some((a) => a.category === "crypto")).toBe(true);
  });

  it("category detection: unknown headers map to other", () => {
    const csv = [
      "日付,合計（円）,謎カテゴリ（円）",
      "2025/04/01,1000000,1000000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.some((a) => a.category === "other")).toBe(true);
  });

  it("excludes the total and points columns", () => {
    const csv = [
      "日付,合計（円）,ポイント（円）,預貯金（円）",
      "2025/04/01,1000000,500,1000000",
    ].join("\n");
    const r = parseMFCSV(csv);
    // Total and points are not included in accounts
    expect(r.accounts.find((a) => a.name.includes("合計"))).toBeUndefined();
    expect(r.accounts.find((a) => a.name.includes("ポイント"))).toBeUndefined();
  });

  it("warns when every category column is 0 or skipped", () => {
    const csv = [
      "日付,合計（円）,預貯金（円）",
      "2025/04/01,1000000,0",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.warnings.some((w) => w.includes("資産カテゴリ"))).toBe(true);
  });

  it("strips suffixes such as （円） from header names", () => {
    const csv = [
      "日付,合計（円）,預貯金（12ヶ月）（円）",
      "2025/04/01,1000000,1000000",
    ].join("\n");
    const r = parseMFCSV(csv);
    const dep = r.accounts.find((a) => a.category === "deposit");
    expect(dep?.name).not.toContain("（");
  });
});

describe("parseMFCSV — account list format", () => {
  it("basic case: account name + balance + type", () => {
    const csv = [
      "口座名,残高,種別",
      "ABC銀行 普通,500000,銀行",
      "野村證券 NISA,2000000,証券",
      "Coincheck,300000,暗号資産",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts).toHaveLength(3);
    expect(r.totalDeposit).toBeGreaterThan(0);
    expect(r.totalInvestment).toBeGreaterThan(0);
  });

  it("warns when the header has neither account name nor balance", () => {
    const csv = "適当,別物\nx,y";
    const r = parseMFCSV(csv);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("classifyByName covers each branch (deposit/invest/crypto/other)", () => {
    const csv = [
      "口座名,残高",
      "ゆうちょ銀行,100000",
      "iDeCo口座,500000",
      "ビットコイン,200000",
      "謎ウォレット,50000",
    ].join("\n");
    const r = parseMFCSV(csv);
    const cats = r.accounts.map((a) => a.category).sort();
    expect(cats).toEqual(["crypto", "deposit", "investment", "other"].sort());
  });

  it("skips blank rows and blank account names", () => {
    const csv = [
      "口座名,残高",
      ",100000",
      "ABC銀行,500000",
      ",,",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts).toHaveLength(1);
  });

  it("imports negative balances (△ or ▲) as negative", () => {
    const csv = [
      "口座名,残高",
      "クレジットカード,△50000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts[0].balance).toBeLessThan(0);
  });

  it("handles negative balances written with -", () => {
    const csv = [
      "口座名,残高",
      "ローン残高,-100000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts[0].balance).toBeLessThan(0);
  });

  it("treats an invalid balance string as 0", () => {
    const csv = [
      "口座名,残高",
      "Foo,abc",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts[0].balance).toBe(0);
  });

  it("isAccount=true but no account-name column → findCol -1 warns", () => {
    // The header contains "残高" but none of "口座名/口座/名称/金融機関"
    const csv = "保有残高,foo\n100,bar";
    const r = parseMFCSV(csv);
    expect(r.warnings.some((w) => w.includes("口座名または残高"))).toBe(true);
  });

  it("warns when data rows exist but every field is empty", () => {
    // A row of all-empty strings is skipped in parseAccountFormat → 0 accounts → warning
    const csv = "口座名,残高\n , ";
    const r = parseMFCSV(csv);
    expect(r.warnings.some((w) => w.includes("口座データ"))).toBe(true);
  });
});

describe("parseMFCSV — edge cases", () => {
  it("empty string → warning", () => {
    const r = parseMFCSV("");
    expect(r.warnings.some((w) => w.includes("データが空"))).toBe(true);
  });

  it("warns when there is only one line (header only)", () => {
    const r = parseMFCSV("foo,bar");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("gives a generic warning for an unknown format", () => {
    const r = parseMFCSV("foo,bar\nx,y");
    expect(r.warnings.some((w) => w.includes("形式を認識"))).toBe(true);
  });

  it("reads as trend when the first row looks like a date (fallback detection)", () => {
    const csv = [
      "x,y,預貯金（円）",
      "2025/04/01,100,500000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.length).toBeGreaterThan(0);
  });

  it("accepts BOM and CRLF", () => {
    const csv = "﻿" + [
      "日付,合計（円）,預貯金（円）",
      "2025/04/01,1000000,1000000",
    ].join("\r\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.length).toBeGreaterThan(0);
  });

  it("handles double quotes and escapes", () => {
    const csv = [
      "口座名,残高",
      '"ABC ""特別"" 口座","500,000"',
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts[0].name).toContain("ABC");
    expect(r.accounts[0].balance).toBeGreaterThan(0);
  });
});

describe("readFileAsText re-export", () => {
  it("readFileAsText is re-exported from nenkinCSV", async () => {
    const f = new File(["abc"], "x.csv");
    expect(typeof readFileAsText).toBe("function");
    const text = await readFileAsText(f);
    expect(text).toBe("abc");
  });
});
