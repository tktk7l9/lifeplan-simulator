/**
 * Accessibility regressions for the import dialogs after a file is parsed:
 * every include checkbox has a name, and the record table scroller takes focus (SHIG 93).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MoneyForwardImportDialog } from "../MoneyForwardImportDialog";
import { NenkinImportDialog } from "../NenkinImportDialog";

vi.mock("@/lib/import/moneyforwardCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      ["口座名,カテゴリ,残高", "三井住友銀行,預貯金,1500000", "SBI証券,証券,3000000"].join("\n"),
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

async function openAndLoad(el: React.ReactElement) {
  render(el);
  await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [new File(["x"], "x.csv", { type: "text/csv" })] } });
  });
}

describe("MoneyForwardImportDialog", () => {
  it("names each include checkbox after its account", async () => {
    await openAndLoad(<MoneyForwardImportDialog onApply={() => {}} />);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "三井住友銀行を預貯金に含める" })).toBeTruthy());
    expect(screen.getByRole("checkbox", { name: "SBI証券を投資に含める" })).toBeTruthy();
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box.getAttribute("aria-label")).toBeTruthy();
    }
  });
});

describe("NenkinImportDialog", () => {
  it("makes the record table scroller a named, focusable region", async () => {
    await openAndLoad(<NenkinImportDialog onApply={() => {}} />);
    const region = await waitFor(() => screen.getByRole("region", { name: "年金記録詳細" }));
    expect(region.tabIndex).toBe(0);
  });
});
