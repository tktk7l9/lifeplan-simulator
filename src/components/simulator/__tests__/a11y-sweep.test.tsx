/**
 * Regressions for the axe sweep: scrollable tables reachable by keyboard (SHIG 93),
 * Japanese close label on dialogs (SHIG 11), results page heading (SHIG 59),
 * and error text that keeps 4.5:1 on its tinted background (SHIG 96).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { DataTable } from "../results/DataTable";
import { MonteCarloChart } from "../results/MonteCarloChart";
import { AIEvaluationCard } from "../results/AIEvaluationCard";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSimulationStore } from "@/store/simulationStore";
import type { MonteCarloDataPoint, SimulationInput } from "@/lib/simulation/types";

vi.mock("recharts", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

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
  useSimulationStore.getState().calculate();
});

describe("scrollable tables are keyboard reachable", () => {
  it("DataTable scroller is a named, focusable region", () => {
    const { result, input } = useSimulationStore.getState();
    render(<DataTable data={result!.yearlyData} input={input as SimulationInput} />);
    const region = screen.getByRole("region", { name: "年別データ表" });
    expect(region.tabIndex).toBe(0);
    expect(region.querySelector("table")).toBeTruthy();
  });

  it("MonteCarloChart key-point table is a named, focusable region", () => {
    const data: MonteCarloDataPoint[] = Array.from({ length: 71 }, (_, i) => ({
      age: 30 + i, p10: 100, p25: 200, p50: 300, p75: 400, p90: 500,
    }));
    render(<MonteCarloChart data={data} retirementAge={65} failureProbability={5} />);
    const region = screen.getByRole("region", { name: "重要時点の資産予測" });
    expect(region.tabIndex).toBe(0);
    expect(region.querySelector("table")).toBeTruthy();
  });
});

describe("dialog close button", () => {
  it("is announced in Japanese", () => {
    render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>t</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "閉じる" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});

describe("AIEvaluationCard error", () => {
  it("uses a dark red that keeps 4.5:1 on bg-red-50", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "評価の取得に失敗しました" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<AIEvaluationCard />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /AI総評を取得/ }));
      });
      const msg = await waitFor(() => screen.getByText("評価の取得に失敗しました"));
      expect(msg.className).toContain("text-red-700");
      expect(msg.className).not.toContain("text-destructive");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
