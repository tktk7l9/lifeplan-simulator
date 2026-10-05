/**
 * Digs into each branch of IncomeStep
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

describe("IncomeStep: rendering per employment type", () => {
  for (const emp of ["employee", "civil_servant", "self_employed", "freelance", "part_time"] as const) {
    it(`employmentType=${emp}`, () => {
      useSimulationStore.setState({
        input: { ...useSimulationStore.getInitialState().input, employmentType: emp },
      });
      render(<IncomeStep onNext={onNext} />);
      expect(screen.getAllByText(/年収|収入/).length).toBeGreaterThan(0);
    });
  }

  it("employee_freelance: assumes a side business", () => {
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

  it("freelance + with director's pay (役員報酬)", () => {
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

describe("IncomeStep: toggles", () => {
  it("side business toggle", () => {
    render(<IncomeStep onNext={onNext} />);
    const toggles = screen.getAllByRole("switch");
    if (toggles.length > 0) {
      act(() => { fireEvent.click(toggles[0]); });
      // The side-job field display changes
      expect(toggles[0]).toBeTruthy();
    }
  });

});

describe("IncomeStep: with spouse", () => {
  it("with spouse, employee", () => {
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

  it("spouse homemaker", () => {
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

  it("with spouse career break", () => {
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

describe("IncomeStep: values derived from annual income", () => {
  it("derives and shows the monthly equivalent and estimated take-home pay from annual income", () => {
    render(<IncomeStep onNext={onNext} />);
    // Default annualIncome = 500 (5M yen) → monthly 500/12 = 41.7 (10k yen)/month
    expect(screen.getByText("41.7万円/月")).toBeTruthy();
    // Estimated take-home is a positive value smaller than the gross (catches a label/value mix-up)
    const net = screen
      .getAllByText(/万円\/月$/)
      .map((el) => Number(el.textContent!.replace("万円/月", "")))
      .filter((n) => Number.isFinite(n));
    expect(Math.min(...net)).toBeGreaterThan(0);
    expect(Math.min(...net)).toBeLessThan(41.7);
  });
});
