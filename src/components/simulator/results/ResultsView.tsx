"use client";

import { useState, useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetChart } from "./AssetChart";
import { CashFlowChart } from "./CashFlowChart";
import { DataTable } from "./DataTable";
import { AIEvaluationCard } from "./AIEvaluationCard";
import { MonteCarloChart } from "./MonteCarloChart";
import { SensitivityAnalysis } from "./SensitivityAnalysis";
import { LifePhaseBreakdown } from "./LifePhaseBreakdown";
import { ExpenseBreakdownChart } from "./ExpenseBreakdownChart";
import { RetirementInsights } from "./RetirementInsights";
import { ActionPlan } from "./ActionPlan";
import type { ChartAnnotation } from "./AssetChart";
import { runSimulation } from "@/lib/simulation/calculator";
import type { SimulationInput } from "@/lib/simulation/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TinySpinner } from "@/components/three/TinySpinner";
import type { MonteCarloResult, SensitivityDataPoint, SimulationResult } from "@/lib/simulation/types";

interface Props {
  onBack: () => void;
}

// ─── Print-only full report ────────────────────────────────────────────────
function PrintReport({ visible }: { visible: boolean }) {
  const { result, input } = useSimulationStore();
  if (!result) return null;

  const now = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const retirementAge = input.retirementAge ?? 65;

  const EMP_LABELS: Record<string, string> = {
    employee: "会社員（正社員）", civil_servant: "公務員",
    employee_freelance: "会社員＋副業", self_employed: "自営業",
    freelance: "フリーランス", part_time: "パート・アルバイト", homemaker: "専業主婦・主夫",
  };
  const HOUSING_LABELS: Record<string, string> = {
    rent: "賃貸", buy: "持ち家（購入予定）", own: "持ち家（既所有）",
  };

  type Row = [string, string];
  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "基本情報",
      rows: [
        ["現在年齢", `${input.age ?? "-"}歳`],
        ["性別", input.gender === "male" ? "男性" : "女性"],
        ["退職年齢", `${retirementAge}歳`],
        ["配偶者", input.hasSpouse ? "あり" : "なし"],
        ...(input.hasSpouse ? [
          ["配偶者年齢", `${input.spouseAge ?? "-"}歳`] as Row,
          ["配偶者退職年齢", `${input.spouseRetirementAge || retirementAge}歳`] as Row,
        ] : []),
        ["子ども", `${input.children?.length ?? 0}人`],
      ],
    },
    {
      title: "収入（本人）",
      rows: [
        ["雇用形態", EMP_LABELS[input.employmentType ?? ""] ?? (input.employmentType ?? "-")],
        ["年収 / 事業収入", `${(input.annualIncome ?? 0).toLocaleString("ja-JP")}万円`],
        ["年収上昇率", `${input.incomeGrowthRate ?? 0}% / 年`],
        ...((input.officerAnnualIncome ?? 0) > 0 ? [
          ["役員報酬（年額）", `${(input.officerAnnualIncome ?? 0).toLocaleString("ja-JP")}万円`] as Row,
          ["役員報酬増加率", `${input.officerIncomeGrowthRate ?? 0}% / 年`] as Row,
        ] : []),
        ...((input.sideIncomeMonthly ?? 0) > 0 ? [
          ["副業収入", `月${input.sideIncomeMonthly}万円`] as Row,
        ] : []),
        ...((input.postRetirementIncomeMonthly ?? 0) > 0 ? [
          ["老後就労収入", `月${input.postRetirementIncomeMonthly}万円（〜${input.postRetirementIncomeUntilAge}歳）`] as Row,
        ] : []),
        ["退職金（予定）", `${(input.retirementAllowance ?? 0).toLocaleString("ja-JP")}万円`],
      ],
    },
    ...(input.hasSpouse ? [{
      title: "収入（配偶者）",
      rows: [
        ["雇用形態", EMP_LABELS[input.spouseEmploymentType ?? ""] ?? (input.spouseEmploymentType ?? "-")],
        ...(input.spouseEmploymentType !== "homemaker" ? [
          ["年収", `${(input.spouseAnnualIncome ?? 0).toLocaleString("ja-JP")}万円`] as Row,
          ["年収上昇率", `${input.spouseIncomeGrowthRate ?? 0}% / 年`] as Row,
        ] : []),
      ] as Row[],
    }] : []),
    {
      title: "支出・住宅",
      rows: [
        ["月の生活費", `${input.monthlyLivingExpense ?? 0}万円 / 月`],
        ["物価上昇率", `${input.inflationRate ?? 1.5}% / 年`],
        ["住宅タイプ", HOUSING_LABELS[input.housingType ?? "rent"] ?? (input.housingType ?? "-")],
        ...(input.housingType === "rent" ? [
          ["月額家賃", `${input.monthlyRent ?? 0}万円 / 月`] as Row,
        ] : []),
        ...(input.housingType === "buy" ? [
          ["物件価格", `${(input.propertyPrice ?? 0).toLocaleString("ja-JP")}万円`] as Row,
          ["頭金", `${(input.downPayment ?? 0).toLocaleString("ja-JP")}万円`] as Row,
          ["住宅ローン", `金利${input.mortgageRate ?? 0}% / ${input.mortgagePeriod ?? 0}年`] as Row,
          ["購入年齢", `${input.purchaseAge ?? 0}歳`] as Row,
        ] : []),
      ],
    },
    {
      title: "投資・貯蓄",
      rows: [
        ["現在の貯蓄", `${(input.currentSavings ?? 0).toLocaleString("ja-JP")}万円`],
        ["現在の投資資産", `${(input.currentInvestmentAssets ?? 0).toLocaleString("ja-JP")}万円`],
        ["月額投資", `${input.monthlyInvestment ?? 0}万円 / 月`],
        ["投資リターン率", `${input.investmentReturnRate ?? 0}% / 年`],
        ...((input.nisaAccumulationMonthly ?? 0) > 0 || (input.nisaGrowthMonthly ?? 0) > 0 ? [
          ["NISA（積立・成長）", `月${(input.nisaAccumulationMonthly ?? 0) + (input.nisaGrowthMonthly ?? 0)}万円（${input.nisaReturnRate ?? 0}%）`] as Row,
        ] : []),
        ...((input.monthlyIdeco ?? 0) > 0 ? [
          ["iDeCo", `月${input.monthlyIdeco}万円（${input.idecoReturnRate ?? 0}%）`] as Row,
        ] : []),
        ...((input.shokiboKigyoMonthly ?? 0) > 0 ? [
          ["小規模企業共済", `月${input.shokiboKigyoMonthly}万円`] as Row,
        ] : []),
      ],
    },
    {
      title: "保険・医療・企業DC",
      rows: [
        ["生命保険料", `月${input.lifeInsurancePremiumMonthly ?? 0}万円`],
        ["70歳以降の医療費追加", `月${input.medicalCostMonthlyAt70 ?? 0}万円`],
        ...((input.nursingCareStartAge ?? 0) > 0 ? [
          ["介護費用", `${input.nursingCareStartAge}歳〜月${input.nursingCareCostMonthly ?? 0}万円`] as Row,
        ] : []),
        ...((input.corporateDCBalance ?? 0) > 0 ? [
          ["企業型DC残高", `${(input.corporateDCBalance ?? 0).toLocaleString("ja-JP")}万円`] as Row,
        ] : []),
        ...((input.corporateDCMonthly ?? 0) > 0 ? [
          ["企業型DC掛金", `月${input.corporateDCMonthly}万円`] as Row,
        ] : []),
        ...((input.corporatePensionMonthly ?? 0) > 0 ? [
          ["企業年金（退職後）", `月${input.corporatePensionMonthly}万円`] as Row,
        ] : []),
      ],
    },
  ];

  const cell: React.CSSProperties = { padding: "2px 8px 2px 0", verticalAlign: "top" as const, fontSize: "8pt" };
  const labelCell: React.CSSProperties = { ...cell, color: "#6b7280", whiteSpace: "nowrap" as const };
  const valueCell: React.CSSProperties = { ...cell, fontWeight: 500 };

  const printStyle: React.CSSProperties = visible
    ? { fontFamily: "sans-serif", fontSize: "10pt", lineHeight: 1.5, color: "#1f2937" }
    : { position: "absolute", top: -9999, left: -9999, width: 794, minHeight: 600, visibility: "hidden", pointerEvents: "none" };

  return (
    <div className="print:block" style={printStyle}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid #d97706", paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ fontSize: "15pt", fontWeight: 700, color: "#92400e" }}>
          🏔️ ライフプランシミュレーション レポート
        </div>
        <div style={{ color: "#6b7280", fontSize: "9pt", marginTop: 2 }}>
          出力日: {now}　／　現在年齢 {input.age}歳　／　退職年齢 {retirementAge}歳
        </div>
      </div>

      {/* Result summary */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "11pt", fontWeight: 700, borderLeft: "3px solid #d97706", paddingLeft: 8, marginBottom: 10 }}>
          シミュレーション結果
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { label: "退職時資産", value: formatManYen(result.retirementAssets), sub: `${retirementAge}歳時点`, ok: result.retirementAssets >= 0 },
            { label: "100歳時の資産", value: formatManYen(result.finalAssets), sub: "100歳時点", ok: result.finalAssets >= 0 },
            { label: "年金月額（概算）", value: `${result.pensionMonthly.toFixed(1)}万円/月`, sub: "公的年金+企業年金", ok: true },
            { label: "老後安全診断", value: result.isRetirementSafe ? "安全 ✓" : "要注意 !", sub: result.isRetirementSafe ? "100歳まで資産維持" : "資産が枯渇する可能性", ok: result.isRetirementSafe },
          ].map((c) => (
            <div key={c.label} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 10px", background: c.ok ? "#fffbeb" : "#fef2f2" }}>
              <div style={{ fontSize: "7pt", color: "#6b7280", marginBottom: 2 }}>{c.label}</div>
              <div style={{ fontSize: "12pt", fontWeight: 700, color: c.ok ? "#d97706" : "#dc2626" }}>{c.value}</div>
              <div style={{ fontSize: "7pt", color: "#9ca3af" }}>{c.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
          {[
            { label: "生涯総収入", value: formatManYen(result.totalIncome) },
            { label: "生涯総支出", value: formatManYen(result.totalExpense) },
            { label: "生涯収支", value: formatManYen(result.totalIncome - result.totalExpense) },
          ].map((c) => (
            <div key={c.label} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 10px", fontSize: "9pt" }}>
              <span style={{ color: "#6b7280" }}>{c.label}：</span>
              <span style={{ fontWeight: 700 }}>{c.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Input conditions */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "11pt", fontWeight: 700, borderLeft: "3px solid #d97706", paddingLeft: 8, marginBottom: 10 }}>
          入力条件
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 20px" }}>
          {sections.map((sec) => (
            <div key={sec.title}>
              <div style={{ fontSize: "8pt", fontWeight: 700, color: "#92400e", borderBottom: "1px solid #fcd34d", paddingBottom: 3, marginBottom: 5 }}>
                {sec.title}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {sec.rows.map(([label, value]) => (
                    <tr key={label}>
                      <td style={labelCell}>{label}</td>
                      <td style={valueCell}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {result.notes.length > 0 && (
        <div style={{ marginBottom: 16, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "8px 12px", fontSize: "8pt" }}>
          <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 4 }}>アドバイス</div>
          {result.notes.map((note, i) => (
            <div key={i} style={{ color: "#78350f" }}>• {note}</div>
          ))}
        </div>
      )}

      {/* Asset chart — explicit height so ResponsiveContainer can measure */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: "10pt", fontWeight: 700, marginBottom: 6 }}>資産推移グラフ（万円）</div>
        <div style={{ width: "100%", height: 260 }}>
          <AssetChart data={result.yearlyData} retirementAge={retirementAge} />
        </div>
      </div>

      {/* Year-by-year table */}
      <div>
        <div style={{ fontSize: "10pt", fontWeight: 700, marginBottom: 6 }}>年別キャッシュフロー詳細（単位: 万円）</div>
        <DataTable
          data={result.yearlyData}
          input={input}
        />
      </div>
    </div>
  );
}

// ─── Scenario comparison ───────────────────────────────────────────────────
function ScenarioComparison({ baseInput, baseResult }: { baseInput: Partial<SimulationInput>; baseResult: SimulationResult }) {
  const full = baseInput as SimulationInput;
  const conservative = runSimulation({
    ...full,
    inflationRate: (full.inflationRate ?? 1.5) + 0.5,
    investmentReturnRate: Math.max(0, full.investmentReturnRate - 2),
    nisaReturnRate: Math.max(0, full.nisaReturnRate - 2),
    idecoReturnRate: Math.max(0, full.idecoReturnRate - 2),
  });
  const optimistic = runSimulation({
    ...full,
    inflationRate: Math.max(0, (full.inflationRate ?? 1.5) - 0.5),
    investmentReturnRate: full.investmentReturnRate + 2,
    nisaReturnRate: full.nisaReturnRate + 2,
    idecoReturnRate: full.idecoReturnRate + 2,
  });

  const scenarios = [
    {
      label: "保守ケース",
      sub: `インフレ+0.5pp / 投資リターン-2pp`,
      retirementAssets: conservative.retirementAssets,
      finalAssets: conservative.finalAssets,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "標準ケース（現設定）",
      sub: "現在の入力値通り",
      retirementAssets: baseResult.retirementAssets,
      finalAssets: baseResult.finalAssets,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "楽観ケース",
      sub: `インフレ-0.5pp / 投資リターン+2pp`,
      retirementAssets: optimistic.retirementAssets,
      finalAssets: optimistic.finalAssets,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {scenarios.map((sc) => (
          <div key={sc.label} className={`rounded-xl border border-border p-4 ${sc.bg}`}>
            <div className={`text-sm font-bold mb-1 ${sc.color}`}>{sc.label}</div>
            <div className="text-xs text-muted-foreground mb-3">{sc.sub}</div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">退職時資産</div>
                <div className={`text-lg font-bold ${sc.retirementAssets >= 0 ? sc.color : "text-red-600"}`}>
                  {formatManYen(sc.retirementAssets)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">100歳時資産</div>
                <div className={`text-lg font-bold ${sc.finalAssets >= 0 ? sc.color : "text-red-600"}`}>
                  {formatManYen(sc.finalAssets)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        ※ インフレ率・投資リターンのみ変更し、その他の条件は現設定と同じです。運用依存度の確認にご活用ください。
      </div>
    </div>
  );
}

function formatManYen(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(2)}億円`;
  }
  return `${Math.round(value).toLocaleString("ja-JP")}万円`;
}

function SaveDialog() {
  const { saveSimulation } = useSimulationStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveSimulation(trimmed);
    setSaved(true);
    setTimeout(() => {
      setOpen(false);
      setSaved(false);
      setName("");
    }, 1200);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSaved(false); setName(""); } }}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 bg-white border border-border hover:border-amber-300 hover:bg-amber-50 text-foreground font-semibold text-sm rounded-xl px-4 py-2.5 transition-all shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          シミュレーションを保存
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>シミュレーションを保存</DialogTitle>
        </DialogHeader>
        {saved ? (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
            <div className="font-semibold text-emerald-700">保存しました！</div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                シミュレーション名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="例: 楽観シナリオ、35歳時点のプランなど"
                maxLength={30}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                autoFocus
              />
              <div className="text-right text-xs text-muted-foreground mt-1">{name.length}/30</div>
            </div>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl py-2.5 transition-all"
            >
              保存する
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ResultsView({ onBack }: Props) {
  const { result, input, isCalculating } = useSimulationStore();
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [sensitivityData, setSensitivityData] = useState<SensitivityDataPoint[] | null>(null);
  const [mcLoading, setMcLoading] = useState(false);
  const [sensLoading, setSensLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  function handlePrint() {
    setIsPrinting(true);
    // Give React one frame to mount the print section with proper dimensions
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 120);
  }

  // Preload both analyses immediately on mount so tabs show results on first click
  useEffect(() => {
    if (!result) return;
    setMcLoading(true);
    import("@/lib/simulation/monteCarlo")
      .then(({ runMonteCarlo }) => setMonteCarloResult(runMonteCarlo({ ...input } as SimulationInput)))
      .finally(() => setMcLoading(false));

    setSensLoading(true);
    import("@/lib/simulation/sensitivityAnalysis")
      .then(({ runSensitivityAnalysis }) => setSensitivityData(runSensitivityAnalysis({ ...input } as SimulationInput)))
      .finally(() => setSensLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isCalculating) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-12 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-muted-foreground font-medium">シミュレーション計算中...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-12 text-center">
        <div className="text-3xl mb-3">📊</div>
        <div className="font-semibold text-muted-foreground">シミュレーション結果がありません</div>
        <button onClick={onBack} className="mt-4 text-amber-600 text-sm hover:underline">
          前のステップに戻る
        </button>
      </div>
    );
  }

  const retirementAge = input.retirementAge ?? 65;
  const currentAge = input.age ?? 30;
  const inflRate = (input.inflationRate ?? 1.5) / 100;
  const realFinalAssets = result.finalAssets / Math.pow(1 + inflRate, 100 - currentAge);

  const householdPensionMonthly = result.pensionMonthly + (result.spousePensionMonthly ?? 0);
  const pensionLabel = input.hasSpouse
    ? `本人 ${result.pensionMonthly.toFixed(1)} + 配偶者 ${(result.spousePensionMonthly ?? 0).toFixed(1)} 万円/月`
    : `${result.pensionMonthly.toFixed(1)} 万円/月`;

  // グラフアノテーション生成
  const annotations: ChartAnnotation[] = [];

  // 住宅購入
  if (input.housingType === "buy" && (input.purchaseAge ?? 0) > currentAge) {
    annotations.push({ age: input.purchaseAge!, label: "住宅購入", color: "#3b82f6" });
  }

  // 介護開始
  if (input.nursingCareStartAge && input.nursingCareStartAge > 0) {
    annotations.push({ age: input.nursingCareStartAge, label: "介護", color: "#dc2626" });
  }

  // 配偶者退職
  if (input.hasSpouse && (input.spouseAge ?? 0) > 0) {
    const spouseRetAge = input.spouseRetirementAge || retirementAge;
    // 本人が何歳のときに配偶者が退職するか
    const mainAgeAtSpouseRetirement = currentAge + (spouseRetAge - (input.spouseAge ?? currentAge));
    if (mainAgeAtSpouseRetirement > currentAge && mainAgeAtSpouseRetirement < 100
        && Math.abs(mainAgeAtSpouseRetirement - retirementAge) > 1) {
      annotations.push({ age: Math.round(mainAgeAtSpouseRetirement), label: "配偶者退職", color: "#ec4899" });
    }
  }

  // 子どものイベント（大学入学・独立）
  (input.children ?? []).forEach((child, idx) => {
    const n = (input.children ?? []).length > 1 ? `${idx + 1}` : "";
    const uniEntryAge = child.birthAge + 18;
    const independenceAge = child.birthAge + 22;
    if (uniEntryAge > currentAge && uniEntryAge < 100) {
      annotations.push({ age: uniEntryAge, label: `子${n}大学`, color: "#7c3aed" });
    }
    if (independenceAge > currentAge && independenceAge < 100) {
      annotations.push({ age: independenceAge, label: `子${n}独立`, color: "#6d28d9" });
    }
  });

  const spouseAgeDiff = (input.hasSpouse && (input.spouseAge ?? 0) > 0)
    ? (input.spouseAge ?? 0) - currentAge
    : undefined;

  const summaryCards = [
    {
      label: "退職時資産",
      value: formatManYen(result.retirementAssets),
      subLabel: `${retirementAge}歳時点`,
      icon: "🏦",
      color: result.retirementAssets >= 0 ? "text-amber-600" : "text-destructive",
      bg: result.retirementAssets >= 0 ? "bg-amber-50" : "bg-red-50",
      spinnerShape: "peak" as const,
      spinnerColor: 0xf59e0b,
    },
    {
      label: "100歳時の資産",
      value: formatManYen(result.finalAssets),
      subLabel: `現在価値 ${formatManYen(realFinalAssets)}`,
      icon: "📈",
      color: result.finalAssets >= 0 ? "text-emerald-600" : "text-destructive",
      bg: result.finalAssets >= 0 ? "bg-emerald-50" : "bg-red-50",
      spinnerShape: "gem" as const,
      spinnerColor: result.finalAssets >= 0 ? 0x10b981 : 0xef4444,
    },
    {
      label: input.hasSpouse ? "世帯年金月額（概算）" : "年金月額（概算）",
      value: `${householdPensionMonthly.toFixed(1)}万円`,
      subLabel: pensionLabel,
      icon: "🔖",
      color: "text-amber-600",
      bg: "bg-amber-50",
      spinnerShape: "coin" as const,
      spinnerColor: 0xd97706,
    },
    {
      label: "老後安全診断",
      value: result.isRetirementSafe ? "安全" : "要注意",
      subLabel: result.isRetirementSafe ? "資産は100歳まで持続" : "資産が枯渇する可能性あり",
      icon: result.isRetirementSafe ? "✅" : "⚠️",
      color: result.isRetirementSafe ? "text-emerald-600" : "text-destructive",
      bg: result.isRetirementSafe ? "bg-emerald-50" : "bg-red-50",
      spinnerShape: "ring" as const,
      spinnerColor: result.isRetirementSafe ? 0x10b981 : 0xef4444,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Print report — rendered off-screen until print triggered */}
      <PrintReport visible={isPrinting} />

      {/* Screen content — hidden when printing */}
      {/* Top bar: back + save + print */}
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          前のステップへ戻る
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-white border border-border hover:border-amber-300 hover:bg-amber-50 text-foreground font-semibold text-sm rounded-xl px-4 py-2.5 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            PDF出力
          </button>
          <SaveDialog />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {summaryCards.map((card) => (
          <div key={card.label} className="relative overflow-hidden bg-white rounded-2xl border border-border shadow-sm p-5">
            <div className="absolute top-1 right-1 opacity-15 pointer-events-none">
              <TinySpinner shape={card.spinnerShape} color={card.spinnerColor} size={44} />
            </div>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3", card.bg)}>
              {card.icon}
            </div>
            <div className="text-xs text-muted-foreground font-medium mb-1">{card.label}</div>
            <div className={cn("text-2xl font-bold leading-tight", card.color)}>{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.subLabel}</div>
          </div>
        ))}
      </div>

      {/* Warning notes */}
      {result.notes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 print:hidden">
          <div className="font-semibold text-amber-800 text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            アドバイス
          </div>
          {result.notes.map((note, i) => (
            <div key={i} className="text-sm text-amber-700 flex gap-2">
              <span className="mt-0.5">•</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Evaluation */}
      <div className="print:hidden">
        <AIEvaluationCard />
      </div>

      {/* Life phase breakdown */}
      <div className="print:hidden">
        <LifePhaseBreakdown data={result.yearlyData} retirementAge={retirementAge} />
      </div>

      {/* Charts and table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm print:hidden">
        <Tabs defaultValue="asset-chart">
          <div className="px-6 pt-5 border-b border-border overflow-x-auto">
            <TabsList className="bg-muted/50 flex-wrap">
              <TabsTrigger value="asset-chart">資産推移</TabsTrigger>
              <TabsTrigger value="cashflow-chart">収支グラフ</TabsTrigger>
              <TabsTrigger value="table">年別データ</TabsTrigger>
              <TabsTrigger value="expense">支出内訳</TabsTrigger>
              <TabsTrigger value="scenarios">シナリオ比較</TabsTrigger>
              <TabsTrigger value="montecarlo">モンテカルロ</TabsTrigger>
              <TabsTrigger value="sensitivity">感度分析</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="asset-chart" className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">資産推移グラフ</h3>
              <p className="text-sm text-muted-foreground">貯蓄資産と投資資産の年間推移</p>
            </div>
            <AssetChart
              data={result.yearlyData}
              retirementAge={retirementAge}
              annotations={annotations}
              spouseAgeDiff={spouseAgeDiff}
              currentAge={currentAge}
            />
          </TabsContent>
          <TabsContent value="cashflow-chart" className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">年間収支グラフ</h3>
              <p className="text-sm text-muted-foreground">年間収入と支出の比較（5年ごと）</p>
            </div>
            <CashFlowChart data={result.yearlyData} retirementAge={retirementAge} />
          </TabsContent>
          <TabsContent value="table" className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">年別データ表</h3>
                <p className="text-sm text-muted-foreground">各年のキャッシュフロー詳細（単位: 万円）</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />
                  赤背景: キャッシュフローがマイナスの年
                </span>
              </div>
            </div>
            <DataTable
              data={result.yearlyData}
              input={input}
            />
          </TabsContent>
          <TabsContent value="expense" className="p-6">
            <ExpenseBreakdownChart data={result.yearlyData} retirementAge={retirementAge} />
          </TabsContent>
          <TabsContent value="scenarios" className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">保守 / 標準 / 楽観シナリオ比較</h3>
              <p className="text-sm text-muted-foreground">インフレ率と投資リターンを変えた3ケースの結果比較</p>
            </div>
            <ScenarioComparison baseInput={input as SimulationInput} baseResult={result} />
          </TabsContent>
          <TabsContent value="montecarlo" className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">モンテカルロシミュレーション</h3>
              <p className="text-sm text-muted-foreground">投資リターンをランダムに変動させた確率的シミュレーション</p>
            </div>
            {mcLoading ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">計算中...（400回シミュレーション）</p>
              </div>
            ) : monteCarloResult ? (
              <MonteCarloChart
                data={monteCarloResult.dataPoints}
                retirementAge={retirementAge}
                failureProbability={monteCarloResult.failureProbability}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">タブをクリックして計算します</p>
            )}
          </TabsContent>
          <TabsContent value="sensitivity" className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">感度分析（トルネードチャート）</h3>
              <p className="text-sm text-muted-foreground">各パラメータが100歳時の資産に与える影響</p>
            </div>
            {sensLoading ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">計算中...</p>
              </div>
            ) : sensitivityData ? (
              <SensitivityAnalysis data={sensitivityData} base={result.finalAssets} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">タブをクリックして計算します</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Retirement insights */}
      <div className="print:hidden">
        <RetirementInsights result={result} input={input} />
      </div>

      {/* Action plan */}
      <div className="print:hidden">
        <ActionPlan result={result} input={input} />
      </div>

      {/* Stats summary */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 print:hidden">
        <h3 className="font-semibold text-foreground mb-4">シミュレーション概要</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">総収入（生涯）</div>
            <div className="font-bold text-foreground">{formatManYen(result.totalIncome)}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">総支出（生涯）</div>
            <div className="font-bold text-foreground">{formatManYen(result.totalExpense)}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">生涯収支</div>
            <div className={cn("font-bold", result.totalIncome - result.totalExpense >= 0 ? "text-emerald-600" : "text-destructive")}>
              {formatManYen(result.totalIncome - result.totalExpense)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">{input.hasSpouse ? "世帯年金月額（概算）" : "年金月額（概算）"}</div>
            <div className="font-bold text-amber-600">{householdPensionMonthly.toFixed(1)}万円 / 月</div>
            {input.hasSpouse && (
              <div className="text-xs text-muted-foreground mt-0.5">{pensionLabel}</div>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          ※ 100歳時の資産「現在価値」はインフレ率 {input.inflationRate ?? 1.5}% で割り引いた実質的な購買力です（名目 {formatManYen(result.finalAssets)} → 現在価値 {formatManYen(realFinalAssets)}）
        </div>
      </div>
    </div>
  );
}
