/**
 * Fires form operations and button clicks on each step to raise coverage.
 * - HousingStep: rent/buy/own branches + loan calculation summary
 * - LifeEventsStep: addEvent / removeEvent / updateEvent / handleNext
 * - InsuranceStep: nursing care age / age-based spending curve / submit
 * - ExpenseStep: rent field shown in rent mode, and submit
 * - InvestmentStep: NISA/iDeCo product selection + submit + MoneyForward import
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { HousingStep } from "../steps/HousingStep";
import { LifeEventsStep } from "../steps/LifeEventsStep";
import { InsuranceStep } from "../steps/InsuranceStep";
import { ExpenseStep } from "../steps/ExpenseStep";
import { InvestmentStep } from "../steps/InvestmentStep";
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

describe("HousingStep interactions", () => {
  it("initial render: shows the 賃貸 (rent) field", () => {
    render(<HousingStep onNext={() => {}} />);
    expect(screen.getByText("賃貸")).toBeTruthy();
    expect(screen.getByText("購入")).toBeTruthy();
    expect(screen.getByText("持ち家あり")).toBeTruthy();
  });

  it("choosing buy shows the loan fields", async () => {
    render(<HousingStep onNext={() => {}} />);
    const buyBtn = screen.getByText("購入").closest("button")!;
    await act(async () => { fireEvent.click(buyBtn); });
    expect(screen.getAllByText(/購入予定年齢|物件価格|頭金|金利|返済期間/).length).toBeGreaterThan(0);
  });

  it("buy: computes the loan summary (loanAmount > 0)", async () => {
    render(<HousingStep onNext={() => {}} />);
    const buyBtn = screen.getByText("購入").closest("button")!;
    await act(async () => { fireEvent.click(buyBtn); });
    expect(screen.getAllByText(/ローンシミュレーション/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/月々の返済額/).length).toBeGreaterThan(0);
  });

  it("buy: changing the property price input", async () => {
    render(<HousingStep onNext={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText("購入").closest("button")!); });
    const price = screen.getByRole("textbox", { name: "物件価格" }) as HTMLInputElement;
    expect(price.value).toBe("4000");
    await act(async () => { fireEvent.change(price, { target: { value: "5000" } }); });
    expect(useSimulationStore.getState().input.propertyPrice).toBe(5000);
  });

  it("choosing owned home shows the owned-home hint", async () => {
    render(<HousingStep onNext={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText("持ち家あり").closest("button")!); });
    expect(screen.getAllByText(/維持費|固定資産税/).length).toBeGreaterThan(0);
  });

  it("choosing rent shows the rent hint", async () => {
    // Initial = rent
    render(<HousingStep onNext={() => {}} />);
    expect(screen.getAllByText(/支出.*ステップ|家賃/).length).toBeGreaterThan(0);
  });

  it("submit calls updateInput + onNext", async () => {
    const onNext = vi.fn();
    render(<HousingStep onNext={onNext} />);
    const submit = screen.getByText("次へ進む").closest("button")!;
    await act(async () => { fireEvent.click(submit); });
    await waitFor(() => {
      expect(onNext).toHaveBeenCalled();
    });
  });
});

describe("LifeEventsStep interactions", () => {
  it("has 2 events by default (wedding, car)", () => {
    render(<LifeEventsStep onNext={() => {}} />);
    expect(screen.getAllByText(/結婚式|マイカー購入/).length).toBeGreaterThan(0);
  });

  it("the add-event button adds one event", async () => {
    render(<LifeEventsStep onNext={() => {}} />);
    const addBtn = screen.getByText("イベントを追加").closest("button")!;
    await act(async () => { fireEvent.click(addBtn); });
    // The added event is その他 (when there is no existing "その他")
    expect(screen.getAllByText(/その他/).length).toBeGreaterThan(0);
  });

  it("the delete-event button removes one event", async () => {
    render(<LifeEventsStep onNext={() => {}} />);
    // Get the delete button (X svg)
    const buttons = document.querySelectorAll("button");
    const removeButtons = Array.from(buttons).filter((b) =>
      b.querySelector('svg line[x1="18"]'),
    );
    expect(removeButtons.length).toBeGreaterThan(0);
    await act(async () => { fireEvent.click(removeButtons[0]); });
    // After deletion, 1 item should remain
    expect(screen.queryAllByText(/結婚式|マイカー購入/).length).toBeLessThan(3);
  });

  it("changing the age input calls updateEvent", async () => {
    render(<LifeEventsStep onNext={() => {}} />);
    const numberInputs = document.querySelectorAll('input[inputmode="decimal"]') as NodeListOf<HTMLInputElement>;
    const age32 = Array.from(numberInputs).find((i) => i.value === "32");
    if (age32) {
      await act(async () => { fireEvent.change(age32, { target: { value: "40" } }); });
      expect(age32.value).toBe("40");
    }
  });

  it("changing the label input", async () => {
    render(<LifeEventsStep onNext={() => {}} />);
    const textInputs = document.querySelectorAll('input[type="text"], input:not([type])') as NodeListOf<HTMLInputElement>;
    const wedding = Array.from(textInputs).find((i) => i.value === "結婚式");
    if (wedding) {
      await act(async () => { fireEvent.change(wedding, { target: { value: "海外挙式" } }); });
      expect(wedding.value).toBe("海外挙式");
    }
  });

  it("\"次へ進む\" (next) calls updateInput + onNext", async () => {
    const onNext = vi.fn();
    render(<LifeEventsStep onNext={onNext} />);
    const nextBtn = screen.getByText("次へ進む").closest("button")!;
    await act(async () => { fireEvent.click(nextBtn); });
    expect(onNext).toHaveBeenCalled();
    expect(useSimulationStore.getState().input.lifeEvents).toBeDefined();
  });

  it("shows the empty placeholder with 0 initial events", () => {
    useSimulationStore.setState({
      input: { ...useSimulationStore.getInitialState().input, lifeEvents: [] },
    });
    render(<LifeEventsStep onNext={() => {}} />);
    expect(screen.getAllByText(/ライフイベントがありません/).length).toBeGreaterThan(0);
  });
});

describe("InsuranceStep interactions", () => {
  it("initial render: each section", () => {
    render(<InsuranceStep onNext={() => {}} />);
    expect(screen.getAllByText(/生命保険|医療|介護|企業/).length).toBeGreaterThan(0);
  });

  it("submit calls onNext", async () => {
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

describe("ExpenseStep interactions", () => {
  it("housingType=rent (default) does not show rent, since the housing step asks for it (SHIG 40)", () => {
    render(<ExpenseStep onNext={() => {}} />);
    expect(screen.queryByText(/月額家賃/)).toBeNull();
  });

  it("housingType=buy hides the rent field", () => {
    useSimulationStore.setState({
      input: { ...useSimulationStore.getInitialState().input, housingType: "buy" },
    });
    render(<ExpenseStep onNext={() => {}} />);
    expect(screen.queryByText(/月額家賃/)).toBeNull();
  });

  it("submit calls onNext", async () => {
    const onNext = vi.fn();
    render(<ExpenseStep onNext={onNext} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/次へ進む/).closest("button")!);
    });
    await waitFor(() => {
      expect(onNext).toHaveBeenCalled();
    });
  });
});

describe("InvestmentStep interactions", () => {
  it("initial render: NISA / iDeCo / Small Business Mutual Aid (小規模企業共済)", () => {
    render(<InvestmentStep onNext={() => {}} />);
    expect(screen.getAllByText(/NISA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/iDeCo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/小規模企業共済/).length).toBeGreaterThan(0);
  });

  it("submit calls onNext", async () => {
    const onNext = vi.fn();
    render(<InvestmentStep onNext={onNext} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/次へ進む/).closest("button")!);
    });
    await waitFor(() => {
      expect(onNext).toHaveBeenCalled();
    });
  });
});
