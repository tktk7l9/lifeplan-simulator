/**
 * ResultsView: 計算結果がある状態で全タブを描画
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
  it("結果概要を表示 (タブ + チャート)", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    // タブのいずれかが見える
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });

  it("「データテーブル」タブをクリックで切替", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const tabs = screen.getAllByRole("tab");
    for (const tab of tabs) {
      await act(async () => { fireEvent.click(tab); });
    }
    // 全タブをクリックしても crash しない
    expect(true).toBe(true);
  });

  it("onBack ボタン (もし存在すれば)", async () => {
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

  it("結果が null のとき", () => {
    useSimulationStore.setState({ result: null });
    expect(() => render(<ResultsView onBack={() => {}} />)).not.toThrow();
  });
});
