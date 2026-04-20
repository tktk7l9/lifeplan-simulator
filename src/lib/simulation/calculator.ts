import type { SimulationInput, SimulationResult, YearlyData, ChildInfo } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────
const KISO_NENKIN_MONTHLY  = 6.8;    // 万円/月 (2024年度国民年金満額)
const STD_REM_CAP_MONTHLY  = 65;     // 万円/月 (標準報酬月額上限)
const PROPERTY_TAX_RATE    = 0.008;  // 固定資産税+都市計画税 ≈ 物件価格の0.8%/年
const NISA_LIFETIME_CAP    = 1800;   // 万円 (新NISA生涯投資枠)
const SAVINGS_INTEREST_RATE = 0.001; // 0.1% 普通預金金利
const AFTER_TAX_RATE       = 0.7921; // (1 - 20.315%) 課税口座の税後リターン率

// ── Education costs (万円/year) ───────────────────────────────────────────
const EDUCATION_COSTS = {
  public:  { nursery: 25, elementary: 32, middle: 53, high: 51, university: 535 / 4 },
  private: { nursery: 53, elementary: 166, middle: 143, high: 104, university: 730 / 4 },
};

// 高齢期の生活費低下係数 (70代以降は支出が減少する)
function getSpendingAgeCoeff(age: number): number {
  if (age >= 80) return 0.65;
  if (age >= 75) return 0.75;
  if (age >= 70) return 0.85;
  return 1.0;
}

function getEducationCost(childAge: number, path: "public" | "private"): number {
  if (childAge >= 3  && childAge <= 5)  return EDUCATION_COSTS[path].nursery;
  if (childAge >= 6  && childAge <= 11) return EDUCATION_COSTS[path].elementary;
  if (childAge >= 12 && childAge <= 14) return EDUCATION_COSTS[path].middle;
  if (childAge >= 15 && childAge <= 17) return EDUCATION_COSTS[path].high;
  if (childAge >= 18 && childAge <= 21) return EDUCATION_COSTS[path].university;
  return 0;
}

function calcChildEducationCost(child: ChildInfo, parentAge: number): number {
  const childAge = parentAge - child.birthAge;
  if (childAge < 0 || childAge > 21) return 0;
  if (child.educationPath === "mix") {
    return (getEducationCost(childAge, "public") + getEducationCost(childAge, "private")) / 2;
  }
  return getEducationCost(childAge, child.educationPath);
}

// ── Mortgage payment (PMT) ────────────────────────────────────────────────
function calcMonthlyMortgage(principal: number, annualRate: number, periodYears: number): number {
  if (annualRate === 0) return principal / (periodYears * 12);
  const r = annualRate / 100 / 12;
  const n = periodYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ── After-tax income ──────────────────────────────────────────────────────
// 日本の所得税・住民税・社会保険料を控除した手取り年収を返す (万円)
export function calcNetIncome(
  grossAnnual: number,
  employmentType: string,
  age: number,
  idecoMonthly: number = 0,
  additionalDeductions: number = 0, // 配偶者控除・扶養控除・小規模企業共済等
): number {
  if (grossAnnual <= 0) return 0;
  if (employmentType === "homemaker") return 0;

  // 社会保険料 (被保険者負担分)
  let siRate = 0, siFlat = 0;
  if (["employee", "civil_servant", "employee_freelance"].includes(employmentType)) {
    // 健保5.0% + 厚生年金9.15% + 雇用保険0.3% = 14.45%
    // + 介護保険0.91% (40歳以上)
    siRate = age >= 40 ? 0.1536 : 0.1445;
  } else if (["self_employed", "freelance"].includes(employmentType)) {
    siRate = 0.08;  // 国民健康保険 (概算)
    siFlat = 20.4;  // 国民年金 (2024: 16,980円 × 12ヶ月)
  } else {
    siRate = 0.05;  // パート等 (簡易)
  }
  const socialInsurance = Math.min(grossAnnual * siRate + siFlat, grossAnnual * 0.28);

  // iDeCo掛金の所得控除
  const idecoDeduction = idecoMonthly * 12;

  // 給与所得控除 / 青色申告特別控除
  const isEmployee = ["employee", "civil_servant", "employee_freelance"].includes(employmentType);
  let incomeDeduction = 0;
  if (isEmployee) {
    if      (grossAnnual <= 180) incomeDeduction = Math.max(55, grossAnnual * 0.40);
    else if (grossAnnual <= 360) incomeDeduction = grossAnnual * 0.30 + 8;
    else if (grossAnnual <= 660) incomeDeduction = grossAnnual * 0.20 + 44;
    else if (grossAnnual <= 850) incomeDeduction = grossAnnual * 0.10 + 110;
    else                         incomeDeduction = 195;
  } else {
    incomeDeduction = 65; // 青色申告特別控除（e-Tax申告、一律65万円）
  }

  // 基礎控除
  const basicDeduction = grossAnnual <= 2400 ? 48 : grossAnnual <= 2450 ? 32 : grossAnnual <= 2500 ? 16 : 0;

  // 課税所得
  const taxableIncome = Math.max(0,
    grossAnnual - socialInsurance - incomeDeduction - idecoDeduction - basicDeduction - additionalDeductions
  );

  // 所得税 (累進課税)
  let incomeTax = 0;
  const bands: [number, number][] = [
    [195, 0.05], [330, 0.10], [695, 0.20], [900, 0.23], [1800, 0.33], [4000, 0.40],
  ];
  let prev = 0;
  for (const [cap, rate] of bands) {
    if (taxableIncome <= prev) break;
    incomeTax += (Math.min(taxableIncome, cap) - prev) * rate;
    prev = cap;
  }
  if (taxableIncome > 4000) incomeTax += (taxableIncome - 4000) * 0.45;
  incomeTax *= 1.021; // 復興特別所得税

  // 住民税 (10% + 均等割約5,000円)
  const residentTax = taxableIncome * 0.10 + 0.5;

  return Math.max(0, grossAnnual - socialInsurance - incomeTax - residentTax);
}

// ── After-tax retirement allowance ───────────────────────────────────────
// 退職所得控除を適用した手取り退職金 (万円)
function calcRetirementAllowanceNet(allowance: number, workYears: number): number {
  if (allowance <= 0) return 0;
  const deduction = workYears <= 20
    ? Math.max(80, 40 * workYears)
    : 800 + 70 * (workYears - 20);
  const taxableRetirement = Math.max(0, (allowance - deduction) * 0.5); // 退職所得×1/2課税
  let tax = 0;
  const bands: [number, number][] = [[195,0.05],[330,0.10],[695,0.20],[900,0.23],[1800,0.33],[4000,0.40]];
  let prev = 0;
  for (const [cap, rate] of bands) {
    if (taxableRetirement <= prev) break;
    tax += (Math.min(taxableRetirement, cap) - prev) * rate;
    prev = cap;
  }
  if (taxableRetirement > 4000) tax += (taxableRetirement - 4000) * 0.45;
  tax *= 1.021;
  tax += taxableRetirement * 0.10; // 住民税
  return Math.max(0, allowance - tax);
}

// ── Freelance + corporate officer combined net income ─────────────────────
// フリーランス事業収入 + 会社役員報酬の合算手取りを計算する (万円)
// 役員がある場合は法人社保（健保+厚生年金）を役員報酬に適用し合算課税
export function calcFreelanceOfficerNetIncome(
  businessIncome: number,   // 事業収入（フリーランス）万円/年
  officerIncome: number,    // 役員報酬（年額）万円
  age: number,
  idecoMonthly: number = 0,
  additionalDeductions: number = 0, // 配偶者控除・扶養控除等
): number {
  if (businessIncome <= 0 && officerIncome <= 0) return 0;

  // 事業所得: 青色申告特別控除65万 + iDeCo掛金控除
  const aoiro = Math.min(65, businessIncome);
  const idecoDeduction = idecoMonthly * 12;
  const businessNetIncome = Math.max(0, businessIncome - aoiro - idecoDeduction);

  // 役員報酬の給与所得: 給与所得控除を適用
  let incomeDeduction = 0;
  if (officerIncome > 0) {
    if      (officerIncome <= 180) incomeDeduction = Math.max(55, officerIncome * 0.40);
    else if (officerIncome <= 360) incomeDeduction = officerIncome * 0.30 + 8;
    else if (officerIncome <= 660) incomeDeduction = officerIncome * 0.20 + 44;
    else if (officerIncome <= 850) incomeDeduction = officerIncome * 0.10 + 110;
    else                           incomeDeduction = 195;
  }
  const officerSalaryIncome = Math.max(0, officerIncome - incomeDeduction);

  // 社会保険料: 役員として法人社保適用（役員報酬に対して健保+厚生年金）
  // フリーランス事業収入は社保の対象外（法人側の社保でカバー）
  const siRate = age >= 40 ? 0.1536 : 0.1445;
  const socialInsurance = officerIncome > 0
    ? officerIncome * siRate
    : Math.min(businessIncome * 0.08 + 20.4, businessIncome * 0.28); // 役員なし: 国民健保+国民年金

  // 合算所得 = 事業所得 + 給与所得
  const totalNetIncome = businessNetIncome + officerSalaryIncome;
  const totalGross = businessIncome + officerIncome;

  // 基礎控除（合算収入で判定）
  const basicDeduction = totalGross <= 2400 ? 48 : totalGross <= 2450 ? 32 : totalGross <= 2500 ? 16 : 0;

  // 課税所得
  const taxableIncome = Math.max(0, totalNetIncome - socialInsurance - basicDeduction - additionalDeductions);

  // 所得税（累進課税・復興特別所得税込み）
  let incomeTax = 0;
  const bands: [number, number][] = [
    [195, 0.05], [330, 0.10], [695, 0.20], [900, 0.23], [1800, 0.33], [4000, 0.40],
  ];
  let prev = 0;
  for (const [cap, rate] of bands) {
    if (taxableIncome <= prev) break;
    incomeTax += (Math.min(taxableIncome, cap) - prev) * rate;
    prev = cap;
  }
  if (taxableIncome > 4000) incomeTax += (taxableIncome - 4000) * 0.45;
  incomeTax *= 1.021;

  // 住民税 10% + 均等割
  const residentTax = taxableIncome * 0.10 + 0.5;

  return Math.max(0, totalGross - socialInsurance - incomeTax - residentTax);
}

// ── Pension estimate (万円/月) ─────────────────────────────────────────────
function calcPensionMonthly(
  annualIncomeMean: number,
  workYears: number,
  gender: "male" | "female",
  employmentType: string,
): number {
  const basicPension = KISO_NENKIN_MONTHLY * Math.min(workYears / 40, 1);

  if (employmentType === "self_employed" || employmentType === "freelance") {
    return basicPension;
  }
  if (employmentType === "part_time") {
    // パート労働者は国民年金のみ（厚生年金非適用が多い）。拠出年数はworkYearsに反映済み
    return basicPension;
  }
  // 厚生年金: 標準報酬月額 × 5.481‰ × 加入月数 (月額換算)
  const stdMonthly = Math.min(annualIncomeMean / 12, STD_REM_CAP_MONTHLY);
  const earningsRelated = (stdMonthly * 10000 * 0.005481 * workYears * 12) / 12 / 10000;
  // 公的年金は性別で支給額が変わらない（男女差は就労年数・賃金の差として既にworkYears・annualIncomeMeanに反映）
  return basicPension + earningsRelated;
}

// ── Main simulation ───────────────────────────────────────────────────────
export function runSimulation(input: SimulationInput): SimulationResult {
  const {
    age, retirementAge, gender, hasSpouse, spouseAge, children,
    employmentType, annualIncome, incomeGrowthRate,
    sideIncomeMonthly, postRetirementIncomeMonthly, postRetirementIncomeUntilAge,
    spouseEmploymentType, spouseAnnualIncome, spouseIncomeGrowthRate,
    spouseCareerBreakStartAge, spouseCareerBreakEndAge, spouseCareerBreakIncomeMonthly,
    monthlyLivingExpense, monthlyRent, housingType,
    purchaseAge, propertyPrice, downPayment, mortgageRate, mortgagePeriod,
    lifeEvents, currentSavings, currentInvestmentAssets,
    monthlyInvestment, investmentReturnRate,
    nisaAccumulationMonthly, nisaGrowthMonthly, nisaReturnRate,
    monthlyIdeco, idecoReturnRate, shokiboKigyoMonthly,
    inflationRate = 1.5,
    spouseRetirementAge: spouseRetirementAgeInput = 0,
    retirementAllowance = 0,
    lifeInsurancePremiumMonthly = 0,
    medicalCostMonthlyAt70 = 0,
    nursingCareStartAge = 0,
    nursingCareCostMonthly = 0,
    corporatePensionMonthly = 0,
    corporateDCBalance = 0,
    corporateDCMonthly = 0,
    officerAnnualIncome = 0,
    officerIncomeGrowthRate = 0,
    useAgeBasedSpendingCurve = true,
  } = input;

  // フリーランス/自営業で役員報酬がある場合、厚生年金適用（役員報酬ベース）
  const isFreelanceWithOfficer = officerAnnualIncome > 0 &&
    (employmentType === "freelance" || employmentType === "self_employed");

  const effectiveSpouseRetirementAge = (spouseRetirementAgeInput > 0)
    ? spouseRetirementAgeInput : retirementAge;
  const inflRate = inflationRate / 100;

  const yearlyData: YearlyData[] = [];
  const currentYear = new Date().getFullYear();

  let savingsAssets    = currentSavings;
  let investmentAssets = currentInvestmentAssets;
  let cumulativeIncome  = 0;
  let cumulativeExpense = 0;
  let assetsDepleted   = false; // 資産が実際に枯渇した場合 true

  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const monthlyMortgagePayment = (housingType === "buy" && loanAmount > 0)
    ? calcMonthlyMortgage(loanAmount, mortgageRate, mortgagePeriod) : 0;

  // 企業型DC: 投資資産に追加
  investmentAssets += corporateDCBalance;

  // 月次投資合計 (退職後は積立停止だが利回り計算の分母として使用)
  const totalMonthlyInvestment = monthlyInvestment + nisaAccumulationMonthly + nisaGrowthMonthly
    + monthlyIdeco + shokiboKigyoMonthly + corporateDCMonthly;
  const nisaMonthlyBase = nisaAccumulationMonthly + nisaGrowthMonthly;

  // NISA生涯投資枠トラッカー (ループ内で更新)
  let nisaTotalContributed = 0;
  let nisaCapHit = false;

  // 年金計算用の累計
  let totalWorkYears         = 0;
  let totalIncomeForPension  = 0;
  let spouseTotalWorkYears         = 0;
  let spouseTotalIncomeForPension  = 0;
  let spousePensionMonthly = 0; // 配偶者退職時に確定

  for (let currentAge = age; currentAge <= 100; currentAge++) {
    const yearsElapsed = currentAge - age;
    const year = currentYear + yearsElapsed;
    const isRetired = currentAge >= retirementAge;
    const spouseCurrentAge = hasSpouse ? spouseAge + yearsElapsed : null;
    const isSpouseRetired = (hasSpouse && spouseCurrentAge !== null)
      ? spouseCurrentAge >= effectiveSpouseRetirementAge : true;

    // ── 所得控除・税額控除の計算 ──────────────────────────────────
    // 配偶者控除 (本人が現役で配偶者が専業主婦/低収入の場合)
    let additionalDeductions = 0;
    if (!isRetired && hasSpouse && spouseCurrentAge !== null) {
      const spouseIsDependent = spouseEmploymentType === "homemaker" || spouseAnnualIncome <= 103;
      if (spouseIsDependent) {
        additionalDeductions += spouseCurrentAge >= 70 ? 48 : 38; // 老人配偶者控除 or 通常
      }
    }
    // 扶養控除 (16-22歳の子ども: 15歳以下は児童手当があり控除対象外)
    if (!isRetired) {
      for (const child of children) {
        const childAge = currentAge - child.birthAge;
        if (childAge >= 19 && childAge <= 22) additionalDeductions += 63; // 特定扶養控除
        else if (childAge >= 16 && childAge <= 18) additionalDeductions += 38; // 一般扶養控除
      }
    }
    // 小規模企業共済掛金控除 (自営業・フリーランスの全額所得控除)
    if (!isRetired && (employmentType === "self_employed" || employmentType === "freelance")) {
      additionalDeductions += shokiboKigyoMonthly * 12;
    }

    // 住宅ローン控除 (残高×0.7%、上限21万/年、購入後13年間の税額控除)
    let housingLoanCredit = 0;
    if (housingType === "buy" && loanAmount > 0 && currentAge >= purchaseAge) {
      const loanAge = currentAge - purchaseAge;
      if (loanAge < 13) {
        const remainingRatio = Math.max(0, 1 - loanAge / mortgagePeriod);
        housingLoanCredit = Math.min(21, loanAmount * remainingRatio * 0.007);
      }
    }

    // ── 本人の収入 ─────────────────────────────────────────────
    let income = 0;
    if (!isRetired) {
      const grossPrimary = annualIncome * Math.pow(1 + incomeGrowthRate / 100, yearsElapsed);
      totalWorkYears++;

      if (isFreelanceWithOfficer) {
        // フリーランス兼役員: 合算計算
        const officerGross = officerAnnualIncome * Math.pow(1 + officerIncomeGrowthRate / 100, yearsElapsed);
        income += calcFreelanceOfficerNetIncome(grossPrimary, officerGross, currentAge, monthlyIdeco, additionalDeductions);
        // 年金計算用: 役員報酬を厚生年金の標準報酬月額として使用
        totalIncomeForPension += Math.min(officerGross, STD_REM_CAP_MONTHLY * 12);
      } else {
        // 通常の計算
        totalIncomeForPension += Math.min(grossPrimary, STD_REM_CAP_MONTHLY * 12);
        income += calcNetIncome(grossPrimary, employmentType, currentAge, monthlyIdeco, additionalDeductions);
        if (sideIncomeMonthly > 0) {
          income += calcNetIncome(sideIncomeMonthly * 12, "freelance", currentAge, 0);
        }
      }
      income += housingLoanCredit; // 住宅ローン控除（税額控除分を手取りに加算）
    }

    // 退職後の収入 (就労 + 年金)
    let pensionEstimate: number | undefined;
    if (isRetired) {
      if (postRetirementIncomeMonthly > 0 && currentAge <= postRetirementIncomeUntilAge) {
        income += calcNetIncome(postRetirementIncomeMonthly * 12, "part_time", currentAge, 0);
      }
      // 公的年金 (公的年金等控除で概ね非課税のため額面で計上)
      const avgIncome = totalWorkYears > 0 ? totalIncomeForPension / totalWorkYears : 0;
      // フリーランス兼役員は厚生年金適用（role: employee相当）
      const effectiveEmpType = isFreelanceWithOfficer ? "employee" : employmentType;
      const monthly = calcPensionMonthly(avgIncome, totalWorkYears, gender, effectiveEmpType);
      // 企業年金・確定給付年金
      const corpPension = corporatePensionMonthly > 0 ? corporatePensionMonthly * 12 : 0;
      pensionEstimate = monthly * 12 + corpPension;
      income += pensionEstimate;
    }

    // 退職金 (退職年に一括)
    if (currentAge === retirementAge && retirementAllowance > 0) {
      savingsAssets += calcRetirementAllowanceNet(retirementAllowance, totalWorkYears);
    }

    // ── 配偶者の収入 ───────────────────────────────────────────
    let spouseIncome = 0;
    if (hasSpouse && spouseCurrentAge !== null) {
      if (!isSpouseRetired) {
        if (spouseEmploymentType !== "homemaker") {
          const inBreak = spouseCareerBreakStartAge > 0
            && spouseCurrentAge >= spouseCareerBreakStartAge
            && spouseCurrentAge <= spouseCareerBreakEndAge;

          if (inBreak) {
            if (spouseCareerBreakIncomeMonthly > 0) {
              spouseIncome = calcNetIncome(spouseCareerBreakIncomeMonthly * 12, "part_time", spouseCurrentAge, 0);
            }
          } else {
            const grossSpouse = spouseAnnualIncome * Math.pow(1 + spouseIncomeGrowthRate / 100, yearsElapsed);
            spouseIncome = calcNetIncome(grossSpouse, spouseEmploymentType, spouseCurrentAge, 0);
            spouseTotalWorkYears++;
            spouseTotalIncomeForPension += Math.min(grossSpouse, STD_REM_CAP_MONTHLY * 12);
          }
        }
      } else {
        // 配偶者退職後の年金
        if (spouseEmploymentType === "homemaker") {
          // 第3号被保険者 → 国民年金 (基礎年金)
          const enrollYears = Math.min(Math.max(effectiveSpouseRetirementAge - 20, 0), 40);
          spouseIncome = KISO_NENKIN_MONTHLY * (enrollYears / 40) * 12;
        } else {
          // 就労歴あり → 厚生年金 or 国民年金
          if (spousePensionMonthly === 0 && spouseTotalWorkYears > 0) {
            const avgSpouseIncome = spouseTotalIncomeForPension / spouseTotalWorkYears;
            const spouseGender: "male" | "female" = gender === "male" ? "female" : "male";
            spousePensionMonthly = calcPensionMonthly(
              avgSpouseIncome, spouseTotalWorkYears, spouseGender, spouseEmploymentType
            );
          }
          spouseIncome = spousePensionMonthly * 12;
        }
      }
    }

    // ── NISA枠チェックと動的ブレンド利回り ─────────────────────
    const nisaMonthlyEffective = (!isRetired && nisaMonthlyBase > 0)
      ? Math.min(nisaMonthlyBase, Math.max(0, NISA_LIFETIME_CAP - nisaTotalContributed) / 12)
      : 0;
    const nisaExcessMonthly = Math.max(0, nisaMonthlyBase - nisaMonthlyEffective);
    if (!isRetired && nisaMonthlyBase > 0) {
      nisaTotalContributed += nisaMonthlyEffective * 12;
      if (nisaExcessMonthly > 0 && !nisaCapHit) nisaCapHit = true;
    }
    const effectiveBlendedRate = (!isRetired && totalMonthlyInvestment > 0)
      ? (monthlyInvestment * investmentReturnRate
        + nisaMonthlyEffective * nisaReturnRate
        + nisaExcessMonthly * nisaReturnRate * AFTER_TAX_RATE
        + monthlyIdeco * idecoReturnRate
        + shokiboKigyoMonthly * 1.0
        + corporateDCMonthly * idecoReturnRate) / totalMonthlyInvestment
      : investmentReturnRate;
    const effectiveMonthlyReturn = effectiveBlendedRate / 100 / 12;

    // ── 支出 ───────────────────────────────────────────────────
    // 生活費 (物価上昇率で毎年増加、高齢期は支出低下係数を適用)
    const ageCoeff = useAgeBasedSpendingCurve ? getSpendingAgeCoeff(currentAge) : 1.0;
    const livingExpense = monthlyLivingExpense * 12 * Math.pow(1 + inflRate, yearsElapsed) * ageCoeff;

    // 住居費
    let housingCost = 0;
    if (housingType === "rent") {
      // 家賃も物価上昇率に連動
      housingCost = monthlyRent * 12 * Math.pow(1 + inflRate, yearsElapsed);
    } else if (housingType === "buy") {
      if (currentAge >= purchaseAge) {
        const loanAge = currentAge - purchaseAge;
        housingCost = loanAge < mortgagePeriod
          ? monthlyMortgagePayment * 12
          : 30; // ローン完済後: 修繕・維持費 30万/年
        housingCost += propertyPrice * PROPERTY_TAX_RATE; // 固定資産税
        if (currentAge === purchaseAge) {
          savingsAssets -= downPayment; // 頭金
        }
      }
    } else {
      // 持ち家: 維持費 + 固定資産税
      housingCost = 30 + propertyPrice * PROPERTY_TAX_RATE;
    }

    // 教育費
    let educationCost = 0;
    for (const child of children) educationCost += calcChildEducationCost(child, currentAge);

    // ライフイベント
    let lifeEventCost = 0;
    for (const event of lifeEvents) {
      if (event.age === currentAge) lifeEventCost += event.cost;
    }

    // 生命保険料 (退職前のみ)
    const insuranceCost = (!isRetired && lifeInsurancePremiumMonthly > 0)
      ? lifeInsurancePremiumMonthly * 12 : 0;

    // 医療・介護費 (70歳以降)
    let medicalCost = 0;
    if (currentAge >= 70 && medicalCostMonthlyAt70 > 0) {
      medicalCost += medicalCostMonthlyAt70 * 12 * Math.pow(1 + inflRate, currentAge - 70);
    }
    if (nursingCareStartAge > 0 && currentAge >= nursingCareStartAge && nursingCareCostMonthly > 0) {
      medicalCost += nursingCareCostMonthly * 12 * Math.pow(1 + inflRate, currentAge - nursingCareStartAge);
    }

    const totalExpense = livingExpense + housingCost + educationCost + lifeEventCost + insuranceCost + medicalCost;
    const totalIncome  = income + spouseIncome;
    const netCashFlow  = totalIncome - totalExpense;

    // ── 投資資産 (月次複利・退職後も継続) ─────────────────────
    let yearInvestment = investmentAssets;
    if (!isRetired) {
      for (let m = 0; m < 12; m++) {
        yearInvestment = yearInvestment * (1 + effectiveMonthlyReturn) + totalMonthlyInvestment;
      }
    } else {
      for (let m = 0; m < 12; m++) {
        yearInvestment = yearInvestment * (1 + effectiveMonthlyReturn);
      }
    }
    investmentAssets = Math.max(0, yearInvestment);

    // ── 貯蓄更新 ───────────────────────────────────────────────
    savingsAssets = savingsAssets + netCashFlow;
    if (!isRetired) savingsAssets -= totalMonthlyInvestment * 12;

    // 貯蓄がマイナスなら投資から補填
    if (savingsAssets < 0 && investmentAssets > 0) {
      const draw = Math.min(-savingsAssets, investmentAssets);
      investmentAssets -= draw;
      savingsAssets    += draw;
    }

    // 資産枯渇チェック: 貯蓄がマイナスかつ投資資産もゼロなら実質破綻
    if (savingsAssets < 0 && investmentAssets === 0) assetsDepleted = true;

    // 普通預金利息 (0.1%/年)
    if (savingsAssets > 0) savingsAssets += savingsAssets * SAVINGS_INTEREST_RATE;

    // 実際の総資産（負値もそのまま表示してグラフに枯渇を反映）
    const cumulativeAssets = savingsAssets + investmentAssets;
    cumulativeIncome  += totalIncome;
    cumulativeExpense += totalExpense;

    // 住宅資産価値: 土地60%は価値維持、建物40%は築年数で償却（2%/年）
    let propertyValue: number | undefined;
    if (housingType === "buy" || housingType === "own") {
      const buildingAge = housingType === "buy"
        ? Math.max(0, currentAge - purchaseAge)
        : yearsElapsed;
      const landValue    = propertyPrice * 0.60;
      const buildingValue = propertyPrice * 0.40 * Math.pow(0.98, buildingAge);
      propertyValue = landValue + buildingValue;
    }

    yearlyData.push({
      year, age: currentAge, income, spouseIncome,
      livingExpense, housingCost, educationCost, lifeEventCost, medicalCost,
      totalExpense, netCashFlow,
      cumulativeAssets,                          // 負値を含む実際の総資産
      investmentAssets: Math.max(0, investmentAssets),
      savingsAssets: Math.max(0, savingsAssets), // 表示用（0フロア）
      propertyValue, pensionEstimate,
    });
  }

  const retirementData = yearlyData.find((d) => d.age === retirementAge);
  const retirementAssets = retirementData?.cumulativeAssets ?? 0;
  const finalData = yearlyData[yearlyData.length - 1];
  const finalAssets = finalData?.cumulativeAssets ?? 0;

  const avgIncome = totalWorkYears > 0 ? totalIncomeForPension / totalWorkYears : 0;
  const finalEffectiveEmpType = isFreelanceWithOfficer ? "employee" : employmentType;
  const pensionMonthly = calcPensionMonthly(avgIncome, totalWorkYears, gender, finalEffectiveEmpType);

  // 配偶者年金月額を確定
  let finalSpousePensionMonthly = 0;
  if (hasSpouse) {
    if (spouseEmploymentType === "homemaker") {
      const enrollYears = Math.min(Math.max(effectiveSpouseRetirementAge - 20, 0), 40);
      finalSpousePensionMonthly = KISO_NENKIN_MONTHLY * (enrollYears / 40);
    } else if (spousePensionMonthly > 0) {
      finalSpousePensionMonthly = spousePensionMonthly;
    } else if (spouseTotalWorkYears > 0) {
      const avgSpouseIncome = spouseTotalIncomeForPension / spouseTotalWorkYears;
      const spouseGender: "male" | "female" = gender === "male" ? "female" : "male";
      finalSpousePensionMonthly = calcPensionMonthly(
        avgSpouseIncome, spouseTotalWorkYears, spouseGender, spouseEmploymentType as string
      );
    }
  }
  const householdPensionMonthly = pensionMonthly + finalSpousePensionMonthly;

  // ── 診断メモ ────────────────────────────────────────────────
  const notes: string[] = [];
  notes.push("収入は所得税・住民税・社会保険料控除後の手取りでシミュレーションしています。");
  if (retirementAssets < 0)   notes.push("退職時点で資産がマイナスになる見込みです。早期の対策が必要です。");
  if (finalAssets < 0)         notes.push("100歳時点で資産が枯渇する見込みです。");
  if (householdPensionMonthly < 15) notes.push(`世帯年金が月${householdPensionMonthly.toFixed(1)}万円と少ない見込みです。追加の貯蓄・投資を検討してください。`);
  if (totalMonthlyInvestment === 0) notes.push("投資を行っていません。NISAやiDeCoの活用を検討してください。");
  if (housingType === "buy")   notes.push(`固定資産税として年間約${Math.round(propertyPrice * PROPERTY_TAX_RATE)}万円を費用計上しています。`);
  if (inflationRate >= 2.5)    notes.push(`物価上昇率${inflationRate}%は高め設定です。保守的なシナリオとして参考にしてください。`);
  if (nisaCapHit) notes.push("NISA生涯投資枠(1800万円)に達したため、超過分は課税口座(税引後リターン)での運用として計算しています。");
  if (finalAssets > retirementAssets * 5 && retirementAssets > 0) {
    notes.push("100歳時点の資産が退職時の5倍を超えています。運用リターンの前提が高すぎる可能性があります。実質リターン(インフレ控除後)でのご確認をお勧めします。");
  }
  if (!useAgeBasedSpendingCurve) {
    notes.push("年齢別支出カーブはOFFです。70代以降も現役期と同水準の生活費で計算しています（保守的）。");
  }

  return {
    yearlyData, retirementAssets, finalAssets,
    // シミュレーション期間中に一度も資産が枯渇しなかった場合のみ「安全」
    isRetirementSafe: !assetsDepleted && finalAssets >= 0,
    pensionMonthly, spousePensionMonthly: finalSpousePensionMonthly,
    totalIncome: cumulativeIncome, totalExpense: cumulativeExpense, notes,
  };
}
