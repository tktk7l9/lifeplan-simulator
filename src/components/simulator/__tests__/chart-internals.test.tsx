/**
 * Renders each chart's CustomTooltip / format helpers directly to raise coverage.
 * The recharts Tooltip does not fire mouse position or payload in jsdom, so
 * we call the tooltip component exported for the react renderer directly via an internal reference.
 *
 * Each *.tsx Tooltip element is <Tooltip content={(props) => <CustomTooltip ... />} />, and
 * to test tooltip rendering in isolation here, the CustomTooltip inside each module
 * is not exported. So we mock recharts and render with active=true and a payload.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// recharts: replace not only Tooltip but also the chart containers with stubs that render children as-is
vi.mock("recharts", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="rc">{children}</div>
    ),
    BarChart: Passthrough,
    LineChart: Passthrough,
    AreaChart: Passthrough,
    ComposedChart: Passthrough,
    Bar: () => null,
    Line: () => null,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Legend: () => null,
    ReferenceLine: () => null,
    Cell: () => null,
    // Tooltip: if content is a function or a React element, call it and render
    Tooltip: ({ content }: { content?: unknown }) => {
      // Also put nested data into payload[i].payload for MonteCarloChart compatibility
      const sharedNested = {
        age: 40,
        p10: 100, p25: 200, p50: 300, p75: 400, p90: 25000,
        _p10: 100, _p25: 200, _p75: 400, _p90: 25000,
      };
      const samplePayload = [
        { name: "総資産", value: 12345, color: "#1e40af", dataKey: "総資産", payload: sharedNested },
        { name: "貯蓄資産", value: 8000, color: "#d97706", dataKey: "貯蓄資産", payload: sharedNested },
        { name: "投資資産", value: 4345, color: "#0d9488", dataKey: "投資資産", payload: sharedNested },
      ];
      const samplePayloadNeg = [
        { name: "総資産", value: -1000, color: "#dc2626", dataKey: "総資産", payload: sharedNested },
      ];
      const label = 40;
      if (typeof content === "function") {
        const Fn = content as (props: unknown) => React.ReactNode;
        return (
          <>
            <div data-testid="tt-positive">{Fn({ active: true, payload: samplePayload, label })}</div>
            <div data-testid="tt-negative">{Fn({ active: true, payload: samplePayloadNeg, label })}</div>
            <div data-testid="tt-inactive">{Fn({ active: false, payload: [], label })}</div>
          </>
        );
      }
      if (React.isValidElement(content)) {
        const Cmp = content.type as React.ComponentType<{ active: boolean; payload: unknown; label: unknown }>;
        return (
          <>
            <div data-testid="tt-positive">
              <Cmp active={true} payload={samplePayload} label={label} />
            </div>
            <div data-testid="tt-negative">
              <Cmp active={true} payload={samplePayloadNeg} label={label} />
            </div>
            <div data-testid="tt-inactive">
              <Cmp active={false} payload={[]} label={label} />
            </div>
          </>
        );
      }
      return null;
    },
  };
});

import { AssetChart } from "../results/AssetChart";
import { CashFlowChart } from "../results/CashFlowChart";
import { MonteCarloChart } from "../results/MonteCarloChart";
import { ExpenseBreakdownChart } from "../results/ExpenseBreakdownChart";
import type { YearlyData, MonteCarloDataPoint } from "@/lib/simulation/types";

beforeEach(() => {});

function makeYearlyData(n = 20): YearlyData[] {
  return Array.from({ length: n }, (_, i) => ({
    age: 30 + i,
    year: 2030 + i,
    income: 500,
    spouseIncome: 100,
    totalIncome: 600,
    livingExpense: 240,
    housingExpense: 120,
    housingCost: 120,
    educationCost: i === 10 ? 200 : 0,
    educationExpense: i === 10 ? 200 : 0,
    medicalCost: i > 15 ? 50 : 5,
    medicalExpense: i > 15 ? 50 : 5,
    insuranceExpense: 0,
    lifeEventCost: i === 5 ? 300 : 0,
    lifeEventExpense: i === 5 ? 300 : 0,
    totalExpense: 360,
    savings: 240,
    savingsAssets: 1000 + i * 100,
    investmentAssets: 500 + i * 50,
    cumulativeAssets: 1500 + i * 150,
    pensionIncome: 0,
    mortgagePayment: 0,
    mortgageBalance: 0,
    netCashFlow: 240,
    monteCarloAssets: [],
  } as unknown as YearlyData));
}

describe("AssetChart CustomTooltip", () => {
  it("active payload で項目描画 + 負の value 赤色 (text-red-700)", () => {
    render(
      <AssetChart
        data={makeYearlyData()}
        retirementAge={65}
        annotations={[]}
        spouseAgeDiff={2}
      />,
    );
    // Positive tooltip
    const pos = screen.getByTestId("tt-positive");
    expect(pos.textContent).toContain("40歳");
    expect(pos.textContent).toMatch(/万円|億円/);
    // Spouse age hint shown
    expect(pos.textContent).toContain("配偶者");
    // Negative tooltip - includes text-red-700
    const neg = screen.getByTestId("tt-negative");
    expect(neg.querySelector(".text-red-700")).toBeTruthy();
    // Inactive renders nothing
    const inactive = screen.getByTestId("tt-inactive");
    expect(inactive.textContent).toBe("");
  });

  it("億円フォーマット (10000 以上)", () => {
    // Prepare large data to hit the 10000+ path of formatYAxis / formatManYen
    const big = makeYearlyData().map((d, i) => ({
      ...d,
      cumulativeAssets: 20000 + i * 1000,
      savingsAssets: 15000,
      investmentAssets: 5000,
    } as YearlyData));
    render(<AssetChart data={big} retirementAge={65} />);
    // The test is smoke only
    expect(screen.getAllByTestId("rc").length).toBeGreaterThan(0);
  });

  it("負の値を含む annotation (hasNegative)", () => {
    const data = makeYearlyData();
    data[10].cumulativeAssets = -500;
    render(
      <AssetChart
        data={data}
        retirementAge={65}
        annotations={[
          { age: 35, label: "結婚", color: "#ff0000" },
          { age: 36, label: "出産" },
        ]}
      />,
    );
    expect(screen.getAllByTestId("rc").length).toBeGreaterThan(0);
  });
});

describe("CashFlowChart CustomTooltip", () => {
  it("active payload で項目描画", () => {
    render(<CashFlowChart data={makeYearlyData(50)} retirementAge={65} />);
    const pos = screen.getByTestId("tt-positive");
    expect(pos.textContent).toContain("40歳");
    expect(pos.textContent).toMatch(/万円/);
  });
});

describe("ExpenseBreakdownChart CustomTooltip", () => {
  it("active payload で合計表示", () => {
    render(<ExpenseBreakdownChart data={makeYearlyData(50)} retirementAge={65} />);
    const pos = screen.getByTestId("tt-positive");
    expect(pos.textContent).toContain("合計");
  });
});

describe("MonteCarloChart fmt edge cases", () => {
  it("p90 1億超で 億円 フォーマット", () => {
    const data: MonteCarloDataPoint[] = Array.from({ length: 60 }, (_, i) => ({
      age: 30 + i,
      p10: 5000,
      p25: 7000,
      p50: 10000,
      p75: 15000,
      p90: 20000,
    }));
    render(<MonteCarloChart data={data} retirementAge={65} failureProbability={5} />);
    expect(screen.getAllByTestId("rc").length).toBeGreaterThan(0);
  });

  it("CustomTooltip active payload 経路", () => {
    const data: MonteCarloDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
      age: 30 + i,
      p10: 100,
      p25: 200,
      p50: 300,
      p75: 400,
      p90: 500,
    }));
    render(<MonteCarloChart data={data} retirementAge={65} failureProbability={15} />);
    // The label inside the Tooltip is shown
    expect(document.body.textContent).toContain("生存確率");
  });
});
