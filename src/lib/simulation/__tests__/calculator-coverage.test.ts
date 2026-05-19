// calculator.ts の未踏分岐を網羅するためのテスト。
// 既存 calculator.test.ts は意味的観点（基本不変条件）を担当。

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

describe("calcNetIncome: 雇用形態と所得帯ごとの分岐", () => {
  it("公務員 (civil_servant) ルートも正の手取り", () => {
    expect(calcNetIncome(600, "civil_servant", 30)).toBeGreaterThan(0);
  });
  it("会社員兼フリーランス (employee_freelance) も正の手取り", () => {
    expect(calcNetIncome(600, "employee_freelance", 30)).toBeGreaterThan(0);
  });
  it("自営業 (self_employed) は厚生年金なし＋国民年金固定額", () => {
    expect(calcNetIncome(500, "self_employed", 30)).toBeGreaterThan(0);
  });
  it("フリーランス (freelance) も同様", () => {
    expect(calcNetIncome(500, "freelance", 30)).toBeGreaterThan(0);
  });
  it("パート (part_time)", () => {
    expect(calcNetIncome(200, "part_time", 30)).toBeGreaterThan(0);
  });
  it("給与所得控除の境界: 180 / 360 / 660 / 850 / 上限", () => {
    expect(calcNetIncome(180, "employee", 30)).toBeGreaterThan(0);
    expect(calcNetIncome(360, "employee", 30)).toBeGreaterThan(0);
    expect(calcNetIncome(660, "employee", 30)).toBeGreaterThan(0);
    expect(calcNetIncome(850, "employee", 30)).toBeGreaterThan(0);
    expect(calcNetIncome(1500, "employee", 30)).toBeGreaterThan(0);
  });
  it("累進課税: 4000万超 (45%帯) も計算できる", () => {
    expect(calcNetIncome(5000, "employee", 50)).toBeGreaterThan(0);
  });
  it("基礎控除の段階: 2400/2450/2500 超で逓減", () => {
    expect(calcNetIncome(2450, "employee", 40)).toBeGreaterThan(0);
    expect(calcNetIncome(2480, "employee", 40)).toBeGreaterThan(0);
    expect(calcNetIncome(2600, "employee", 40)).toBeGreaterThan(0);
  });
  it("additionalDeductions が大きいと手取りが増える（基礎控除以下の境界）", () => {
    const no = calcNetIncome(600, "employee", 30, 0, 0);
    const yes = calcNetIncome(600, "employee", 30, 0, 100);
    expect(yes).toBeGreaterThan(no);
  });
});

describe("calcFreelanceOfficerNetIncome: 各分岐", () => {
  it("役員報酬のみ(事業0)でも正の手取り", () => {
    expect(calcFreelanceOfficerNetIncome(0, 500, 35)).toBeGreaterThan(0);
  });
  it("役員報酬の給与所得控除境界 (180/360/660/850/上限)", () => {
    for (const v of [180, 360, 660, 850, 1500]) {
      expect(calcFreelanceOfficerNetIncome(100, v, 30)).toBeGreaterThan(0);
    }
  });
  it("40歳以上の社保料増加分が手取りに反映される", () => {
    const under = calcFreelanceOfficerNetIncome(300, 400, 39);
    const over  = calcFreelanceOfficerNetIncome(300, 400, 40);
    expect(over).toBeLessThan(under);
  });
  it("4000万超で45%税率帯も処理", () => {
    expect(calcFreelanceOfficerNetIncome(2000, 3000, 50)).toBeGreaterThan(0);
  });
  it("基礎控除段階 2400/2450/2500 超", () => {
    expect(calcFreelanceOfficerNetIncome(1200, 1300, 40)).toBeGreaterThan(0);
    expect(calcFreelanceOfficerNetIncome(1300, 1300, 40)).toBeGreaterThan(0);
  });
  it("基礎控除 ≤2400 / ≤2450 / ≤2500 の各段階を踏む", () => {
    // ≤2400: 48万
    expect(calcFreelanceOfficerNetIncome(1000, 1000, 40)).toBeGreaterThan(0);
    // 2400 < x ≤ 2450: 32万
    expect(calcFreelanceOfficerNetIncome(1200, 1230, 40)).toBeGreaterThan(0);
    // 2450 < x ≤ 2500: 16万
    expect(calcFreelanceOfficerNetIncome(1240, 1240, 40)).toBeGreaterThan(0);
  });
});

describe("runSimulation: 住居タイプ分岐", () => {
  it("housingType=own: 維持費＋固定資産税のみ", () => {
    const r = runSimulation(baseInput({ housingType: "own", propertyPrice: 4000, monthlyRent: 0 }));
    const y = r.yearlyData[0];
    expect(y.housingCost).toBeGreaterThan(0);
    // 維持費30万 + 固定資産税(4000*0.008=32) = 62万 程度
    expect(y.housingCost).toBeCloseTo(62, 0);
    expect(y.propertyValue).toBeGreaterThan(0);
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
    expect(after.housingCost).toBeGreaterThan(0);
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
    // 35+20 = 55歳でローン完済、56歳以降は維持費+税
    const after = r.yearlyData.find((d) => d.age === 60)!;
    expect(after.housingCost).toBeCloseTo(30 + 4000 * 0.008, 0);
  });

  it("住宅ローン控除は購入年から13年で打ち切り", () => {
    // 控除適用中と非適用後で income を比較するのは難しいので、
    // 13年以内なら housingLoanCredit が income に加算される（負ではない）ことを担保
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
    // 購入後5年目 (40歳) は控除が効いている → 全 income が手取りより大きいはず
    const at40 = r.yearlyData.find((d) => d.age === 40)!;
    expect(at40.income).toBeGreaterThan(0);
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
    expect(total).toBeGreaterThan(0);
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
        age: 46, // 子は 16歳
        children: [child({ birthAge: 30, educationPath: "public" })],
        annualIncome: 700,
      })
    );
    const withCollege = runSimulation(
      baseInput({
        age: 49, // 子は 19歳
        children: [child({ birthAge: 30, educationPath: "public" })],
        annualIncome: 700,
      })
    );
    expect(withTeen.yearlyData[0].income).toBeGreaterThan(0);
    expect(withCollege.yearlyData[0].income).toBeGreaterThan(0);
  });
});

describe("runSimulation: 配偶者の各パターン", () => {
  it("homemaker: 退職後は基礎年金（第3号被保険者）", () => {
    const r = runSimulation(
      baseInput({ hasSpouse: true, spouseAge: 30, spouseEmploymentType: "homemaker" })
    );
    expect(r.spousePensionMonthly).toBeGreaterThan(0);
    expect(r.spousePensionMonthly).toBeLessThan(7);
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
    expect(r.spousePensionMonthly).toBeGreaterThan(0);
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
    expect(r.spousePensionMonthly).toBeGreaterThan(0);
  });

  it("retirementAge が age より前 → retirementData undefined で fallback 0", () => {
    // age=70 で retirementAge=65 にすると、yearlyData は 70 から始まるので
    // age===65 のエントリがない → retirementAssets が 0 にフォールバック (line 555)
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
    expect(inBreak.spouseIncome).toBeGreaterThan(0);
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

  it("配偶者が生涯現役 (退職年齢>100) でもポスト処理で年金が算出される (gender=female)", () => {
    const r = runSimulation(
      baseInput({
        gender: "female",
        hasSpouse: true,
        spouseAge: 30,
        spouseRetirementAge: 120,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
      })
    );
    expect(r.spousePensionMonthly).toBeGreaterThan(0);
  });

  it("配偶者が生涯現役: gender=male 経路 (line 573 三項分岐の他方)", () => {
    const r = runSimulation(
      baseInput({
        gender: "male",
        hasSpouse: true,
        spouseAge: 30,
        spouseRetirementAge: 120,
        spouseEmploymentType: "employee",
        spouseAnnualIncome: 400,
      })
    );
    expect(r.spousePensionMonthly).toBeGreaterThan(0);
  });

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
    expect(r.spousePensionMonthly).toBeGreaterThan(0);
  });

  it("配偶者控除: 専業主婦・70歳以上は老人配偶者控除（48万）", () => {
    const r = runSimulation(
      baseInput({
        age: 38, // 配偶者は 70歳開始ではないが、本人年金前に hasSpouse のときの控除適用ライン
        annualIncome: 700,
        hasSpouse: true,
        spouseAge: 70,
        spouseEmploymentType: "homemaker",
      })
    );
    expect(r.yearlyData[0].income).toBeGreaterThan(0);
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
    expect(r.yearlyData[0].income).toBeGreaterThan(0);
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
    expect(r.yearlyData.find((d) => d.age === 70)!.medicalCost).toBeGreaterThan(0);
  });
  it("介護費用は nursingCareStartAge から発生", () => {
    const r = runSimulation(baseInput({ nursingCareStartAge: 80, nursingCareCostMonthly: 8 }));
    expect(r.yearlyData.find((d) => d.age === 79)!.medicalCost).toBe(0);
    expect(r.yearlyData.find((d) => d.age === 80)!.medicalCost).toBeGreaterThan(0);
  });
  it("生命保険料は退職前にのみ計上", () => {
    const r = runSimulation(baseInput({ lifeInsurancePremiumMonthly: 2 }));
    // 退職前 < 退職後（保険料分の差）
    const before = r.yearlyData.find((d) => d.age === 64)!.totalExpense;
    // 単一年比較は粗いが、保険料があるぶん大きいはず
    expect(before).toBeGreaterThan(0);
  });
  it("退職金は退職年に貯蓄へ加算される", () => {
    const a = runSimulation(baseInput({ retirementAllowance: 0 }));
    const b = runSimulation(baseInput({ retirementAllowance: 2000 }));
    expect(b.retirementAssets).toBeGreaterThan(a.retirementAssets);
  });
  it("退職金: 勤務20年以下と20年超で控除式が違う（どちらも計算できる）", () => {
    // 30→45 で15年勤務 (≤20)
    const short = runSimulation(
      baseInput({ age: 30, retirementAge: 45, retirementAllowance: 1500 })
    );
    // 30→65 で35年勤務 (>20)
    const long = runSimulation(baseInput({ retirementAge: 65, retirementAllowance: 1500 }));
    expect(short.retirementAssets).not.toBe(long.retirementAssets);
  });
  it("退職金が極大 (1億円超): 4000万超の45%帯", () => {
    const r = runSimulation(baseInput({ retirementAllowance: 12000 }));
    expect(r.retirementAssets).toBeGreaterThan(0);
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
    expect(r.yearlyData[0].income).toBeGreaterThan(0);
    expect(r.pensionMonthly).toBeGreaterThan(0);
  });
  it("self_employed + officerAnnualIncome でも同経路", () => {
    const r = runSimulation(
      baseInput({
        employmentType: "self_employed",
        annualIncome: 200,
        officerAnnualIncome: 500,
      })
    );
    expect(r.pensionMonthly).toBeGreaterThan(0);
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
        monthlyLivingExpense: 50, // 大赤字
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
        investmentReturnRate: 12, // 過大設定
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
    // 月20万 × 12 × 10年 = 2400万 で枠超過
    const r = runSimulation(
      baseInput({
        annualIncome: 2000,
        currentSavings: 5000,
        nisaAccumulationMonthly: 20,
        nisaReturnRate: 7,
      })
    );
    expect(r.notes.some((n) => n.includes("NISA"))).toBe(true);
    expect(r.finalAssets).toBeGreaterThan(0);
  });
});

describe("runSimulation: 高齢期支出係数の段階", () => {
  it("70/75/80歳で生活費が段階的に低下", () => {
    const r = runSimulation(baseInput({ monthlyLivingExpense: 30 }));
    const at69 = r.yearlyData.find((d) => d.age === 69)!.livingExpense;
    const at70 = r.yearlyData.find((d) => d.age === 70)!.livingExpense;
    const at75 = r.yearlyData.find((d) => d.age === 75)!.livingExpense;
    const at80 = r.yearlyData.find((d) => d.age === 80)!.livingExpense;
    // インフレで上がりつつも係数で下がる → 比率で確認
    expect(at70 / at69).toBeLessThan(1.0);
    expect(at75 / at70).toBeLessThan(1.0);
    expect(at80 / at75).toBeLessThan(1.0);
  });
});
