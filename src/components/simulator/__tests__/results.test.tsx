/**
 * Results 系コンポーネントの smoke test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { DataTable } from "../results/DataTable";
import { AssetChart } from "../results/AssetChart";
import { ExpenseBreakdownChart } from "../results/ExpenseBreakdownChart";
import { CashFlowChart } from "../results/CashFlowChart";
import { LifePhaseBreakdown } from "../results/LifePhaseBreakdown";
import { RetirementInsights } from "../results/RetirementInsights";
import { ActionPlan } from "../results/ActionPlan";
import { useSimulationStore } from "@/store/simulationStore";
import type { SimulationInput, SimulationResult } from "@/lib/simulation/types";

vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="rc">{children}</div>
    ),
  };
});

let result: SimulationResult;
let input: SimulationInput;

beforeEach(() => {
  localStorage.clear();
  useSimulationStore.setState({
    currentStep: 0,
    input: useSimulationStore.getInitialState().input,
    result: null,
    isCalculating: false,
    savedSimulations: [],
    aiEvaluation: null,
  });
  useSimulationStore.getState().calculate();
  result = useSimulationStore.getState().result!;
  input = useSimulationStore.getState().input as SimulationInput;
});

describe("DataTable", () => {
  it("smoke", () => {
    expect(() => render(<DataTable data={result.yearlyData} input={input} />)).not.toThrow();
  });
});

describe("AssetChart", () => {
  it("smoke", () => {
    expect(() => render(
      <AssetChart
        data={result.yearlyData}
        retirementAge={input.retirementAge}
        currentAge={input.age}
      />
    )).not.toThrow();
  });
});

describe("ExpenseBreakdownChart", () => {
  it("smoke", () => {
    expect(() => render(
      <ExpenseBreakdownChart data={result.yearlyData} retirementAge={input.retirementAge} />
    )).not.toThrow();
  });
});

describe("CashFlowChart", () => {
  it("smoke", () => {
    expect(() => render(
      <CashFlowChart data={result.yearlyData} retirementAge={input.retirementAge} />
    )).not.toThrow();
  });
});

describe("LifePhaseBreakdown", () => {
  it("smoke", () => {
    expect(() => render(
      <LifePhaseBreakdown data={result.yearlyData} retirementAge={input.retirementAge} />
    )).not.toThrow();
  });
});

describe("RetirementInsights", () => {
  it("smoke", () => {
    expect(() => render(<RetirementInsights result={result} input={input} />)).not.toThrow();
  });
});

describe("ActionPlan", () => {
  it("smoke", () => {
    expect(() => render(<ActionPlan result={result} input={input} />)).not.toThrow();
  });
});
