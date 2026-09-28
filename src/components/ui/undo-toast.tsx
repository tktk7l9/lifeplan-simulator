"use client";

import { useEffect } from "react";
import { create } from "zustand";

/**
 * A single, app-wide notification with an optional undo action.
 * Actions run immediately and this toast offers the way back (SHIG 57, 54),
 * shown near the bottom of the screen so it does not block the work (SHIG 66, 90).
 */
interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toast: ToastItem | null;
  show: (toast: Omit<ToastItem, "id">) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toast: null,
  show: (toast) => set({ toast: { ...toast, id: nextId++ } }),
  dismiss: () => set({ toast: null }),
}));

export function showToast(toast: Omit<ToastItem, "id">) {
  useToastStore.getState().show(toast);
}

export const TOAST_DURATION_MS = 6000;

export function Toaster() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 print:hidden"
    >
      {toast && (
        <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg">
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => { toast.onAction?.(); dismiss(); }}
              className="-my-2 min-h-11 shrink-0 rounded-lg px-3 font-semibold text-amber-300 underline-offset-2 hover:underline"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
