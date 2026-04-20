export { readFileAsText } from "./nenkinCSV";

export interface MFAccount {
  name: string;
  balance: number; // 万円単位（小数1桁）
  category: "deposit" | "investment" | "crypto" | "other";
}

export interface MFParseResult {
  accounts: MFAccount[];
  totalDeposit: number;
  totalInvestment: number;
  updateDate: string;
  warnings: string[];
}

function removeBOM(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
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

function parseYen(s: string): number {
  const isNeg = s.includes("△") || s.includes("▲") || s.replace(/[^\-\d]/g, "").startsWith("-");
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  if (isNaN(n)) return 0;
  const val = Math.round((n / 10000) * 10) / 10; // 万円・小数1桁
  return isNeg ? -val : val;
}

// ─── 資産推移月次 形式 ────────────────────────────────────────────
// 列: 日付, 合計（円）, 預貯金・現金・仮想通貨（円）, 証券(運用)（円）, その他（円）, ポイント（円）
// 最新行（先頭データ行）から各カテゴリ金額を読む

function parseTrendFormat(lines: string[], headerCols: string[], warnings: string[]): MFParseResult {
  // 最新データ行（日付列に YYYY/MM/DD を含む最初の行）
  let dataRow: string[] | null = null;
  let updateDate = "";

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols[0]?.match(/\d{4}\/\d{2}\/\d{2}/)) {
      dataRow = cols;
      updateDate = cols[0].trim();
      break;
    }
  }

  if (!dataRow) {
    warnings.push("資産推移月次CSVからデータ行を読み取れませんでした。");
    return { accounts: [], totalDeposit: 0, totalInvestment: 0, updateDate, warnings };
  }

  const accounts: MFAccount[] = [];

  // 各ヘッダー列をスキャンしてカテゴリを判定
  for (let col = 1; col < headerCols.length; col++) {
    const header = headerCols[col];
    const raw = dataRow[col] ?? "0";
    const balance = parseYen(raw);

    // 合計列・ポイント列はスキップ
    if (header.includes("合計") || header.includes("ポイント")) continue;
    // 0円の列もスキップ
    if (balance === 0) continue;

    // カテゴリ判定
    let category: MFAccount["category"];
    if (header.includes("証券") || header.includes("運用")) {
      category = "investment";
    } else if (header.includes("仮想通貨") || header.includes("暗号")) {
      category = "crypto";
    } else if (header.includes("預貯金") || header.includes("現金")) {
      // "預貯金・現金・仮想通貨" という複合カテゴリはまず deposit 扱い
      category = "deposit";
    } else {
      category = "other";
    }

    // ヘッダーから "（円）" などの不要部分を除いた短い名前
    const name = header
      .replace(/（円）|(\(円\))|\(¥\)/g, "")
      .replace(/（\d+ヶ月）/g, "")
      .trim();

    accounts.push({ name, balance, category });
  }

  if (accounts.length === 0) {
    warnings.push("資産カテゴリの列が見つかりませんでした。");
  }

  const totalDeposit = Math.round(
    accounts.filter((a) => a.category === "deposit").reduce((s, a) => s + a.balance, 0) * 10
  ) / 10;
  const totalInvestment = Math.round(
    accounts.filter((a) => a.category === "investment" || a.category === "crypto")
      .reduce((s, a) => s + a.balance, 0) * 10
  ) / 10;

  return { accounts, totalDeposit, totalInvestment, updateDate, warnings };
}

// ─── 口座一覧 形式 ────────────────────────────────────────────────
// 列: 口座名, 残高（円）, 種別, ...

const DEPOSIT_KW = ["銀行", "預金", "貯金", "普通", "定期", "財布", "現金", "ゆうちょ", "信用金庫", "信金", "JAバンク"];
const INVEST_KW  = ["証券", "NISA", "iDeCo", "投資", "投信", "ファンド", "ETF", "株", "FX", "先物", "外貨", "債券"];
const CRYPTO_KW  = ["仮想通貨", "暗号", "ビットコイン", "BTC", "ETH", "コイン"];

function classifyByName(name: string): MFAccount["category"] {
  for (const kw of CRYPTO_KW) if (name.includes(kw)) return "crypto";
  for (const kw of INVEST_KW)  if (name.includes(kw)) return "investment";
  for (const kw of DEPOSIT_KW) if (name.includes(kw)) return "deposit";
  return "other";
}

function parseAccountFormat(lines: string[], headerCols: string[], warnings: string[]): MFParseResult {
  const findCol = (keywords: string[]) =>
    keywords.map((kw) => headerCols.findIndex((h) => h.includes(kw))).find((i) => i !== -1) ?? -1;

  const nameIdx    = findCol(["口座名", "口座", "名称", "金融機関"]);
  const balanceIdx = findCol(["残高", "金額", "評価額", "資産額"]);
  const catIdx     = findCol(["種別", "カテゴリ", "分類"]);

  if (nameIdx === -1 || balanceIdx === -1) {
    warnings.push("口座名または残高の列が見つかりませんでした。");
    return { accounts: [], totalDeposit: 0, totalInvestment: 0, updateDate: "", warnings };
  }

  const accounts: MFAccount[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.every((c) => !c.trim())) continue;
    const get = (idx: number) => (idx !== -1 && idx < cols.length ? cols[idx].trim() : "");
    const name = get(nameIdx);
    if (!name) continue;
    const balance  = parseYen(get(balanceIdx));
    const catRaw   = get(catIdx);
    const category = classifyByName(catRaw + name);
    accounts.push({ name, balance, category });
  }

  if (accounts.length === 0) warnings.push("口座データが見つかりませんでした。");

  const totalDeposit = Math.round(
    accounts.filter((a) => a.category === "deposit").reduce((s, a) => s + a.balance, 0) * 10
  ) / 10;
  const totalInvestment = Math.round(
    accounts.filter((a) => a.category === "investment" || a.category === "crypto")
      .reduce((s, a) => s + a.balance, 0) * 10
  ) / 10;

  return { accounts, totalDeposit, totalInvestment, updateDate: "", warnings };
}

// ─── エントリポイント ─────────────────────────────────────────────

export function parseMFCSV(text: string): MFParseResult {
  const warnings: string[] = [];
  const cleaned = removeBOM(text);
  const lines   = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    warnings.push("データが空です。");
    return { accounts: [], totalDeposit: 0, totalInvestment: 0, updateDate: "", warnings };
  }

  const headerCols = splitCSVLine(lines[0]).map((c) => c.trim());

  // フォーマット判定
  const isTrend   = headerCols.some((h) => h.includes("日付") || h.includes("合計"));
  const isAccount = headerCols.some((h) => h.includes("口座") || h.includes("残高"));

  // 日付列の値でも判定
  const firstData = splitCSVLine(lines[1] ?? "");
  const looksLikeDate = /^\d{4}\/\d{2}\/\d{2}$/.test(firstData[0]?.trim() ?? "");

  if (isTrend || looksLikeDate) {
    return parseTrendFormat(lines, headerCols, warnings);
  }
  if (isAccount) {
    return parseAccountFormat(lines, headerCols, warnings);
  }

  warnings.push(
    "CSVの形式を認識できませんでした。「資産推移月次」または「資産（口座一覧）」CSVをご利用ください。"
  );
  return { accounts: [], totalDeposit: 0, totalInvestment: 0, updateDate: "", warnings };
}
