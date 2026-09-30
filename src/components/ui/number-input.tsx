"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/** Converts full-width digits and symbols to ASCII and drops thousands separators (SHIG 50). */
export function normalizeNumericText(raw: string): string {
  return raw
    .replace(/[０-９．－＋]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[ー−]/g, "-")
    .replace(/[,，、\s]/g, "");
}

/** Returns the number, null for an empty field, or NaN when the text is not a number. */
export function parseLenientNumber(raw: string): number | null {
  const text = normalizeNumericText(raw);
  if (text === "") return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(text)) return NaN;
  return Number(text);
}

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

interface NumberInputProps {
  /** Accessible name; usually the visible field label. */
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Unit shown after the field and in messages, e.g. "万円 / 月". */
  unit?: string;
  className?: string;
  wrapperClassName?: string;
}

/**
 * Numeric text field that accepts lenient input (full-width digits, commas),
 * keeps an emptied field empty instead of turning it into 0, and clamps values
 * outside the range while saying so right next to the field (SHIG 50, 46, 55, 66).
 */
export function NumberInput({
  label,
  value,
  onValueChange,
  min,
  max,
  unit = "",
  className,
  wrapperClassName,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeId = useId();

  function handleChange(raw: string) {
    setDraft(raw);
    const parsed = parseLenientNumber(raw);
    if (parsed === null) {
      setNotice(null);
      return;
    }
    if (Number.isNaN(parsed)) {
      setNotice("数字で入力してください");
      return;
    }
    if (max !== undefined && parsed > max) {
      setNotice(`${formatNumber(max)}${unit}までで入力してください（${formatNumber(max)}${unit}で計算します）`);
      onValueChange(max);
      return;
    }
    if (min !== undefined && parsed < min) {
      setNotice(`${formatNumber(min)}${unit}以上で入力してください（${formatNumber(min)}${unit}で計算します）`);
      onValueChange(min);
      return;
    }
    setNotice(null);
    onValueChange(parsed);
  }

  function handleBlur() {
    setDraft(null);
    // An abandoned non-number is dropped silently; the kept value is shown again.
    if (notice === "数字で入力してください") setNotice(null);
  }

  return (
    <span className={cn("inline-flex flex-col items-end gap-1", wrapperClassName)}>
      <span className="inline-flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={label}
          aria-describedby={notice ? noticeId : undefined}
          aria-invalid={notice ? true : undefined}
          value={draft ?? String(value)}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={handleBlur}
          className={cn(
            "flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-right text-base font-bold text-amber-700 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm",
            notice && "border-destructive",
            className
          )}
        />
        {unit && <span className="shrink-0 text-sm text-muted-foreground">{unit}</span>}
      </span>
      {notice && (
        <span id={noticeId} className="max-w-[18rem] text-right text-xs font-medium text-destructive">
          {notice}
        </span>
      )}
    </span>
  );
}
