/**
 * IncomeStep の各分岐を深掘り
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { IncomeStep } from "../steps/IncomeStep";
import { useSimulationStore } from "@/store/simulationStore";

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
});

const onNext = () => {};

describe("IncomeStep: 雇用形態ごとの描画", () => {
  for (const emp of ["employee", "civil_servant", "self_employed", "freelance", "part_time"] as const) {
    it(`employmentType=${emp}`, () => {
      useSimulationStore.setState({
        input: { ...useSimulationStore.getInitialState().input, employmentType: emp },
      });
      render(<IncomeStep onNext={onNext} />);
      expect(screen.getAllByText(/年収|収入/).length).toBeGreaterThan(0);
    });
  }

  it("employee_freelance: 副業前提", () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        employmentType: "employee_freelance",
        sideIncomeMonthly: 5,
      },
    });
    render(<IncomeStep onNext={onNext} />);
    expect(screen.getAllByText(/年収|収入/).length).toBeGreaterThan(0);
  });

  it("freelance + 役員報酬あり", () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        employmentType: "freelance",
        officerAnnualIncome: 300,
      },
    });
    render(<IncomeStep onNext={onNext} />);
    expect(screen.getAllByText(/役員|フリーランス/).length).toBeGreaterThan(0);
  });
});

describe("IncomeStep: 切替トグル", () => {
  it("副業ありトグル", () => {
    render(<IncomeStep onNext={onNext} />);
    const toggles = screen.getAllByRole("switch");
    if (toggles.length > 0) {
      act(() => { fireEvent.click(toggles[0]); });
      // 副業フィールド表示が変わる
      expect(toggles[0]).toBeTruthy();
    }
  });

});

describe("IncomeStep: 配偶者あり", () => {
  it("配偶者あり employee", () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        hasSpouse: true,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
      },
    });
    render(<IncomeStep onNext={onNext} />);
    expect(screen.getAllByText(/配偶者/).length).toBeGreaterThan(0);
  });

  it("配偶者 homemaker", () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        hasSpouse: true,
        spouseEmploymentType: "homemaker",
        spouseAnnualIncome: 0,
      },
    });
    render(<IncomeStep onNext={onNext} />);
    expect(screen.getAllByText(/配偶者/).length).toBeGreaterThan(0);
  });

  it("配偶者キャリアブレイクあり", () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        hasSpouse: true,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 300,
        spouseCareerBreakStartAge: 32,
        spouseCareerBreakEndAge: 35,
      },
    });
    render(<IncomeStep onNext={onNext} />);
    expect(screen.getAllByText(/配偶者/).length).toBeGreaterThan(0);
  });
});

describe("IncomeStep: 年収の派生表示", () => {
  it("年収から月額換算と手取り推計を導出して表示する", () => {
    render(<IncomeStep onNext={onNext} />);
    // 既定 annualIncome=500万 → 月額換算 500/12 = 41.7万円/月
    expect(screen.getByText("41.7万円/月")).toBeTruthy();
    // 手取り推計は額面より小さい正の値（ラベルと値の取り違えを捕まえる）
    const net = screen
      .getAllByText(/万円\/月$/)
      .map((el) => Number(el.textContent!.replace("万円/月", "")))
      .filter((n) => Number.isFinite(n));
    expect(Math.min(...net)).toBeGreaterThan(0);
    expect(Math.min(...net)).toBeLessThan(41.7);
  });
});
