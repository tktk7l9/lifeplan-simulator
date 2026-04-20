import type { SimulationInput, MonteCarloResult, MonteCarloDataPoint } from "./types";
import { runSimulation } from "./calculator";

// Box-Muller transform for normal random variable
function randn(mean: number, std: number): number {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function runMonteCarlo(input: SimulationInput, runs = 400): MonteCarloResult {
  const baseResult = runSimulation(input);
  const ages = baseResult.yearlyData.map((d) => d.age);

  // Volatility: σ ≈ expected_return * 2.2, capped at 18%
  const expectedReturn = input.investmentReturnRate;
  const sigma = Math.min(18, Math.max(5, expectedReturn * 2.2));

  // Track assets at each age across all runs
  const assetsByAge: number[][] = ages.map(() => []);

  for (let run = 0; run < runs; run++) {
    // Each run uses the same base simulation but with stochastic annual returns
    const annualReturns = ages.map(() => randn(expectedReturn, sigma));

    // 本計算と同じ: 企業型DC残高は投資資産に加算
    let savingsAssets = input.currentSavings;
    let investmentAssets = input.currentInvestmentAssets + (input.corporateDCBalance ?? 0);

    const inflRate = (input.inflationRate ?? 1.5) / 100;
    const totalMonthlyInvestment =
      (input.monthlyInvestment ?? 0) +
      (input.nisaAccumulationMonthly ?? 0) +
      (input.nisaGrowthMonthly ?? 0) +
      (input.monthlyIdeco ?? 0) +
      (input.shokiboKigyoMonthly ?? 0) +
      (input.corporateDCMonthly ?? 0);

    for (let i = 0; i < ages.length; i++) {
      const base = baseResult.yearlyData[i];
      const annualReturn = annualReturns[i];
      const monthlyReturn = Math.max(-0.05, annualReturn / 100 / 12);

      const isRetired = base.age >= input.retirementAge;

      // Same income/expenses as base simulation
      const totalIncome = base.income + base.spouseIncome;
      const totalExpense = base.totalExpense;
      const netCashFlow = totalIncome - totalExpense;

      // Investment compounding with random return
      if (!isRetired) {
        for (let m = 0; m < 12; m++) {
          investmentAssets = investmentAssets * (1 + monthlyReturn) + totalMonthlyInvestment;
        }
      } else {
        for (let m = 0; m < 12; m++) {
          investmentAssets = investmentAssets * (1 + monthlyReturn);
        }
      }
      investmentAssets = Math.max(0, investmentAssets);

      savingsAssets = savingsAssets + netCashFlow;
      if (!isRetired) savingsAssets -= totalMonthlyInvestment * 12;

      if (savingsAssets < 0 && investmentAssets > 0) {
        const draw = Math.min(-savingsAssets, investmentAssets);
        investmentAssets -= draw;
        savingsAssets += draw;
      }

      const cumulativeAssets = Math.max(0, savingsAssets) + investmentAssets;
      assetsByAge[i].push(cumulativeAssets);
    }
  }

  const dataPoints: MonteCarloDataPoint[] = ages.map((age, i) => ({
    age,
    p10: Math.round(percentile(assetsByAge[i], 10)),
    p25: Math.round(percentile(assetsByAge[i], 25)),
    p50: Math.round(percentile(assetsByAge[i], 50)),
    p75: Math.round(percentile(assetsByAge[i], 75)),
    p90: Math.round(percentile(assetsByAge[i], 90)),
  }));

  // Failure = any run where assets reach 0 before age 90
  const age90idx = ages.findIndex((a) => a >= 90);
  let failures = 0;
  if (age90idx >= 0) {
    for (let run = 0; run < runs; run++) {
      let failed = false;
      for (let i = 0; i <= age90idx; i++) {
        if (assetsByAge[i][run] <= 0) { failed = true; break; }
      }
      if (failed) failures++;
    }
  }

  return {
    dataPoints,
    failureProbability: Math.round((failures / runs) * 100),
  };
}
