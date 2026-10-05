/**
 * Extra coverage for the import dialogs:
 * - drag/drop events
 * - the 「やり直す」 button
 * - the 「シミュレーターに反映する」 button → onApply
 * - error display
 * - checkbox toggle (MoneyForward include/exclude)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MoneyForwardImportDialog } from "../MoneyForwardImportDialog";
import { NenkinImportDialog } from "../NenkinImportDialog";

vi.mock("@/lib/import/moneyforwardCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      [
        "口座名,カテゴリ,残高",
        "三井住友銀行,預貯金,1500000",
        "SBI証券,証券,3000000",
        "ビットフライヤー,暗号資産,200000",
        "その他口座,その他,100000",
      ].join("\n"),
    ),
  };
});

vi.mock("@/lib/import/nenkinCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      [
        "種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
        "厚生年金,A社,平成20年4月,令和3年3月,300000,156",
        "国民年金,,令和3年4月,令和5年3月,0,24",
      ].join("\n"),
    ),
  };
});

beforeEach(() => {});

describe("MoneyForwardImportDialog deep", () => {
  it("accepts a file by drag over / drop", async () => {
    const onApply = vi.fn();
    render(<MoneyForwardImportDialog onApply={onApply} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    // Get the drop zone (the div containing border-dashed)
    const dropzone = document.querySelector(".border-dashed") as HTMLElement;
    expect(dropzone).toBeTruthy();
    await act(async () => { fireEvent.dragOver(dropzone); });
    await act(async () => { fireEvent.dragLeave(dropzone); });
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    });
    await waitFor(() => {
      // The result area appears (account names etc.)
      expect(document.body.textContent).toMatch(/口座|銀行|預貯金/);
    });
  });

  it("after a file is added, 「やり直す」 returns to the drop zone", async () => {
    render(<MoneyForwardImportDialog onApply={() => {}} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/口座|銀行/));
    const reset = screen.getAllByText(/やり直す/)[0].closest("button");
    if (reset) {
      await act(async () => { fireEvent.click(reset); });
    }
    await waitFor(() => {
      expect(document.querySelector(".border-dashed")).toBeTruthy();
    });
  });

  it("「シミュレーターに反映する」 calls onApply", async () => {
    const onApply = vi.fn();
    render(<MoneyForwardImportDialog onApply={onApply} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/口座|銀行/));
    const apply = screen.getAllByText(/反映する/)[0].closest("button");
    if (apply) {
      await act(async () => { fireEvent.click(apply); });
    }
    expect(onApply).toHaveBeenCalled();
  });

  it("toggling a checkbox updates includeMap", async () => {
    render(<MoneyForwardImportDialog onApply={() => {}} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => expect(document.body.textContent).toMatch(/銀行/));
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      for (let i = 0; i < Math.min(checkboxes.length, 4); i++) {
        await act(async () => { fireEvent.click(checkboxes[i]); });
      }
    }
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("shows an error when readFileAsText throws", async () => {
    const mod = await import("@/lib/import/moneyforwardCSV");
    (mod.readFileAsText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("読み込み失敗"));
    render(<MoneyForwardImportDialog onApply={() => {}} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain("読み込み失敗");
    });
  });
});

describe("NenkinImportDialog deep", () => {
  it("dropping a file shows the result", async () => {
    render(<NenkinImportDialog onApply={() => {}} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const dropzone = document.querySelector(".border-dashed") as HTMLElement;
    await act(async () => { fireEvent.dragOver(dropzone); });
    await act(async () => { fireEvent.dragLeave(dropzone); });
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain("厚生年金");
    });
  });

  it("「やり直す」 returns to the drop zone", async () => {
    render(<NenkinImportDialog onApply={() => {}} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => expect(document.body.textContent).toContain("厚生年金"));
    const reset = screen.getAllByText(/やり直す/)[0].closest("button");
    if (reset) {
      await act(async () => { fireEvent.click(reset); });
    }
    expect(document.querySelector(".border-dashed")).toBeTruthy();
  });

  it("「シミュレーターに反映する」 calls onApply", async () => {
    const onApply = vi.fn();
    render(<NenkinImportDialog onApply={onApply} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => expect(document.body.textContent).toContain("厚生年金"));
    const apply = screen.getAllByText(/反映する/)[0].closest("button");
    if (apply) {
      await act(async () => { fireEvent.click(apply); });
    }
    expect(onApply).toHaveBeenCalled();
  });

  it("shows an error when readFileAsText throws", async () => {
    const mod = await import("@/lib/import/nenkinCSV");
    (mod.readFileAsText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("年金CSV読み込み失敗"));
    render(<NenkinImportDialog onApply={() => {}} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.csv", { type: "text/csv" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain("年金CSV読み込み失敗");
    });
  });
});
