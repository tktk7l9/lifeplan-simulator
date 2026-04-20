"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import type { AIEvaluation, AIRank } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";

const RANK_CONFIG: Record<AIRank, { label: string; color: string; bg: string; border: string; ring: string }> = {
  S: { label: "S", color: "text-yellow-700", bg: "bg-gradient-to-br from-yellow-400 to-amber-500", border: "border-yellow-300", ring: "ring-yellow-200" },
  A: { label: "A", color: "text-amber-700", bg: "bg-gradient-to-br from-amber-500 to-amber-600", border: "border-amber-300", ring: "ring-amber-200" },
  B: { label: "B", color: "text-emerald-700", bg: "bg-gradient-to-br from-emerald-400 to-emerald-600", border: "border-emerald-300", ring: "ring-emerald-200" },
  C: { label: "C", color: "text-sky-700", bg: "bg-gradient-to-br from-sky-400 to-sky-500", border: "border-sky-300", ring: "ring-sky-200" },
  D: { label: "D", color: "text-orange-700", bg: "bg-gradient-to-br from-orange-400 to-orange-500", border: "border-orange-300", ring: "ring-orange-200" },
  F: { label: "F", color: "text-red-700", bg: "bg-gradient-to-br from-red-500 to-red-600", border: "border-red-300", ring: "ring-red-200" },
};

function ScoreCircle({ score, rank }: { score: number; rank: AIRank }) {
  const config = RANK_CONFIG[rank];
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-1000",
              rank === "S" && "stroke-amber-400",
              rank === "A" && "stroke-amber-500",
              rank === "B" && "stroke-emerald-500",
              rank === "C" && "stroke-sky-500",
              rank === "D" && "stroke-orange-400",
              rank === "F" && "stroke-red-500",
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg ring-4",
        config.bg,
        config.ring,
      )}>
        {rank}
      </div>
      <div className="text-sm font-semibold text-muted-foreground">総合評価ランク</div>
    </div>
  );
}

export function AIEvaluationCard() {
  const { input, result, setAiEvaluation, aiEvaluation } = useSimulationStore();
  const [evaluation, setEvaluation] = useState<AIEvaluation | null>(aiEvaluation);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEvaluate() {
    if (!result || !input) return;
    setIsLoading(true);
    setError(null);

    try {
      const fullInput = {
        age: input.age ?? 30,
        retirementAge: input.retirementAge ?? 65,
        gender: input.gender ?? "male",
        hasSpouse: input.hasSpouse ?? false,
        spouseAge: input.spouseAge ?? 30,
        children: input.children ?? [],
        annualIncome: input.annualIncome ?? 500,
        incomeGrowthRate: input.incomeGrowthRate ?? 2,
        spouseAnnualIncome: input.spouseAnnualIncome ?? 0,
        spouseIncomeGrowthRate: input.spouseIncomeGrowthRate ?? 1,
        monthlyLivingExpense: input.monthlyLivingExpense ?? 20,
        monthlyRent: input.monthlyRent ?? 10,
        housingType: input.housingType ?? "rent",
        purchaseAge: input.purchaseAge ?? 35,
        propertyPrice: input.propertyPrice ?? 4000,
        downPayment: input.downPayment ?? 400,
        mortgageRate: input.mortgageRate ?? 1.0,
        mortgagePeriod: input.mortgagePeriod ?? 35,
        lifeEvents: input.lifeEvents ?? [],
        currentSavings: input.currentSavings ?? 200,
        currentInvestmentAssets: input.currentInvestmentAssets ?? 0,
        monthlyInvestment: input.monthlyInvestment ?? 3,
        investmentReturnRate: input.investmentReturnRate ?? 5,
        nisaAccumulationMonthly: input.nisaAccumulationMonthly ?? 0,
        nisaGrowthMonthly: input.nisaGrowthMonthly ?? 0,
        nisaProductId: input.nisaProductId ?? "allworld",
        nisaReturnRate: input.nisaReturnRate ?? 6.5,
        monthlyIdeco: input.monthlyIdeco ?? 0,
        idecoProductId: input.idecoProductId ?? "allworld",
        idecoReturnRate: input.idecoReturnRate ?? 6.5,
        shokiboKigyoMonthly: input.shokiboKigyoMonthly ?? 0,
      };

      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: fullInput, result }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "評価の取得に失敗しました");
      }

      const data: AIEvaluation = await res.json();
      setEvaluation(data);
      setAiEvaluation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  if (!evaluation && !isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">
            🤖
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-lg mb-1">AI総評</h3>
            <p className="text-sm text-muted-foreground mb-4">
              あなたのライフプランをFPの視点でAIが総合評価します。スコア（0〜100）とランク（S〜F）、改善アドバイスをお届けします。
            </p>
            {error && (
              <div className="mb-3 text-sm text-destructive bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              onClick={handleEvaluate}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl px-5 py-2.5 transition-all hover:scale-105 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M12 8v4l3 3" />
              </svg>
              AI総評を取得する
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-xl">🤖</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-foreground mb-1">AIが分析中...</div>
            <div className="text-sm text-muted-foreground">ライフプランを総合評価しています</div>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!evaluation) return null;

  const config = RANK_CONFIG[evaluation.rank];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold text-white text-lg">AI総評</h3>
            <p className="text-amber-200 text-xs">FPの視点による総合評価</p>
          </div>
        </div>
        <button
          onClick={() => { setEvaluation(null); setAiEvaluation(null); setError(null); }}
          className="text-amber-200 hover:text-white text-xs underline transition-colors"
        >
          再評価
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Score + Rank */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreCircle score={evaluation.score} rank={evaluation.rank} />
          <div className="flex-1 space-y-3">
            <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border", config.border, config.color, "bg-white")}>
              <span>総合ランク: {evaluation.rank}ランク</span>
            </div>
            <p className="text-foreground text-sm leading-relaxed">{evaluation.summary}</p>
          </div>
        </div>

        {/* Strengths */}
        <div>
          <h4 className="font-semibold text-emerald-700 text-sm flex items-center gap-2 mb-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs">✓</span>
            優れている点
          </h4>
          <ul className="space-y-2">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs text-emerald-600 font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div>
          <h4 className="font-semibold text-amber-700 text-sm flex items-center gap-2 mb-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">!</span>
            改善ポイント
          </h4>
          <ul className="space-y-2">
            {evaluation.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-xs text-amber-600 font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Conclusion */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">💬</span>
            <p className="text-sm text-amber-900 leading-relaxed">{evaluation.conclusion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
