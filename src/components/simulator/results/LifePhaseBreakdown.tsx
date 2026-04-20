"use client";

import type { YearlyData } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";

interface Props {
  data: YearlyData[];
  retirementAge: number;
}

interface PhaseStats {
  key: string;
  label: string;
  sublabel: string;
  startAge: number;
  endAge: number;
  years: number;
  totalIncome: number;
  totalExpense: number;
  netCF: number;
  avgAnnualCF: number;
  color: string;
  bg: string;
  border: string;
  headerBg: string;
  icon: string;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億円`;
  return `${Math.round(v).toLocaleString("ja-JP")}万円`;
}

function fmtSigned(v: number): { text: string; cls: string } {
  const text = (v >= 0 ? "+" : "") + fmt(v);
  return { text, cls: v >= 0 ? "text-emerald-600" : "text-red-500" };
}

function calcPhase(rows: YearlyData[]) {
  const totalIncome = rows.reduce((s, r) => s + r.income + r.spouseIncome, 0);
  const totalExpense = rows.reduce((s, r) => s + r.totalExpense, 0);
  const netCF = totalIncome - totalExpense;
  return { totalIncome, totalExpense, netCF, avgAnnualCF: rows.length > 0 ? netCF / rows.length : 0 };
}

export function LifePhaseBreakdown({ data, retirementAge }: Props) {
  if (!data.length) return null;

  const pensionAge = Math.max(65, retirementAge);
  const currentAge = data[0].age;
  const lastAge = data[data.length - 1].age;

  const workingRows = data.filter((d) => d.age < retirementAge);
  const gapRows = data.filter((d) => d.age >= retirementAge && d.age < pensionAge);
  const pensionRows = data.filter((d) => d.age >= pensionAge);

  const phases: PhaseStats[] = [];

  if (workingRows.length > 0) {
    const s = calcPhase(workingRows);
    phases.push({
      key: "working",
      label: "現役期",
      sublabel: `${currentAge}〜${retirementAge - 1}歳`,
      startAge: currentAge,
      endAge: retirementAge - 1,
      years: workingRows.length,
      ...s,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      headerBg: "bg-amber-100",
      icon: "💼",
    });
  }

  if (gapRows.length > 0) {
    const s = calcPhase(gapRows);
    phases.push({
      key: "retired",
      label: "退職後〜年金前",
      sublabel: `${retirementAge}〜${pensionAge - 1}歳`,
      startAge: retirementAge,
      endAge: pensionAge - 1,
      years: gapRows.length,
      ...s,
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      headerBg: "bg-blue-100",
      icon: "🌿",
    });
  }

  if (pensionRows.length > 0) {
    const s = calcPhase(pensionRows);
    phases.push({
      key: "pension",
      label: "年金受給期",
      sublabel: `${pensionAge}〜${lastAge}歳`,
      startAge: pensionAge,
      endAge: lastAge,
      years: pensionRows.length,
      ...s,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      headerBg: "bg-emerald-100",
      icon: "🌅",
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <h3 className="font-semibold text-foreground">ライフフェーズ別 収支サマリー</h3>
        <p className="text-sm text-muted-foreground mt-0.5">人生を3つのフェーズに分けた収支の全体像</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {phases.map((ph) => {
          const avg = fmtSigned(ph.avgAnnualCF);
          const net = fmtSigned(ph.netCF);
          return (
            <div key={ph.key} className="flex flex-col">
              {/* Phase header */}
              <div className={cn("px-5 py-3 flex items-center gap-2.5", ph.headerBg)}>
                <span className="text-xl">{ph.icon}</span>
                <div>
                  <div className={cn("font-bold text-sm", ph.color)}>{ph.label}</div>
                  <div className="text-xs text-muted-foreground">{ph.sublabel}（{ph.years}年間）</div>
                </div>
              </div>

              {/* Stats */}
              <div className="px-5 py-4 space-y-3 flex-1">
                <StatRow label="総収入" value={fmt(ph.totalIncome)} valueClass="text-amber-700 font-bold" />
                <StatRow label="総支出" value={fmt(ph.totalExpense)} valueClass="text-slate-600 font-semibold" />
                <div className="border-t border-border/60 pt-2">
                  <StatRow label="累計収支" value={net.text} valueClass={cn("font-bold text-base", net.cls)} />
                  <StatRow label="年間平均収支" value={`${avg.text}/年`} valueClass={cn("text-xs font-medium", avg.cls)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer context */}
      <div className="px-6 py-3 bg-muted/20 border-t border-border text-xs text-muted-foreground">
        ※ 収入は税・社会保険料控除後の手取り額、支出は生活費・住居費・教育費・医療費・イベント費の合計です。
      </div>
    </div>
  );
}

function StatRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={cn("tabular-nums text-right", valueClass)}>{value}</span>
    </div>
  );
}
