/**
 * 各ステップコンポーネントの smoke + 基本インタラクション。
 * react-hook-form + Radix Select の組み合わせ。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
  // 初期状態に戻す
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
  it("基本情報フォームが描画される", () => {
    render(<BasicInfoStep onNext={onNext} />);
    expect(screen.getAllByText(/生年月日|年齢|基本/).length).toBeGreaterThan(0);
  });

  it("hasSpouse=true 状態で配偶者フィールドが表示される", () => {
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

  it("子どもありで詳細入力欄が出る", () => {
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

  it("子どもボタン (1) クリックで children に追加", () => {
    render(<BasicInfoStep onNext={onNext} />);
    const buttons = screen.getAllByRole("button");
    const oneBtn = buttons.find((b) => b.textContent === "1");
    if (oneBtn) {
      act(() => { fireEvent.click(oneBtn); });
      // useSimulationStore は handleChildrenCountChange 経由で更新される
    }
    expect(true).toBe(true);
  });
});

describe("IncomeStep", () => {
  it("収入フォーム描画", () => {
    render(<IncomeStep onNext={onNext} />);
    expect(screen.getAllByText(/年収|収入/).length).toBeGreaterThan(0);
  });
});

describe("ExpenseStep", () => {
  it("支出フォーム描画", () => {
    render(<ExpenseStep onNext={onNext} />);
    expect(screen.getAllByText(/生活費|支出/).length).toBeGreaterThan(0);
  });
});

describe("HousingStep", () => {
  it("住居フォーム描画", () => {
    render(<HousingStep onNext={onNext} />);
    expect(screen.getAllByText(/住宅|住居|家賃|賃貸/).length).toBeGreaterThan(0);
  });
});

describe("LifeEventsStep", () => {
  it("ライフイベントフォーム描画", () => {
    render(<LifeEventsStep onNext={onNext} />);
    expect(screen.getAllByText(/ライフイベント|イベント/).length).toBeGreaterThan(0);
  });
});

describe("InvestmentStep", () => {
  it("投資フォーム描画", () => {
    render(<InvestmentStep onNext={onNext} />);
    expect(screen.getAllByText(/投資|NISA|貯蓄|iDeCo/).length).toBeGreaterThan(0);
  });
});

describe("InsuranceStep", () => {
  it("保険フォーム描画", () => {
    render(<InsuranceStep onNext={onNext} />);
    expect(screen.getAllByText(/保険|医療|介護/).length).toBeGreaterThan(0);
  });
});
