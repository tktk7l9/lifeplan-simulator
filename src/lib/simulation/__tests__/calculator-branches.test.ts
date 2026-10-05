// Locks the current behavior of each branch of calculator.ts. Employment type, deduction tier, housing type, spouse pattern,
// old-age costs and other paths that split by input combination are each pinned to exact amounts, one at a time.
// The neighboring calculator.test.ts covers structural invariants (year count, monotonicity, consistency).
//
// Values were measured as of 2026-09-12. When the tax rules or assumptions are changed on purpose, this file failing
// confirms that "the change took effect", so review the diff before updating.
// (This file used to be named calculator-coverage.test.ts and was a list of
//   `expect(...).toBeGreaterThan(0)` that merely hit branches. The branches ran, but it passed even if amounts doubled or halved,
//   so it was replaced with exact-amount locks.)

import { describe, it, expect } from "vitest";
import { calcNetIncome, calcFreelanceOfficerNetIncome, runSimulation } from "../calculator";
import type { SimulationInput, ChildInfo, LifeEvent } from "../types";

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

/**
 * Locks the current take-home pay calculation.
 *
 * This used to be a list of `expect(...).toBeGreaterThan(0)` (5 employment types, 5 boundary points of the employment income
 * deduction, 3 tiers of the basic deduction…). They hit the branches, but all passed even with `return 1`, so take-home pay doubling
 * or halving went unnoticed. Only pinning exact amounts in a table makes amount regressions fail.
 *
 * Units are 10k yen/year. Values are measured from the implementation as of 2026-09-12. When the tax rules are changed on purpose,
 * update these deliberately (the diff appearing is itself the confirmation that the change "took effect").
 */
describe("calcNetIncome: take-home pay by employment type and income band (current behavior lock)", () => {
  it.each<[string, number, string, number, number]>([
    ["公務員",                 600, "civil_servant",      30, 461.8620],
    ["会社員兼フリーランス",   600, "employee_freelance", 30, 461.8620],
    ["自営業（厚生年金なし）", 500, "self_employed",      30, 383.0489],
    ["フリーランス",           500, "freelance",          30, 383.0489],
    ["パート",                 200, "part_time",          30, 177.8692],
    // Employment income deduction boundaries: 180 / 360 / 660 / 850 / cap
    ["給与所得控除 180万境界",  180, "employee",          30, 148.3558],
    ["給与所得控除 360万境界",  360, "employee",          30, 285.7318],
    ["給与所得控除 660万境界",  660, "employee",          30, 504.1581],
    ["給与所得控除 850万境界",  850, "employee",          30, 623.0367],
    ["給与所得控除 上限超",    1500, "employee",          30, 985.0592],
    // Top progressive tax bracket (over 40M yen, 45% band)
    ["45%帯",                 5000, "employee",          50, 2462.6720],
    // The 3 tapering tiers of the basic deduction (2400 / 2450 / over 2500)
    ["基礎控除 2400超",       2450, "employee",          40, 1419.7995],
    ["基礎控除 2450超",       2480, "employee",          40, 1424.1478],
    ["基礎控除 2500超",       2600, "employee",          40, 1465.9442],
  ])("%s: 年収%d万 / %s / %d歳 → 手取り %s万", (_label, gross, type, age, expected) => {
    expect(calcNetIncome(gross, type, age)).toBeCloseTo(expected, 3);
  });

  it("large additionalDeductions raise take-home pay (boundary below the basic deduction)", () => {
    const no = calcNetIncome(600, "employee", 30, 0, 0);
    const yes = calcNetIncome(600, "employee", 30, 0, 100);
    expect(yes).toBeGreaterThan(no);
  });
});

describe("calcFreelanceOfficerNetIncome: business income + officer compensation (役員報酬) (current behavior lock)", () => {
  it.each<[string, number, number, number, number]>([
    ["役員報酬のみ（事業0）",      0, 500, 35, 389.5597],
    // Employment income deduction boundaries on the officer compensation side
    ["役員 180万境界",           100, 180, 30, 243.0691],
    ["役員 360万境界",           100, 360, 30, 380.4451],
    ["役員 660万境界",           100, 660, 30, 593.5111],
    ["役員 850万境界",           100, 850, 30, 712.3897],
    ["役員 上限超",              100, 1500, 30, 1069.7666],
    ["45%帯",                   2000, 3000, 50, 2634.3732],
    // The 3 tiers of the basic deduction (total income ≤2400 / ≤2450 / ≤2500 / above)
    ["基礎控除 48万段",         1000, 1000, 40, 1330.5525],
    ["基礎控除 32万段",         1200, 1230, 40, 1535.1354],
    ["基礎控除 16万段",         1240, 1240, 40, 1550.8259],
    ["基礎控除 0 段",           1200, 1300, 40, 1556.1273],
    ["基礎控除 0 段（事業増）", 1300, 1300, 40, 1597.1529],
  ])("%s: 事業%d万 + 役員%d万 / %d歳 → 手取り %s万", (_label, business, officer, age, expected) => {
    expect(calcFreelanceOfficerNetIncome(business, officer, age)).toBeCloseTo(expected, 3);
  });

  it("the higher social insurance premium from age 40 is reflected in take-home pay", () => {
    const under = calcFreelanceOfficerNetIncome(300, 400, 39);
    const over  = calcFreelanceOfficerNetIncome(300, 400, 40);
    expect(over).toBeLessThan(under);
  });
});

describe("runSimulation: housing type branches", () => {
  it("housingType=own: only maintenance + fixed asset tax (固定資産税)", () => {
    const r = runSimulation(baseInput({ housingType: "own", propertyPrice: 4000, monthlyRent: 0 }));
    const y = r.yearlyData[0];
    // upkeep 300k + fixed asset tax (4000 * 0.008 = 320k) = 620k
    expect(y.housingCost).toBe(62);
    expect(y.propertyValue).toBe(4000);
  });

  it("housingType=buy: no rent before purchaseAge, mortgage after purchase", () => {
    const r = runSimulation(
      baseInput({
        currentSavings: 2000,
        housingType: "buy",
        purchaseAge: 40,
        propertyPrice: 4000,
        downPayment: 500,
        mortgageRate: 1.0,
        mortgagePeriod: 30,
        monthlyRent: 0,
      })
    );
    const before = r.yearlyData.find((d) => d.age === 39)!;
    const after = r.yearlyData.find((d) => d.age === 41)!;
    expect(before.housingCost).toBe(0);
    expect(after.housingCost).toBeCloseTo(167.0886, 4);
  });

  it("housingType=buy: after the mortgage is paid off, only 30万 maintenance + fixed asset tax", () => {
    const r = runSimulation(
      baseInput({
        currentSavings: 3000,
        housingType: "buy",
        purchaseAge: 35,
        propertyPrice: 4000,
        downPayment: 500,
        mortgageRate: 1.5,
        mortgagePeriod: 20,
        monthlyRent: 0,
      })
    );
    // Loan paid off at 35+20 = 55; from 56 onward, upkeep + tax
    const after = r.yearlyData.find((d) => d.age === 60)!;
    expect(after.housingCost).toBeCloseTo(30 + 4000 * 0.008, 0);
  });

  it("housing loan deduction stops 13 years after the purchase year", () => {
    // Comparing income while the credit applies vs. after it ends is hard, so
    // ensure that within 13 years housingLoanCredit is added to income (not negative)
    const r = runSimulation(
      baseInput({
        housingType: "buy",
        purchaseAge: 35,
        propertyPrice: 4000,
        downPayment: 500,
        mortgageRate: 1.0,
        mortgagePeriod: 35,
        annualIncome: 700,
        currentSavings: 2000,
      })
    );
    // In the 5th year after purchase (age 40) the credit applies → total income should exceed take-home pay
    const at40 = r.yearlyData.find((d) => d.age === 40)!;
    expect(at40.income).toBeCloseTo(591.111, 4);
  });

  it("works with a 0% mortgageRate", () => {
    const r = runSimulation(
      baseInput({
        currentSavings: 2000,
        housingType: "buy",
        purchaseAge: 35,
        propertyPrice: 3000,
        downPayment: 500,
        mortgageRate: 0,
        mortgagePeriod: 25,
        monthlyRent: 0,
      })
    );
    expect(r.yearlyData[0].income).toBeGreaterThanOrEqual(0);
  });
});

describe("runSimulation: children's education cost branches", () => {
  const child = (overrides: Partial<ChildInfo> = {}): ChildInfo => ({
    id: "c",
    birthAge: 30,
    educationPath: "public",
    ...overrides,
  });

  it("public for every stage (kindergarten to university)", () => {
    const r = runSimulation(baseInput({ children: [child({ educationPath: "public" })] }));
    expect(r.yearlyData.some((y) => y.educationCost > 0)).toBe(true);
  });

  it("private for every stage", () => {
    const r = runSimulation(baseInput({ children: [child({ educationPath: "private" })] }));
    const total = r.yearlyData.reduce((s, y) => s + y.educationCost, 0);
    expect(total).toBe(2626);
  });

  it("mix: between public and private", () => {
    const pubR = runSimulation(baseInput({ children: [child({ educationPath: "public" })] }));
    const privR = runSimulation(baseInput({ children: [child({ educationPath: "private" })] }));
    const mixR = runSimulation(baseInput({ children: [child({ educationPath: "mix" })] }));
    const pub = pubR.yearlyData.reduce((s, y) => s + y.educationCost, 0);
    const priv = privR.yearlyData.reduce((s, y) => s + y.educationCost, 0);
    const mix = mixR.yearlyData.reduce((s, y) => s + y.educationCost, 0);
    expect(mix).toBeGreaterThan(pub);
    expect(mix).toBeLessThan(priv);
  });

  it("dependent deductions for ages 16-18 and 19-22 apply (reflected in take-home pay)", () => {
    const withTeen = runSimulation(
      baseInput({
        age: 46, // child is 16
        children: [child({ birthAge: 30, educationPath: "public" })],
        annualIncome: 700,
      })
    );
    const withCollege = runSimulation(
      baseInput({
        age: 49, // child is 19
        children: [child({ birthAge: 30, educationPath: "public" })],
        annualIncome: 700,
      })
    );
    expect(withTeen.yearlyData[0].income).toBeCloseTo(535.9531, 4);
    expect(withCollege.yearlyData[0].income).toBeCloseTo(541.0056, 4);
  });
});

describe("runSimulation: spouse patterns", () => {
  it("homemaker: basic pension after retirement (category 3 insured, 第3号被保険者)", () => {
    const r = runSimulation(
      baseInput({ hasSpouse: true, spouseAge: 30, spouseEmploymentType: "homemaker" })
    );
    expect(r.spousePensionMonthly).toBeCloseTo(6.8, 4);
  });

  it("employee spouse: employees' pension after retirement", () => {
    const r = runSimulation(
      baseInput({
        hasSpouse: true,
        spouseAge: 32,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
        spouseIncomeGrowthRate: 1,
      })
    );
    expect(r.spousePensionMonthly).toBeCloseTo(12.7114, 4);
  });

  it("employee spouse (self gender=female): the other side of the gender ternary", () => {
    const r = runSimulation(
      baseInput({
        gender: "female",
        hasSpouse: true,
        spouseAge: 32,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
      })
    );
    expect(r.spousePensionMonthly).toBeCloseTo(11.6391, 4);
  });

  it("retirementAge before age → retirementData undefined falls back to 0", () => {
    // With age=70 and retirementAge=65, yearlyData starts at 70, so
    // there is no entry with age===65 → retirementAssets falls back to 0
    const r = runSimulation(baseInput({ age: 70, retirementAge: 65 }));
    expect(r.retirementAssets).toBe(0);
  });

  it("income during parental leave / career break is counted", () => {
    const r = runSimulation(
      baseInput({
        hasSpouse: true,
        spouseAge: 30,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
        spouseCareerBreakStartAge: 32,
        spouseCareerBreakEndAge: 34,
        spouseCareerBreakIncomeMonthly: 10,
      })
    );
    const inBreak = r.yearlyData.find((d) => d.age === 33)!; // spouseAge=33
    expect(inBreak.spouseIncome).toBeCloseTo(113.34895, 5);
  });

  it("no error during a career break with zero income", () => {
    const r = runSimulation(
      baseInput({
        hasSpouse: true,
        spouseAge: 30,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
        spouseCareerBreakStartAge: 32,
        spouseCareerBreakEndAge: 34,
        spouseCareerBreakIncomeMonthly: 0,
      })
    );
    const inBreak = r.yearlyData.find((d) => d.age === 33)!;
    expect(inBreak.spouseIncome).toBe(0);
  });

  // Hits both paths of the ternary on the user's gender. Measured, the spouse pension is
  // the same either way (19.7717 (10k yen)/month), and "the user's gender does not affect the spouse pension"
  // is exactly what we want to assert. These used to be separate its, whose names
  // said "the other side of the ternary" while nobody checked that the values were equal.
  it.each(["female", "male"] as const)(
    "spouse works for life (retirement age > 100): spouse pension is the same with self gender=%s",
    (gender) => {
      const r = runSimulation(
        baseInput({
          gender,
          hasSpouse: true,
          spouseAge: 30,
          spouseRetirementAge: 120,
          spouseEmploymentType: "employee",
          spouseAnnualIncome: 400,
        })
      );
      expect(r.spousePensionMonthly).toBeCloseTo(19.7717, 4);
    }
  );

  it("spouse retirement age is set independently", () => {
    const r = runSimulation(
      baseInput({
        hasSpouse: true,
        spouseAge: 30,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
        spouseRetirementAge: 60,
        retirementAge: 65,
      })
    );
    expect(r.spousePensionMonthly).toBeCloseTo(10.581, 4);
  });

  it("spouse deduction: homemaker aged 70+ gets the elderly spouse deduction (48万)", () => {
    const r = runSimulation(
      baseInput({
        age: 38, // the spouse does not start at 70, but this is the line where the deduction applies with hasSpouse before the user's pension
        annualIncome: 700,
        hasSpouse: true,
        spouseAge: 70,
        spouseEmploymentType: "homemaker",
      })
    );
    expect(r.yearlyData[0].income).toBeCloseTo(543.0568, 4);
  });

  it("a spouse with income ≤103万円 also qualifies for the spouse deduction", () => {
    const r = runSimulation(
      baseInput({
        annualIncome: 700,
        hasSpouse: true,
        spouseAge: 30,
        spouseEmploymentType: "part_time",
        spouseAnnualIncome: 100,
      })
    );
    expect(r.yearlyData[0].income).toBeCloseTo(540.7448, 4);
  });
});

describe("runSimulation: investment / NISA / iDeCo / corporate DC / Small Business Mutual Aid (小規模企業共済)", () => {
  it("does not break with iDeCo, Small Business Mutual Aid and corporate DC all set", () => {
    const r = runSimulation(
      baseInput({
        employmentType: "self_employed",
        annualIncome: 800,
        monthlyIdeco: 6.8,
        shokiboKigyoMonthly: 7,
        corporateDCMonthly: 0,
      })
    );
    expect(r.yearlyData).toHaveLength(71);
  });
  it("corporate DC balance is added to investment assets", () => {
    const a = runSimulation(baseInput({ corporateDCBalance: 0 }));
    const b = runSimulation(baseInput({ corporateDCBalance: 500 }));
    expect(b.yearlyData[0].investmentAssets).toBeGreaterThan(a.yearlyData[0].investmentAssets);
  });
  it("monthly corporate pension (DB) increases post-retirement income", () => {
    const a = runSimulation(baseInput({ corporatePensionMonthly: 0 }));
    const b = runSimulation(baseInput({ corporatePensionMonthly: 5 }));
    const aRet = a.yearlyData.find((d) => d.age === 66)!;
    const bRet = b.yearlyData.find((d) => d.age === 66)!;
    expect(bRet.income).toBeGreaterThan(aRet.income);
  });
});

describe("runSimulation: old-age care, medical, insurance, retirement allowance and side income", () => {
  it("medicalCostMonthlyAt70: starts at 70", () => {
    const r = runSimulation(baseInput({ medicalCostMonthlyAt70: 2 }));
    expect(r.yearlyData.find((d) => d.age === 69)!.medicalCost).toBe(0);
    expect(r.yearlyData.find((d) => d.age === 70)!.medicalCost).toBe(24);
  });
  it("nursing care costs start at nursingCareStartAge", () => {
    const r = runSimulation(baseInput({ nursingCareStartAge: 80, nursingCareCostMonthly: 8 }));
    expect(r.yearlyData.find((d) => d.age === 79)!.medicalCost).toBe(0);
    expect(r.yearlyData.find((d) => d.age === 80)!.medicalCost).toBe(96);
  });
  it("life insurance premiums are counted only before retirement", () => {
    const r = runSimulation(baseInput({ lifeInsurancePremiumMonthly: 2 }));
    // before retirement < after retirement (difference from the premiums)
    const before = r.yearlyData.find((d) => d.age === 64)!.totalExpense;
    // Comparing a single year is rough, but it should be larger by the premiums
    expect(before).toBeCloseTo(720.7785, 4);
  });
  it("retirement allowance is added to savings in the retirement year", () => {
    const a = runSimulation(baseInput({ retirementAllowance: 0 }));
    const b = runSimulation(baseInput({ retirementAllowance: 2000 }));
    expect(b.retirementAssets).toBeGreaterThan(a.retirementAssets);
  });
  it("retirement allowance: deduction formula differs for ≤20 and >20 years of service (both compute)", () => {
    // 30→45: 15 years of service (≤20)
    const short = runSimulation(
      baseInput({ age: 30, retirementAge: 45, retirementAllowance: 1500 })
    );
    // 30→65: 35 years of service (>20)
    const long = runSimulation(baseInput({ retirementAge: 65, retirementAllowance: 1500 }));
    expect(short.retirementAssets).not.toBe(long.retirementAssets);
  });
  it("very large retirement allowance (over 1億円): the 45% bracket above 4000万", () => {
    const r = runSimulation(baseInput({ retirementAllowance: 12000 }));
    expect(r.retirementAssets).toBeCloseTo(6098.3766, 4);
  });
  it("postRetirementIncomeMonthly: post-retirement work income", () => {
    const a = runSimulation(baseInput({ postRetirementIncomeMonthly: 0 }));
    const b = runSimulation(
      baseInput({ postRetirementIncomeMonthly: 10, postRetirementIncomeUntilAge: 70 })
    );
    const at66 = b.yearlyData.find((d) => d.age === 66)!;
    const at66a = a.yearlyData.find((d) => d.age === 66)!;
    expect(at66.income).toBeGreaterThan(at66a.income);
  });
  it("sideIncomeMonthly: side income", () => {
    const a = runSimulation(baseInput({ sideIncomeMonthly: 0 }));
    const b = runSimulation(baseInput({ sideIncomeMonthly: 5 }));
    expect(b.yearlyData[0].income).toBeGreaterThan(a.yearlyData[0].income);
  });
});

describe("runSimulation: freelance + company officer path", () => {
  it("freelance + officerAnnualIncome > 0 switches the path", () => {
    const r = runSimulation(
      baseInput({
        employmentType: "freelance",
        annualIncome: 300,
        officerAnnualIncome: 400,
        officerIncomeGrowthRate: 2,
      })
    );
    expect(r.yearlyData[0].income).toBeCloseTo(562.0859, 4);
    expect(r.pensionMonthly).toBeCloseTo(15.082, 4);
  });
  it("self_employed + officerAnnualIncome takes the same path", () => {
    const r = runSimulation(
      baseInput({
        employmentType: "self_employed",
        annualIncome: 200,
        officerAnnualIncome: 500,
      })
    );
    expect(r.pensionMonthly).toBeCloseTo(13.9431, 4);
  });
});

describe("runSimulation: life events", () => {
  it("lifeEvents: cost is counted in the matching year", () => {
    const events: LifeEvent[] = [
      { id: "1", type: "wedding", age: 32, cost: 300, label: "結婚" },
      { id: "2", type: "car", age: 40, cost: 250, label: "車購入" },
    ];
    const r = runSimulation(baseInput({ lifeEvents: events }));
    const at32 = r.yearlyData.find((d) => d.age === 32)!;
    const at40 = r.yearlyData.find((d) => d.age === 40)!;
    expect(at32.lifeEventCost).toBe(300);
    expect(at40.lifeEventCost).toBe(250);
  });
});

describe("runSimulation: each diagnostic notes branch", () => {
  it("negative assets at retirement → caution note", () => {
    const r = runSimulation(
      baseInput({
        currentSavings: 0,
        annualIncome: 200,
        monthlyLivingExpense: 50, // heavy deficit
      })
    );
    expect(r.notes.some((n) => n.includes("退職時点で資産がマイナス"))).toBe(true);
  });

  it("negative finalAssets → assets-depleted-by-100 note", () => {
    const r = runSimulation(
      baseInput({ currentSavings: 0, annualIncome: 200, monthlyLivingExpense: 50 })
    );
    expect(r.notes.some((n) => n.includes("100歳時点で資産が枯渇"))).toBe(true);
  });

  it("household pension under 15万円 → caution note", () => {
    const r = runSimulation(
      baseInput({ employmentType: "part_time", annualIncome: 100 })
    );
    expect(r.notes.some((n) => n.includes("世帯年金"))).toBe(true);
  });

  it("no investment → note recommending NISA", () => {
    const r = runSimulation(baseInput());
    expect(r.notes.some((n) => n.includes("投資を行っていません"))).toBe(true);
  });

  it("buy mode → fixed asset tax note", () => {
    const r = runSimulation(
      baseInput({
        currentSavings: 2000,
        housingType: "buy",
        purchaseAge: 35,
        propertyPrice: 4000,
        downPayment: 500,
        mortgageRate: 1,
        mortgagePeriod: 30,
        monthlyRent: 0,
      })
    );
    expect(r.notes.some((n) => n.includes("固定資産税"))).toBe(true);
  });

  it("inflation >= 2.5% → high-inflation warning note", () => {
    const r = runSimulation(baseInput({ inflationRate: 3 }));
    expect(r.notes.some((n) => n.includes("物価上昇率"))).toBe(true);
  });

  it("assets at 100 over 5× those at retirement → excessive-return warning note", () => {
    const r = runSimulation(
      baseInput({
        currentSavings: 1000,
        currentInvestmentAssets: 2000,
        annualIncome: 1500,
        monthlyInvestment: 20,
        investmentReturnRate: 12, // unrealistically high
      })
    );
    expect(r.notes.some((n) => n.includes("退職時の5倍"))).toBe(true);
  });

  it("useAgeBasedSpendingCurve=false → OFF note", () => {
    const r = runSimulation(baseInput({ useAgeBasedSpendingCurve: false }));
    expect(r.notes.some((n) => n.includes("年齢別支出カーブはOFF"))).toBe(true);
  });
});

describe("runSimulation: NISA taxable-account fallback", () => {
  it("AFTER_TAX_RATE applies when NISA contributions exceed the 1800万 cap", () => {
    // 200k yen/month × 12 × 10 years = 24M yen, exceeding the cap
    const r = runSimulation(
      baseInput({
        annualIncome: 2000,
        currentSavings: 5000,
        nisaAccumulationMonthly: 20,
        nisaReturnRate: 7,
      })
    );
    expect(r.notes.some((n) => n.includes("NISA"))).toBe(true);
    expect(r.finalAssets).toBeCloseTo(85526.4871, 4);
  });
});

describe("runSimulation: old-age spending factor steps", () => {
  it("living costs step down at 70/75/80", () => {
    const r = runSimulation(baseInput({ monthlyLivingExpense: 30 }));
    const at69 = r.yearlyData.find((d) => d.age === 69)!.livingExpense;
    const at70 = r.yearlyData.find((d) => d.age === 70)!.livingExpense;
    const at75 = r.yearlyData.find((d) => d.age === 75)!.livingExpense;
    const at80 = r.yearlyData.find((d) => d.age === 80)!.livingExpense;
    // Rises with inflation but falls with the factor → check the ratio
    expect(at70 / at69).toBeLessThan(1.0);
    expect(at75 / at70).toBeLessThan(1.0);
    expect(at80 / at75).toBeLessThan(1.0);
  });
});
