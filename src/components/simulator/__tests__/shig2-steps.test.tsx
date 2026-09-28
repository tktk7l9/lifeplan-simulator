/**
 * SHIG 2nd round — input steps.
 * - 38/7/9: edits are written to the store as they happen (no need to press 次へ)
 * - 50/46: lenient numeric input (full-width digits, commas, empty field)
 * - 55/66: constructive range message next to the field
 * - 94/48: accessible names for sliders and inputs, radio semantics for choices
 * - 40/32: rent is asked in the housing step
 * - 54: deleting a life event can be undone
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { BasicInfoStep } from "../steps/BasicInfoStep";
import { IncomeStep } from "../steps/IncomeStep";
import { ExpenseStep } from "../steps/ExpenseStep";
import { HousingStep } from "../steps/HousingStep";
import { LifeEventsStep } from "../steps/LifeEventsStep";
import { InvestmentStep } from "../steps/InvestmentStep";
import { InsuranceStep } from "../steps/InsuranceStep";
import { Toaster } from "@/components/ui/undo-toast";
import { useSimulationStore } from "@/store/simulationStore";

beforeEach(() => {
  localStorage.clear();
  useSimulationStore.setState({
    currentStep: 0,
    input: useSimulationStore.getInitialState().input,
    result: null,
    resultKey: null,
    isCalculating: false,
    savedSimulations: [],
    aiEvaluation: null,
  });
});

const noop = () => {};

describe("edits are kept without pressing 次へ (SHIG 38, 7, 9)", () => {
  it("ExpenseStep writes the living cost to the store on change", async () => {
    render(<ExpenseStep onNext={noop} />);
    const field = screen.getByRole("textbox", { name: "月の生活費" });
    await act(async () => { fireEvent.change(field, { target: { value: "55" } }); });
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(55);
  });

  it("IncomeStep writes the annual income to the store on change", async () => {
    render(<IncomeStep onNext={noop} />);
    const field = screen.getByRole("textbox", { name: "年収（額面）" });
    await act(async () => { fireEvent.change(field, { target: { value: "720" } }); });
    expect(useSimulationStore.getState().input.annualIncome).toBe(720);
  });

  it("LifeEventsStep writes events to the store on change", async () => {
    render(<LifeEventsStep onNext={noop} />);
    await act(async () => { fireEvent.click(screen.getByText("イベントを追加")); });
    expect(useSimulationStore.getState().input.lifeEvents).toHaveLength(3);
  });

  it("BasicInfoStep writes the age derived from the birth year to the store", async () => {
    render(<BasicInfoStep onNext={noop} />);
    const year = screen.getByRole("combobox", { name: "生まれた年" });
    const target = new Date().getFullYear() - 45;
    await act(async () => { fireEvent.change(year, { target: { value: String(target) } }); });
    const age = useSimulationStore.getState().input.age!;
    expect(age === 44 || age === 45).toBe(true);
  });

  it("HousingStep and InvestmentStep and InsuranceStep sync on change", async () => {
    const { unmount } = render(<HousingStep onNext={noop} />);
    await act(async () => { fireEvent.click(screen.getByRole("radio", { name: /購入/ })); });
    expect(useSimulationStore.getState().input.housingType).toBe("buy");
    unmount();

    const inv = render(<InvestmentStep onNext={noop} />);
    await act(async () => {
      fireEvent.change(screen.getByRole("textbox", { name: "現在の貯蓄額" }), { target: { value: "1234" } });
    });
    expect(useSimulationStore.getState().input.currentSavings).toBe(1234);
    inv.unmount();

    render(<InsuranceStep onNext={noop} />);
    await act(async () => {
      fireEvent.change(screen.getByRole("textbox", { name: "月額保険料" }), { target: { value: "2" } });
    });
    expect(useSimulationStore.getState().input.lifeInsurancePremiumMonthly).toBe(2);
  });
});

describe("lenient numeric input (SHIG 50, 46, 55)", () => {
  it("accepts full-width digits and commas", async () => {
    render(<ExpenseStep onNext={noop} />);
    const field = screen.getByRole("textbox", { name: "月の生活費" });
    await act(async () => { fireEvent.change(field, { target: { value: "３２" } }); });
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(32);

    render(<InvestmentStep onNext={noop} />);
    const savings = screen.getByRole("textbox", { name: "現在の貯蓄額" });
    await act(async () => { fireEvent.change(savings, { target: { value: "1,500" } }); });
    expect(useSimulationStore.getState().input.currentSavings).toBe(1500);
  });

  it("an emptied field does not become 0 and shows the kept value again on blur", async () => {
    render(<ExpenseStep onNext={noop} />);
    const field = screen.getByRole("textbox", { name: "月の生活費" }) as HTMLInputElement;
    await act(async () => { fireEvent.focus(field); fireEvent.change(field, { target: { value: "" } }); });
    expect(field.value).toBe("");
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(20);
    await act(async () => { fireEvent.blur(field); });
    expect(field.value).toBe("20");
  });

  it("an out-of-range value is clamped and explained next to the field in Japanese", async () => {
    render(<ExpenseStep onNext={noop} />);
    const field = screen.getByRole("textbox", { name: "月の生活費" });
    await act(async () => { fireEvent.change(field, { target: { value: "500" } }); });
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(200);
    expect(screen.getByText(/200万円 \/ 月までで入力してください/)).toBeTruthy();
    // The summary follows the clamped value, not the rejected one
    expect(screen.queryByText(/6,000万円/)).toBeNull();
  });

  it("non-numeric text is ignored with a hint", async () => {
    render(<ExpenseStep onNext={noop} />);
    const field = screen.getByRole("textbox", { name: "月の生活費" });
    await act(async () => { fireEvent.change(field, { target: { value: "abc" } }); });
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(20);
    expect(screen.getByText(/数字で入力してください/)).toBeTruthy();
  });
});

describe("accessibility (SHIG 94, 48)", () => {
  const steps = [BasicInfoStep, IncomeStep, ExpenseStep, HousingStep, InvestmentStep, InsuranceStep];

  it("every slider and text input on every step has an accessible name", async () => {
    useSimulationStore.setState({
      input: {
        ...useSimulationStore.getInitialState().input,
        hasSpouse: true,
        housingType: "buy",
        children: [{ id: "c1", birthAge: 32, educationPath: "public" }],
        nursingCareStartAge: 80,
      },
    });
    for (const Step of steps) {
      const { unmount, container } = render(<Step onNext={noop} />);
      for (const el of Array.from(container.querySelectorAll('[role="slider"], input[type="text"]'))) {
        const named = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.id && container.querySelector(`label[for="${el.id}"]`);
        expect(named, `${Step.name}: ${el.outerHTML.slice(0, 80)}`).toBeTruthy();
      }
      unmount();
    }
  });

  it("choice buttons expose their selected state as radios", async () => {
    render(<BasicInfoStep onNext={noop} />);
    const group = screen.getByRole("radiogroup", { name: "性別" });
    const male = within(group).getByRole("radio", { name: "男性" });
    expect(male.getAttribute("aria-checked")).toBe("true");
    await act(async () => { fireEvent.click(within(group).getByRole("radio", { name: "女性" })); });
    expect(male.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("radiogroup", { name: "子どもの数" })).toBeTruthy();
  });

  it("the spending-curve switch exposes its state", () => {
    render(<InsuranceStep onNext={noop} />);
    const sw = screen.getByRole("switch", { name: "年齢別支出カーブを使用する" });
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });
});

describe("form story (SHIG 40, 32, 20, 67)", () => {
  it("rent is asked in the housing step, not in the expense step", () => {
    const { unmount } = render(<ExpenseStep onNext={noop} />);
    expect(screen.queryByRole("textbox", { name: "月額家賃" })).toBeNull();
    unmount();
    render(<HousingStep onNext={noop} />);
    expect(screen.getByRole("textbox", { name: "月額家賃" })).toBeTruthy();
  });

  it("rent entered in the housing step reaches the store", async () => {
    render(<HousingStep onNext={noop} />);
    await act(async () => {
      fireEvent.change(screen.getByRole("textbox", { name: "月額家賃" }), { target: { value: "12.5" } });
    });
    expect(useSimulationStore.getState().input.monthlyRent).toBe(12.5);
  });

  it("the annual income comes before the optional pension CSV import", () => {
    render(<IncomeStep onNext={noop} />);
    const income = screen.getByRole("textbox", { name: "年収（額面）" });
    const csv = screen.getByText("ねんきんネット CSV 連携（任意）");
    expect(income.compareDocumentPosition(csv) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("life event delete can be undone (SHIG 54, 94)", () => {
  it("removes at once and restores from the toast", async () => {
    render(<><LifeEventsStep onNext={noop} /><Toaster /></>);
    const del = screen.getByRole("button", { name: "イベント1（結婚式）を削除" });
    await act(async () => { fireEvent.click(del); });
    expect(useSimulationStore.getState().input.lifeEvents).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toMatch(/結婚式を削除しました/);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "元に戻す" })); });
    const events = useSimulationStore.getState().input.lifeEvents!;
    expect(events.map((e) => e.label)).toEqual(["結婚式", "マイカー購入"]);
  });
});
