/**
 * Full flow of SaveDialog in ResultsView + print button + display after switching each tab
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ResultsView } from "../results/ResultsView";
import { useSimulationStore } from "@/store/simulationStore";

vi.mock("recharts", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
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

afterEach(() => {
  vi.useRealTimers();
});

describe("SaveDialog full flow", () => {
  it("「シミュレーションを保存」, enter a name, then the save button calls saveSimulation", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    // SaveDialog trigger
    const trigger = screen.getByText(/シミュレーションを保存/).closest("button")!;
    await act(async () => { fireEvent.click(trigger); });
    // The input field appears
    const input = await screen.findByPlaceholderText(/楽観シナリオ/);
    await act(async () => { fireEvent.change(input, { target: { value: "シナリオA" } }); });
    // Save button
    const saveBtn = screen.getAllByText(/保存する/).find((el) => el.tagName === "BUTTON")!;
    await act(async () => { fireEvent.click(saveBtn); });
    await waitFor(() => {
      expect(useSimulationStore.getState().savedSimulations.length).toBe(1);
    });
    // The dialog closes at once (confirmation is a toast, SHIG 57)
    await waitFor(() => expect(screen.queryByPlaceholderText(/楽観シナリオ/)).toBeNull());
  });

  it("disables the save button while the name is empty", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const trigger = screen.getByText(/シミュレーションを保存/).closest("button")!;
    await act(async () => { fireEvent.click(trigger); });
    const saveBtn = screen.getAllByText(/保存する/).find((el) => el.tagName === "BUTTON") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("Enter calls handleSave", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const trigger = screen.getByText(/シミュレーションを保存/).closest("button")!;
    await act(async () => { fireEvent.click(trigger); });
    const input = await screen.findByPlaceholderText(/楽観シナリオ/) as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { value: "Enter保存" } }); });
    await act(async () => { fireEvent.keyDown(input, { key: "Enter" }); });
    await waitFor(() => {
      expect(useSimulationStore.getState().savedSimulations.length).toBe(1);
    });
  });

  it("trimmed='' (空白のみ) は早期 return", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const trigger = screen.getByText(/シミュレーションを保存/).closest("button")!;
    await act(async () => { fireEvent.click(trigger); });
    const input = await screen.findByPlaceholderText(/楽観シナリオ/);
    // Whitespace only
    await act(async () => { fireEvent.change(input, { target: { value: "   " } }); });
    // The save button is disabled (trim().length === 0)
    const saveBtn = screen.getAllByText(/保存する/).find((el) => el.tagName === "BUTTON") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("clicking the 印刷 / PDFに保存 button calls window.print", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { value: printSpy, writable: true, configurable: true });
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const print = screen.getByText("印刷 / PDFに保存").closest("button")!;
    await act(async () => { fireEvent.click(print); });
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(printSpy).toHaveBeenCalled();
  });

  it("Escape closes the dialog", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const trigger = screen.getByText(/シミュレーションを保存/).closest("button")!;
    await act(async () => { fireEvent.click(trigger); });
    const input = await screen.findByPlaceholderText(/楽観シナリオ/) as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { value: "X" } }); });
    // Close with the ESC key (standard radix dialog behavior)
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Escape" });
    });
    // It closed, so the dialog's input field is gone (and nothing was saved)
    expect(screen.queryByPlaceholderText(/楽観シナリオ/)).toBeNull();
    expect(useSimulationStore.getState().savedSimulations).toHaveLength(0);
  });
});
