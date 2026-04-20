"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { YearlyData } from "@/lib/simulation/types";

interface Props {
  data: YearlyData[];
  retirementAge: number;
}

function formatManYen(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")}万円`;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-sm min-w-[200px]">
      <div className="font-bold text-foreground mb-2">{label}歳</div>
      {payload.map((item) => (
        <div key={item.name} className="flex justify-between gap-4">
          <span style={{ color: item.color }} className="font-medium">
            {item.name}
          </span>
          <span className="font-semibold">{formatManYen(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowChart({ data, retirementAge }: Props) {
  // Sample every 5 years to avoid overcrowding
  const chartData = data
    .filter((d) => d.age % 5 === 0 || d.age === data[0]?.age)
    .map((d) => ({
      age: d.age,
      収入: Math.round(d.income + d.spouseIncome),
      支出: Math.round(d.totalExpense),
    }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
          barGap={2}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
          <XAxis
            dataKey="age"
            tickFormatter={(v) => `${v}歳`}
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => {
              if (v >= 1000) return `${Math.round(v / 100) / 10}千万`;
              return `${v}万`;
            }}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-sm font-medium">{value}</span>
            )}
          />
          <ReferenceLine
            x={retirementAge}
            stroke="#f59e0b"
            strokeDasharray="4 4"
          />
          <Bar dataKey="収入" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="支出" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
