/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "../simulationStore";

// Reset the store before each test
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
  it("initial state: default input + currentStep=0 + result=null", () => {
    const s = useSimulationStore.getState();
    expect(s.currentStep).toBe(0);
    expect(s.result).toBeNull();
    expect(s.input.age).toBe(30);
    expect(s.input.retirementAge).toBe(65);
  });

  it("updateInput: updates state with a partial patch", () => {
    useSimulationStore.getState().updateInput({ annualIncome: 700 });
    expect(useSimulationStore.getState().input.annualIncome).toBe(700);
    // Other fields are kept
    expect(useSimulationStore.getState().input.retirementAge).toBe(65);
  });

  it("setStep: changes the step number", () => {
    useSimulationStore.getState().setStep(3);
    expect(useSimulationStore.getState().currentStep).toBe(3);
  });

  it("calculate: computes result and resets isCalculating to false", () => {
    useSimulationStore.getState().calculate();
    const s = useSimulationStore.getState();
    expect(s.result).not.toBeNull();
    expect(s.isCalculating).toBe(false);
    expect(s.result?.yearlyData.length).toBeGreaterThan(0);
  });

  it("calculate: resets an existing aiEvaluation", () => {
    useSimulationStore.setState({
      aiEvaluation: {
        score: 80, rank: "A", summary: "x",
        strengths: [], improvements: [], conclusion: "",
      },
    });
    useSimulationStore.getState().calculate();
    expect(useSimulationStore.getState().aiEvaluation).toBeNull();
  });

  it("calculate: works with defaults for incomplete input", () => {
    useSimulationStore.setState({ input: {} });
    useSimulationStore.getState().calculate();
    expect(useSimulationStore.getState().result).not.toBeNull();
  });

  it("saveSimulation: does nothing without a computed result", () => {
    useSimulationStore.getState().saveSimulation("first");
    expect(useSimulationStore.getState().savedSimulations).toHaveLength(0);
  });

  it("saveSimulation: saves when a result exists (newest first)", () => {
    useSimulationStore.getState().calculate();
    useSimulationStore.getState().saveSimulation("A");
    useSimulationStore.getState().saveSimulation("B");
    const list = useSimulationStore.getState().savedSimulations;
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("B");
    expect(list[1].name).toBe("A");
    expect(list[0].id).toMatch(/^sim_\d+/);
  });

  it("loadSimulation: restores a saved entry as input and result + currentStep=7", () => {
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

  it("loadSimulation: does nothing for an unknown ID", () => {
    useSimulationStore.getState().loadSimulation("nonexistent");
    expect(useSimulationStore.getState().result).toBeNull();
  });

  it("deleteSimulation: deletes the given ID", () => {
    useSimulationStore.getState().calculate();
    useSimulationStore.getState().saveSimulation("A");
    // saveSimulation's id is based on Date.now(), so rewrite it by hand to avoid collisions
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

  it("setAiEvaluation: sets and clears the evaluation", () => {
    const ev = { score: 75, rank: "A" as const, summary: "good", strengths: [], improvements: [], conclusion: "" };
    useSimulationStore.getState().setAiEvaluation(ev);
    expect(useSimulationStore.getState().aiEvaluation).toEqual(ev);
    useSimulationStore.getState().setAiEvaluation(null);
    expect(useSimulationStore.getState().aiEvaluation).toBeNull();
  });

  it("savedSimulations are written to localStorage by persist", () => {
    useSimulationStore.getState().calculate();
    useSimulationStore.getState().saveSimulation("persist");
    const raw = localStorage.getItem("lifeplan-simulator-store");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.savedSimulations).toHaveLength(1);
  });

  it("calculate: when runSimulation throws, only isCalculating goes back to false", () => {
    // Aim for an internal throw with invalid input (it does not actually throw, so this is only a light check)
    useSimulationStore.setState({ input: {}, isCalculating: true });
    useSimulationStore.getState().calculate();
    expect(useSimulationStore.getState().isCalculating).toBe(false);
  });

  it("saveSimulation: copies the result contents too", () => {
    useSimulationStore.getState().calculate();
    const result = useSimulationStore.getState().result;
    useSimulationStore.getState().saveSimulation("X");
    const saved = useSimulationStore.getState().savedSimulations[0];
    expect(saved.result.finalAssets).toBe(result?.finalAssets);
  });
});
