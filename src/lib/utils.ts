import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatManYen(value: number): string {
  return `${value.toLocaleString("ja-JP")}万円`;
}

export function formatYen(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}
