/**
 * IncomeStep: optional income sources, the pension CSV import and the spouse section.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { IncomeStep } from "../steps/IncomeStep";
import { useSimulationStore } from "@/store/simulationStore";

vi.mock("@/lib/import/nenkinCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      [
        "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
        "厚生年金,A社,平成20年4月,令和3年3月,300000,156",
        "国民年金,,令和3年4月,令和5年3月,0,24",
      ].join("\n"),
    ),
  };
});

beforeEach(() => {
  localStorage.clear();
  useSimulationStore.setState({
    currentStep: 1,
    input: useSimulationStore.getInitialState().input,
    result: null,
    isCalculating: false,
    savedSimulations: [],
    aiEvaluation: null,
  });
});

const store = () => useSimulationStore.getState().input;
const setInput = (patch: Partial<ReturnType<typeof store>>) =>
  useSimulationStore.setState({ input: { ...store(), ...patch } });

async function pressKey(el: HTMLElement, key: string, times = 1) {
  for (let i = 0; i < times; i++) {
    await act(async () => { fireEvent.keyDown(el, { key }); });
  }
}

describe("pension CSV import (ねんきんネット)", () => {
  it("applying a record shows what was read, switches 自営業 to an employee, and the notice can be dismissed", async () => {
    setInput({ employmentType: "self_employed" });
    render(<IncomeStep onNext={() => {}} />);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /ねんきんネット連携/ })); });
    const dialog = screen.getByRole("dialog");
    const file = new File(["x"], "nenkin.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(dialog.querySelector('input[type="file"]')!, { target: { files: [file] } });
    });
    const apply = await within(dialog).findByRole("button", { name: /反映/ });
    await act(async () => { fireEvent.click(apply); });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("読み込みました")).toBeTruthy();
    expect(screen.getByText(/厚生年金 156ヶ月 \/ 国民年金 24ヶ月/)).toBeTruthy();
    const employment = screen.getByRole("radiogroup", { name: "雇用形態" });
    expect(within(employment).getByRole("radio", { name: /^会社員厚生年金あり/ }).getAttribute("aria-checked")).toBe("true");
    await waitFor(() => expect(store().employmentType).toBe("employee"));

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "閉じる" })); });
    expect(screen.queryByText("読み込みました")).toBeNull();
  });
});

describe("optional income sources", () => {
  it("re-employment income after retirement: the switch reveals its fields and the values are stored", async () => {
    render(<IncomeStep onNext={() => {}} />);
    expect(screen.queryByRole("slider", { name: "働く期間（終了年齢）" })).toBeNull();

    const sw = screen.getByRole("switch", { name: "退職後の再雇用・パート収入" });
    await act(async () => { fireEvent.click(sw); });
    expect(sw.getAttribute("aria-checked")).toBe("true");

    const monthly = screen.getByRole("textbox", { name: "再雇用月収" });
    await act(async () => { fireEvent.change(monthly, { target: { value: "18" } }); });
    const until = screen.getByRole("slider", { name: "働く期間（終了年齢）" });
    const start = Number(until.getAttribute("aria-valuenow"));
    await pressKey(until, "ArrowRight", 2);
    expect(screen.getByText(`${start + 2}歳まで`)).toBeTruthy();

    await waitFor(() => {
      expect(store().postRetirementIncomeMonthly).toBe(18);
      expect(store().postRetirementIncomeUntilAge).toBe(start + 2);
    });

    // Turning it off again zeroes the income rather than keeping a hidden value
    await act(async () => { fireEvent.click(sw); });
    await waitFor(() => expect(store().postRetirementIncomeMonthly).toBe(0));
  });

  it("freelance with an officer salary shows the combined gross and take-home estimate", async () => {
    setInput({ employmentType: "freelance", annualIncome: 600 });
    render(<IncomeStep onNext={() => {}} />);
    expect(screen.queryByText("合算総収入（月換算）")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "会社役員報酬（不動産管理会社等）あり" }));
    });
    await act(async () => {
      fireEvent.change(screen.getByRole("textbox", { name: "役員報酬（年額）" }), { target: { value: "240" } });
    });
    expect(screen.getByText("合算総収入（月換算）")).toBeTruthy();
    // (600 + 240) / 12 = 70.0
    expect(screen.getByText("70.0万円/月")).toBeTruthy();
    expect(screen.getByText("推計手取り（合算・税社保控除後）")).toBeTruthy();
  });
});

describe("employment type", () => {
  it("会社員＋副業 turns the side-income switch on, and 次へ進む stores the choice", async () => {
    const onNext = vi.fn();
    render(<IncomeStep onNext={onNext} />);
    const side = screen.getByRole("switch", { name: "副業・その他収入" });
    expect(side.getAttribute("aria-checked")).toBe("false");

    const group = screen.getByRole("radiogroup", { name: "雇用形態" });
    await act(async () => { fireEvent.click(within(group).getByRole("radio", { name: /^会社員＋副業/ })); });
    expect(side.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("textbox", { name: "副業月収" })).toBeTruthy();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "次へ進む" })); });
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(store().employmentType).toBe("employee_freelance");
  });
});

describe("spouse income", () => {
  it("is hidden without a spouse", () => {
    render(<IncomeStep onNext={() => {}} />);
    expect(screen.queryByRole("radiogroup", { name: "配偶者の雇用形態" })).toBeNull();
  });

  it("choosing the spouse's employment type and a career break is stored", async () => {
    setInput({ hasSpouse: true, spouseAge: 30 });
    render(<IncomeStep onNext={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "配偶者の雇用形態" });
    await act(async () => { fireEvent.click(within(group).getByRole("radio", { name: /^パート/ })); });
    expect(within(group).getByRole("radio", { name: /^パート/ }).getAttribute("aria-checked")).toBe("true");
    await waitFor(() => expect(store().spouseEmploymentType).toBe("part_time"));

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "キャリアブレーク（産休・育休など）" }));
    });
    const breakStart = screen.getByRole("slider", { name: "ブレーク開始年齢" });
    await pressKey(breakStart, "Home");
    await waitFor(() => expect(store().spouseCareerBreakStartAge).toBe(20));
  });
});
