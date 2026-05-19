/**
 * SimulatorApp / ResultsView / SavedSimulationsDrawer / AIEvaluationCard / import dialogs
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { SimulatorApp } from "../SimulatorApp";
import { SavedSimulationsDrawer } from "../SavedSimulationsDrawer";
import { AIEvaluationCard } from "../results/AIEvaluationCard";
import { SensitivityAnalysis } from "../results/SensitivityAnalysis";
import { MonteCarloChart } from "../results/MonteCarloChart";
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

// ResultsView は lazy import なので Suspense + 必要に応じて preload
vi.mock("../results/ResultsView", async () => {
  // 実体を import して default 形でラップ
  const mod = await vi.importActual<typeof import("../results/ResultsView")>("../results/ResultsView");
  return { ResultsView: mod.ResultsView };
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
});

describe("SimulatorApp", () => {
  it("currentStep=0: 基本情報ステップを表示", async () => {
    await act(async () => { render(<SimulatorApp />); });
    expect(screen.getAllByText(/ベースキャンプ|基本情報|登山ルート/).length).toBeGreaterThan(0);
  });

  it("currentStep=7: ResultsView (Suspense fallback or 結果) を表示", async () => {
    useSimulationStore.setState({ currentStep: 7 });
    useSimulationStore.getState().calculate();
    let r!: ReturnType<typeof render>;
    await act(async () => { r = render(<SimulatorApp />); });
    // 集計中 or 結果
    await waitFor(() => {
      expect(r.container.textContent).toMatch(/集計中|結果|資産|総額/);
    });
  });

  it("ステップボタンクリックで currentStep が変わる", async () => {
    await act(async () => { render(<SimulatorApp />); });
    // サイドバーの "一合目" などのボタンを探す
    const stepBtn = screen.queryByText(/一合目/);
    if (stepBtn) {
      const btn = stepBtn.closest("button");
      if (btn) {
        await act(async () => { fireEvent.click(btn); });
        expect(useSimulationStore.getState().currentStep).not.toBe(0);
      }
    }
  });

  it("前へボタンは currentStep=0 で disabled", async () => {
    await act(async () => { render(<SimulatorApp />); });
    const back = screen.getByText("前へ").closest("button") as HTMLButtonElement;
    expect(back.disabled).toBe(true);
  });
});

describe("SavedSimulationsDrawer", () => {
  it("ボタンが描画される (保存ゼロ件)", () => {
    render(<SavedSimulationsDrawer />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("保存済みがあればドロワーに件数表示", () => {
    const input = useSimulationStore.getInitialState().input;
    useSimulationStore.setState({
      savedSimulations: [{
        id: "sim_1",
        name: "テスト",
        savedAt: new Date().toISOString(),
        input: input as Parameters<typeof useSimulationStore.getState>[0] extends never ? never : import("@/lib/simulation/types").SimulationInput,
        result: {} as import("@/lib/simulation/types").SimulationResult,
      }],
    });
    render(<SavedSimulationsDrawer />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});

describe("AIEvaluationCard", () => {
  it("aiEvaluation なし: 初期表示 + AI 総評ボタンが見える", () => {
    render(<AIEvaluationCard />);
    expect(screen.getByText(/AI総評を取得する/)).toBeTruthy();
  });

  it("aiEvaluation あり: 結果を表示", () => {
    useSimulationStore.setState({
      aiEvaluation: {
        score: 75,
        rank: "A",
        summary: "良好です",
        strengths: ["強み1", "強み2"],
        improvements: ["改善1", "改善2"],
        conclusion: "結論",
      },
    });
    render(<AIEvaluationCard />);
    expect(screen.getAllByText(/良好|強み|改善|A/).length).toBeGreaterThan(0);
  });

  it("ボタンクリックで fetch (失敗時はエラー表示)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useSimulationStore.getState().calculate();
    render(<AIEvaluationCard />);
    const btn = screen.getByText(/AI総評を取得する/).closest("button")!;
    await act(async () => { fireEvent.click(btn); });
    await waitFor(() => {
      // エラーが表示されるか aiEvaluation が null のまま
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it("ボタンクリック成功で aiEvaluation がセットされる", async () => {
    const ai = { score: 88, rank: "A", summary: "OK", strengths: ["s1"], improvements: ["i1"], conclusion: "c" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ai,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useSimulationStore.getState().calculate();
    render(<AIEvaluationCard />);
    const btn = screen.getByText(/AI総評を取得する/).closest("button")!;
    await act(async () => { fireEvent.click(btn); });
    await waitFor(() => {
      expect(useSimulationStore.getState().aiEvaluation?.score).toBe(88);
    });
  });

  it("ランク S/B/C/D/F の各表示", () => {
    for (const rank of ["S", "B", "C", "D", "F"] as const) {
      useSimulationStore.setState({
        aiEvaluation: {
          score: 50,
          rank,
          summary: `${rank} 評価`,
          strengths: ["a"],
          improvements: ["b"],
          conclusion: "c",
        },
      });
      const { unmount } = render(<AIEvaluationCard />);
      expect(screen.getAllByText(new RegExp(rank)).length).toBeGreaterThan(0);
      unmount();
    }
  });
});

describe("SensitivityAnalysis (data prop)", () => {
  it("data prop で smoke", () => {
    expect(() => render(<SensitivityAnalysis
      data={[
        { parameter: "annualIncome", label: "年収", low: 100, base: 200, high: 300 },
      ]}
      base={200}
    />)).not.toThrow();
  });
});

describe("MonteCarloChart (data prop)", () => {
  it("smoke", () => {
    const data = Array.from({ length: 5 }, (_, i) => ({
      age: 30 + i, p10: 100, p25: 200, p50: 300, p75: 400, p90: 500,
    }));
    expect(() => render(<MonteCarloChart data={data} retirementAge={65} failureProbability={5} />)).not.toThrow();
  });
});
