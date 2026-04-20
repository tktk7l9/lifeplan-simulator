"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseMFCSV, readFileAsText, MFAccount, MFParseResult } from "@/lib/import/moneyforwardCSV";

interface MoneyForwardImportDialogProps {
  onApply: (deposit: number, investment: number) => void;
}

type IncludeMap = Record<string, { deposit: boolean; investment: boolean }>;

const CATEGORY_LABEL: Record<MFAccount["category"], string> = {
  deposit: "預貯金",
  investment: "投資",
  crypto: "暗号資産",
  other: "その他",
};

const CATEGORY_COLOR: Record<MFAccount["category"], string> = {
  deposit: "bg-blue-100 text-blue-700",
  investment: "bg-green-100 text-green-700",
  crypto: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};

function buildDefaultIncludeMap(accounts: MFAccount[]): IncludeMap {
  const map: IncludeMap = {};
  accounts.forEach((a, i) => {
    const key = `${i}-${a.name}`;
    map[key] = {
      deposit: a.category === "deposit",
      investment: a.category === "investment" || a.category === "crypto",
    };
  });
  return map;
}

function calcTotals(accounts: MFAccount[], includeMap: IncludeMap): { deposit: number; investment: number } {
  let deposit = 0;
  let investment = 0;
  accounts.forEach((a, i) => {
    const key = `${i}-${a.name}`;
    const inc = includeMap[key];
    if (!inc) return;
    if (inc.deposit) deposit += a.balance;
    if (inc.investment) investment += a.balance;
  });
  return {
    deposit: Math.round(deposit * 10) / 10,
    investment: Math.round(investment * 10) / 10,
  };
}

export function MoneyForwardImportDialog({ onApply }: MoneyForwardImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<MFParseResult | null>(null);
  const [includeMap, setIncludeMap] = useState<IncludeMap>({});
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const text = await readFileAsText(file);
      const parsed = parseMFCSV(text);
      setResult(parsed);
      setIncludeMap(buildDefaultIncludeMap(parsed.accounts));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ファイルの読み込みに失敗しました。");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const toggleInclude = (key: string, field: "deposit" | "investment") => {
    setIncludeMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: !prev[key]?.[field],
      },
    }));
  };

  const handleApply = () => {
    if (!result) return;
    const { deposit, investment } = calcTotals(result.accounts, includeMap);
    onApply(deposit, investment);
    setOpen(false);
    setResult(null);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setResult(null);
      setError(null);
    }
  };

  const totals = result ? calcTotals(result.accounts, includeMap) : { deposit: 0, investment: 0 };
  const otherTotal = result
    ? Math.round(
        result.accounts
          .filter((a) => a.category === "other")
          .reduce((s, a) => s + a.balance, 0) * 10
      ) / 10
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50"
        >
          <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0">CSV</Badge>
          マネーフォワード連携
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-700">マネーフォワード ME CSV インポート</DialogTitle>
        </DialogHeader>

        {!result ? (
          <>
            {/* ドロップゾーン */}
            <div
              className={cn(
                "mt-4 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-700">
                    マネーフォワード ME の CSV をここにドロップ
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    またはクリックしてファイルを選択（.csv / .txt）
                  </p>
                  <p className="text-xs text-blue-500 mt-2 font-medium">
                    対応形式：「資産推移月次」CSV / 「資産（口座一覧）」CSV
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PC版 マネーフォワード ME →「資産」→「資産推移」→「月次」→「CSVダウンロード」
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  ファイルはブラウザ内のみで処理されます。サーバーには送信されません。
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            {/* warnings */}
            {result.warnings.length > 0 && (
              <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-1">注意</p>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-700">{w}</p>
                ))}
              </div>
            )}

            {result.updateDate && (
              <p className="mt-3 text-xs text-gray-500">データ更新日: {result.updateDate}</p>
            )}

            {/* サマリー */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-600 font-medium">預貯金合計</p>
                <p className="mt-1 text-lg font-bold text-blue-700">{totals.deposit} 万円</p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-xs text-green-600 font-medium">投資合計</p>
                <p className="mt-1 text-lg font-bold text-green-700">{totals.investment} 万円</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                <p className="text-xs text-gray-600 font-medium">その他</p>
                <p className="mt-1 text-lg font-bold text-gray-700">{otherTotal} 万円</p>
              </div>
            </div>

            {/* 口座一覧 + チェックボックス */}
            {result.accounts.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  口座ごとの振り分け設定
                </p>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">口座名</th>
                        <th className="px-3 py-2 text-left text-gray-600">種別</th>
                        <th className="px-3 py-2 text-right text-gray-600">残高(万円)</th>
                        <th className="px-3 py-2 text-center text-gray-600">預貯金に含める</th>
                        <th className="px-3 py-2 text-center text-gray-600">投資に含める</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.accounts.map((a, i) => {
                        const key = `${i}-${a.name}`;
                        const inc = includeMap[key] ?? { deposit: false, investment: false };
                        return (
                          <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{a.name}</td>
                            <td className="px-3 py-2">
                              <Badge
                                className={cn("text-xs", CATEGORY_COLOR[a.category])}
                                variant="secondary"
                              >
                                {CATEGORY_LABEL[a.category]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {a.balance.toFixed(1)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={inc.deposit}
                                onChange={() => toggleInclude(key, "deposit")}
                                className="w-4 h-4 accent-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={inc.investment}
                                onChange={() => toggleInclude(key, "investment")}
                                className="w-4 h-4 accent-green-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* アクション */}
            <div className="mt-6 flex justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => { setResult(null); setError(null); }}
              >
                やり直す
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleApply}
              >
                シミュレーターに反映する
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
