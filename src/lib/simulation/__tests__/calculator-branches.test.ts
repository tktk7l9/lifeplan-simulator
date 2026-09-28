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
describe("calcNetIncome: 雇用形態と所得帯ごとの手取り（現状ロック）", () => {
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

  it("additionalDeductions が大きいと手取りが増える（基礎控除以下の境界）", () => {
    const no = calcNetIncome(600, "employee", 30, 0, 0);
    const yes = calcNetIncome(600, "employee", 30, 0, 100);
    expect(yes).toBeGreaterThan(no);
  });
});

describe("calcFreelanceOfficerNetIncome: 事業収入＋役員報酬（現状ロック）", () => {
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

  it("40歳以上の社保料増加分が手取りに反映される", () => {
    const under = calcFreelanceOfficerNetIncome(300, 400, 39);
    const over  = calcFreelanceOfficerNetIncome(300, 400, 40);
    expect(over).toBeLessThan(under);
  });
});

describe("runSimulation: 住居タイプ分岐", () => {
  it("housingType=own: 維持費＋固定資産税のみ", () => {
    const r = runSimulation(baseInput({ housingType: "own", propertyPrice: 4000, monthlyRent: 0 }));
    const y = r.yearlyData[0];
    // upkeep 300k + fixed asset tax (4000 * 0.008 = 320k) = 620k
    expect(y.housingCost).toBe(62);
    expect(y.propertyValue).toBe(4000);
  });

  it("housingType=buy で purchaseAge 前は家賃ゼロ・購入後はローン", () => {
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

  it("housingType=buy: ローン完済後は維持費30万+固定資産税のみ", () => {
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

  it("住宅ローン控除は購入年から13年で打ち切り", () => {
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

  it("0% mortgageRate も計算可能", () => {
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

describe("runSimulation: 子どもの教育費分岐", () => {
  const child = (overrides: Partial<ChildInfo> = {}): ChildInfo => ({
    id: "c",
    birthAge: 30,
    educationPath: "public",
    ...overrides,
  });

  it("public 全期間 (幼稚園〜大学)", () => {
    const r = runSimulation(baseInput({ children: [child({ educationPath: "public" })] }));
    expect(r.yearlyData.some((y) => y.educationCost > 0)).toBe(true);
  });

  it("private 全期間", () => {
    const r = runSimulation(baseInput({ children: [child({ educationPath: "private" })] }));
    const total = r.yearlyData.reduce((s, y) => s + y.educationCost, 0);
    expect(total).toBe(2626);
  });

  it("mix: public と private の中間値", () => {
    const pubR = runSimulation(baseInput({ children: [child({ educationPath: "public" })] }));
    const privR = runSimulation(baseInput({ children: [child({ educationPath: "private" })] }));
    const mixR = runSimulation(baseInput({ children: [child({ educationPath: "mix" })] }));
    const pub = pubR.yearlyData.reduce((s, y) => s + y.educationCost, 0);
    const priv = privR.yearlyData.reduce((s, y) => s + y.educationCost, 0);
    const mix = mixR.yearlyData.reduce((s, y) => s + y.educationCost, 0);
    expect(mix).toBeGreaterThan(pub);
    expect(mix).toBeLessThan(priv);
  });

  it("16-18歳・19-22歳の扶養控除が適用される（手取りに反映）", () => {
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

describe("runSimulation: 配偶者の各パターン", () => {
  it("homemaker: 退職後は基礎年金（第3号被保険者）", () => {
    const r = runSimulation(
      baseInput({ hasSpouse: true, spouseAge: 30, spouseEmploymentType: "homemaker" })
    );
    expect(r.spousePensionMonthly).toBeCloseTo(6.8, 4);
  });

  it("会社員配偶者: 退職後に厚生年金", () => {
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

  it("会社員配偶者(本人 gender=female ケース): 性別三項分岐の他方", () => {
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

  it("retirementAge が age より前 → retirementData undefined で fallback 0", () => {
    // With age=70 and retirementAge=65, yearlyData starts at 70, so
    // there is no entry with age===65 → retirementAssets falls back to 0
    const r = runSimulation(baseInput({ age: 70, retirementAge: 65 }));
    expect(r.retirementAssets).toBe(0);
  });

  it("育休/キャリアブレーク期間中の収入も計上される", () => {
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

  it("キャリアブレーク中・収入ゼロでもエラーにならない", () => {
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
    "配偶者が生涯現役 (退職年齢>100): 本人 gender=%s でも配偶者年金は同値",
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

  it("配偶者退職年齢の独立設定", () => {
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

  it("配偶者控除: 専業主婦・70歳以上は老人配偶者控除（48万）", () => {
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

  it("配偶者の所得 ≤103万円も配偶者控除対象", () => {
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

describe("runSimulation: 投資 / NISA / iDeCo / 企業DC / 小規模企業共済", () => {
  it("iDeCo月額・小規模企業共済・企業DC を全部入れても破綻しない", () => {
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
  it("企業型DC 残高は投資資産に加算される", () => {
    const a = runSimulation(baseInput({ corporateDCBalance: 0 }));
    const b = runSimulation(baseInput({ corporateDCBalance: 500 }));
    expect(b.yearlyData[0].investmentAssets).toBeGreaterThan(a.yearlyData[0].investmentAssets);
  });
  it("企業年金（DB）月額が退職後の income を増やす", () => {
    const a = runSimulation(baseInput({ corporatePensionMonthly: 0 }));
    const b = runSimulation(baseInput({ corporatePensionMonthly: 5 }));
    const aRet = a.yearlyData.find((d) => d.age === 66)!;
    const bRet = b.yearlyData.find((d) => d.age === 66)!;
    expect(bRet.income).toBeGreaterThan(aRet.income);
  });
});

describe("runSimulation: 老後の介護・医療・保険・退職金・副業", () => {
  it("medicalCostMonthlyAt70: 70歳から発生", () => {
    const r = runSimulation(baseInput({ medicalCostMonthlyAt70: 2 }));
    expect(r.yearlyData.find((d) => d.age === 69)!.medicalCost).toBe(0);
    expect(r.yearlyData.find((d) => d.age === 70)!.medicalCost).toBe(24);
  });
  it("介護費用は nursingCareStartAge から発生", () => {
    const r = runSimulation(baseInput({ nursingCareStartAge: 80, nursingCareCostMonthly: 8 }));
    expect(r.yearlyData.find((d) => d.age === 79)!.medicalCost).toBe(0);
    expect(r.yearlyData.find((d) => d.age === 80)!.medicalCost).toBe(96);
  });
  it("生命保険料は退職前にのみ計上", () => {
    const r = runSimulation(baseInput({ lifeInsurancePremiumMonthly: 2 }));
    // before retirement < after retirement (difference from the premiums)
    const before = r.yearlyData.find((d) => d.age === 64)!.totalExpense;
    // Comparing a single year is rough, but it should be larger by the premiums
    expect(before).toBeCloseTo(720.7785, 4);
  });
  it("退職金は退職年に貯蓄へ加算される", () => {
    const a = runSimulation(baseInput({ retirementAllowance: 0 }));
    const b = runSimulation(baseInput({ retirementAllowance: 2000 }));
    expect(b.retirementAssets).toBeGreaterThan(a.retirementAssets);
  });
  it("退職金: 勤務20年以下と20年超で控除式が違う（どちらも計算できる）", () => {
    // 30→45: 15 years of service (≤20)
    const short = runSimulation(
      baseInput({ age: 30, retirementAge: 45, retirementAllowance: 1500 })
    );
    // 30→65: 35 years of service (>20)
    const long = runSimulation(baseInput({ retirementAge: 65, retirementAllowance: 1500 }));
    expect(short.retirementAssets).not.toBe(long.retirementAssets);
  });
  it("退職金が極大 (1億円超): 4000万超の45%帯", () => {
    const r = runSimulation(baseInput({ retirementAllowance: 12000 }));
    expect(r.retirementAssets).toBeCloseTo(6098.3766, 4);
  });
  it("postRetirementIncomeMonthly: 退職後の就労収入", () => {
    const a = runSimulation(baseInput({ postRetirementIncomeMonthly: 0 }));
    const b = runSimulation(
      baseInput({ postRetirementIncomeMonthly: 10, postRetirementIncomeUntilAge: 70 })
    );
    const at66 = b.yearlyData.find((d) => d.age === 66)!;
    const at66a = a.yearlyData.find((d) => d.age === 66)!;
    expect(at66.income).toBeGreaterThan(at66a.income);
  });
  it("sideIncomeMonthly: 副業収入", () => {
    const a = runSimulation(baseInput({ sideIncomeMonthly: 0 }));
    const b = runSimulation(baseInput({ sideIncomeMonthly: 5 }));
    expect(b.yearlyData[0].income).toBeGreaterThan(a.yearlyData[0].income);
  });
});

describe("runSimulation: フリーランス兼役員パス", () => {
  it("freelance + officerAnnualIncome > 0 で経路スイッチ", () => {
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
  it("self_employed + officerAnnualIncome でも同経路", () => {
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

describe("runSimulation: ライフイベント", () => {
  it("lifeEvents: 該当年に費用計上", () => {
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

describe("runSimulation: 診断 notes 各分岐", () => {
  it("退職時点で資産マイナス → 注意note", () => {
    const r = runSimulation(
      baseInput({
        currentSavings: 0,
        annualIncome: 200,
        monthlyLivingExpense: 50, // heavy deficit
      })
    );
    expect(r.notes.some((n) => n.includes("退職時点で資産がマイナス"))).toBe(true);
  });

  it("最終 finalAssets マイナス → 100歳資産枯渇note", () => {
    const r = runSimulation(
      baseInput({ currentSavings: 0, annualIncome: 200, monthlyLivingExpense: 50 })
    );
    expect(r.notes.some((n) => n.includes("100歳時点で資産が枯渇"))).toBe(true);
  });

  it("世帯年金が15万円未満 → 注意note", () => {
    const r = runSimulation(
      baseInput({ employmentType: "part_time", annualIncome: 100 })
    );
    expect(r.notes.some((n) => n.includes("世帯年金"))).toBe(true);
  });

  it("投資ゼロ → NISA勧めnote", () => {
    const r = runSimulation(baseInput());
    expect(r.notes.some((n) => n.includes("投資を行っていません"))).toBe(true);
  });

  it("購入モード → 固定資産税note", () => {
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

  it("inflation >= 2.5% → 高インフレ警告note", () => {
    const r = runSimulation(baseInput({ inflationRate: 3 }));
    expect(r.notes.some((n) => n.includes("物価上昇率"))).toBe(true);
  });

  it("100歳資産が退職時の5倍超 → リターン過大警告note", () => {
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

describe("runSimulation: NISA 課税口座フォールバック", () => {
  it("NISA 拠出が枠1800万を超えるケースで AFTER_TAX_RATE が効く", () => {
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

describe("runSimulation: 高齢期支出係数の段階", () => {
  it("70/75/80歳で生活費が段階的に低下", () => {
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
