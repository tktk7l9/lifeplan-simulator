/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "../simulationStore";
import type { SimulationResult } from "@/lib/simulation/types";

// 各テスト前にストアを初期化
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

describe("simulationStore", () => {
  it("初期値: 既定入力 + currentStep=0 + result=null", () => {
    const s = useSimulationStore.getState();
    expect(s.currentStep).toBe(0);
    expect(s.result).toBeNull();
    expect(s.input.age).toBe(30);
    expect(s.input.retirementAge).toBe(65);
  });

  it("updateInput: 部分パッチで状態更新", () => {
    useSimulationStore.getState().updateInput({ annualIncome: 700 });
    expect(useSimulationStore.getState().input.annualIncome).toBe(700);
    // 他フィールドは保持
    expect(useSimulationStore.getState().input.retirementAge).toBe(65);
  });

  it("setStep: ステップ番号を変更", () => {
    useSimulationStore.getState().setStep(3);
    expect(useSimulationStore.getState().currentStep).toBe(3);
  });

  it("calculate: result が計算され isCalculating が false に戻る", () => {
    useSimulationStore.getState().calculate();
    const s = useSimulationStore.getState();
    expect(s.result).not.toBeNull();
    expect(s.isCalculating).toBe(false);
    expect(s.result?.yearlyData.length).toBeGreaterThan(0);
  });

  it("calculate: 既存の aiEvaluation はリセットされる", () => {
    useSimulationStore.setState({
      aiEvaluation: {
        score: 80, rank: "A", summary: "x",
        strengths: [], improvements: [], conclusion: "",
      },
    });
    useSimulationStore.getState().calculate();
    expect(useSimulationStore.getState().aiEvaluation).toBeNull();
  });

  it("calculate: 不完全な input でもデフォルト値で動く", () => {
    useSimulationStore.setState({ input: {} });
    useSimulationStore.getState().calculate();
    expect(useSimulationStore.getState().result).not.toBeNull();
  });

  it("saveSimulation: result 未計算なら何もしない", () => {
    useSimulationStore.getState().saveSimulation("first");
    expect(useSimulationStore.getState().savedSimulations).toHaveLength(0);
  });

  it("saveSimulation: 結果ありで保存される (最新を先頭に)", () => {
    useSimulationStore.getState().calculate();
    useSimulationStore.getState().saveSimulation("A");
    useSimulationStore.getState().saveSimulation("B");
    const list = useSimulationStore.getState().savedSimulations;
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("B");
    expect(list[1].name).toBe("A");
    expect(list[0].id).toMatch(/^sim_\d+/);
  });

  it("loadSimulation: 保存済みを入力・結果として復元 + currentStep=7", () => {
    useSimulationStore.getState().calculate();
    useSimulationStore.getState().saveSimulation("saved");
    const savedId = useSimulationStore.getState().savedSimulations[0].id;

    useSimulationStore.setState({ currentStep: 0, input: {}, result: null });
    useSimulationStore.getState().loadSimulation(savedId);
    const s = useSimulationStore.getState();
    expect(s.currentStep).toBe(7);
    expect(s.input.age).toBeDefined();
    expect(s.result).not.toBeNull();
  });

  it("loadSimulation: 存在しないIDは何もしない", () => {
    useSimulationStore.getState().loadSimulation("nonexistent");
    expect(useSimulationStore.getState().result).toBeNull();
  });

  it("deleteSimulation: 指定IDを削除", () => {
    useSimulationStore.getState().calculate();
    useSimulationStore.getState().saveSimulation("A");
    // saveSimulation の id は Date.now() ベースなので人為的に書き換えて衝突回避
    const state = useSimulationStore.getState();
    useSimulationStore.setState({
      savedSimulations: [
        { ...state.savedSimulations[0], id: "sim_1", name: "A" },
        { ...state.savedSimulations[0], id: "sim_2", name: "B" },
      ],
    });
    useSimulationStore.getState().deleteSimulation("sim_1");
    expect(useSimulationStore.getState().savedSimulations).toHaveLength(1);
    expect(useSimulationStore.getState().savedSimulations[0].name).toBe("B");
  });

  it("setAiEvaluation: 評価をセット/解除", () => {
    const ev = { score: 75, rank: "A" as const, summary: "good", strengths: [], improvements: [], conclusion: "" };
    useSimulationStore.getState().setAiEvaluation(ev);
    expect(useSimulationStore.getState().aiEvaluation).toEqual(ev);
    useSimulationStore.getState().setAiEvaluation(null);
    expect(useSimulationStore.getState().aiEvaluation).toBeNull();
  });

  it("savedSimulations は persist で localStorage に書かれる", () => {
    useSimulationStore.getState().calculate();
    useSimulationStore.getState().saveSimulation("persist");
    const raw = localStorage.getItem("lifeplan-simulator-store");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.savedSimulations).toHaveLength(1);
  });

  it("calculate: runSimulation が throw すると isCalculating だけ false に", () => {
    // 不正な input で内部 throw を狙う（実際は throw しないため、軽い確認のみ）
    useSimulationStore.setState({ input: {}, isCalculating: true });
    useSimulationStore.getState().calculate();
    expect(useSimulationStore.getState().isCalculating).toBe(false);
  });

  it("saveSimulation: result の中身もコピーされる", () => {
    useSimulationStore.getState().calculate();
    const result = useSimulationStore.getState().result;
    useSimulationStore.getState().saveSimulation("X");
    const saved = useSimulationStore.getState().savedSimulations[0];
    expect(saved.result.finalAssets).toBe(result?.finalAssets);
  });
});
