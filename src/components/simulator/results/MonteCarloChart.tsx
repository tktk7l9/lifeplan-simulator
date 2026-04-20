"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { MonteCarloDataPoint } from "@/lib/simulation/types";

interface Props {
  data: MonteCarloDataPoint[];
  retirementAge: number;
  failureProbability: number;
}

function fmt(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億円`;
  return `${Math.round(v).toLocaleString("ja-JP")}万円`;
}

function fmtAxis(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億`;
  return `${v}万`;
}

interface ChartPoint {
  age: number;
  // stacked bands
  p10: number;
  inner25: number;
  inner50band: number;
  outerBand: number;
  // median line
  p50: number;
  // raw values for tooltip
  _p10: number;
  _p25: number;
  _p75: number;
  _p90: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-border rounded-lg p-3 shadow-lg text-xs min-w-[200px] space-y-1">
      <div className="font-bold text-foreground pb-1 border-b border-border">{label}歳時点の資産</div>
      <div className="flex justify-between gap-6">
        <span className="text-amber-600">楽観的（90%ile）</span>
        <span className="font-semibold text-amber-600">{fmt(d._p90)}</span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-muted-foreground">やや有利（75%ile）</span>
        <span className="font-medium">{fmt(d._p75)}</span>
      </div>
      <div className="flex justify-between gap-6 bg-muted/30 rounded px-1">
        <span className="text-foreground font-bold">中央値（50%ile）</span>
        <span className="font-bold text-foreground">{fmt(d.p50)}</span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-muted-foreground">やや不利（25%ile）</span>
        <span className="font-medium">{fmt(d._p25)}</span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-red-500">悲観的（10%ile）</span>
        <span className="font-semibold text-red-500">{fmt(d._p10)}</span>
      </div>
    </div>
  );
}

export function MonteCarloChart({ data, retirementAge, failureProbability }: Props) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  if (!isClient) return null;

  const chartData: ChartPoint[] = data.filter((_, i) => i % 2 === 0).map((d) => ({
    age: d.age,
    p10: Math.max(0, d.p10),
    inner25: Math.max(0, d.p25 - d.p10),
    inner50band: Math.max(0, d.p75 - d.p25),
    outerBand: Math.max(0, d.p90 - d.p75),
    p50: d.p50,
    _p10: d.p10,
    _p25: d.p25,
    _p75: d.p75,
    _p90: d.p90,
  }));

  const successProbability = 100 - failureProbability;
  const safeColor = successProbability >= 90 ? "#10b981" : successProbability >= 70 ? "#f59e0b" : "#ef4444";
  const safeBg = successProbability >= 90
    ? "bg-emerald-50 border-emerald-200"
    : successProbability >= 70
    ? "bg-amber-50 border-amber-200"
    : "bg-red-50 border-red-200";
  const safeLabel = successProbability >= 90
    ? "低リスク — ほぼ安心です"
    : successProbability >= 70
    ? "中リスク — 対策を検討しましょう"
    : "高リスク — 見直しが必要です";

  // Key stats at retirement and age 90
  const retPt = data.find((d) => d.age >= retirementAge) ?? data[Math.floor(data.length / 2)];
  const pt90 = data.find((d) => d.age >= 90) ?? data[data.length - 1];

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className={`rounded-xl border p-4 flex items-start gap-4 ${safeBg}`}>
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <div className="text-4xl font-black leading-none" style={{ color: safeColor }}>
            {successProbability}%
          </div>
          <div className="text-[11px] font-semibold mt-1" style={{ color: safeColor }}>
            生存確率
          </div>
        </div>
        <div>
          <div className="font-bold text-sm text-foreground mb-1">
            90歳まで資産が持続する確率: <span style={{ color: safeColor }}>{successProbability}%</span>
          </div>
          <div className="text-xs text-muted-foreground">{safeLabel}</div>
          <div className="text-xs text-muted-foreground mt-1">
            投資リターンをランダムに変動させた <span className="font-semibold">400回</span> の試行のうち、
            90歳時点で資産が残っていたのは <span className="font-semibold">{successProbability}%</span> でした。
          </div>
        </div>
      </div>

      {/* Key age stats table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 bg-muted/30 border-b border-border">
          <span className="text-xs font-semibold text-foreground">重要時点の資産予測</span>
          <span className="text-xs text-muted-foreground ml-2">（単位: 万円 / 億円）</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center min-w-[500px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">時点</th>
                <th className="px-3 py-2 font-semibold text-red-500">
                  悲観的<br />
                  <span className="font-normal text-muted-foreground">（10%ile）</span>
                </th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  やや不利<br />
                  <span className="font-normal">（25%ile）</span>
                </th>
                <th className="px-3 py-2 font-bold text-foreground">
                  中央値<br />
                  <span className="font-normal text-muted-foreground">（50%ile）</span>
                </th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  やや有利<br />
                  <span className="font-normal">（75%ile）</span>
                </th>
                <th className="px-3 py-2 font-semibold text-amber-600">
                  楽観的<br />
                  <span className="font-normal text-muted-foreground">（90%ile）</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50 bg-amber-50/30">
                <td className="px-3 py-2.5 text-left font-semibold text-foreground">退職時（{retPt.age}歳）</td>
                <td className="px-3 py-2.5 font-medium text-red-500">{fmt(retPt.p10)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmt(retPt.p25)}</td>
                <td className="px-3 py-2.5 font-bold text-foreground">{fmt(retPt.p50)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmt(retPt.p75)}</td>
                <td className="px-3 py-2.5 font-medium text-amber-600">{fmt(retPt.p90)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 text-left font-semibold text-foreground">90歳時</td>
                <td className="px-3 py-2.5 font-medium text-red-500">{fmt(pt90.p10)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmt(pt90.p25)}</td>
                <td className="px-3 py-2.5 font-bold text-foreground">{fmt(pt90.p50)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmt(pt90.p75)}</td>
                <td className="px-3 py-2.5 font-medium text-amber-600">{fmt(pt90.p90)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-3 rounded" style={{ background: "rgba(217,119,6,0.20)" }} />
          <span>10〜90%ile帯（広い不確実性の範囲）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-3 rounded" style={{ background: "rgba(217,119,6,0.40)" }} />
          <span>25〜75%ile帯（典型的な結果の範囲）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-0.5 bg-amber-600" />
          <span>中央値（最も代表的な結果）</span>
        </div>
      </div>

      {/* Fan chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}歳`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={fmtAxis}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={retirementAge}
            stroke="#d97706"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: "退職", position: "top", fontSize: 10, fill: "#d97706" }}
          />
          {/* Stacked fan bands */}
          <Area type="monotone" dataKey="p10" stackId="fan" stroke="none" fill="transparent" />
          <Area type="monotone" dataKey="inner25" stackId="fan" stroke="none" fill="rgba(217,119,6,0.15)" />
          <Area type="monotone" dataKey="inner50band" stackId="fan" stroke="none" fill="rgba(217,119,6,0.30)" />
          <Area type="monotone" dataKey="outerBand" stackId="fan" stroke="none" fill="rgba(217,119,6,0.15)" />
          {/* Median line */}
          <Area type="monotone" dataKey="p50" stroke="#d97706" strokeWidth={2} fill="none" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-xs text-muted-foreground">
        ※ パーセンタイルとは: 400回の試行を資産額で並べたときの位置です。10%ileは「400回中40回が下回る悲観的な結果」、50%ileは「ちょうど真ん中の最も代表的な結果」を意味します。収入・支出は基準シナリオと同一で、投資リターンのみ確率的に変動させています。
      </p>
    </div>
  );
}
