import { describe, it, expect } from "vitest";
import { parseMFCSV, readFileAsText } from "../moneyforwardCSV";

describe("parseMFCSV — 資産推移月次形式", () => {
  it("基本ケース: 預貯金・証券・仮想通貨をカテゴリ分け", () => {
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

  it("0円の列はスキップ", () => {
    const csv = [
      "日付,合計（円）,預貯金（円）,証券(運用)（円）",
      "2025/04/01,1000000,1000000,0",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.find((a) => a.category === "investment")).toBeUndefined();
  });

  it("データ行が無いと warning", () => {
    const csv = [
      "日付,合計（円）,預貯金（円）",
      "2025-aaa,nonsense",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.warnings.some((w) => w.includes("資産推移"))).toBe(true);
  });

  it("カテゴリ判定: 暗号資産は crypto", () => {
    const csv = [
      "日付,合計（円）,暗号資産（円）",
      "2025/04/01,1000000,1000000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.some((a) => a.category === "crypto")).toBe(true);
  });

  it("カテゴリ判定: 未知ヘッダーは other", () => {
    const csv = [
      "日付,合計（円）,謎カテゴリ（円）",
      "2025/04/01,1000000,1000000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.some((a) => a.category === "other")).toBe(true);
  });

  it("合計／ポイント列は除外", () => {
    const csv = [
      "日付,合計（円）,ポイント（円）,預貯金（円）",
      "2025/04/01,1000000,500,1000000",
    ].join("\n");
    const r = parseMFCSV(csv);
    // 合計とポイントは accounts に含まれない
    expect(r.accounts.find((a) => a.name.includes("合計"))).toBeUndefined();
    expect(r.accounts.find((a) => a.name.includes("ポイント"))).toBeUndefined();
  });

  it("カテゴリ列がすべて 0 / スキップ対象だと warning", () => {
    const csv = [
      "日付,合計（円）,預貯金（円）",
      "2025/04/01,1000000,0",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.warnings.some((w) => w.includes("資産カテゴリ"))).toBe(true);
  });

  it("ヘッダー名から（円）等のサフィックスが取り除かれる", () => {
    const csv = [
      "日付,合計（円）,預貯金（12ヶ月）（円）",
      "2025/04/01,1000000,1000000",
    ].join("\n");
    const r = parseMFCSV(csv);
    const dep = r.accounts.find((a) => a.category === "deposit");
    expect(dep?.name).not.toContain("（");
  });
});

describe("parseMFCSV — 口座一覧形式", () => {
  it("基本ケース: 口座名+残高+種別", () => {
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

  it("口座名/残高どちらもないヘッダーは warning", () => {
    const csv = "適当,別物\nx,y";
    const r = parseMFCSV(csv);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("classifyByName 各ブランチ (deposit/invest/crypto/other)", () => {
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

  it("空行・空口座名はスキップ", () => {
    const csv = [
      "口座名,残高",
      ",100000",
      "ABC銀行,500000",
      ",,",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts).toHaveLength(1);
  });

  it("負の残高 (△ や ▲) をマイナスとして取り込む", () => {
    const csv = [
      "口座名,残高",
      "クレジットカード,△50000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts[0].balance).toBeLessThan(0);
  });

  it("負の残高 (-) も処理", () => {
    const csv = [
      "口座名,残高",
      "ローン残高,-100000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts[0].balance).toBeLessThan(0);
  });

  it("残高文字列が無効でも 0 として処理", () => {
    const csv = [
      "口座名,残高",
      "Foo,abc",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts[0].balance).toBe(0);
  });

  it("isAccount=true だが口座名カラムが取れない → findCol -1 で warning (line 145-147)", () => {
    // ヘッダーに "残高" は含まれるが "口座名/口座/名称/金融機関" は含まれない
    const csv = "保有残高,foo\n100,bar";
    const r = parseMFCSV(csv);
    expect(r.warnings.some((w) => w.includes("口座名または残高"))).toBe(true);
  });

  it("データ行はあるが全空フィールドなら warning", () => {
    // 全空文字列の行は parseAccountFormat 内でスキップ → 口座0件 → warning
    const csv = "口座名,残高\n , ";
    const r = parseMFCSV(csv);
    expect(r.warnings.some((w) => w.includes("口座データ"))).toBe(true);
  });
});

describe("parseMFCSV — エッジ", () => {
  it("空文字 → warning", () => {
    const r = parseMFCSV("");
    expect(r.warnings.some((w) => w.includes("データが空"))).toBe(true);
  });

  it("行数が 1 (ヘッダーだけ) も警告", () => {
    const r = parseMFCSV("foo,bar");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("既知のフォーマットでなければ汎用 warning", () => {
    const r = parseMFCSV("foo,bar\nx,y");
    expect(r.warnings.some((w) => w.includes("形式を認識"))).toBe(true);
  });

  it("先頭行が日付っぽければ trend として読む（フォールバック判定）", () => {
    const csv = [
      "x,y,預貯金（円）",
      "2025/04/01,100,500000",
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.length).toBeGreaterThan(0);
  });

  it("BOM・CRLF を受理", () => {
    const csv = "﻿" + [
      "日付,合計（円）,預貯金（円）",
      "2025/04/01,1000000,1000000",
    ].join("\r\n");
    const r = parseMFCSV(csv);
    expect(r.accounts.length).toBeGreaterThan(0);
  });

  it("ダブルクオート + エスケープ", () => {
    const csv = [
      "口座名,残高",
      '"ABC ""特別"" 口座","500,000"',
    ].join("\n");
    const r = parseMFCSV(csv);
    expect(r.accounts[0].name).toContain("ABC");
    expect(r.accounts[0].balance).toBeGreaterThan(0);
  });
});

describe("readFileAsText 再エクスポート", () => {
  it("readFileAsText は nenkinCSV から再エクスポートされる", async () => {
    const f = new File(["abc"], "x.csv");
    expect(typeof readFileAsText).toBe("function");
    const text = await readFileAsText(f);
    expect(text).toBe("abc");
  });
});
