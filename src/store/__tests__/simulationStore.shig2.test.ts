/**
 * @vitest-environment jsdom
 * SHIG 2nd round: results bound to input (35, 29), user input is kept (38, 97),
 * fail-safe undo instead of confirmation (54, 57).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore, RESULT_STEP } from "../simulationStore";

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

describe("results are bound to input (SHIG 35, 29)", () => {
  it("entering the result step computes a result without pressing the last step's button", () => {
    useSimulationStore.getState().setStep(RESULT_STEP);
    expect(useSimulationStore.getState().result).not.toBeNull();
  });

  it("entering the result step after an edit recomputes the result", () => {
    const s = useSimulationStore.getState();
    s.setStep(RESULT_STEP);
    const before = useSimulationStore.getState().result!.finalAssets;
    s.setStep(2);
    s.updateInput({ monthlyLivingExpense: 60 });
    s.setStep(RESULT_STEP);
    expect(useSimulationStore.getState().result!.finalAssets).toBeLessThan(before);
  });

  it("re-entering the result step without edits keeps the AI evaluation", () => {
    const s = useSimulationStore.getState();
    s.setStep(RESULT_STEP);
    const ev = { score: 70, rank: "B" as const, summary: "", strengths: [], improvements: [], conclusion: "" };
    s.setAiEvaluation(ev);
    s.setStep(3);
    s.setStep(RESULT_STEP);
    expect(useSimulationStore.getState().aiEvaluation).toEqual(ev);
  });
});

describe("persistence (SHIG 38, 97)", () => {
  it("persists input and the current step, not only saved simulations", () => {
    const s = useSimulationStore.getState();
    s.updateInput({ monthlyLivingExpense: 33 });
    s.setStep(3);
    const parsed = JSON.parse(localStorage.getItem("lifeplan-simulator-store")!);
    expect(parsed.state.input.monthlyLivingExpense).toBe(33);
    expect(parsed.state.currentStep).toBe(3);
  });

  it("resetInput restores defaults and returns a snapshot that restoreSession brings back", () => {
    const s = useSimulationStore.getState();
    s.updateInput({ monthlyLivingExpense: 44 });
    s.setStep(RESULT_STEP);
    const snap = s.resetInput();
    let now = useSimulationStore.getState();
    expect(now.input.monthlyLivingExpense).toBe(20);
    expect(now.currentStep).toBe(0);
    expect(now.result).toBeNull();
    now.restoreSession(snap);
    now = useSimulationStore.getState();
    expect(now.input.monthlyLivingExpense).toBe(44);
    expect(now.currentStep).toBe(RESULT_STEP);
    expect(now.result).not.toBeNull();
  });
});

describe("undo instead of confirmation (SHIG 54, 57)", () => {
  function seedTwo() {
    const s = useSimulationStore.getState();
    s.calculate();
    s.saveSimulation("A");
    const base = useSimulationStore.getState().savedSimulations[0];
    useSimulationStore.setState({
      savedSimulations: [
        { ...base, id: "sim_1", name: "A" },
        { ...base, id: "sim_2", name: "B" },
      ],
    });
  }

  it("deleteSimulation returns what was removed and restoreSimulation puts it back in place", () => {
    seedTwo();
    const removed = useSimulationStore.getState().deleteSimulation("sim_1");
    expect(removed?.sim.name).toBe("A");
    expect(useSimulationStore.getState().savedSimulations.map((x) => x.id)).toEqual(["sim_2"]);
    useSimulationStore.getState().restoreSimulation(removed!.sim, removed!.index);
    expect(useSimulationStore.getState().savedSimulations.map((x) => x.id)).toEqual(["sim_1", "sim_2"]);
  });

  it("deleteSimulation returns null for an unknown id", () => {
    expect(useSimulationStore.getState().deleteSimulation("nope")).toBeNull();
  });

  it("loadSimulation returns the previous session so it can be undone", () => {
    seedTwo();
    const s = useSimulationStore.getState();
    s.updateInput({ monthlyLivingExpense: 77 });
    s.setStep(4);
    const prev = s.loadSimulation("sim_2");
    expect(useSimulationStore.getState().currentStep).toBe(RESULT_STEP);
    expect(prev?.input.monthlyLivingExpense).toBe(77);
    useSimulationStore.getState().restoreSession(prev!);
    expect(useSimulationStore.getState().input.monthlyLivingExpense).toBe(77);
    expect(useSimulationStore.getState().currentStep).toBe(4);
  });

  it("loadSimulation returns null for an unknown id", () => {
    expect(useSimulationStore.getState().loadSimulation("nope")).toBeNull();
  });
});
