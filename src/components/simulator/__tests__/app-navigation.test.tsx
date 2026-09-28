/**
 * SimulatorApp wayfinding: completed steps summarise what was entered, and both the
 * desktop trail and the compact mobile trail jump straight to a step (SHIG 59, 60).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { SimulatorApp } from "../SimulatorApp";
import { useSimulationStore } from "@/store/simulationStore";

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

const setInput = (patch: Record<string, unknown>) =>
  useSimulationStore.setState({ input: { ...useSimulationStore.getState().input, ...patch } });

function trail() {
  return screen.getByRole("navigation", { name: "ステップ一覧" });
}

describe("step summaries in the trail", () => {
  it("summarises a planned purchase, the monthly investment and the premium once those steps are behind", async () => {
    setInput({ housingType: "buy", propertyPrice: 4500, monthlyInvestment: 3, lifeInsurancePremiumMonthly: 1.5 });
    useSimulationStore.setState({ currentStep: 6 });
    await act(async () => { render(<SimulatorApp />); });
    const nav = trail();
    expect(within(nav).getByText("購入 4,500万円")).toBeTruthy();
    expect(within(nav).getByText("月投資 3万円")).toBeTruthy();
    // The current step still shows its description, not a summary
    expect(within(nav).getByText("保険・医療・企業DC")).toBeTruthy();
  });

  it("an owned home is summarised as 持ち家", async () => {
    setInput({ housingType: "own" });
    useSimulationStore.setState({ currentStep: 4 });
    await act(async () => { render(<SimulatorApp />); });
    expect(within(trail()).getByText("持ち家")).toBeTruthy();
  });

  it("an unset housing type falls back to the step description", async () => {
    setInput({ housingType: undefined });
    useSimulationStore.setState({ currentStep: 4 });
    await act(async () => { render(<SimulatorApp />); });
    expect(within(trail()).getByText("住宅・ローン")).toBeTruthy();
  });
});

describe("jumping between steps", () => {
  it("the desktop trail opens the chosen step and marks it current", async () => {
    await act(async () => { render(<SimulatorApp />); });
    const target = within(trail()).getByRole("button", { name: /三合目/ });
    await act(async () => { fireEvent.click(target); });
    expect(useSimulationStore.getState().currentStep).toBe(3);
    expect(within(trail()).getByRole("button", { name: /三合目/ }).getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("heading", { level: 1, name: "住宅・ローン" })).toBeTruthy();
  });

  it("the mobile trail dots are named after their step and jump there", async () => {
    await act(async () => { render(<SimulatorApp />); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "5: 投資・貯蓄" })); });
    expect(useSimulationStore.getState().currentStep).toBe(5);
    expect(screen.getByRole("button", { name: "5: 投資・貯蓄" }).getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("heading", { level: 1, name: "投資・貯蓄" })).toBeTruthy();
  });

  it("前へ goes back one step", async () => {
    useSimulationStore.setState({ currentStep: 2 });
    await act(async () => { render(<SimulatorApp />); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "前へ" })); });
    expect(screen.getByRole("heading", { level: 1, name: "収入・年収" })).toBeTruthy();
  });
});
