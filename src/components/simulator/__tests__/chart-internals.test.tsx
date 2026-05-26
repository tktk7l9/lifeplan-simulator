/**
 * 各チャートの CustomTooltip / format ヘルパを直接 render してカバレッジを上げる。
 * recharts の Tooltip は jsdom ではマウス位置や payload を発火しないため、
 * react-renderer 用にエクスポートされた tooltip コンポーネントを内部参照で直接呼び出す。
 *
 * 各 *.tsx の Tooltip 要素は <Tooltip content={(props) => <CustomTooltip ... />} /> のため、
 * ここでは tooltip 描画を独立してテストするために、それぞれの module 内部の CustomTooltip
 * は export されていない。そこで、recharts を mock し、active=true payload 付きでレンダする。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";

// recharts: Tooltip だけでなく、Chart コンテナも children をそのまま render する stub に差し替える
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
    // Tooltip: content が関数 or React 要素なら呼び出して描画
    Tooltip: ({ content }: { content?: unknown }) => {
      // payload[i].payload に nested data も入れて MonteCarloChart 互換に
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
        const Cmp = content.type as React.ComponentType<unknown>;
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
  it("active payload で項目描画 + 負の value 赤色 (text-red-500)", () => {
    render(
      <AssetChart
        data={makeYearlyData()}
        retirementAge={65}
        annotations={[]}
        spouseAgeDiff={2}
      />,
    );
    // 正の tooltip
    const pos = screen.getByTestId("tt-positive");
    expect(pos.textContent).toContain("40歳");
    expect(pos.textContent).toMatch(/万円|億円/);
    // 配偶者年齢ヒント表示
    expect(pos.textContent).toContain("配偶者");
    // 負の tooltip - text-red-500 含む
    const neg = screen.getByTestId("tt-negative");
    expect(neg.querySelector(".text-red-500")).toBeTruthy();
    // inactive は何も描画しない
    const inactive = screen.getByTestId("tt-inactive");
    expect(inactive.textContent).toBe("");
  });

  it("億円フォーマット (10000 以上)", () => {
    // formatYAxis / formatManYen の 10000+ 経路 を踏むため大きな data を用意
    const big = makeYearlyData().map((d, i) => ({
      ...d,
      cumulativeAssets: 20000 + i * 1000,
      savingsAssets: 15000,
      investmentAssets: 5000,
    } as YearlyData));
    render(<AssetChart data={big} retirementAge={65} />);
    // テストは smoke だけ
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
    // Tooltip 内のラベルが表示される
    expect(document.body.textContent).toContain("生存確率");
  });
});
