import { describe, it, expect } from "vitest";
import { parseNenkinCSV, readFileAsText } from "../nenkinCSV";

describe("parseNenkinCSV", () => {
  it("warns when no header row is found", () => {
    const r = parseNenkinCSV("foo,bar\n1,2\n");
    expect(r.records).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes("ヘッダー行"))).toBe(true);
  });

  it("returns an empty result safely for an empty string", () => {
    const r = parseNenkinCSV("");
    expect(r.records).toHaveLength(0);
  });

  it("header present but no data rows", () => {
    const r = parseNenkinCSV("種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数\n");
    expect(r.warnings.some((w) => w.includes("データ行"))).toBe(true);
  });

  it("basic case: one employees' pension (厚生年金) record, standard monthly remuneration and month totals", () => {
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

  it("national pension (国民年金) is totaled separately from employees' pension", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "国民年金,,昭和60年4月,平成元年3月,0,48",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].type).toBe("国民年金");
    expect(r.citizenMonths).toBe(48);
    expect(r.empMonths).toBe(0);
  });

  it("mutual aid pension (共済) is totaled in the employees' pension category", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "共済,公務員部局,平成20年4月,令和3年3月,300000,156",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].type).toBe("共済");
    expect(r.empMonths).toBe(156);
  });

  it("handles unknown types (distinct from skipping empty-field rows)", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "謎,X社,平成20年4月,平成21年3月,0,12",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].type).toBe("不明");
  });

  it("parses Japanese era variants (令和/平成/昭和/R/H/S)", () => {
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

  it("keeps the original string when the Japanese era does not match", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,不明日付,終了不明,250000,12",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].startYM).toBe("不明日付");
    expect(r.records[0].endYM).toBe("終了不明");
    expect(r.records[0].months).toBe(12);
  });

  it("computes months from start/end dates when the month field is missing", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].months).toBe(24); // 2020/01 → 2021/12 = 24 months
  });

  it("amount strings: strips commas, full-width commas and yen signs", () => {
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

  it("extracts the number from a month field with non-digit characters (e.g. 24月)", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,24ヶ月",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].months).toBe(24);
  });

  it("non-numeric months become 0 and fall through to date calculation", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,abc",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].months).toBe(24); // computed from the dates
  });

  it("skips fully empty rows", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      ",,,,,",
      "厚生年金,A,令和2年1月,令和3年12月,250000,24",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
  });

  it("skips rows with many empty fields (typeRaw/employer/start/end empty)", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      ",,,,300000,12",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(0);
  });

  it("handles double-quoted fields (escapes)", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      '"厚生年金","ABC ""特別"" Inc.",令和2年1月,令和3年12月,250000,24',
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
    expect(r.records[0].employer).toContain("ABC");
  });

  it("accepts UTF-8 with BOM", () => {
    const csv = "﻿" + [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,24",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
  });

  it("handles CRLF line breaks", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,A,令和2年1月,令和3年12月,250000,24",
    ].join("\r\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
  });

  it("parses headers without specific columns (standard monthly remuneration / months)", () => {
    // Hit the path where the column is missing and findCol returns -1
    const csv = [
      "種別,勤務先,資格取得,資格喪失",
      "厚生年金,A,令和2年1月,令和3年12月",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records).toHaveLength(1);
    expect(r.records[0].standardMonthly).toBe(0);
    expect(r.records[0].months).toBe(24); // filled by the date calculation
  });

  it("fills an empty employer with '不明'", () => {
    const csv = [
      "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
      "厚生年金,,令和2年1月,令和3年12月,250000,24",
    ].join("\n");
    const r = parseNenkinCSV(csv);
    expect(r.records[0].employer).toBe("不明");
  });
});

describe("readFileAsText", () => {
  it("rejects files larger than 5MB", async () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.csv");
    await expect(readFileAsText(big)).rejects.toThrow();
  });

  it("returns a CSV readable as UTF-8 as is", async () => {
    const f = new File(["種別,勤務先\n厚生年金,テスト"], "ok.csv", { type: "text/csv" });
    const text = await readFileAsText(f);
    expect(text).toContain("種別");
  });

  it("detects mojibake and falls back to Shift-JIS (via FileReader)", async () => {
    // Mock FileReader in the node environment
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
      // A string containing 0x80-0x9F → the UTF-8 path fails the check → falls back to Shift-JIS
      const f = new File([new Uint8Array([0x83, 0x8c])], "x.csv");
      const out = await readFileAsText(f);
      expect(out).toBe(decoded);
    } finally {
      (globalThis as { FileReader?: unknown }).FileReader = orig;
    }
  });

  it("errors when the Shift-JIS fallback also fails", async () => {
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

  it("falls back to Shift-JIS when file.text() throws", async () => {
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
      // Force text() to reject
      Object.defineProperty(f, "text", { value: () => Promise.reject(new Error("boom")) });
      const out = await readFileAsText(f);
      expect(out).toBe(decoded);
    } finally {
      (globalThis as { FileReader?: unknown }).FileReader = orig;
    }
  });
});
