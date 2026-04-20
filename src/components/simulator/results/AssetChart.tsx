"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { YearlyData } from "@/lib/simulation/types";

export interface ChartAnnotation {
  age: number;
  label: string;
  color?: string;
}

interface Props {
  data: YearlyData[];
  retirementAge: number;
  annotations?: ChartAnnotation[];
  spouseAgeDiff?: number; // spouseAge - mainAge
  currentAge?: number;
}

function formatManYen(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}億円`;
  }
  return `${Math.round(value).toLocaleString("ja-JP")}万円`;
}

function formatYAxis(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}千万`;
  return `${v}万`;
}

interface CustomTooltipProps {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string | number;
  spouseAgeDiff?: number;
}

function CustomTooltip({ active, payload, label, spouseAgeDiff }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || label == null) return null;
  const numLabel = typeof label === "number" ? label : Number(label);
  const spouseAge = spouseAgeDiff != null ? numLabel + spouseAgeDiff : null;

  const items = payload.filter((p) => p.value != null);

  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-sm min-w-[190px]">
      <div className="font-bold text-foreground mb-0.5">{numLabel}歳</div>
      {spouseAge != null && (
        <div className="text-xs text-muted-foreground mb-2">配偶者: {spouseAge}歳</div>
      )}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.dataKey} className="flex justify-between gap-3">
            <span style={{ color: item.color }} className="font-medium text-xs">
              {item.name}
            </span>
            <span className={`font-semibold text-xs ${item.value < 0 ? "text-red-500" : ""}`}>
              {formatManYen(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Find minimum value for domain
function calcDomain(data: { 総資産: number }[]): [number, number] {
  const min = Math.min(...data.map((d) => d.総資産));
  const max = Math.max(...data.map((d) => d.総資産));
  const padding = (max - min) * 0.1;
  return [Math.floor((min - padding) / 100) * 100, Math.ceil((max + padding) / 100) * 100];
}

export function AssetChart({ data, retirementAge, annotations = [], spouseAgeDiff, currentAge }: Props) {
  const chartData = data.map((d) => ({
    age: d.age,
    貯蓄資産: Math.max(0, Math.round(d.savingsAssets)),
    投資資産: Math.max(0, Math.round(d.investmentAssets)),
    総資産: Math.round(d.cumulativeAssets),
  }));

  const [yMin, yMax] = calcDomain(chartData);
  const hasNegative = yMin < 0;

  // Sort annotations by age to reduce label overlap; alternate position
  const sortedAnnotations = [...annotations].sort((a, b) => a.age - b.age);

  const positions = ["top", "insideTopLeft", "insideTopRight", "top"] as const;

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 16, right: 40, left: 10, bottom: 4 }}
        >
          <defs>
            <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.30} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" vertical={false} />

          <XAxis
            dataKey="age"
            tickFormatter={(v) => `${v}歳`}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#fde68a" }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                spouseAgeDiff={spouseAgeDiff}
              />
            )}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs font-medium">{value}</span>
            )}
            iconType="circle"
            iconSize={8}
          />

          {/* Zero line when chart goes negative */}
          {hasNegative && (
            <ReferenceLine
              y={0}
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={{
                value: "0",
                position: "right",
                fontSize: 10,
                fill: "#94a3b8",
              }}
            />
          )}

          {/* Retirement line */}
          <ReferenceLine
            x={retirementAge}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            label={{
              value: "退職",
              position: "insideTopLeft",
              fontSize: 10,
              fill: "#d97706",
              fontWeight: 600,
              offset: 4,
            }}
          />

          {/* Family & life event annotations */}
          {sortedAnnotations.map((ann, i) => (
            <ReferenceLine
              key={`${ann.age}-${ann.label}`}
              x={ann.age}
              stroke={ann.color ?? "#94a3b8"}
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: ann.label,
                position: i % 2 === 0 ? "insideTopLeft" : "insideTopRight",
                fontSize: 9,
                fill: ann.color ?? "#64748b",
                fontWeight: 500,
              }}
            />
          ))}

          {/* Stacked areas: positive breakdown */}
          <Area
            type="monotone"
            dataKey="貯蓄資産"
            stackId="1"
            stroke="#d97706"
            strokeWidth={1.5}
            fill="url(#colorSavings)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="投資資産"
            stackId="1"
            stroke="#0d9488"
            strokeWidth={1.5}
            fill="url(#colorInvestment)"
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Total asset line — shows true trajectory including negatives */}
          <Line
            type="monotone"
            dataKey="総資産"
            stroke="#1e40af"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#1e40af" }}
            strokeDasharray={hasNegative ? "none" : "none"}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
