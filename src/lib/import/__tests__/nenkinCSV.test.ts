import { describe, it, expect } from "vitest";
import { parseNenkinCSV, readFileAsText } from "../nenkinCSV";

describe("parseNenkinCSV", () => {
  it("ヘッダー行が見つからない場合は warning", () => {
    const r = parseNenkinCSV("foo,bar\n1,2\n");
    expect(r.records).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes("ヘッダー行"))).toBe(true);
  });

  it("空文字でも安全に空結果を返す", () => {
    const r = parseNenkinCSV("");
    expect(r.records).toHaveLength(0);
  });

  it("ヘッダーはあるがデータ行が空", () => {
    const r = parseNenkinCSV("種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数\n");
    expect(r.warnings.some((w) => w.includes("データ行"))).toBe(true);
  });

  it("基本ケース: 厚生年金 1件・標準報酬月額・月数集計", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,株式会社A,平成20年4月,令和3年3月,300000,156",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
    expect(r.records[0].type).toBe("厚生年金");
    expect(r.records[0].standardMonthly).toBe(300000);
    expect(r.records[0].months).toBe(156);
    expect(r.empMonths).toBe(156);
    expect(r.avgStandardMonthly).toBe(300000);
    expect(r.pensionMonthlyEst).toBeGreaterThan(0);
  });

  it("国民年金は厚生年金と分けて集計される", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "国民年金,,昭和60年4月,平成元年3月,0,48",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].type).toBe("国民年金");
    expect(r.citizenMonths).toBe(48);
    expect(r.empMonths).toBe(0);
  });

  it("共済も厚生年金カテゴリとして集計", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "共済,公務員部局,平成20年4月,令和3年3月,300000,156",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].type).toBe("共済");
    expect(r.empMonths).toBe(156);
  });

  it("不明なtypeも処理 (空フィールド行スキップとは区別)", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "謎,X社,平成20年4月,平成21年3月,0,12",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].type).toBe("不明");
  });

  it("和暦バリエーション (令和/平成/昭和/R/H/S) を解釈", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,R5.12,250000,",
      "厚生年金,B,平成2年4月,H5.3,250000,",
      "厚生年金,C,昭和50年4月,S60.3,250000,",
      "厚生年金,D,2000/04,2005/03,250000,",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(4);
    expect(r.records[0].startYM).toBe("2020/01");
    expect(r.records[0].endYM).toBe("2023/12");
    expect(r.records[1].startYM).toBe("1990/04");
    expect(r.records[2].startYM).toBe("1975/04");
    expect(r.records[3].startYM).toBe("2000/04");
  });

  it("和暦不一致の場合は元文字列をそのまま保持", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,不明日付,終了不明,250000,12",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].startYM).toBe("不明日付");
    expect(r.records[0].endYM).toBe("終了不明");
    expect(r.records[0].months).toBe(12);
  });

  it("月数フィールド未指定でも開始/終了日付から計算する", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].months).toBe(24); // 2020/01 → 2021/12 = 24ヶ月
  });

  it("金額文字列: カンマ・全角カンマ・円記号を除去", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,\"300,000円\",24",
      "厚生年金,B,令和2年1月,令和3年12月,¥250000,24",
      "厚生年金,C,令和2年1月,令和3年12月,abc,24",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].standardMonthly).toBe(300000);
    expect(r.records[1].standardMonthly).toBe(250000);
    expect(r.records[2].standardMonthly).toBe(0);
  });

  it("月数フィールドが非数値文字 (例: 24月) でも数値抽出する", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,24ヶ月",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].months).toBe(24);
  });

  it("数値化できない月数は 0 + 日付計算へ fall through", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,abc",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].months).toBe(24); // 日付から計算
  });

  it("全空行はスキップ", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      ",,,,,",
      "厚生年金,A,令和2年1月,令和3年12月,250000,24",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
  });

  it("空フィールドが多い行 (typeRaw/employer/start/end が空) もスキップ", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      ",,,,300000,12",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(0);
  });

  it("ダブルクオートで囲んだフィールド (エスケープ)", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      '"厚生年金","ABC ""特別"" Inc.",令和2年1月,令和3年12月,250000,24',
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
    expect(r.records[0].employer).toContain("ABC");
  });

  it("BOM 付き UTF-8 も受理", () => {
    const csv = "﻿" + [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,24",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
  });

  it("CRLF 改行も処理", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,24",
    ].join("\r\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
  });

  it("特定カラム (標準報酬月額/月数) が無いヘッダーでも parse できる", () => {
    // findCol が -1 を返す経路 (line 169) を発火
    const csv = [
      "種別,勤務先,資格取得,資格喪失",
      "厚生年金,A,令和2年1月,令和3年12月",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
    expect(r.records[0].standardMonthly).toBe(0);
    expect(r.records[0].months).toBe(24); // 日付計算で埋まる
  });

  it("勤務先が空なら '不明' で埋める", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,,令和2年1月,令和3年12月,250000,24",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].employer).toBe("不明");
  });
});

describe("readFileAsText", () => {
  it("5MB を超えるファイルは拒否", async () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.csv");
    await expect(readFileAsText(big)).rejects.toThrow();
  });

  it("UTF-8 として読める CSV はそのまま返る", async () => {
    const f = new File(["種別,勤務先\n厚生年金,テスト"], "ok.csv", { type: "text/csv" });
    const text = await readFileAsText(f);
    expect(text).toContain("種別");
  });

  it("文字化けを検出して Shift-JIS フォールバック (FileReader 経由)", async () => {
    // FileReader を node 環境でモック
    const decoded = "種別,勤務先\n厚生年金,テスト";
    class MockFR {
      result: string | null = null;
      error: unknown = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        Promise.resolve().then(() => { this.result = decoded; this.onload?.(); });
      }
    }
    const orig = (globalThis as { FileReader?: unknown }).FileReader;
    (globalThis as { FileReader?: unknown }).FileReader = MockFR as unknown as typeof FileReader;
    try {
      // 0x80-0x9F を含む文字列 → UTF-8 経路でテスト失敗 → Shift-JIS へ
      const f = new File([new Uint8Array([0x83, 0x8c])], "x.csv");
      const out = await readFileAsText(f);
      expect(out).toBe(decoded);
    } finally {
      (globalThis as { FileReader?: unknown }).FileReader = orig;
    }
  });

  it("Shift-JIS フォールバックも失敗するとエラー", async () => {
    const fail = new Error("Shift-JIS decode failed");
    class MockFR {
      result: string | null = null;
      error: unknown = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        Promise.resolve().then(() => { this.error = fail; this.onerror?.(); });
      }
    }
    const orig = (globalThis as { FileReader?: unknown }).FileReader;
    (globalThis as { FileReader?: unknown }).FileReader = MockFR as unknown as typeof FileReader;
    try {
      const f = new File([new Uint8Array([0x83, 0x8c])], "x.csv");
      await expect(readFileAsText(f)).rejects.toBe(fail);
    } finally {
      (globalThis as { FileReader?: unknown }).FileReader = orig;
    }
  });

  it("file.text() が例外を投げた場合も Shift-JIS フォールバックへ", async () => {
    const decoded = "from-shift-jis";
    class MockFR {
      result: string | null = null;
      error: unknown = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        Promise.resolve().then(() => { this.result = decoded; this.onload?.(); });
      }
    }
    const orig = (globalThis as { FileReader?: unknown }).FileReader;
    (globalThis as { FileReader?: unknown }).FileReader = MockFR as unknown as typeof FileReader;
    try {
      const f = new File(["x"], "x.csv");
      // text() を強制的に reject させる
      Object.defineProperty(f, "text", { value: () => Promise.reject(new Error("boom")) });
      const out = await readFileAsText(f);
      expect(out).toBe(decoded);
    } finally {
      (globalThis as { FileReader?: unknown }).FileReader = orig;
    }
  });
});
