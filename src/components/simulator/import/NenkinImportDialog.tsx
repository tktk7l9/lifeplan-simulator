"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseNenkinCSV, readFileAsText, NenkinParseResult } from "@/lib/import/nenkinCSV";

interface NenkinImportDialogProps {
  onApply: (result: NenkinParseResult) => void;
}

export function NenkinImportDialog({ onApply }: NenkinImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<NenkinParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const text = await readFileAsText(file);
      const parsed = parseNenkinCSV(text);
      setResult(parsed);
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

  const handleApply = () => {
    if (result) {
      onApply(result);
      setOpen(false);
      setResult(null);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setResult(null);
      setError(null);
    }
  };

  const toMan = (n: number) => (n / 10000).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
        >
          <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">CSV</Badge>
          ねんきんネット連携
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-700">ねんきんネット CSV インポート</DialogTitle>
        </DialogHeader>

        {!result ? (
          <>
            {/* ドロップゾーン */}
            <div
              className={cn(
                "mt-4 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragging
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-700">
                    ねんきんネットの「年金記録照会」CSV をここにドロップ
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    またはクリックしてファイルを選択（.csv / .txt）
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

            {/* サマリー */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-xs text-green-600 font-medium">加入月数</p>
                <p className="mt-1 text-sm text-gray-700">
                  厚生年金 <span className="font-bold text-green-700">{result.empMonths}</span> ヶ月
                  {" / "}
                  国民年金 <span className="font-bold text-green-700">{result.citizenMonths}</span> ヶ月
                </p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-xs text-green-600 font-medium">平均標準報酬月額</p>
                <p className="mt-1 text-lg font-bold text-green-700">
                  {toMan(result.avgStandardMonthly)} 万円
                </p>
              </div>
              <div className="col-span-2 rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs text-amber-600 font-medium">推計年金月額（65歳時点）</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {toMan(result.pensionMonthlyEst)} 万円<span className="text-base font-normal text-amber-600">/月</span>
                </p>
                <p className="text-xs text-amber-500 mt-1">※ 簡易推計値。実際の受給額とは異なる場合があります。</p>
              </div>
            </div>

            {/* レコードテーブル */}
            {result.records.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">年金記録詳細</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">種別</th>
                        <th className="px-3 py-2 text-left text-gray-600">勤務先</th>
                        <th className="px-3 py-2 text-left text-gray-600">期間</th>
                        <th className="px-3 py-2 text-right text-gray-600">月数</th>
                        <th className="px-3 py-2 text-right text-gray-600">標準報酬</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.records.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2">
                            <Badge
                              className={cn(
                                "text-xs",
                                r.type === "厚生年金" && "bg-green-100 text-green-700",
                                r.type === "国民年金" && "bg-blue-100 text-blue-700",
                                r.type === "共済" && "bg-purple-100 text-purple-700",
                                r.type === "不明" && "bg-gray-100 text-gray-600"
                              )}
                              variant="secondary"
                            >
                              {r.type}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{r.employer}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {r.startYM} 〜 {r.endYM}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">{r.months}</td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {r.standardMonthly > 0 ? `${toMan(r.standardMonthly)}万円` : "—"}
                          </td>
                        </tr>
                      ))}
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
                className="bg-green-600 hover:bg-green-700 text-white"
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
