"use client";

import type { SimulationResult, SimulationInput, YearlyData } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";

interface Props {
  result: SimulationResult;
  input: Partial<SimulationInput>;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億円`;
  return `${Math.round(v).toLocaleString("ja-JP")}万円`;
}

function fmtM(v: number): string {
  return `${v >= 0 ? "+" : ""}${Math.round(v).toLocaleString("ja-JP")}万円`;
}

interface IncomeItem { label: string; monthly: number; color: string }
interface ExpenseItem { label: string; monthly: number; color: string }

function MonthlyBreakdown({
  title, subtitle, incomes, expenses, bg, border,
}: {
  title: string;
  subtitle: string;
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  bg: string;
  border: string;
}) {
  const totalIn = incomes.reduce((s, i) => s + i.monthly, 0);
  const totalOut = expenses.reduce((s, i) => s + i.monthly, 0);
  const net = totalIn - totalOut;

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", bg, border)}>
      <div>
        <div className="font-bold text-sm text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>

      {/* Income */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-1.5">月収入</div>
        <div className="space-y-1">
          {incomes.filter((i) => i.monthly > 0).map((i) => (
            <div key={i.label} className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: i.color }} />
                {i.label}
              </span>
              <span className="font-semibold tabular-nums">{Math.round(i.monthly).toLocaleString("ja-JP")}万円</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold pt-1 border-t border-border/60">
            <span>収入計</span>
            <span className="text-amber-700 tabular-nums">{Math.round(totalIn).toLocaleString("ja-JP")}万円/月</span>
          </div>
        </div>
      </div>

      {/* Expense */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-1.5">月支出</div>
        <div className="space-y-1">
          {expenses.filter((e) => e.monthly > 0).map((e) => (
            <div key={e.label} className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                {e.label}
              </span>
              <span className="font-semibold tabular-nums">{Math.round(e.monthly).toLocaleString("ja-JP")}万円</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold pt-1 border-t border-border/60">
            <span>支出計</span>
            <span className="text-slate-600 tabular-nums">{Math.round(totalOut).toLocaleString("ja-JP")}万円/月</span>
          </div>
        </div>
      </div>

      {/* Net */}
      <div className={cn(
        "rounded-lg px-3 py-2 flex justify-between items-center",
        net >= 0 ? "bg-emerald-100" : "bg-red-100"
      )}>
        <span className="text-xs font-bold text-foreground">月次収支</span>
        <span className={cn("text-base font-black tabular-nums", net >= 0 ? "text-emerald-700" : "text-red-600")}>
          {fmtM(net)}/月
        </span>
      </div>

      {net < 0 && (
        <p className="text-[11px] text-muted-foreground">
          ※ 月{Math.round(-net).toLocaleString()}万円を資産から取り崩す必要があります
        </p>
      )}
    </div>
  );
}

export function RetirementInsights({ result, input }: Props) {
  const retirementAge = input.retirementAge ?? 65;
  const pensionAge = Math.max(65, retirementAge);
  const { yearlyData } = result;

  // Get yearly data rows at key ages
  const retRow: YearlyData | undefined =
    yearlyData.find((d) => d.age === retirementAge) ?? yearlyData.find((d) => d.age > retirementAge);
  const pensionRow: YearlyData | undefined =
    yearlyData.find((d) => d.age === pensionAge) ?? yearlyData.find((d) => d.age > pensionAge);

  const inflFactor = Math.pow(1 + (input.inflationRate ?? 1.5) / 100, retirementAge - (input.age ?? 30));

  // Retirement-phase income breakdown
  const postWorkMonthly = input.postRetirementIncomeMonthly ?? 0;
  const corpPensionMonthly = input.corporatePensionMonthly ?? 0;

  // Pre-pension monthly income (work + corporate pension only, no public pension yet)
  const retIncomes: IncomeItem[] = [
    { label: "就労収入", monthly: postWorkMonthly, color: "#f59e0b" },
    { label: "企業年金", monthly: corpPensionMonthly, color: "#a78bfa" },
  ];

  // Post-pension monthly income
  const myPension = result.pensionMonthly;
  const spousePension = result.spousePensionMonthly ?? 0;
  const pensionIncomes: IncomeItem[] = [
    { label: "公的年金（本人）", monthly: myPension, color: "#10b981" },
    ...(spousePension > 0 ? [{ label: "公的年金（配偶者）", monthly: spousePension, color: "#34d399" }] : []),
    { label: "就労収入", monthly: postWorkMonthly, color: "#f59e0b" },
    { label: "企業年金", monthly: corpPensionMonthly, color: "#a78bfa" },
  ];

  // Expenses from yearlyData (monthly)
  function getExpenses(row: YearlyData | undefined): ExpenseItem[] {
    if (!row) return [];
    return [
      { label: "生活費", monthly: row.livingExpense / 12, color: "#6b7280" },
      { label: "住居費", monthly: row.housingCost / 12, color: "#60a5fa" },
      { label: "医療費", monthly: row.medicalCost / 12, color: "#f87171" },
      { label: "保険料", monthly: (input.lifeInsurancePremiumMonthly ?? 0), color: "#fb923c" },
    ];
  }

  // Income sources pie-like summary
  const totalPensionMonthly = myPension + spousePension + corpPensionMonthly;
  const totalPensionAnnual = totalPensionMonthly * 12;
  const livingExpenseAtRetirement = (input.monthlyLivingExpense ?? 20) * 12 * inflFactor;
  const pensionCoverageRate = livingExpenseAtRetirement > 0
    ? Math.min(100, Math.round((totalPensionAnnual / livingExpenseAtRetirement) * 100))
    : 0;

  // Asset longevity estimate (if unsafe)
  const retirementAssetBase = result.retirementAssets;
  const annualCFAtRetirement = retRow ? (retRow.income + retRow.spouseIncome - retRow.totalExpense) : 0;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <h3 className="font-semibold text-foreground">老後の月次収支イメージ</h3>
        <p className="text-sm text-muted-foreground mt-0.5">退職後の毎月のお金の流れを収入源・支出別に確認できます</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Pension coverage summary */}
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[160px]">
              <div className="text-xs text-muted-foreground mb-1">年金が生活費をカバーする割合</div>
              <div className="flex items-end gap-2">
                <span className={cn(
                  "text-3xl font-black",
                  pensionCoverageRate >= 80 ? "text-emerald-600" : pensionCoverageRate >= 50 ? "text-amber-600" : "text-red-500"
                )}>
                  {pensionCoverageRate}%
                </span>
                <span className="text-xs text-muted-foreground mb-1">（退職時の生活費ベース）</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>世帯年金月額</span>
              <span className="font-semibold text-foreground text-right">{totalPensionMonthly.toFixed(1)}万円/月</span>
              <span>退職時の生活費（月額）</span>
              <span className="font-semibold text-foreground text-right">{Math.round(livingExpenseAtRetirement / 12).toLocaleString()}万円/月</span>
              <span>退職時点の総資産</span>
              <span className="font-semibold text-foreground text-right">{fmt(retirementAssetBase)}</span>
            </div>
          </div>
          {pensionCoverageRate < 70 && (
            <div className="mt-3 text-xs text-amber-800 bg-amber-100 rounded-lg px-3 py-2">
              年金だけでは生活費の{pensionCoverageRate}%しかカバーできません。残りの{100 - pensionCoverageRate}%は資産の取り崩しや就労収入で補う必要があります。
            </div>
          )}
        </div>

        {/* Monthly cash flow cards */}
        <div className={cn(
          "grid gap-4",
          retirementAge < pensionAge ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-md"
        )}>
          {retirementAge < pensionAge && (
            <MonthlyBreakdown
              title={`退職直後（${retirementAge}〜${pensionAge - 1}歳）`}
              subtitle="公的年金受給前の期間"
              incomes={retIncomes}
              expenses={getExpenses(retRow)}
              bg="bg-blue-50/50"
              border="border-blue-200"
            />
          )}
          <MonthlyBreakdown
            title={`年金受給後（${pensionAge}歳〜）`}
            subtitle="公的年金 + その他収入"
            incomes={pensionIncomes}
            expenses={getExpenses(pensionRow)}
            bg="bg-emerald-50/50"
            border="border-emerald-200"
          />
        </div>

        {/* Income source breakdown */}
        <div>
          <div className="text-sm font-semibold text-foreground mb-3">老後の収入源の内訳</div>
          <div className="space-y-2">
            {[
              { label: "公的年金（本人）", value: myPension, max: totalPensionMonthly + postWorkMonthly, color: "bg-emerald-500" },
              ...(spousePension > 0 ? [{ label: "公的年金（配偶者）", value: spousePension, max: totalPensionMonthly + postWorkMonthly, color: "bg-emerald-300" }] : []),
              ...(corpPensionMonthly > 0 ? [{ label: "企業年金", value: corpPensionMonthly, max: totalPensionMonthly + postWorkMonthly, color: "bg-violet-400" }] : []),
              ...(postWorkMonthly > 0 ? [{ label: "老後就労収入", value: postWorkMonthly, max: totalPensionMonthly + postWorkMonthly, color: "bg-amber-400" }] : []),
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.value.toFixed(1)}万円/月</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", item.color)}
                    style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
