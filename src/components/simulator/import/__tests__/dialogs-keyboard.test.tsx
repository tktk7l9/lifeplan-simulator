/**
 * Keyboard and dismissal behaviour of the CSV import dialogs.
 * The file input is visually hidden, so the drop zone must be operable from the keyboard.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { MoneyForwardImportDialog } from "../MoneyForwardImportDialog";
import { NenkinImportDialog } from "../NenkinImportDialog";
import { readFileAsText as readMF } from "@/lib/import/moneyforwardCSV";
import { readFileAsText as readNenkin } from "@/lib/import/nenkinCSV";

vi.mock("@/lib/import/moneyforwardCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      ["口座名,カテゴリ,残高", "三井住友銀行,預貯金,1500000"].join("\n"),
    ),
  };
});

vi.mock("@/lib/import/nenkinCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      ["種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数", "厚生年金,A社,平成20年4月,令和3年3月,300000,156"].join("\n"),
    ),
  };
});

const DIALOGS = [
  { name: "MoneyForward", trigger: "マネーフォワード連携", el: () => <MoneyForwardImportDialog onApply={() => {}} /> },
  { name: "Nenkin", trigger: "ねんきんネット連携", el: () => <NenkinImportDialog onApply={() => {}} /> },
] as const;

async function openDialog(trigger: string) {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: new RegExp(trigger) })); });
  return screen.getByRole("dialog");
}

async function chooseFile(dialog: HTMLElement) {
  const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["x"], "export.csv", { type: "text/csv" });
  await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
}

describe.each(DIALOGS)("$name import dialog", ({ trigger, el }) => {
  it("the drop zone is a focusable button that opens the file picker with Enter and Space", async () => {
    render(el());
    const dialog = await openDialog(trigger);
    const zone = within(dialog).getByRole("button", { name: "CSV ファイルを選択" });
    expect(zone.tabIndex).toBe(0);

    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const pick = vi.spyOn(input, "click").mockImplementation(() => {});
    zone.focus();
    fireEvent.keyDown(zone, { key: "Enter" });
    fireEvent.keyDown(zone, { key: " " });
    fireEvent.keyDown(zone, { key: "a" });
    expect(pick).toHaveBeenCalledTimes(2);
  });

  it("closing the dialog discards a parsed file, so reopening starts from the drop zone", async () => {
    render(el());
    let dialog = await openDialog(trigger);
    await chooseFile(dialog);
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "やり直す" })).toBeTruthy());

    await act(async () => { fireEvent.keyDown(dialog, { key: "Escape" }); });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    dialog = await openDialog(trigger);
    expect(within(dialog).getByRole("button", { name: "CSV ファイルを選択" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "やり直す" })).toBeNull();
  });

  it("highlights the drop zone only while a file is dragged over it", async () => {
    render(el());
    const dialog = await openDialog(trigger);
    const zone = within(dialog).getByRole("button", { name: "CSV ファイルを選択" });
    const idle = zone.className;
    fireEvent.dragOver(zone);
    expect(zone.className).not.toBe(idle);
    fireEvent.dragLeave(zone);
    expect(zone.className).toBe(idle);
  });
});

describe("parse warnings are shown before applying", () => {
  it("MoneyForward: an empty export shows the reason under 注意", async () => {
    vi.mocked(readMF).mockResolvedValueOnce("口座名,残高");
    render(<MoneyForwardImportDialog onApply={() => {}} />);
    const dialog = await openDialog("マネーフォワード連携");
    await chooseFile(dialog);
    await waitFor(() => expect(within(dialog).getByText("注意")).toBeTruthy());
    expect(within(dialog).getByText("データが空です。")).toBeTruthy();
  });

  it("Nenkin: a header-only export shows the reason under 注意", async () => {
    vi.mocked(readNenkin).mockResolvedValueOnce("種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数");
    render(<NenkinImportDialog onApply={() => {}} />);
    const dialog = await openDialog("ねんきんネット連携");
    await chooseFile(dialog);
    await waitFor(() => expect(within(dialog).getByText("注意")).toBeTruthy());
    expect(within(dialog).getByText("データ行が見つかりませんでした。")).toBeTruthy();
  });
});
