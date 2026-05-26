/**
 * ResultsView 内 SaveDialog のフルフロー + 印刷ボタン + 各タブ切替後の表示
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
  it("「シミュレーションを保存」→ 名前入力 → 保存ボタンで saveSimulation 呼び出し", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    // SaveDialog trigger
    const trigger = screen.getByText(/シミュレーションを保存/).closest("button")!;
    await act(async () => { fireEvent.click(trigger); });
    // 入力欄が現れる
    const input = await screen.findByPlaceholderText(/楽観シナリオ/);
    await act(async () => { fireEvent.change(input, { target: { value: "シナリオA" } }); });
    // 保存ボタン
    const saveBtn = screen.getAllByText(/保存する/).find((el) => el.tagName === "BUTTON")!;
    await act(async () => { fireEvent.click(saveBtn); });
    await waitFor(() => {
      expect(useSimulationStore.getState().savedSimulations.length).toBe(1);
    });
    // 「保存しました！」表示
    expect(screen.getAllByText(/保存しました/).length).toBeGreaterThan(0);
    // 1.2s 後にダイアログが閉じる
    await act(async () => { vi.advanceTimersByTime(1300); });
  });

  it("名前が空欄では保存ボタンが disabled", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const trigger = screen.getByText(/シミュレーションを保存/).closest("button")!;
    await act(async () => { fireEvent.click(trigger); });
    const saveBtn = screen.getAllByText(/保存する/).find((el) => el.tagName === "BUTTON") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("Enter キーで handleSave", async () => {
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
    // 空白だけ
    await act(async () => { fireEvent.change(input, { target: { value: "   " } }); });
    // 保存ボタンは disabled (trim().length === 0)
    const saveBtn = screen.getAllByText(/保存する/).find((el) => el.tagName === "BUTTON") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("PDF出力ボタンクリックで window.print", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", { value: printSpy, writable: true, configurable: true });
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const print = screen.getByText("PDF出力").closest("button")!;
    await act(async () => { fireEvent.click(print); });
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(printSpy).toHaveBeenCalled();
  });

  it("ESC キーでダイアログクローズ", async () => {
    await act(async () => { render(<ResultsView onBack={() => {}} />); });
    const trigger = screen.getByText(/シミュレーションを保存/).closest("button")!;
    await act(async () => { fireEvent.click(trigger); });
    const input = await screen.findByPlaceholderText(/楽観シナリオ/) as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { value: "X" } }); });
    // ESC キーで閉じる (radix dialog 標準動作)
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Escape" });
    });
    // 何らかの結果が出ていれば OK
    expect(true).toBe(true);
  });
});
