/**
 * Smoke + basic interaction for each step component.
 * A combination of react-hook-form + Radix Select.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BasicInfoStep } from "../steps/BasicInfoStep";
import { IncomeStep } from "../steps/IncomeStep";
import { ExpenseStep } from "../steps/ExpenseStep";
import { HousingStep } from "../steps/HousingStep";
import { LifeEventsStep } from "../steps/LifeEventsStep";
import { InvestmentStep } from "../steps/InvestmentStep";
import { InsuranceStep } from "../steps/InsuranceStep";
import { useSimulationStore } from "@/store/simulationStore";

vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="rc">{children}</div>
    ),
  };
});

beforeEach(() => {
  localStorage.clear();
  // Reset to the initial state
  useSimulationStore.setState({
    currentStep: 0,
    input: useSimulationStore.getInitialState().input,
    result: null,
    isCalculating: false,
    savedSimulations: [],
    aiEvaluation: null,
  });
});

const onNext = () => {};

describe("BasicInfoStep", () => {
  it("renders the basic info form", () => {
    render(<BasicInfoStep onNext={onNext} />);
    expect(screen.getAllByText(/生年月日|年齢|基本/).length).toBeGreaterThan(0);
  });

  it("shows the spouse fields when hasSpouse=true", () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        hasSpouse: true,
        spouseBirthDate: "1995-01-01",
        spouseAge: 30,
        spouseRetirementAge: 65,
      },
    });
    render(<BasicInfoStep onNext={onNext} />);
    expect(screen.getAllByText(/配偶者/).length).toBeGreaterThan(0);
  });

  it("shows the detail inputs when there are children", () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        children: [
          { id: "c1", birthAge: 32, educationPath: "public" },
          { id: "c2", birthAge: 35, educationPath: "private" },
        ],
      },
    });
    render(<BasicInfoStep onNext={onNext} />);
    expect(screen.getByText("第1子")).toBeTruthy();
    expect(screen.getByText("第2子")).toBeTruthy();
  });

});

describe("IncomeStep", () => {
  it("renders the income form", () => {
    render(<IncomeStep onNext={onNext} />);
    expect(screen.getAllByText(/年収|収入/).length).toBeGreaterThan(0);
  });
});

describe("ExpenseStep", () => {
  it("renders the expense form", () => {
    render(<ExpenseStep onNext={onNext} />);
    expect(screen.getAllByText(/生活費|支出/).length).toBeGreaterThan(0);
  });
});

describe("HousingStep", () => {
  it("renders the housing form", () => {
    render(<HousingStep onNext={onNext} />);
    expect(screen.getAllByText(/住宅|住居|家賃|賃貸/).length).toBeGreaterThan(0);
  });
});

describe("LifeEventsStep", () => {
  it("renders the life events form", () => {
    render(<LifeEventsStep onNext={onNext} />);
    expect(screen.getAllByText(/ライフイベント|イベント/).length).toBeGreaterThan(0);
  });
});

describe("InvestmentStep", () => {
  it("renders the investment form", () => {
    render(<InvestmentStep onNext={onNext} />);
    expect(screen.getAllByText(/投資|NISA|貯蓄|iDeCo/).length).toBeGreaterThan(0);
  });
});

describe("InsuranceStep", () => {
  it("renders the insurance form", () => {
    render(<InsuranceStep onNext={onNext} />);
    expect(screen.getAllByText(/保険|医療|介護/).length).toBeGreaterThan(0);
  });
});
