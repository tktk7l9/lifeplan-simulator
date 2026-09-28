/**
 * SHIG 2nd round — results, saved simulations and app chrome.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { ResultsView } from "../results/ResultsView";
import { SavedSimulationsDrawer } from "../SavedSimulationsDrawer";
import { SimulatorApp } from "../SimulatorApp";
import { AIEvaluationCard } from "../results/AIEvaluationCard";
import { DataTable } from "../results/DataTable";
import { Toaster } from "@/components/ui/undo-toast";
import { useSimulationStore, RESULT_STEP } from "@/store/simulationStore";
import { findDepletion } from "@/lib/simulation/depletion";
import type { SimulationInput, SimulationResult, YearlyData } from "@/lib/simulation/types";

vi.mock("recharts", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock("../results/ResultsView", async () => {
  const mod = await vi.importActual<typeof import("../results/ResultsView")>("../results/ResultsView");
  return { ResultsView: mod.ResultsView };
});

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

function row(age: number, cumulativeAssets: number, netCashFlow = 0): YearlyData {
  return {
    year: 2026 + age, age, income: 0, spouseIncome: 0, livingExpense: 0, housingCost: 0,
    educationCost: 0, lifeEventCost: 0, medicalCost: 0, totalExpense: 0, netCashFlow,
    cumulativeAssets, investmentAssets: 0, savingsAssets: cumulativeAssets,
  };
}

function makeSim(id: string, name = `保存-${id}`) {
  return {
    id,
    name,
    savedAt: new Date().toISOString(),
    input: { ...(useSimulationStore.getInitialState().input as SimulationInput), monthlyLivingExpense: 99 },
    result: {
      retirementAssets: 5000, finalAssets: 3000, isRetirementSafe: true, totalIncome: 1, totalExpense: 1,
      pensionMonthly: 18, spousePensionMonthly: 0, yearlyData: [], notes: [],
    } as SimulationResult,
  };
}

describe("findDepletion (SHIG 28)", () => {
  it("returns the first age with negative assets and the deepest shortfall", () => {
    expect(findDepletion([row(80, 100), row(81, -50), row(82, -300), row(83, -200)]))
      .toEqual({ age: 81, maxShortfall: 300 });
  });
  it("returns null when money lasts", () => {
    expect(findDepletion([row(80, 100), row(81, 0)])).toBeNull();
  });
});

describe("result view is bound to input (SHIG 35, 29, 55)", () => {
  it("jumping to the summit on a fresh session shows a result, not an empty state", async () => {
    await act(async () => { render(<SimulatorApp />); });
    const summit = screen.getAllByRole("button", { name: /シミュレーション結果/ })[0];
    await act(async () => { fireEvent.click(summit); });
    await waitFor(() => expect(screen.getAllByText("退職時資産").length).toBeGreaterThan(0));
    expect(screen.queryByText("シミュレーション結果がありません")).toBeNull();
  });

  it("the empty state offers to calculate with the current input", async () => {
    useSimulationStore.setState({ currentStep: RESULT_STEP });
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "この条件で計算する" })); });
    expect(useSimulationStore.getState().result).not.toBeNull();
  });

  it("the diagnosis card states the age money runs out and the shortfall", async () => {
    useSimulationStore.setState({ input: { ...useSimulationStore.getInitialState().input, monthlyLivingExpense: 60 } });
    useSimulationStore.getState().setStep(RESULT_STEP);
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const d = findDepletion(useSimulationStore.getState().result!.yearlyData)!;
    expect(d).not.toBeNull();
    expect(screen.getAllByText(`${d.age}歳で資産が尽きる`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/最大不足額/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "改善策を見る" }).getAttribute("href")).toBe("#action-plan");
  });

  it("does not claim that analysis tabs need a click; they are preloaded", async () => {
    useSimulationStore.getState().setStep(RESULT_STEP);
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    expect(screen.queryByText(/タブをクリックして計算します/)).toBeNull();
  });

  it("names the print button for what it does (SHIG 11, 47)", async () => {
    useSimulationStore.getState().setStep(RESULT_STEP);
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    expect(screen.getByRole("button", { name: "印刷 / PDFに保存" })).toBeTruthy();
  });

  it("the tab bar scrolls instead of wrapping behind the panel (SHIG 52, 85)", async () => {
    useSimulationStore.getState().setStep(RESULT_STEP);
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const list = screen.getByRole("tablist");
    expect(list.className).toMatch(/flex-nowrap/);
    expect(list.className).not.toMatch(/flex-wrap(?!-)/);
  });
});

describe("save closes at once and confirms with a toast (SHIG 57, 66)", () => {
  it("closes the dialog immediately and shows a toast", async () => {
    useSimulationStore.getState().setStep(RESULT_STEP);
    await act(async () => { render(<><ResultsView onBack={() => {}} /><Toaster /></>); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /シミュレーションを保存/ })); });
    const name = await screen.findByPlaceholderText(/楽観シナリオ/);
    await act(async () => { fireEvent.change(name, { target: { value: "案A" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "保存する" })); });
    expect(useSimulationStore.getState().savedSimulations).toHaveLength(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("status").textContent).toMatch(/「案A」を保存しました/);
  });
});

describe("saved simulations: undo instead of confirm, delete kept apart (SHIG 57, 54, 16, 78)", () => {
  it("deletes at once and restores from the toast", async () => {
    useSimulationStore.setState({ savedSimulations: [makeSim("a"), makeSim("b")] });
    render(<><SavedSimulationsDrawer /><Toaster /></>);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /保存済み/ })); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "保存-aを削除" })); });
    expect(useSimulationStore.getState().savedSimulations.map((s) => s.id)).toEqual(["b"]);
    expect(screen.queryByText(/本当に削除/)).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "元に戻す" })); });
    expect(useSimulationStore.getState().savedSimulations.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("moves keyboard focus to 元に戻す when the pressed delete button disappears", async () => {
    useSimulationStore.setState({ savedSimulations: [makeSim("a"), makeSim("b")] });
    render(<SavedSimulationsDrawer />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /保存済み/ })); });
    const del = screen.getByRole("button", { name: "保存-aを削除" });
    del.focus();
    await act(async () => { fireEvent.click(del); });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "元に戻す" }));
  });

  it("the delete button is not in the same row as 読み込む", async () => {
    useSimulationStore.setState({ savedSimulations: [makeSim("a")] });
    render(<SavedSimulationsDrawer />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /保存済み/ })); });
    const load = screen.getByRole("button", { name: /読み込む/ });
    const del = screen.getByRole("button", { name: "保存-aを削除" });
    expect(load.parentElement).not.toBe(del.parentElement);
  });

  it("loading can be undone and brings back the unsaved input", async () => {
    useSimulationStore.setState({ savedSimulations: [makeSim("a")], currentStep: 3 });
    useSimulationStore.getState().updateInput({ monthlyLivingExpense: 42 });
    render(<><SavedSimulationsDrawer /><Toaster /></>);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /保存済み/ })); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /読み込む/ })); });
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(99);
    expect(screen.getByRole("status").textContent).toMatch(/「保存-a」を読み込みました/);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "元に戻す" })); });
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(42);
    expect(useSimulationStore.getState().currentStep).toBe(3);
  });
});

describe("start over with undo (SHIG 38, 54, 60)", () => {
  it("resets input and restores it from the toast", async () => {
    useSimulationStore.getState().updateInput({ monthlyLivingExpense: 42 });
    useSimulationStore.setState({ currentStep: 2 });
    await act(async () => { render(<SimulatorApp />); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "最初からやり直す" })); });
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(20);
    expect(useSimulationStore.getState().currentStep).toBe(0);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "元に戻す" })); });
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(42);
    expect(useSimulationStore.getState().currentStep).toBe(2);
  });
});

describe("step forms never show values other than the store's (SHIG 38, 54)", () => {
  it("resetting on the first step clears the visible form, and undo brings it back", async () => {
    await act(async () => { render(<SimulatorApp />); });
    await act(async () => { fireEvent.click(screen.getByRole("radio", { name: "女性" })); });
    expect(useSimulationStore.getState().input.gender).toBe("female");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "最初からやり直す" })); });
    expect(useSimulationStore.getState().input.gender).toBe("male");
    expect(screen.getByRole("radio", { name: "男性" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "女性" }).getAttribute("aria-checked")).toBe("false");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "元に戻す" })); });
    expect(useSimulationStore.getState().input.gender).toBe("female");
    expect(screen.getByRole("radio", { name: "女性" }).getAttribute("aria-checked")).toBe("true");
  });

  it("a form mounted before rehydration shows the persisted input afterwards", async () => {
    await act(async () => { render(<SimulatorApp />); });
    expect(screen.getByRole("radio", { name: "男性" }).getAttribute("aria-checked")).toBe("true");
    const persisted = {
      state: {
        savedSimulations: [],
        input: { ...useSimulationStore.getInitialState().input, gender: "female", hasSpouse: true },
        currentStep: 0,
        result: null,
        resultKey: null,
      },
      version: 0,
    };
    localStorage.setItem("lifeplan-simulator-store", JSON.stringify(persisted));
    await act(async () => { await useSimulationStore.persist.rehydrate(); });
    expect(screen.getByRole("radio", { name: "女性" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "あり" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("AI evaluation: 再評価 re-runs and keeps the old result meanwhile (SHIG 11, 47, 54)", () => {
  it("re-evaluates instead of discarding", async () => {
    useSimulationStore.getState().setStep(RESULT_STEP);
    const first = { score: 60, rank: "C" as const, summary: "旧評価", strengths: [], improvements: [], conclusion: "" };
    const second = { ...first, score: 80, rank: "A" as const, summary: "新評価" };
    useSimulationStore.getState().setAiEvaluation(first);
    let resolve!: (v: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((r) => { resolve = r; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AIEvaluationCard />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "再評価" })); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("旧評価")).toBeTruthy();
    await act(async () => { resolve(new Response(JSON.stringify(second), { status: 200 })); });
    await waitFor(() => expect(screen.getByText("新評価")).toBeTruthy());
    vi.unstubAllGlobals();
  });
});

describe("deficit years are not marked by color only (SHIG 96)", () => {
  it("marks deficit rows with text", () => {
    render(<DataTable data={[row(40, 100, 10), row(41, 50, -50)]} input={{ retirementAge: 65 }} />);
    const rows = screen.getAllByRole("row");
    const deficit = rows.find((r) => within(r).queryByText("41歳"))!;
    expect(within(deficit).getByText("赤字")).toBeTruthy();
    const surplus = rows.find((r) => within(r).queryByText("40歳"))!;
    expect(within(surplus).queryByText("赤字")).toBeNull();
  });
});

describe("mobile trail targets are at least 44px (SHIG 78, 93)", () => {
  it("each step dot button has a 44px hit area", async () => {
    await act(async () => { render(<SimulatorApp />); });
    const dots = screen.getAllByRole("button", { name: /^(BC|\d|🚩): / });
    expect(dots.length).toBe(8);
    for (const d of dots) expect(d.className).toMatch(/min-h-11/);
  });
});
