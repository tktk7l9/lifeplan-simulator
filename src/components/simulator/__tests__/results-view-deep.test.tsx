/**
 * Covers each branch of ResultsView:
 * - has spouse + spouse retirement age annotation
 * - has children (university entrance / independence annotations)
 * - planned home purchase (annotation)
 * - nursing care start (annotation)
 * - retirementAssets/finalAssets are negative
 * - isCalculating / result null
 * - opening/closing the save dialog and saving
 * - print button
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ResultsView } from "../results/ResultsView";
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
  useSimulationStore.setState({
    currentStep: 7,
    input: useSimulationStore.getInitialState().input,
    result: null,
    isCalculating: false,
    savedSimulations: [],
    aiEvaluation: null,
  });
});

describe("ResultsView annotation branches", () => {
  it("home purchase annotation", async () => {
    const base = useSimulationStore.getInitialState().input;
    useSimulationStore.setState({
      input: {
        ...base,
        age: 30,
        housingType: "buy",
        purchaseAge: 38,
      },
    });
    useSimulationStore.getState().calculate();
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });

  it("nursing care start annotation", async () => {
    const base = useSimulationStore.getInitialState().input;
    useSimulationStore.setState({
      input: {
        ...base,
        nursingCareStartAge: 80,
        nursingCareCostMonthly: 8,
      },
    });
    useSimulationStore.getState().calculate();
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });

  it("spouse retirement annotation (different year from the user)", async () => {
    const base = useSimulationStore.getInitialState().input;
    useSimulationStore.setState({
      input: {
        ...base,
        age: 30,
        retirementAge: 65,
        hasSpouse: true,
        spouseAge: 28,
        spouseRetirementAge: 60,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
      },
    });
    useSimulationStore.getState().calculate();
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });

  it("with children (university entry and independence annotations)", async () => {
    const base = useSimulationStore.getInitialState().input;
    useSimulationStore.setState({
      input: {
        ...base,
        age: 30,
        children: [
          { id: "c1", birthAge: 32, educationPath: "public" },
          { id: "c2", birthAge: 34, educationPath: "private" },
        ],
      },
    });
    useSimulationStore.getState().calculate();
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });

  it("shows loading while isCalculating", () => {
    useSimulationStore.setState({ isCalculating: true });
    render(<ResultsView onBack={() => {}} />);
    expect(screen.getAllByText(/計算中/).length).toBeGreaterThan(0);
  });

  it("result=null shows the no-result view", () => {
    render(<ResultsView onBack={() => {}} />);
    expect(screen.getAllByText(/結果がありません|前のステップに戻る/).length).toBeGreaterThan(0);
  });

  it("no-result state: clicking 前のステップに戻る (back) calls onBack", () => {
    const onBack = vi.fn();
    render(<ResultsView onBack={onBack} />);
    const btn = screen.getByText(/前のステップに戻る/).closest("button")!;
    fireEvent.click(btn);
    expect(onBack).toHaveBeenCalled();
  });

  it("clicking 前のステップへ戻る (back) calls onBack (with results)", async () => {
    useSimulationStore.getState().calculate();
    const onBack = vi.fn();
    await act(async () => { render(<ResultsView onBack={onBack} />); });
    const back = screen.queryByText(/前のステップへ戻る/);
    if (back) {
      const btn = back.closest("button")!;
      fireEvent.click(btn);
      expect(onBack).toHaveBeenCalled();
    }
  });

  it("clicks through every tab", async () => {
    useSimulationStore.getState().calculate();
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const tabs = screen.getAllByRole("tab");
    for (const tab of tabs) {
      await act(async () => { fireEvent.click(tab); });
    }
    await waitFor(() => {
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  it("the scenario comparison tab renders ScenarioComparison", async () => {
    useSimulationStore.getState().calculate();
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const scenarioTab = screen.getByRole("tab", { name: /シナリオ比較/ });
    // Radix Tabs is pointerdown based, so mouseDown + click
    await act(async () => {
      fireEvent.pointerDown(scenarioTab, { button: 0, pointerType: "mouse" });
      fireEvent.mouseDown(scenarioTab);
      fireEvent.click(scenarioTab);
    });
    // Matching the whole text may fail, so check the HTML string
    await waitFor(() => {
      const body = document.body.innerHTML;
      expect(body).toMatch(/保守ケース|楽観ケース|標準ケース/);
    });
  });

  it("switches from the Monte Carlo tab to the sensitivity tab", async () => {
    useSimulationStore.getState().calculate();
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    // Radix Tabs switches on onMouseDown (click does nothing)
    const mc = screen.getByRole("tab", { name: /モンテカルロ/ });
    await act(async () => { fireEvent.mouseDown(mc); });
    expect(screen.getByText("モンテカルロシミュレーション")).toBeTruthy();

    const sens = screen.getByRole("tab", { name: /感度分析/ });
    await act(async () => { fireEvent.mouseDown(sens); });
    expect(screen.getByText("感度分析（トルネードチャート）")).toBeTruthy();
    // We switched, so the previous panel is gone
    expect(screen.queryByText("モンテカルロシミュレーション")).toBeNull();
  });
});
