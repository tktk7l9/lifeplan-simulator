import type { YearlyData } from "./types";

export interface Depletion {
  /** First age at which total assets fall below zero. */
  age: number;
  /** Largest shortfall over the simulated period, in 万円 (positive number). */
  maxShortfall: number;
}

/** Turns the yearly table into the answer the user wants: when does money run out, and by how much (SHIG 28). */
export function findDepletion(yearlyData: YearlyData[]): Depletion | null {
  const first = yearlyData.find((d) => d.cumulativeAssets < 0);
  if (!first) return null;
  const lowest = Math.min(...yearlyData.map((d) => d.cumulativeAssets));
  return { age: first.age, maxShortfall: Math.round(-lowest) };
}
