"use client";

import { useMemo, Fragment } from "react";
import type { YearlyData, SimulationInput, LifeEventType } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";

interface Props {
  data: YearlyData[];
  input: Partial<SimulationInput>;
}

// ── Event badge definitions ───────────────────────────────────────────────

interface EventBadge {
  label: string;
  icon: string;
  cls: string; // Tailwind classes for the pill
}

const LIFE_EVENT_ICONS: Record<LifeEventType, string> = {
  wedding:    "💍",
  car:        "🚗",
  travel:     "✈️",
  baby:       "👶",
  caregiving: "🏥",
  other:      "📌",
};

function buildEventMap(input: Partial<SimulationInput>): Map<number, EventBadge[]> {
  const map = new Map<number, EventBadge[]>();

  function push(age: number, badge: EventBadge) {
    if (age == null || isNaN(age) || age < 0) return;
    const a = Math.round(age);
    if (!map.has(a)) map.set(a, []);
    map.get(a)!.push(badge);
  }

  const myAge = input.age ?? 0;

  // 住宅購入
  if (input.housingType === "buy" && input.purchaseAge) {
    push(input.purchaseAge, {
      label: "住宅購入",
      icon: "🏠",
      cls: "bg-blue-100 text-blue-700 border-blue-200",
    });
  }

  // 退職
  if (input.retirementAge) {
    push(input.retirementAge, {
      label: "退職",
      icon: "🎌",
      cls: "bg-amber-100 text-amber-800 border-amber-200",
    });
  }

  // 年金受給開始（65歳固定 or 退職後65歳）
  const pensionStart = Math.max(65, input.retirementAge ?? 65);
  push(pensionStart, {
    label: "年金受給",
    icon: "💴",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  });

  // 配偶者退職
  if (input.hasSpouse && input.spouseAge && input.spouseRetirementAge) {
    const ageAtSpouseRetirement = myAge + (input.spouseRetirementAge - input.spouseAge);
    push(ageAtSpouseRetirement, {
      label: "配偶者退職",
      icon: "👫",
      cls: "bg-pink-100 text-pink-700 border-pink-200",
    });
  }

  // 子どものイベント
  (input.children ?? []).forEach((child, idx) => {
    const suffix = (input.children?.length ?? 0) > 1 ? `${idx + 1}` : "";

    // 大学入学（本人 age = child.birthAge + 18）
    push(child.birthAge + 18, {
      label: `子${suffix}大学`,
      icon: "🎓",
      cls: "bg-violet-100 text-violet-700 border-violet-200",
    });

    // 独立（child.birthAge + 22）
    push(child.birthAge + 22, {
      label: `子${suffix}独立`,
      icon: "🏡",
      cls: "bg-purple-100 text-purple-700 border-purple-200",
    });
  });

  // ライフイベント（wedding, car, travel …）
  (input.lifeEvents ?? []).forEach((ev) => {
    push(ev.age, {
      label: ev.label,
      icon: LIFE_EVENT_ICONS[ev.type] ?? "📌",
      cls: "bg-orange-100 text-orange-700 border-orange-200",
    });
  });

  // 介護開始
  if ((input.nursingCareStartAge ?? 0) > 0) {
    push(input.nursingCareStartAge!, {
      label: "介護開始",
      icon: "🏥",
      cls: "bg-red-100 text-red-700 border-red-200",
    });
  }

  return map;
}

// ── Formatting helpers ────────────────────────────────────────────────────

function fmt(value: number): string {
  if (value === 0) return "—";
  return Math.round(value).toLocaleString("ja-JP");
}

function fmtSigned(value: number): { text: string; positive: boolean } {
  const rounded = Math.round(value);
  return {
    text: (rounded >= 0 ? "+" : "") + rounded.toLocaleString("ja-JP"),
    positive: rounded >= 0,
  };
}

// ── Phase detection ───────────────────────────────────────────────────────

type Phase = "working" | "retired" | "pension";

function getPhase(age: number, retirementAge: number, pensionAge: number): Phase {
  if (age >= pensionAge) return "pension";
  if (age >= retirementAge) return "retired";
  return "working";
}

// ── Component ─────────────────────────────────────────────────────────────

export function DataTable({ data, input }: Props) {
  const eventMap = useMemo(() => buildEventMap(input), [input]);
  const retirementAge = input.retirementAge ?? 65;
  const pensionAge = Math.max(65, retirementAge);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">凡例</span>
        <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-amber-800">現役期</span>
        <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 text-blue-700">退職後</span>
        <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 text-emerald-700">年金期</span>
        <span className="inline-flex items-center gap-1 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 text-red-600">CF赤字年</span>
      </div>

      <div className="overflow-auto max-h-[560px]">
        <table className="w-full text-sm min-w-[820px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Age + Year */}
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-left font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border sticky left-0">
                年齢 / 年
              </th>
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border">
                収入<br /><span className="font-normal">(万円)</span>
              </th>
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border">
                支出<br /><span className="font-normal">(万円)</span>
              </th>
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border">
                住居費<br /><span className="font-normal">(万円)</span>
              </th>
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border">
                教育費<br /><span className="font-normal">(万円)</span>
              </th>
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border">
                イベント費<br /><span className="font-normal">(万円)</span>
              </th>
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border">
                純CF<br /><span className="font-normal">(万円)</span>
              </th>
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border">
                総資産<br /><span className="font-normal">(万円)</span>
              </th>
              <th className="bg-muted/80 backdrop-blur px-3 py-2.5 text-left font-semibold text-xs text-muted-foreground whitespace-nowrap border-b border-border">
                イベント
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const phase = getPhase(row.age, retirementAge, pensionAge);
              const isNegativeCF = row.netCashFlow < 0;
              const badges = eventMap.get(row.age) ?? [];
              const isPhaseStart =
                (phase === "retired" && row.age === retirementAge) ||
                (phase === "pension" && row.age === pensionAge);
              const cf = fmtSigned(row.netCashFlow);
              const totalIncome = row.income + row.spouseIncome;

              const rowBg = isNegativeCF
                ? "bg-red-50/70"
                : phase === "pension"
                ? "bg-emerald-50/40"
                : phase === "retired"
                ? "bg-blue-50/30"
                : idx % 2 === 0
                ? "bg-white"
                : "bg-muted/20";

              return (
                <Fragment key={row.age}>
                  {/* Phase separator */}
                  {isPhaseStart && (
                    <tr key={`sep-${row.age}`} aria-hidden="true">
                      <td
                        colSpan={9}
                        className={cn(
                          "px-3 py-1 text-xs font-bold tracking-wide border-t-2",
                          phase === "retired"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : "bg-emerald-50 text-emerald-600 border-emerald-200"
                        )}
                      >
                        {phase === "retired" ? "━━ 退職後 ━━" : "━━ 年金受給開始 ━━"}
                      </td>
                    </tr>
                  )}

                  <tr
                    key={row.age}
                    className={cn(
                      "transition-colors hover:brightness-95",
                      rowBg,
                      isPhaseStart && "border-t border-border/60"
                    )}
                  >
                    {/* Age / Year */}
                    <td className={cn(
                      "px-3 py-2 whitespace-nowrap sticky left-0 border-r border-border/40",
                      rowBg
                    )}>
                      <span className="font-bold text-foreground">{row.age}歳</span>
                      <span className="text-xs text-muted-foreground ml-1.5">{row.year}</span>
                    </td>

                    {/* 収入 */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className={cn(
                        "font-medium",
                        totalIncome > 0 ? "text-amber-700" : "text-muted-foreground"
                      )}>
                        {fmt(totalIncome)}
                      </span>
                      {row.spouseIncome > 0 && (
                        <span className="block text-[10px] text-muted-foreground">
                          本人{fmt(row.income)} / 配偶者{fmt(row.spouseIncome)}
                        </span>
                      )}
                    </td>

                    {/* 支出 */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className="font-medium text-slate-600">{fmt(row.totalExpense)}</span>
                    </td>

                    {/* 住居費 */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-slate-500">
                      {fmt(row.housingCost)}
                    </td>

                    {/* 教育費 */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-slate-500">
                      {fmt(row.educationCost)}
                    </td>

                    {/* イベント費 */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.lifeEventCost > 0 ? (
                        <span className="text-orange-600 font-medium">{fmt(row.lifeEventCost)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* 純CF */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className={cn(
                        "font-semibold tabular-nums",
                        cf.positive ? "text-emerald-600" : "text-red-600"
                      )}>
                        {cf.text}
                      </span>
                    </td>

                    {/* 総資産 */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className={cn(
                        "font-bold tabular-nums",
                        row.cumulativeAssets < 0 ? "text-red-600" : "text-foreground"
                      )}>
                        {fmt(row.cumulativeAssets)}
                      </span>
                      {row.investmentAssets > 0 && (
                        <span className="block text-[10px] text-muted-foreground">
                          投資{fmt(row.investmentAssets)}
                        </span>
                      )}
                    </td>

                    {/* イベント */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {badges.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {badges.map((b, i) => (
                            <span
                              key={i}
                              className={cn(
                                "inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded border",
                                b.cls
                              )}
                            >
                              {b.icon} {b.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="px-4 py-2.5 bg-muted/30 border-t border-border flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>{data.length}年分のデータ</span>
        <span>
          最大資産:{" "}
          <strong className="text-foreground">
            {Math.round(Math.max(...data.map((d) => d.cumulativeAssets))).toLocaleString("ja-JP")}万円
          </strong>
        </span>
        <span>
          赤字年:{" "}
          <strong className="text-red-600">
            {data.filter((d) => d.netCashFlow < 0).length}年
          </strong>
        </span>
      </div>
    </div>
  );
}
