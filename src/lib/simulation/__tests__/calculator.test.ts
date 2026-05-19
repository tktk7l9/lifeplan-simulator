import { describe, it, expect } from "vitest";
import { calcNetIncome, calcFreelanceOfficerNetIncome, runSimulation } from "../calculator";
import { NISA_PRODUCTS, IDECO_PRODUCTS } from "../types";
import type { SimulationInput } from "../types";

describe("投資商品マスタ定数", () => {
  it("NISA_PRODUCTS / IDECO_PRODUCTS は最低限のフィールドを持つ", () => {
    for (const p of [...NISA_PRODUCTS, ...IDECO_PRODUCTS]) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(typeof p.expectedReturn).toBe("number");
    }
  });
});

// 共通の最小入力（テストごとに override する）
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
  it("homemaker は常に 0", () => {
    expect(calcNetIncome(500, "homemaker", 30)).toBe(0);
  });

  it("ゼロ・負の総収入は 0 を返す", () => {
    expect(calcNetIncome(0, "employee", 30)).toBe(0);
    expect(calcNetIncome(-100, "employee", 30)).toBe(0);
  });

  it("会社員 年収500万円・30歳: 手取りは現在ロジックの値域内", () => {
    // 手取りは概ね 380〜410 万円 (税+社保 ~18〜24%)
    const net = calcNetIncome(500, "employee", 30);
    expect(net).toBeGreaterThan(370);
    expect(net).toBeLessThan(420);
  });

  it("40歳以上は介護保険分だけ手取りが減る", () => {
    const under40 = calcNetIncome(600, "employee", 39);
    const over40  = calcNetIncome(600, "employee", 40);
    expect(over40).toBeLessThan(under40);
    // 差は社保負担0.91%相当（≒5〜7万円）
    expect(under40 - over40).toBeGreaterThan(3);
    expect(under40 - over40).toBeLessThan(10);
  });

  it("iDeCo掛金は所得控除されるため手取りが増える", () => {
    const noIdeco   = calcNetIncome(600, "employee", 30, 0);
    const withIdeco = calcNetIncome(600, "employee", 30, 2.3); // 月2.3万円
    expect(withIdeco).toBeGreaterThan(noIdeco);
  });
});

describe("calcFreelanceOfficerNetIncome", () => {
  it("両収入0なら0", () => {
    expect(calcFreelanceOfficerNetIncome(0, 0, 35)).toBe(0);
  });

  it("フリーランス収入のみは calcNetIncome(freelance) と概ね一致範囲", () => {
    // 完全一致は社保計算ロジックが微妙に異なるため近似比較
    const v = calcFreelanceOfficerNetIncome(500, 0, 35);
    expect(v).toBeGreaterThan(380);
    expect(v).toBeLessThan(470);
  });

  it("役員報酬を加算すると総手取りが増える", () => {
    const noOfficer   = calcFreelanceOfficerNetIncome(300, 0, 35);
    const withOfficer = calcFreelanceOfficerNetIncome(300, 400, 35);
    expect(withOfficer).toBeGreaterThan(noOfficer);
  });
});

describe("runSimulation: 構造的不変条件", () => {
  it("yearlyData は age=30 → 100 で 71年分", () => {
    const r = runSimulation(baseInput());
    expect(r.yearlyData).toHaveLength(71);
    expect(r.yearlyData[0].age).toBe(30);
    expect(r.yearlyData[r.yearlyData.length - 1].age).toBe(100);
  });

  it("年は単調増加、age と完全に同期", () => {
    const r = runSimulation(baseInput());
    for (let i = 1; i < r.yearlyData.length; i++) {
      expect(r.yearlyData[i].age).toBe(r.yearlyData[i - 1].age + 1);
      expect(r.yearlyData[i].year).toBe(r.yearlyData[i - 1].year + 1);
    }
  });

  it("retirementAge での cumulativeAssets が retirementAssets と一致", () => {
    const input = baseInput({ retirementAge: 65 });
    const r = runSimulation(input);
    const retYear = r.yearlyData.find((d) => d.age === 65)!;
    expect(retYear.cumulativeAssets).toBeCloseTo(r.retirementAssets, 6);
  });

  it("最終年の cumulativeAssets が finalAssets と一致", () => {
    const r = runSimulation(baseInput());
    expect(r.yearlyData[r.yearlyData.length - 1].cumulativeAssets).toBeCloseTo(r.finalAssets, 6);
  });

  it("年金月額は 0 以上で受給可能な水準", () => {
    const r = runSimulation(baseInput());
    expect(r.pensionMonthly).toBeGreaterThan(0);
    expect(r.pensionMonthly).toBeLessThan(40); // 万円/月
  });

  it("投資なしでも投資資産は非負（最初の月で +0 されるだけ）", () => {
    const r = runSimulation(baseInput());
    for (const y of r.yearlyData) expect(y.investmentAssets).toBeGreaterThanOrEqual(0);
  });

  it("購入時の頭金は貯蓄から差し引かれる", () => {
    // 頭金影響を観測できるよう手元資金を厚めに与える（baseInput は 200万円）
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
    // 購入年は頭金分だけ資産が削られる → cumulativeAssets は rent より小さい
    expect(buyAt35.cumulativeAssets).toBeLessThan(rentAt35.cumulativeAssets);
  });

  it("NISA枠1800万に達した時に notes に上限到達メッセージが入る", () => {
    // 月15万 × 12 × 10年 = 1800 でちょうど枠到達
    const r = runSimulation(
      baseInput({
        nisaAccumulationMonthly: 15,
        nisaGrowthMonthly: 0,
        annualIncome: 1500, // 拠出原資を確保
      })
    );
    expect(r.notes.some((n) => n.includes("NISA"))).toBe(true);
  });

  it("高齢期支出カーブ ON は OFF より総支出が少ない", () => {
    const on  = runSimulation(baseInput({ useAgeBasedSpendingCurve: true }));
    const off = runSimulation(baseInput({ useAgeBasedSpendingCurve: false }));
    expect(on.totalExpense).toBeLessThan(off.totalExpense);
  });
});

describe("runSimulation: 現状ロック (snapshot 的)", () => {
  // 計算ロジック変更を意図せず壊さないための「現在値」を固定。
  // 桁が大きく変わるような値変化は意図された場合のみ更新する。
  it("健全ケース（年収800・支出20・投資3万/月）で 65歳時点プラス資産", () => {
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

  it("生涯総収入は税後・現役35年の現実レンジ内 (年収500万ケース)", () => {
    const r = runSimulation(baseInput());
    // 税後手取り ~400万 × 35年 + 退職後年金35年 → 概ね 1.5〜2.5万 万円
    expect(r.totalIncome).toBeGreaterThan(10000);
    expect(r.totalIncome).toBeLessThan(25000);
  });
});
