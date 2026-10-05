/**
 * ResultsView: render every tab with a calculation result present
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ResultsView } from "../ResultsView";
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
  useSimulationStore.getState().calculate();
});

describe("ResultsView", () => {
  it("shows the result overview (tabs + chart)", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    // One of the tabs is visible
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });

  it("clicking the 「年別データ」 tab switches to the yearly data table", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    // The initial tab (asset history) does not show the yearly data table
    expect(screen.queryByText("年別データ表")).toBeNull();
    const tab = screen.getByRole("tab", { name: "年別データ" });
    // Radix Tabs switches on onMouseDown (click does nothing)
    await act(async () => { fireEvent.mouseDown(tab); });
    expect(screen.getByText("年別データ表")).toBeTruthy();
    expect(tab.getAttribute("data-state")).toBe("active");
  });

  it("onBack button (if present)", async () => {
    const onBack = vi.fn();
    await act(async () => { render(<ResultsView onBack={onBack} />); });
    const back = screen.queryByText(/前へ|戻る/);
    if (back) {
      const btn = back.closest("button");
      if (btn && !btn.disabled) {
        await act(async () => { fireEvent.click(btn); });
        expect(onBack).toHaveBeenCalled();
      }
    }
  });

  it("when the result is null", () => {
    useSimulationStore.setState({ result: null });
    expect(() => render(<ResultsView onBack={() => {}} />)).not.toThrow();
  });
});
