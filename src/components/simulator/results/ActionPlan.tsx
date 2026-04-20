"use client";

import { useMemo } from "react";
import { runSimulation } from "@/lib/simulation/calculator";
import type { SimulationResult, SimulationInput } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";

interface Props {
  result: SimulationResult;
  input: Partial<SimulationInput>;
}

interface Action {
  id: string;
  priority: "高" | "中" | "低";
  icon: string;
  title: string;
  description: string;
  impact?: string;
  impactColor?: string;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億円`;
  return `${Math.round(Math.abs(v)).toLocaleString("ja-JP")}万円`;
}

function safeRun(input: SimulationInput): number | null {
  try { return runSimulation(input).finalAssets; } catch { return null; }
}

const PRIORITY_STYLE: Record<"高" | "中" | "低", string> = {
  高: "bg-red-100 text-red-700 border-red-200",
  中: "bg-amber-100 text-amber-700 border-amber-200",
  低: "bg-blue-100 text-blue-700 border-blue-200",
};

export function ActionPlan({ result, input }: Props) {
  const actions = useMemo<Action[]>(() => {
    const full = input as SimulationInput;
    const base = result.finalAssets;
    const retAge = input.retirementAge ?? 65;
    const curAge = input.age ?? 30;
    const yearsToRet = Math.max(1, retAge - curAge);
    const list: Action[] = [];

    // ── 1. 緊急資金チェック ─────────────────────────────────────────────────
    const monthlyExpense = input.monthlyLivingExpense ?? 20;
    const emergencyTarget = monthlyExpense * 6;
    const savings = input.currentSavings ?? 0;
    if (savings < emergencyTarget) {
      list.push({
        id: "emergency",
        priority: "高",
        icon: "🛡️",
        title: "緊急資金を6ヶ月分確保する",
        description: `現在の貯蓄（${Math.round(savings).toLocaleString()}万円）は生活費6ヶ月分の目安（${Math.round(emergencyTarget).toLocaleString()}万円）を下回っています。まず${Math.round(emergencyTarget - savings).toLocaleString()}万円の緊急資金を現金で確保してから投資を始めましょう。`,
        impact: "リスク管理の基盤",
        impactColor: "text-red-600",
      });
    }

    // ── 2. NISA 積立枠の活用チェック ──────────────────────────────────────
    const nisaUsed = (input.nisaAccumulationMonthly ?? 0) + (input.nisaGrowthMonthly ?? 0);
    const NISA_ACCUM_MAX = 10; // 新NISA積立枠 月10万円
    if (nisaUsed < NISA_ACCUM_MAX) {
      const addNisa = Math.min(3, NISA_ACCUM_MAX - nisaUsed);
      const after = safeRun({ ...full, nisaAccumulationMonthly: (input.nisaAccumulationMonthly ?? 0) + addNisa });
      const delta = after != null ? after - base : null;
      list.push({
        id: "nisa",
        priority: "高",
        icon: "📈",
        title: `NISA積立枠を月${addNisa}万円増やす`,
        description: `現在のNISA利用額は月${nisaUsed}万円。新NISAの積立枠は月10万円（年120万円）まで非課税で運用できます。利益に約20%かかる税金が0円になるため、長期投資の効果が大幅に向上します。`,
        impact: delta != null ? `100歳時の資産が約+${fmt(delta)}` : "非課税効果で資産増加",
        impactColor: "text-emerald-600",
      });
    }

    // ── 3. iDeCo 活用チェック ──────────────────────────────────────────────
    const idecoUsed = input.monthlyIdeco ?? 0;
    const empType = input.employmentType ?? "employee";
    const idecoMax = empType === "self_employed" || empType === "freelance" ? 6.8
      : empType === "civil_servant" ? 1.2 : 2.3;

    if (idecoUsed < idecoMax && curAge < 60) {
      const addIdeco = Math.min(idecoMax - idecoUsed, 1);
      const after = safeRun({ ...full, monthlyIdeco: idecoUsed + addIdeco });
      const delta = after != null ? after - base : null;
      list.push({
        id: "ideco",
        priority: "中",
        icon: "💰",
        title: `iDeCoを月${addIdeco.toFixed(1)}万円増額する`,
        description: `iDeCoは掛金が全額所得控除になるため、所得税・住民税が軽減されます。現在の掛金（月${idecoUsed}万円）から増額可能な上限は月${idecoMax}万円です。節税効果と運用益が同時に得られます。`,
        impact: delta != null ? `100歳時の資産が約+${fmt(delta)}` : "所得控除で節税+資産形成",
        impactColor: "text-emerald-600",
      });
    }

    // ── 4. 月次投資額の増加効果 ─────────────────────────────────────────────
    if (yearsToRet >= 5) {
      const ADD = 1; // 月1万円追加
      const after = safeRun({ ...full, monthlyInvestment: (input.monthlyInvestment ?? 0) + ADD });
      const delta = after != null ? after - base : null;
      if (delta != null && delta > 0) {
        list.push({
          id: "invest",
          priority: "中",
          icon: "🌱",
          title: "月1万円だけ投資額を増やす",
          description: `毎月の投資額を1万円増やすだけで、複利効果により退職時の資産は大きく変わります。コーヒー代やサブスク1本を見直すだけで実現できる改善です。`,
          impact: `100歳時の資産が約+${fmt(delta)}`,
          impactColor: "text-emerald-600",
        });
      }
    }

    // ── 5. 退職時期の延長効果 ──────────────────────────────────────────────
    const DELAY = 3;
    if (!result.isRetirementSafe && retAge < 70 && curAge < retAge) {
      const after = safeRun({ ...full, retirementAge: retAge + DELAY });
      const delta = after != null ? after - base : null;
      list.push({
        id: "retire-delay",
        priority: "高",
        icon: "⏳",
        title: `退職を${DELAY}年遅らせることを検討する`,
        description: `現在のシミュレーションでは100歳まで資産が持続しないリスクがあります。退職を${DELAY}年遅らせると、収入期間が延び・支出期間が短縮され・投資の複利期間も伸びる三重のメリットがあります。`,
        impact: delta != null ? `100歳時の資産が約+${fmt(delta)}` : "資産枯渇リスクを大幅軽減",
        impactColor: "text-emerald-600",
      });
    }

    // ── 6. 老後就労収入の追加 ──────────────────────────────────────────────
    const postWork = input.postRetirementIncomeMonthly ?? 0;
    if (postWork < 5 && retAge < 70) {
      const ADD_WORK = 5;
      const untilAge = Math.min(75, retAge + 10);
      const after = safeRun({
        ...full,
        postRetirementIncomeMonthly: postWork + ADD_WORK,
        postRetirementIncomeUntilAge: Math.max(input.postRetirementIncomeUntilAge ?? 70, untilAge),
      });
      const delta = after != null ? after - base : null;
      list.push({
        id: "post-work",
        priority: result.isRetirementSafe ? "低" : "中",
        icon: "👣",
        title: `退職後も月${ADD_WORK}万円の就労収入を得る`,
        description: `フリーランス・パート・コンサルティングなど、週2〜3日程度の軽い就労で月${ADD_WORK}万円の収入を確保すると、資産の取り崩しを大幅に遅らせることができます。健康面・社会参加の面でもメリットがあります。`,
        impact: delta != null ? `100歳時の資産が約+${fmt(delta)}` : "資産取り崩しを先延ばし",
        impactColor: "text-emerald-600",
      });
    }

    // ── 7. 生活費の最適化 ──────────────────────────────────────────────────
    if (monthlyExpense >= 30) {
      const CUT = 2;
      const after = safeRun({ ...full, monthlyLivingExpense: monthlyExpense - CUT });
      const delta = after != null ? after - base : null;
      if (delta != null && delta > 0) {
        list.push({
          id: "expense",
          priority: "低",
          icon: "✂️",
          title: `月${CUT}万円の生活費削減を試みる`,
          description: `固定費（通信費・保険・サブスク）の見直しや食費の工夫で月${CUT}万円の削減は十分達成可能です。少額に思えても長期では大きな効果があります。`,
          impact: delta != null ? `100歳時の資産が約+${fmt(delta)}` : "支出削減で資産改善",
          impactColor: "text-emerald-600",
        });
      }
    }

    // Sort by priority
    const pOrder = { 高: 0, 中: 1, 低: 2 };
    return list.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]).slice(0, 6);
  }, [result, input]);

  if (!actions.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <h3 className="font-semibold text-foreground">今すぐできるアクションプラン</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          あなたのシミュレーション結果をもとに、効果の高い改善策を優先順に提案します
        </p>
      </div>

      <div className="divide-y divide-border">
        {actions.map((action, idx) => (
          <div key={action.id} className="px-6 py-4 flex gap-4 hover:bg-muted/20 transition-colors">
            {/* Number + priority */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-0.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {idx + 1}
              </div>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap",
                PRIORITY_STYLE[action.priority]
              )}>
                {action.priority}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-lg leading-none mt-0.5">{action.icon}</span>
                <span className="font-semibold text-foreground text-sm leading-snug">{action.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {action.description}
              </p>
              {action.impact && (
                <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-lg px-2.5 py-1 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 flex-shrink-0">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                  <span className={cn("font-semibold", action.impactColor ?? "text-foreground")}>
                    {action.impact}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-3 bg-muted/20 border-t border-border text-xs text-muted-foreground">
        ※ 「100歳時の資産」の増加試算はその施策のみを変更した場合の概算です。税制優遇の効果（iDeCo節税等）は含まず、投資リターン・インフレ等の前提は現在の入力値と同一です。
      </div>
    </div>
  );
}
