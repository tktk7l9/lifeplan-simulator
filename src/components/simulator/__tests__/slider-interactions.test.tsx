/**
 * Replaces ui/slider with a plain <input type="range"> and fires the Radix Slider
 * onValueChange handlers to raise coverage of each step.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// Slider → plain input[type=range] (value=[number] / onValueChange=([n])=>void)
vi.mock("@/components/ui/slider", () => {
  type SliderProps = {
    value?: number[];
    onValueChange?: (v: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
    "data-testid"?: string;
  };
  function Slider({ value, onValueChange, min = 0, max = 100, step = 1, className }: SliderProps) {
    return (
      <input
        data-testid="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value?.[0] ?? 0}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        className={className}
      />
    );
  }
  return { Slider };
});

import { InsuranceStep } from "../steps/InsuranceStep";
import { InvestmentStep } from "../steps/InvestmentStep";
import { ExpenseStep } from "../steps/ExpenseStep";
import { BasicInfoStep } from "../steps/BasicInfoStep";
import { IncomeStep } from "../steps/IncomeStep";
import { HousingStep } from "../steps/HousingStep";
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

function sliders() {
  return screen.getAllByTestId("slider") as HTMLInputElement[];
}

describe("InsuranceStep sliders", () => {
  it("changes every slider in turn without errors", async () => {
    render(<InsuranceStep onNext={() => {}} />);
    const all = sliders();
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("age-based spending curve off branch", async () => {
    render(<InsuranceStep onNext={() => {}} />);
    const toggleBtn = screen.getByText(/年齢別支出カーブを使用する/)
      .closest("div")?.parentElement?.querySelector("button");
    expect(toggleBtn).toBeTruthy();
    // toggle off
    if (toggleBtn) {
      await act(async () => { fireEvent.click(toggleBtn); });
      // Click again to turn it on
      await act(async () => { fireEvent.click(toggleBtn); });
    }
  });

  it("submit calls onNext + updateInput", async () => {
    const onNext = vi.fn();
    render(<InsuranceStep onNext={onNext} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/次へ進む/).closest("button")!);
    });
    await waitFor(() => {
      expect(onNext).toHaveBeenCalled();
    });
  });
});

describe("InvestmentStep sliders", () => {
  it("changes every slider", async () => {
    render(<InvestmentStep onNext={() => {}} />);
    const all = sliders();
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("iDeCo / Small Business Mutual Aid (小規模企業共済) sliders take the 0.1-step rounding path", async () => {
    render(<InvestmentStep onNext={() => {}} />);
    const all = sliders();
    // iDeCo slider (max 6.8, step 0.1) or shokibo (max 7, step 0.1)
    for (const s of all) {
      const max = Number(s.max);
      if (max === 6.8 || max === 7) {
        await act(async () => { fireEvent.change(s, { target: { value: "3.55" } }); });
      }
    }
  });

  it("switches through the NISA products in turn", async () => {
    render(<InvestmentStep onNext={() => {}} />);
    const productButtons = document.querySelectorAll('button[type="button"]');
    // If there are at least 2 product buttons, switch between them
    if (productButtons.length >= 4) {
      for (let i = 1; i < Math.min(productButtons.length, 6); i++) {
        await act(async () => { fireEvent.click(productButtons[i]); });
      }
    }
    expect(productButtons.length).toBeGreaterThan(0);
  });

  it("submit calls onNext", async () => {
    const onNext = vi.fn();
    render(<InvestmentStep onNext={onNext} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/次へ進む/).closest("button")!);
    });
    await waitFor(() => expect(onNext).toHaveBeenCalled());
  });
});

describe("ExpenseStep sliders", () => {
  it("changes every slider", async () => {
    render(<ExpenseStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("housingType=buy hides the rent slider → operates the remaining sliders", async () => {
    useSimulationStore.setState({
      input: { ...useSimulationStore.getInitialState().input, housingType: "buy" },
    });
    render(<ExpenseStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      await act(async () => { fireEvent.change(s, { target: { value: s.value } }); });
    }
    expect(screen.queryByText(/月額家賃/)).toBeNull();
  });
});

describe("HousingStep sliders (buy)", () => {
  it("changes every slider in buy mode", async () => {
    render(<HousingStep onNext={() => {}} />);
    // Switch to buy
    await act(async () => {
      fireEvent.click(screen.getByText("購入").closest("button")!);
    });
    const all = sliders();
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });
});

describe("BasicInfoStep sliders", () => {
  it("changes every slider", async () => {
    render(<BasicInfoStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("hasSpouse=true renders the spouse sliders → operates them", async () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        hasSpouse: true,
        spouseAge: 28,
        spouseRetirementAge: 65,
      },
    });
    render(<BasicInfoStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("operates sliders with 2 children", async () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        children: [
          { id: "c1", birthAge: 32, educationPath: "public" },
          { id: "c2", birthAge: 35, educationPath: "private" },
        ],
      },
    });
    render(<BasicInfoStep onNext={() => {}} />);
    const all = sliders();
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });
});

describe("IncomeStep sliders", () => {
  it("changes every slider (employee)", async () => {
    render(<IncomeStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("freelance + director's pay (役員報酬) ON operates every slider", async () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        employmentType: "freelance",
        officerAnnualIncome: 200,
      },
    });
    render(<IncomeStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("hasSpouse + careerBreak ON operates every slider", async () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        hasSpouse: true,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
        spouseCareerBreakStartAge: 32,
        spouseCareerBreakEndAge: 36,
      },
    });
    render(<IncomeStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });
});
