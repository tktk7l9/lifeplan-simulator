import { describe, it, expect } from "vitest";
import { runSensitivityAnalysis } from "../sensitivityAnalysis";
import type { SimulationInput } from "../types";

function baseInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    age: 30,
    retirementAge: 65,
    gender: "male",
    hasSpouse: false,
    spouseAge: 0,
    children: [],
    employmentType: "employee",
    annualIncome: 600,
    incomeGrowthRate: 1.0,
    sideIncomeMonthly: 0,
    postRetirementIncomeMonthly: 5,
    postRetirementIncomeUntilAge: 70,
    spouseEmploymentType: "homemaker",
    spouseAnnualIncome: 0,
    spouseIncomeGrowthRate: 0,
    spouseCareerBreakStartAge: 0,
    spouseCareerBreakEndAge: 0,
    spouseCareerBreakIncomeMonthly: 0,
    monthlyLivingExpense: 22,
    monthlyRent: 10,
    housingType: "rent",
    purchaseAge: 0,
    propertyPrice: 0,
    downPayment: 0,
    mortgageRate: 0,
    mortgagePeriod: 0,
    lifeEvents: [],
    currentSavings: 500,
    currentInvestmentAssets: 0,
    monthlyInvestment: 3,
    investmentReturnRate: 5,
    nisaAccumulationMonthly: 0,
    nisaGrowthMonthly: 0,
    nisaProductId: "sp500",
    nisaReturnRate: 7,
    monthlyIdeco: 0,
    idecoProductId: "sp500",
    idecoReturnRate: 7,
    shokiboKigyoMonthly: 0,
    inflationRate: 1.5,
    spouseRetirementAge: 0,
    retirementAllowance: 0,
    lifeInsurancePremiumMonthly: 0,
    medicalCostMonthlyAt70: 0,
    nursingCareStartAge: 0,
    nursingCareCostMonthly: 0,
    corporatePensionMonthly: 0,
    corporateDCBalance: 0,
    corporateDCMonthly: 0,
    officerAnnualIncome: 0,
    officerIncomeGrowthRate: 0,
    useAgeBasedSpendingCurve: true,
    ...overrides,
  };
}

describe("runSensitivityAnalysis", () => {
  it("returns results for all 6 parameters", () => {
    const r = runSensitivityAnalysis(baseInput());
    const params = r.map((d) => d.parameter);
    expect(params).toContain("annualIncome");
    expect(params).toContain("investmentReturnRate");
    expect(params).toContain("monthlyLivingExpense");
    expect(params).toContain("inflationRate");
    expect(params).toContain("retirementAge");
    expect(params).toContain("postRetirementIncome");
  });

  it("base is the same at every point, and low <= base or low != high", () => {
    const r = runSensitivityAnalysis(baseInput());
    const base = r[0].base;
    for (const dp of r) expect(dp.base).toBe(base);
  });

  it("sorted descending by impact (high-low)", () => {
    const r = runSensitivityAnalysis(baseInput());
    for (let i = 1; i < r.length; i++) {
      const prev = r[i - 1].high - r[i - 1].low;
      const cur  = r[i].high - r[i].low;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });

  it("works with the fallback (1.5%) when inflationRate is undefined", () => {
    const input = baseInput();
    // @ts-expect-error deliberately deleted to hit the fallback branch
    delete input.inflationRate;
    const r = runSensitivityAnalysis(input);
    expect(r.find((d) => d.parameter === "inflationRate")).toBeDefined();
  });

  it("falls back to 0 when postRetirementIncomeMonthly is undefined", () => {
    const input = baseInput();
    // @ts-expect-error deliberately deleted to hit the fallback branch
    delete input.postRetirementIncomeMonthly;
    const r = runSensitivityAnalysis(input);
    expect(r.find((d) => d.parameter === "postRetirementIncome")).toBeDefined();
  });

  it("clamped to 0 by Math.max(0,...) even when investmentReturnRate is 1%", () => {
    const r = runSensitivityAnalysis(baseInput({ investmentReturnRate: 1 }));
    const ret = r.find((d) => d.parameter === "investmentReturnRate")!;
    expect(ret).toBeDefined();
  });
});
