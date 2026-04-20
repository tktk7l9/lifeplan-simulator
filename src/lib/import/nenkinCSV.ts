export interface NenkinRecord {
  type: "厚生年金" | "国民年金" | "共済" | "不明";
  employer: string;
  startYM: string;
  endYM: string;
  standardMonthly: number;
  months: number;
}

export interface NenkinParseResult {
  records: NenkinRecord[];
  empMonths: number;
  citizenMonths: number;
  avgStandardMonthly: number;
  pensionMonthlyEst: number;
  warnings: string[];
}

const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5 MB

export async function readFileAsText(file: File): Promise<string> {
  if (file.size > MAX_CSV_SIZE) {
    throw new Error("ファイルサイズが大きすぎます（最大5MB）");
  }
  try {
    const utf8Text = await file.text();
    // UTF-8として読めた場合、文字化けチェック（Shift-JIS由来の文字化けパターン）
    if (!utf8Text.includes("\uFFFD") && !/[\x80-\x9F]/.test(utf8Text)) {
      return utf8Text;
    }
  } catch {
    // fall through to Shift-JIS
  }

  // Shift-JIS フォールバック
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "Shift-JIS");
  });
}

function parseJapaneseDate(s: string): { year: number; month: number } | null {
  const cleaned = s.trim().replace(/\s+/g, "");

  // 令和N年M月
  let m = cleaned.match(/令和(\d+)年(\d+)月/);
  if (m) return { year: 2018 + parseInt(m[1]), month: parseInt(m[2]) };

  // 平成N年M月
  m = cleaned.match(/平成(\d+)年(\d+)月/);
  if (m) return { year: 1988 + parseInt(m[1]), month: parseInt(m[2]) };

  // 昭和N年M月
  m = cleaned.match(/昭和(\d+)年(\d+)月/);
  if (m) return { year: 1925 + parseInt(m[1]), month: parseInt(m[2]) };

  // R/H/S shorthand
  m = cleaned.match(/^R(\d+)\.(\d+)$/);
  if (m) return { year: 2018 + parseInt(m[1]), month: parseInt(m[2]) };

  m = cleaned.match(/^H(\d+)\.(\d+)$/);
  if (m) return { year: 1988 + parseInt(m[1]), month: parseInt(m[2]) };

  m = cleaned.match(/^S(\d+)\.(\d+)$/);
  if (m) return { year: 1925 + parseInt(m[1]), month: parseInt(m[2]) };

  // YYYY/MM または YYYY-MM
  m = cleaned.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) };

  return null;
}

function formatYM(year: number, month: number): string {
  return `${year}/${String(month).padStart(2, "0")}`;
}

function calcMonthsDiff(start: { year: number; month: number }, end: { year: number; month: number }): number {
  return Math.max(0, (end.year - start.year) * 12 + (end.month - start.month) + 1);
}

function parseAmount(s: string): number {
  const cleaned = s.replace(/[,，\s円¥￥]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectType(typeStr: string): NenkinRecord["type"] {
  if (typeStr.includes("厚生")) return "厚生年金";
  if (typeStr.includes("国民")) return "国民年金";
  if (typeStr.includes("共済")) return "共済";
  return "不明";
}

function removeBOM(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

export function parseNenkinCSV(text: string): NenkinParseResult {
  const warnings: string[] = [];
  const records: NenkinRecord[] = [];

  const cleaned = removeBOM(text);
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // ヘッダー行を探す
  const headerKeywords = ["種別", "勤務先", "資格取得", "加入", "期間", "標準報酬", "月数"];
  let headerIndex = -1;
  let headerCols: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const joined = cols.join("");
    const matchCount = headerKeywords.filter((kw) => joined.includes(kw)).length;
    if (matchCount >= 2) {
      headerIndex = i;
      headerCols = cols.map((c) => c.trim());
      break;
    }
  }

  if (headerIndex === -1) {
    warnings.push("ヘッダー行が見つかりませんでした。CSVのフォーマットを確認してください。");
    return {
      records: [],
      empMonths: 0,
      citizenMonths: 0,
      avgStandardMonthly: 0,
      pensionMonthlyEst: 0,
      warnings,
    };
  }

  // カラムインデックスを推定
  const findCol = (keywords: string[]): number => {
    for (const kw of keywords) {
      const idx = headerCols.findIndex((h) => h.includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const typeIdx = findCol(["種別", "年金種別", "制度"]);
  const employerIdx = findCol(["勤務先", "事業所", "事業者", "会社"]);
  const startIdx = findCol(["資格取得", "取得", "開始", "加入開始"]);
  const endIdx = findCol(["資格喪失", "喪失", "終了", "加入終了", "退職"]);
  const stdMonthlyIdx = findCol(["標準報酬月額", "標準報酬", "報酬月額", "報酬"]);
  const monthsIdx = findCol(["加入月数", "月数", "期間月数"]);

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.every((c) => c.trim() === "")) continue;

    const get = (idx: number): string => (idx !== -1 && idx < cols.length ? cols[idx].trim() : "");

    const typeRaw = get(typeIdx);
    const employerRaw = get(employerIdx);
    const startRaw = get(startIdx);
    const endRaw = get(endIdx);
    const stdMonthlyRaw = get(stdMonthlyIdx);
    const monthsRaw = get(monthsIdx);

    // 全フィールドが空の行はスキップ
    if (!typeRaw && !employerRaw && !startRaw && !endRaw) continue;

    const startDate = parseJapaneseDate(startRaw);
    const endDate = parseJapaneseDate(endRaw);

    const startYM = startDate ? formatYM(startDate.year, startDate.month) : startRaw;
    const endYM = endDate ? formatYM(endDate.year, endDate.month) : endRaw;

    let months = 0;
    if (monthsRaw && monthsRaw !== "") {
      const parsed = parseInt(monthsRaw.replace(/[^\d]/g, ""), 10);
      months = isNaN(parsed) ? 0 : parsed;
    }
    if (months === 0 && startDate && endDate) {
      months = calcMonthsDiff(startDate, endDate);
    }

    const standardMonthly = parseAmount(stdMonthlyRaw);
    const type = detectType(typeRaw);

    records.push({
      type,
      employer: employerRaw || "不明",
      startYM,
      endYM,
      standardMonthly,
      months,
    });
  }

  if (records.length === 0) {
    warnings.push("データ行が見つかりませんでした。");
  }

  // 集計
  const empRecords = records.filter((r) => r.type === "厚生年金" || r.type === "共済");
  const citizenRecords = records.filter((r) => r.type === "国民年金");

  const empMonths = empRecords.reduce((sum, r) => sum + r.months, 0);
  const citizenMonths = citizenRecords.reduce((sum, r) => sum + r.months, 0);
  const totalMonths = records.reduce((sum, r) => sum + r.months, 0);

  // 平均標準報酬月額（厚生年金・共済のみ）
  const weightedSum = empRecords.reduce((sum, r) => sum + r.standardMonthly * r.months, 0);
  const avgStandardMonthly = empMonths > 0 ? Math.round(weightedSum / empMonths) : 0;

  // 推計年金月額
  // 基礎年金: 6.8万円 × min(totalMonths / 480, 1)
  const basicPension = 68000 * Math.min(totalMonths / 480, 1);
  // 厚生年金報酬比例部分: avgStd円 × 0.005481 × empMonths
  const empPension = avgStandardMonthly * 0.005481 * empMonths;
  const pensionMonthlyEst = Math.round((basicPension + empPension) / 10000) * 10000;

  return {
    records,
    empMonths,
    citizenMonths,
    avgStandardMonthly,
    pensionMonthlyEst,
    warnings,
  };
}
