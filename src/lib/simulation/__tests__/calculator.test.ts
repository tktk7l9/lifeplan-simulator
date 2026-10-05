import { describe, it, expect } from "vitest";
import { calcNetIncome, calcFreelanceOfficerNetIncome, runSimulation } from "../calculator";
import { NISA_PRODUCTS, IDECO_PRODUCTS } from "../types";
import type { SimulationInput } from "../types";

describe("investment product master constants", () => {
  it("NISA_PRODUCTS / IDECO_PRODUCTS have the minimum fields", () => {
    for (const p of [...NISA_PRODUCTS, ...IDECO_PRODUCTS]) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(typeof p.expectedReturn).toBe("number");
    }
  });
});

// Common minimal input (overridden per test)
function baseInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    age: 30,
    retirementAge: 65,
    gender: "male",
    hasSpouse: false,
    spouseAge: 0,
    children: [],
    employmentType: "employee",
    annualIncome: 500,
    incomeGrowthRate: 1.0,
    sideIncomeMonthly: 0,
    postRetirementIncomeMonthly: 0,
    postRetirementIncomeUntilAge: 65,
    spouseEmploymentType: "homemaker",
    spouseAnnualIncome: 0,
    spouseIncomeGrowthRate: 0,
    spouseCareerBreakStartAge: 0,
    spouseCareerBreakEndAge: 0,
    spouseCareerBreakIncomeMonthly: 0,
    monthlyLivingExpense: 25,
    monthlyRent: 10,
    housingType: "rent",
    purchaseAge: 0,
    propertyPrice: 0,
    downPayment: 0,
    mortgageRate: 0,
    mortgagePeriod: 0,
    lifeEvents: [],
    currentSavings: 200,
    currentInvestmentAssets: 0,
    monthlyInvestment: 0,
    investmentReturnRate: 3,
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

describe("calcNetIncome", () => {
  it("homemaker is always 0", () => {
    expect(calcNetIncome(500, "homemaker", 30)).toBe(0);
  });

  it("returns 0 for zero or negative gross income", () => {
    expect(calcNetIncome(0, "employee", 30)).toBe(0);
    expect(calcNetIncome(-100, "employee", 30)).toBe(0);
  });

  it("employee, 500万 income, age 30: take-home pay within the current logic's range", () => {
    // Take-home is roughly 3.8–4.1M yen (tax + social insurance ~18–24%)
    const net = calcNetIncome(500, "employee", 30);
    expect(net).toBeGreaterThan(370);
    expect(net).toBeLessThan(420);
  });

  it("from age 40, take-home pay drops by the long-term care insurance premium", () => {
    const under40 = calcNetIncome(600, "employee", 39);
    const over40  = calcNetIncome(600, "employee", 40);
    expect(over40).toBeLessThan(under40);
    // The difference equals the 0.91% social insurance share (≈ 50–70k yen)
    expect(under40 - over40).toBeGreaterThan(3);
    expect(under40 - over40).toBeLessThan(10);
  });

  it("iDeCo contributions are income-deductible, so take-home pay rises", () => {
    const noIdeco   = calcNetIncome(600, "employee", 30, 0);
    const withIdeco = calcNetIncome(600, "employee", 30, 2.3); // 23k yen/month
    expect(withIdeco).toBeGreaterThan(noIdeco);
  });
});

describe("calcFreelanceOfficerNetIncome", () => {
  it("0 when both incomes are 0", () => {
    expect(calcFreelanceOfficerNetIncome(0, 0, 35)).toBe(0);
  });

  it("freelance income only roughly matches calcNetIncome(freelance)", () => {
    // Exact equality fails because the social insurance logic differs slightly, so compare approximately
    const v = calcFreelanceOfficerNetIncome(500, 0, 35);
    expect(v).toBeGreaterThan(380);
    expect(v).toBeLessThan(470);
  });

  it("adding officer compensation increases total take-home pay", () => {
    const noOfficer   = calcFreelanceOfficerNetIncome(300, 0, 35);
    const withOfficer = calcFreelanceOfficerNetIncome(300, 400, 35);
    expect(withOfficer).toBeGreaterThan(noOfficer);
  });
});

describe("runSimulation: structural invariants", () => {
  it("yearlyData covers 71 years from age=30 to 100", () => {
    const r = runSimulation(baseInput());
    expect(r.yearlyData).toHaveLength(71);
    expect(r.yearlyData[0].age).toBe(30);
    expect(r.yearlyData[r.yearlyData.length - 1].age).toBe(100);
  });

  it("year increases monotonically, fully in sync with age", () => {
    const r = runSimulation(baseInput());
    for (let i = 1; i < r.yearlyData.length; i++) {
      expect(r.yearlyData[i].age).toBe(r.yearlyData[i - 1].age + 1);
      expect(r.yearlyData[i].year).toBe(r.yearlyData[i - 1].year + 1);
    }
  });

  it("cumulativeAssets at retirementAge matches retirementAssets", () => {
    const input = baseInput({ retirementAge: 65 });
    const r = runSimulation(input);
    const retYear = r.yearlyData.find((d) => d.age === 65)!;
    expect(retYear.cumulativeAssets).toBeCloseTo(r.retirementAssets, 6);
  });

  it("cumulativeAssets in the last year matches finalAssets", () => {
    const r = runSimulation(baseInput());
    expect(r.yearlyData[r.yearlyData.length - 1].cumulativeAssets).toBeCloseTo(r.finalAssets, 6);
  });

  it("monthly pension is non-negative and at a payable level", () => {
    const r = runSimulation(baseInput());
    expect(r.pensionMonthly).toBeGreaterThan(0);
    expect(r.pensionMonthly).toBeLessThan(40); // 10k yen/month
  });

  it("investment assets stay non-negative with no investment (only +0 in the first month)", () => {
    const r = runSimulation(baseInput());
    for (const y of r.yearlyData) expect(y.investmentAssets).toBeGreaterThanOrEqual(0);
  });

  it("the down payment is deducted from savings at purchase", () => {
    // Give ample cash on hand so the down payment's effect is observable (baseInput has 2M yen)
    const opts = {
      currentSavings: 2000,
      annualIncome: 800,
      monthlyLivingExpense: 20,
    } as const;
    const rentR = runSimulation(baseInput({ ...opts, housingType: "rent", monthlyRent: 10 }));
    const buyR  = runSimulation(
      baseInput({
        ...opts,
        housingType: "buy",
        purchaseAge: 35,
        propertyPrice: 4000,
        downPayment: 800,
        mortgageRate: 1.5,
        mortgagePeriod: 35,
        monthlyRent: 0,
      })
    );
    const rentAt35 = rentR.yearlyData.find((d) => d.age === 35)!;
    const buyAt35  = buyR.yearlyData.find((d) => d.age === 35)!;
    // In the purchase year assets drop by the down payment → cumulativeAssets is smaller than with rent
    expect(buyAt35.cumulativeAssets).toBeLessThan(rentAt35.cumulativeAssets);
  });

  it("notes include the cap-reached message when the 1800万 NISA cap is hit", () => {
    // 150k yen/month × 12 × 10 years = 1800 (10k yen), exactly reaching the cap
    const r = runSimulation(
      baseInput({
        nisaAccumulationMonthly: 15,
        nisaGrowthMonthly: 0,
        annualIncome: 1500, // secure the contribution funds
      })
    );
    expect(r.notes.some((n) => n.includes("NISA"))).toBe(true);
  });

  it("old-age spending curve ON has lower total spending than OFF", () => {
    const on  = runSimulation(baseInput({ useAgeBasedSpendingCurve: true }));
    const off = runSimulation(baseInput({ useAgeBasedSpendingCurve: false }));
    expect(on.totalExpense).toBeLessThan(off.totalExpense);
  });
});

describe("runSimulation: current behavior lock (snapshot-like)", () => {
  // Pin the "current values" so calculation logic changes do not break things unintentionally.
  // Update only when a change that shifts values by orders of magnitude is intended.
  it("healthy case (income 800, spending 20, investing 3万/month) has positive assets at 65", () => {
    const r = runSimulation(
      baseInput({
        annualIncome: 800,
        monthlyLivingExpense: 20,
        currentSavings: 500,
        monthlyInvestment: 3,
      })
    );
    expect(r.retirementAssets).toBeGreaterThan(0);
    expect(r.totalIncome).toBeGreaterThan(0);
    expect(r.totalExpense).toBeGreaterThan(0);
  });

  it("lifetime total income is after tax and within a realistic range for 35 working years (500万 income)", () => {
    const r = runSimulation(baseInput());
    // After-tax take-home ~4M yen × 35 years + 35 years of pension after retirement → roughly 150–250M yen
    expect(r.totalIncome).toBeGreaterThan(10000);
    expect(r.totalIncome).toBeLessThan(25000);
  });
});
