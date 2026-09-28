import type { SimulationInput, SensitivityDataPoint } from "./types";
import { runSimulation } from "./calculator";

function simulate(input: SimulationInput): number {
  return runSimulation(input).finalAssets;
}

export function runSensitivityAnalysis(input: SimulationInput): SensitivityDataPoint[] {
  const base = simulate(input);

  const results: SensitivityDataPoint[] = [];

  // Annual income ±20%
  results.push({
    parameter: "annualIncome",
    label: "年収",
    low:  simulate({ ...input, annualIncome: input.annualIncome * 0.8 }),
    base,
    high: simulate({ ...input, annualIncome: input.annualIncome * 1.2 }),
  });

  // Investment return ±2pp
  results.push({
    parameter: "investmentReturnRate",
    label: "投資リターン",
    low:  simulate({ ...input, investmentReturnRate: Math.max(0, input.investmentReturnRate - 2) }),
    base,
    high: simulate({ ...input, investmentReturnRate: input.investmentReturnRate + 2 }),
  });

  // Living expenses ±20%
  results.push({
    parameter: "monthlyLivingExpense",
    label: "生活費",
    low:  simulate({ ...input, monthlyLivingExpense: input.monthlyLivingExpense * 0.8 }),
    base,
    high: simulate({ ...input, monthlyLivingExpense: input.monthlyLivingExpense * 1.2 }),
  });

  // Inflation rate ±1pp
  results.push({
    parameter: "inflationRate",
    label: "物価上昇率",
    low:  simulate({ ...input, inflationRate: Math.max(0, (input.inflationRate ?? 1.5) - 1) }),
    base,
    high: simulate({ ...input, inflationRate: (input.inflationRate ?? 1.5) + 1 }),
  });

  // Retirement age ±5 years
  results.push({
    parameter: "retirementAge",
    label: "退職年齢",
    low:  simulate({ ...input, retirementAge: input.retirementAge - 5 }),
    base,
    high: simulate({ ...input, retirementAge: input.retirementAge + 5 }),
  });

  // Post-retirement work income: 0 vs 2x
  results.push({
    parameter: "postRetirementIncome",
    label: "老後就労収入",
    low:  simulate({ ...input, postRetirementIncomeMonthly: 0 }),
    base,
    high: simulate({ ...input, postRetirementIncomeMonthly: (input.postRetirementIncomeMonthly ?? 0) * 2 + 5 }),
  });

  // Sort by impact (range size)
  results.sort((a, b) => (b.high - b.low) - (a.high - a.low));

  return results;
}
