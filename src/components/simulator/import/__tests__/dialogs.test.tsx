/**
 * Import dialogs の smoke test
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MoneyForwardImportDialog } from "../MoneyForwardImportDialog";
import { NenkinImportDialog } from "../NenkinImportDialog";

// readFileAsText を mock
vi.mock("@/lib/import/moneyforwardCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      "日付,合計（円）,預貯金（円）,証券(運用)（円）\n2025/04/01,1500000,1000000,500000"
    ),
  };
});

vi.mock("@/lib/import/nenkinCSV", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    readFileAsText: vi.fn().mockResolvedValue(
      ["種別,勤務先,資格取得,資格喪失,標準報酬月額,加入月数",
       "厚生年金,A社,平成20年4月,令和3年3月,300000,156",
      ].join("\n")
    ),
  };
});

describe("MoneyForwardImportDialog", () => {
  it("ボタンを表示", () => {
    render(<MoneyForwardImportDialog onApply={() => {}} />);
    // CSV インポートのトリガーボタン
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("トリガーボタンクリックでダイアログが開く", async () => {
    render(<MoneyForwardImportDialog onApply={() => {}} />);
    const btn = screen.getAllByRole("button")[0];
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getAllByText(/CSV|資産|読み込み|インポート|マネーフォワード/i).length).toBeGreaterThan(0);
  });

  it("ファイル選択でパース実行", async () => {
    const onApply = vi.fn();
    render(<MoneyForwardImportDialog onApply={onApply} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    // dialog 内の file input を探す
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (fileInput) {
      const file = new File(["dummy"], "data.csv", { type: "text/csv" });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });
      // パース後に結果が表示される
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(1);
      });
    }
  });
});

describe("NenkinImportDialog", () => {
  it("ボタンを表示", () => {
    render(<NenkinImportDialog onApply={() => {}} />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("トリガークリックでダイアログが開く", async () => {
    render(<NenkinImportDialog onApply={() => {}} />);
    const btn = screen.getAllByRole("button")[0];
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getAllByText(/年金|CSV|インポート/i).length).toBeGreaterThan(0);
  });

  it("ファイル選択でパース実行", async () => {
    const onApply = vi.fn();
    render(<NenkinImportDialog onApply={onApply} />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button")[0]); });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (fileInput) {
      const file = new File(["dummy"], "nenkin.csv", { type: "text/csv" });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });
      await waitFor(() => {
        expect(document.body.textContent).toContain("厚生年金");
      });
    }
  });
});
