/**
 * LifeEventsStep (edit / delete with undo) and InvestmentStep (product choice, CSV import).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { LifeEventsStep } from "../steps/LifeEventsStep";
import { InvestmentStep } from "../steps/InvestmentStep";
import { Toaster, useToastStore } from "@/components/ui/undo-toast";
import { useSimulationStore } from "@/store/simulationStore";
import type { LifeEvent } from "@/lib/simulation/types";

vi.mock("@/lib/import/moneyforwardCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      ["口座名,カテゴリ,残高", "三井住友銀行,預貯金,1500000", "SBI証券,証券,3000000"].join("\n"),
    ),
  };
});

const EVENTS: LifeEvent[] = [
  { id: "e1", type: "other", age: 35, cost: 100, label: "その他" },
  { id: "e2", type: "travel", age: 40, cost: 50, label: "欧州旅行" },
];

beforeEach(() => {
  localStorage.clear();
  useToastStore.setState({ toast: null });
  useSimulationStore.setState({
    currentStep: 4,
    input: { ...useSimulationStore.getInitialState().input, lifeEvents: EVENTS },
    result: null,
    isCalculating: false,
    savedSimulations: [],
    aiEvaluation: null,
  });
});

const store = () => useSimulationStore.getState().input;

async function chooseOption(combobox: HTMLElement, option: RegExp) {
  await act(async () => { fireEvent.keyDown(combobox, { key: "Enter" }); });
  const item = await screen.findByRole("option", { name: option });
  await act(async () => { fireEvent.keyDown(item, { key: "Enter" }); });
}

describe("life events", () => {
  it("each event type picker has a name a screen reader can announce", () => {
    render(<LifeEventsStep onNext={() => {}} />);
    expect(screen.getByRole("combobox", { name: "イベント1の種類" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "イベント2の種類" })).toBeTruthy();
  });

  it("changing the type renames an event that still has the default label", async () => {
    render(<LifeEventsStep onNext={() => {}} />);
    await chooseOption(screen.getByRole("combobox", { name: "イベント1の種類" }), /マイカー購入/);
    await waitFor(() => expect(store().lifeEvents?.[0]).toMatchObject({ type: "car", label: "マイカー購入" }));
    expect((screen.getByRole("textbox", { name: "イベント1のラベル" }) as HTMLInputElement).value).toBe("マイカー購入");
  });

  it("changing the type keeps a label the user wrote", async () => {
    render(<LifeEventsStep onNext={() => {}} />);
    await chooseOption(screen.getByRole("combobox", { name: "イベント2の種類" }), /結婚式/);
    await waitFor(() => expect(store().lifeEvents?.[1]).toMatchObject({ type: "wedding", label: "欧州旅行" }));
  });

  it("editing the cost is stored on the event", async () => {
    render(<LifeEventsStep onNext={() => {}} />);
    await act(async () => {
      fireEvent.change(screen.getByRole("textbox", { name: "イベント2の費用" }), { target: { value: "80" } });
    });
    expect(store().lifeEvents?.[1].cost).toBe(80);
  });

  it("deleting happens at once and 元に戻す puts the event back in the same place", async () => {
    render(<><LifeEventsStep onNext={() => {}} /><Toaster /></>);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "イベント1（その他）を削除" }));
    });
    expect(store().lifeEvents?.map((e) => e.id)).toEqual(["e2"]);
    expect(screen.getByText("その他を削除しました")).toBeTruthy();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "元に戻す" })); });
    expect(store().lifeEvents?.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(screen.getByRole("textbox", { name: "イベント1のラベル" })).toBeTruthy();
  });
});

describe("investment", () => {
  it("picking an iDeCo product marks it selected and uses its expected return", async () => {
    render(<InvestmentStep onNext={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "iDeCoの投資商品" });
    const teiki = within(group).getByRole("radio", { name: /定期預金/ });
    await act(async () => { fireEvent.click(teiki); });
    expect(teiki.getAttribute("aria-checked")).toBe("true");
    await waitFor(() => expect(store()).toMatchObject({ idecoProductId: "teiki", idecoReturnRate: 0.2 }));
  });

  it("the NISA monthly slider moves in 0.5万円 steps from the keyboard", async () => {
    render(<InvestmentStep onNext={() => {}} />);
    const slider = screen.getByRole("slider", { name: "積立投資枠" });
    const before = Number(slider.getAttribute("aria-valuenow"));
    await act(async () => { fireEvent.keyDown(slider, { key: "ArrowRight" }); });
    expect(Number(slider.getAttribute("aria-valuenow"))).toBe(before + 0.5);
  });

  it("a MoneyForward export fills in savings and investment assets", async () => {
    render(<InvestmentStep onNext={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /マネーフォワード連携/ })); });
    const dialog = screen.getByRole("dialog");
    const file = new File(["x"], "mf.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(dialog.querySelector('input[type="file"]')!, { target: { files: [file] } });
    });
    await act(async () => { fireEvent.click(await within(dialog).findByRole("button", { name: /反映/ })); });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((screen.getByRole("textbox", { name: "現在の貯蓄額" }) as HTMLInputElement).value).toBe("150");
    expect((screen.getByRole("textbox", { name: "現在の投資資産" }) as HTMLInputElement).value).toBe("300");
    await waitFor(() => expect(store()).toMatchObject({ currentSavings: 150, currentInvestmentAssets: 300 }));
  });
});
