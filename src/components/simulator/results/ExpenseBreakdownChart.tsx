"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import type { YearlyData } from "@/lib/simulation/types";

interface Props {
  data: YearlyData[];
  retirementAge: number;
}

const CATEGORIES = [
  { key: "生活費",   color: "#f59e0b" },
  { key: "住居費",   color: "#60a5fa" },
  { key: "教育費",   color: "#a78bfa" },
  { key: "医療費",   color: "#f87171" },
  { key: "イベント費", color: "#34d399" },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

interface ChartRow {
  age: string;
  生活費: number;
  住居費: number;
  教育費: number;
  医療費: number;
  イベント費: number;
  _age: number;
}

interface TooltipItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-xs min-w-[170px]">
      <div className="font-bold text-foreground mb-2">{label}</div>
      {payload.map((p) => (
        p.value > 0 && (
          <div key={p.name} className="flex justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums">{Math.round(p.value).toLocaleString("ja-JP")}万円</span>
          </div>
        )
      ))}
      <div className="border-t border-border mt-1.5 pt-1.5 flex justify-between font-bold">
        <span>合計</span>
        <span>{Math.round(total).toLocaleString("ja-JP")}万円</span>
      </div>
    </div>
  );
}

export function ExpenseBreakdownChart({ data, retirementAge }: Props) {
  // Sample every 5 years
  const chartData: ChartRow[] = data
    .filter((d) => d.age % 5 === 0 || d.age === data[0]?.age)
    .map((d) => ({
      age: `${d.age}歳`,
      生活費: Math.round(d.livingExpense),
      住居費: Math.round(d.housingCost),
      教育費: Math.round(d.educationCost),
      医療費: Math.round(d.medicalCost),
      イベント費: Math.round(d.lifeEventCost),
      _age: d.age,
    }));

  // Find index of retirement age for reference line label
  const retirementLabel = chartData.find((d) => d._age >= retirementAge)?.age;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">支出内訳の変化</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          生活費・住居費・教育費・医療費などが年齢とともにどう変わるかを示します（5歳ごと）
        </p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c.color }} />
            <span>{c.key}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}万`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          {retirementLabel && (
            <ReferenceLine
              x={retirementLabel}
              stroke="#d97706"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: "退職", position: "top", fontSize: 10, fill: "#d97706" }}
            />
          )}
          {CATEGORIES.map((c) => (
            <Bar key={c.key} dataKey={c.key as CategoryKey} stackId="exp" fill={c.color} radius={c.key === "イベント費" ? [2, 2, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Insight callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {(() => {
          const edu = data.filter((d) => d.educationCost > 0);
          const eduPeak = edu.reduce((m, d) => d.educationCost > m.educationCost ? d : m, edu[0] ?? data[0]);
          const medPeak = data.reduce((m, d) => d.medicalCost > m.medicalCost ? d : m, data[0]);
          const housing = data.filter((d) => d.housingCost > 0);
          const housingTotal = housing.reduce((s, d) => s + d.housingCost, 0);
          return [
            edu.length > 0 && {
              icon: "🎓",
              label: "教育費のピーク",
              value: `${eduPeak?.age}歳頃 / 年${Math.round(eduPeak?.educationCost ?? 0).toLocaleString()}万円`,
              cls: "bg-violet-50 border-violet-200",
            },
            {
              icon: "🏥",
              label: "医療費のピーク",
              value: `${medPeak?.age}歳頃 / 年${Math.round(medPeak?.medicalCost ?? 0).toLocaleString()}万円`,
              cls: "bg-red-50 border-red-200",
            },
            housingTotal > 0 && {
              icon: "🏠",
              label: "住居費の生涯合計",
              value: `${Math.round(housingTotal).toLocaleString("ja-JP")}万円`,
              cls: "bg-blue-50 border-blue-200",
            },
          ].filter(Boolean);
        })().map((item, i) => item && (
          <div key={i} className={`rounded-lg border p-3 ${item.cls}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span>{item.icon}</span>
              <span className="font-semibold text-foreground">{item.label}</span>
            </div>
            <div className="text-muted-foreground">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
