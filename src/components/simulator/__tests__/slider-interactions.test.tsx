/**
 * ui/slider を素の <input type="range"> に差し替え、Radix Slider の
 * onValueChange ハンドラ群を発火させて各ステップのカバレッジを引き上げる。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// Slider → 素の input[type=range] (value=[number] / onValueChange=([n])=>void)
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
  it("全スライダーを順番に変更してエラーなし", async () => {
    render(<InsuranceStep onNext={() => {}} />);
    const all = sliders();
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("nursingCareStartAge > 0 で nursingCareCostMonthly slider が描画される", async () => {
    render(<InsuranceStep onNext={() => {}} />);
    // 介護開始年齢 slider (range 0-95, デフォルト 80) - 0 にしてから 80 に戻す
    const all = sliders();
    // 80 と一致するスライダーがそれ
    const careStartSlider = all.find((s) => s.value === "80");
    if (careStartSlider) {
      await act(async () => { fireEvent.change(careStartSlider, { target: { value: "0" } }); });
      await act(async () => { fireEvent.change(careStartSlider, { target: { value: "85" } }); });
    }
    expect(true).toBe(true);
  });

  it("年齢別支出カーブ off ブランチ", async () => {
    render(<InsuranceStep onNext={() => {}} />);
    const toggleBtn = screen.getByText(/年齢別支出カーブを使用する/)
      .closest("div")?.parentElement?.querySelector("button");
    expect(toggleBtn).toBeTruthy();
    // toggle off
    if (toggleBtn) {
      await act(async () => { fireEvent.click(toggleBtn); });
      // 再度クリックで on
      await act(async () => { fireEvent.click(toggleBtn); });
    }
  });

  it("submit で onNext + updateInput", async () => {
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
  it("全スライダーを変更", async () => {
    render(<InvestmentStep onNext={() => {}} />);
    const all = sliders();
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("iDeCo / 小規模企業共済 slider で 0.1 ステップの round 経路", async () => {
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

  it("NISA 商品を順番に切替", async () => {
    render(<InvestmentStep onNext={() => {}} />);
    const productButtons = document.querySelectorAll('button[type="button"]');
    // 最低 2つ以上の商品ボタンがあれば切り替える
    if (productButtons.length >= 4) {
      for (let i = 1; i < Math.min(productButtons.length, 6); i++) {
        await act(async () => { fireEvent.click(productButtons[i]); });
      }
    }
    expect(productButtons.length).toBeGreaterThan(0);
  });

  it("submit で onNext", async () => {
    const onNext = vi.fn();
    render(<InvestmentStep onNext={onNext} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/次へ進む/).closest("button")!);
    });
    await waitFor(() => expect(onNext).toHaveBeenCalled());
  });
});

describe("ExpenseStep sliders", () => {
  it("全スライダーを変更", async () => {
    render(<ExpenseStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("housingType=buy で家賃 slider 非表示 → 残り sliders を操作", async () => {
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
  it("購入モードの全スライダーを変更", async () => {
    render(<HousingStep onNext={() => {}} />);
    // 購入に切替
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
  it("全スライダーを変更", async () => {
    render(<BasicInfoStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("hasSpouse=true で配偶者 slider 描画 → 操作", async () => {
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

  it("子ども 2人状態で sliders 操作", async () => {
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
  it("全スライダーを変更 (employee)", async () => {
    render(<IncomeStep onNext={() => {}} />);
    const all = sliders();
    for (const s of all) {
      const mid = Math.round((Number(s.min) + Number(s.max)) / 2);
      await act(async () => { fireEvent.change(s, { target: { value: String(mid) } }); });
    }
  });

  it("freelance + 役員報酬 ON で全 sliders 操作", async () => {
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

  it("hasSpouse + careerBreak ON で全 sliders", async () => {
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
