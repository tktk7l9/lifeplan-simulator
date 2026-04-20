"use client";

import { useState, useEffect } from "react";
import type { SensitivityDataPoint } from "@/lib/simulation/types";

interface Props {
  data: SensitivityDataPoint[];
  base: number;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億円`;
  return `${Math.round(v).toLocaleString("ja-JP")}万円`;
}

function fmtDelta(v: number): string {
  const prefix = v > 0 ? "+" : "";
  if (Math.abs(v) >= 10000) return `${prefix}${(v / 10000).toFixed(1)}億円`;
  return `${prefix}${Math.round(v).toLocaleString("ja-JP")}万円`;
}

// Per-parameter scenario descriptions
const PARAM_INFO: Record<string, {
  range: string;
  lowScenario: string;
  highScenario: string;
}> = {
  annualIncome: {
    range: "±20%",
    lowScenario: "年収が現在より20%減った場合",
    highScenario: "年収が現在より20%増えた場合",
  },
  investmentReturnRate: {
    range: "±2%pt",
    lowScenario: "投資利回りが2%低下した場合",
    highScenario: "投資利回りが2%上昇した場合",
  },
  monthlyLivingExpense: {
    range: "±20%",
    lowScenario: "生活費が現在より20%減った場合",
    highScenario: "生活費が現在より20%増えた場合",
  },
  inflationRate: {
    range: "±1%pt",
    lowScenario: "物価上昇率が1%低下した場合",
    highScenario: "物価上昇率が1%上昇した場合",
  },
  retirementAge: {
    range: "±5年",
    lowScenario: "5年早く退職した場合",
    highScenario: "5年遅く退職した場合",
  },
  postRetirementIncome: {
    range: "0〜2倍",
    lowScenario: "老後の就労収入がゼロになった場合",
    highScenario: "老後の就労収入が2倍になった場合",
  },
};

export function SensitivityAnalysis({ data, base }: Props) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  if (!isClient) return null;

  const items = data.map((d) => {
    const lowDelta = Math.round(d.low - base);
    const highDelta = Math.round(d.high - base);
    // Better scenario = whichever gives higher assets
    const betterIsHigh = highDelta >= lowDelta;
    const betterDelta = betterIsHigh ? highDelta : lowDelta;
    const worseDelta = betterIsHigh ? lowDelta : highDelta;
    const info = PARAM_INFO[d.parameter] ?? {
      range: "",
      lowScenario: "低いケース",
      highScenario: "高いケース",
    };
    return {
      label: d.label,
      parameter: d.parameter,
      info,
      betterIsHigh,
      betterDelta,
      worseDelta,
      lowDelta,
      highDelta,
      lowAbs: Math.round(d.low),
      highAbs: Math.round(d.high),
      impact: Math.abs(betterDelta) + Math.abs(worseDelta),
    };
  });

  // Already sorted by impact from server, but normalize bar widths
  const maxAbsDelta = Math.max(...items.flatMap((d) => [Math.abs(d.betterDelta), Math.abs(d.worseDelta)]), 1);

  const topItem = items[0];

  return (
    <div className="space-y-5">
      {/* Top insight */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <div className="text-xs font-semibold text-amber-700 mb-0.5">最も影響が大きい要素</div>
        <div className="text-sm text-amber-900">
          <span className="font-bold">{topItem.label}</span> を変えると
          100歳時の資産が最大 <span className="font-bold">{fmt(topItem.impact)}</span> 変わります
          <span className="text-amber-700 ml-1">（変化幅: {topItem.info.range}）</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">
        各パラメータを変化させた場合に、100歳時の資産が基準値
        （<span className="font-semibold text-foreground">{fmt(base)}</span>）
        からどれだけ増減するかを示します。バーが長いほど影響が大きいことを意味します。
      </p>

      {/* Bars */}
      <div className="space-y-6">
        {items.map((d, rank) => {
          const worsePct = (Math.abs(d.worseDelta) / maxAbsDelta) * 46; // max 46% per side (leave room for labels)
          const betterPct = (Math.abs(d.betterDelta) / maxAbsDelta) * 46;
          const betterScenario = d.betterIsHigh ? d.info.highScenario : d.info.lowScenario;
          const worseScenario = d.betterIsHigh ? d.info.lowScenario : d.info.highScenario;

          return (
            <div key={d.label}>
              {/* Row header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {rank + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{d.label}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">（変化幅: {d.info.range}）</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  影響幅 <span className="font-bold text-foreground">{fmt(d.impact)}</span>
                </span>
              </div>

              {/* Bidirectional bar */}
              <div className="relative h-8 bg-muted/20 rounded-md overflow-hidden">
                {/* Center baseline */}
                <div className="absolute left-1/2 top-0 h-full w-px bg-border z-10" />
                {/* Worse bar (left, red) */}
                <div
                  className="absolute right-1/2 top-1.5 bottom-1.5 bg-red-400 rounded-l-sm"
                  style={{ width: `${worsePct}%` }}
                />
                {/* Better bar (right, green) */}
                <div
                  className="absolute left-1/2 top-1.5 bottom-1.5 bg-emerald-400 rounded-r-sm"
                  style={{ width: `${betterPct}%` }}
                />
                {/* Delta labels inside/outside */}
                <div className="absolute right-1/2 inset-y-0 flex items-center justify-end pr-2 pointer-events-none">
                  <span className="text-[11px] font-bold text-red-600 bg-white/80 rounded px-0.5 leading-tight">
                    {fmtDelta(d.worseDelta)}
                  </span>
                </div>
                <div className="absolute left-1/2 inset-y-0 flex items-center pl-2 pointer-events-none">
                  <span className="text-[11px] font-bold text-emerald-600 bg-white/80 rounded px-0.5 leading-tight">
                    {fmtDelta(d.betterDelta)}
                  </span>
                </div>
              </div>

              {/* Scenario labels */}
              <div className="flex justify-between text-[11px] mt-1 px-0.5">
                <span className="text-red-500 flex items-center gap-1">
                  <span>←</span>
                  <span className="text-muted-foreground">{worseScenario}</span>
                </span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <span className="text-muted-foreground">{betterScenario}</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-emerald-400" />
          <span>資産が増えるシナリオ（有利）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-red-400" />
          <span>資産が減るシナリオ（不利）</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ※ 各パラメータを独立して変化させた単変量分析です。複数の要因が同時に動く実際の将来とは異なります。数値はすべて100歳時点の資産額への影響です。
      </p>
    </div>
  );
}
