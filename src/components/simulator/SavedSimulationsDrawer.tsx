"use client";

import { useEffect, useState } from "react";
import type { SavedSimulation } from "@/lib/simulation/types";
import { TOAST_DURATION_MS } from "@/components/ui/undo-toast";
import { useSimulationStore } from "@/store/simulationStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/undo-toast";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatManYen(value: number): string {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}億円`;
  return `${Math.round(value).toLocaleString("ja-JP")}万円`;
}

export function SavedSimulationsDrawer() {
  const { savedSimulations, loadSimulation, deleteSimulation, restoreSimulation, restoreSession } = useSimulationStore();
  const [open, setOpen] = useState(false);
  // Undo for a delete is shown inside the dialog, next to the list it changed (SHIG 66);
  // a page-level toast would sit behind the modal.
  const [lastDeleted, setLastDeleted] = useState<{ sim: SavedSimulation; index: number } | null>(null);

  useEffect(() => {
    if (!lastDeleted) return;
    const timer = setTimeout(() => setLastDeleted(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [lastDeleted]);

  // Loading replaces the current input, so keep the way back (SHIG 54, 38).
  function handleLoad(id: string, name: string) {
    const previous = loadSimulation(id);
    setOpen(false);
    if (previous) {
      showToast({
        message: `「${name}」を読み込みました`,
        actionLabel: "元に戻す",
        onAction: () => restoreSession(previous),
      });
    }
  }

  // Delete at once and offer undo instead of a two-step confirmation (SHIG 57, 54).
  function handleDelete(id: string) {
    const removed = deleteSimulation(id);
    if (removed) setLastDeleted(removed);
  }

  function handleUndoDelete() {
    if (!lastDeleted) return;
    restoreSimulation(lastDeleted.sim, lastDeleted.index);
    setLastDeleted(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          保存済み
          {savedSimulations.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
              {savedSimulations.length > 9 ? "9+" : savedSimulations.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            保存済みシミュレーション
          </DialogTitle>
        </DialogHeader>

        <div role="status" aria-live="polite">
          {lastDeleted && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-stone-900 px-3 py-1 text-sm text-white">
              <span className="min-w-0 truncate">「{lastDeleted.sim.name}」を削除しました</span>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="min-h-11 shrink-0 px-2 font-semibold text-amber-300 underline-offset-2 hover:underline"
              >
                元に戻す
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto mt-2">
          {savedSimulations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">📂</div>
              <div className="font-semibold text-muted-foreground text-sm">保存済みのシミュレーションがありません</div>
              <div className="text-xs text-muted-foreground mt-1">シミュレーション結果画面から保存できます</div>
            </div>
          ) : (
            <div className="space-y-3">
              {savedSimulations.map((sim) => (
                <div
                  key={sim.id}
                  className="border border-border rounded-xl p-4 hover:border-amber-200 hover:bg-amber-50/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground text-sm truncate">{sim.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{formatDate(sim.savedAt)}</div>
                        </div>
                        {/* Small, secondary and away from 読み込む (SHIG 16, 78, 13) */}
                        <button
                          type="button"
                          onClick={() => handleDelete(sim.id)}
                          aria-label={`${sim.name}を削除`}
                          className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        >
                          削除
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="bg-white rounded-lg border border-border p-2 text-center">
                          <div className="text-[10px] text-muted-foreground">年収</div>
                          <div className="text-xs font-bold text-foreground mt-0.5">{sim.input.annualIncome}万円</div>
                        </div>
                        <div className={cn(
                          "rounded-lg border p-2 text-center",
                          sim.result.retirementAssets >= 0 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"
                        )}>
                          <div className="text-[10px] text-muted-foreground">退職時資産</div>
                          <div className={cn("text-xs font-bold mt-0.5", sim.result.retirementAssets >= 0 ? "text-amber-700" : "text-red-600")}>
                            {formatManYen(sim.result.retirementAssets)}
                          </div>
                        </div>
                        <div className={cn(
                          "rounded-lg border p-2 text-center",
                          sim.result.isRetirementSafe ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
                        )}>
                          <div className="text-[10px] text-muted-foreground">老後診断</div>
                          <div className={cn("text-xs font-bold mt-0.5", sim.result.isRetirementSafe ? "text-emerald-700" : "text-amber-700")}>
                            {sim.result.isRetirementSafe ? "安全" : "要注意"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleLoad(sim.id, sim.name)}
                      className="w-full min-h-11 inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
                    >
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      読み込む
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
