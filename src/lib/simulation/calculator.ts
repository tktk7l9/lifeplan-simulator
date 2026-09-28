import type { SimulationInput, SimulationResult, YearlyData, ChildInfo } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────
const KISO_NENKIN_MONTHLY  = 6.8;    // 10k yen/month (FY2024 full National Pension amount)
const STD_REM_CAP_MONTHLY  = 65;     // 10k yen/month (cap on standard monthly remuneration)
const PROPERTY_TAX_RATE    = 0.008;  // fixed asset tax + city planning tax ≈ 0.8% of the property price per year
const NISA_LIFETIME_CAP    = 1800;   // 10k yen (new NISA lifetime investment cap)
const SAVINGS_INTEREST_RATE = 0.001; // 0.1% ordinary deposit interest rate
const AFTER_TAX_RATE       = 0.7921; // (1 - 20.315%) after-tax return ratio for a taxable account

// ── Education costs (10k yen/year) ───────────────────────────────────────────
const EDUCATION_COSTS = {
  public:  { nursery: 25, elementary: 32, middle: 53, high: 51, university: 535 / 4 },
  private: { nursery: 53, elementary: 166, middle: 143, high: 104, university: 730 / 4 },
};

// Spending reduction factor for old age (spending declines from the 70s onward)
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
// Returns annual take-home pay (10k yen) after Japanese income tax, resident tax and social insurance
export function calcNetIncome(
  grossAnnual: number,
  employmentType: string,
  age: number,
  idecoMonthly: number = 0,
  additionalDeductions: number = 0, // spouse deduction, dependent deduction, Small Business Mutual Aid, etc.
): number {
  if (grossAnnual <= 0) return 0;
  if (employmentType === "homemaker") return 0;

  // Social insurance premiums (insured person's share)
  let siRate = 0, siFlat = 0;
  if (["employee", "civil_servant", "employee_freelance"].includes(employmentType)) {
    // health insurance 5.0% + employees' pension 9.15% + employment insurance 0.3% = 14.45%
    // + long-term care insurance 0.91% (age 40 and over)
    siRate = age >= 40 ? 0.1536 : 0.1445;
  } else if (["self_employed", "freelance"].includes(employmentType)) {
    siRate = 0.08;  // National Health Insurance (rough estimate)
    siFlat = 20.4;  // National Pension (2024: 16,980 yen × 12 months)
  } else {
    siRate = 0.05;  // part-time etc. (simplified)
  }
  const socialInsurance = Math.min(grossAnnual * siRate + siFlat, grossAnnual * 0.28);

  // Income deduction for iDeCo contributions
  const idecoDeduction = idecoMonthly * 12;

  // Employment income deduction / blue-return special deduction
  const isEmployee = ["employee", "civil_servant", "employee_freelance"].includes(employmentType);
  let incomeDeduction = 0;
  if (isEmployee) {
    if      (grossAnnual <= 180) incomeDeduction = Math.max(55, grossAnnual * 0.40);
    else if (grossAnnual <= 360) incomeDeduction = grossAnnual * 0.30 + 8;
    else if (grossAnnual <= 660) incomeDeduction = grossAnnual * 0.20 + 44;
    else if (grossAnnual <= 850) incomeDeduction = grossAnnual * 0.10 + 110;
    else                         incomeDeduction = 195;
  } else {
    incomeDeduction = 65; // blue-return special deduction (e-Tax filing, flat 650k yen)
  }

  // Basic deduction
  const basicDeduction = grossAnnual <= 2400 ? 48 : grossAnnual <= 2450 ? 32 : grossAnnual <= 2500 ? 16 : 0;

  // Taxable income
  const taxableIncome = Math.max(0,
    grossAnnual - socialInsurance - incomeDeduction - idecoDeduction - basicDeduction - additionalDeductions
  );

  // Income tax (progressive)
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
  incomeTax *= 1.021; // special income tax for reconstruction

  // Resident tax (10% + per-capita levy of about 5,000 yen)
  const residentTax = taxableIncome * 0.10 + 0.5;

  return Math.max(0, grossAnnual - socialInsurance - incomeTax - residentTax);
}

// ── After-tax retirement allowance ───────────────────────────────────────
// Take-home retirement allowance (10k yen) after the retirement income deduction
function calcRetirementAllowanceNet(allowance: number, workYears: number): number {
  if (allowance <= 0) return 0;
  const deduction = workYears <= 20
    ? Math.max(80, 40 * workYears)
    : 800 + 70 * (workYears - 20);
  const taxableRetirement = Math.max(0, (allowance - deduction) * 0.5); // retirement income taxed at 1/2
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
  tax += taxableRetirement * 0.10; // resident tax
  return Math.max(0, allowance - tax);
}

// ── Freelance + corporate officer combined net income ─────────────────────
// Computes combined take-home pay (10k yen) of freelance business income + company officer compensation
// With officer compensation, corporate social insurance (health + employees' pension) applies to it and the two are taxed together
export function calcFreelanceOfficerNetIncome(
  businessIncome: number,   // business income (freelance), 10k yen/year
  officerIncome: number,    // officer compensation (annual), 10k yen
  age: number,
  idecoMonthly: number = 0,
  additionalDeductions: number = 0, // spouse deduction, dependent deduction, etc.
): number {
  if (businessIncome <= 0 && officerIncome <= 0) return 0;

  // Business income: blue-return special deduction of 650k yen + iDeCo contribution deduction
  const aoiro = Math.min(65, businessIncome);
  const idecoDeduction = idecoMonthly * 12;
  const businessNetIncome = Math.max(0, businessIncome - aoiro - idecoDeduction);

  // Employment income from officer compensation: apply the employment income deduction
  let incomeDeduction = 0;
  if (officerIncome > 0) {
    if      (officerIncome <= 180) incomeDeduction = Math.max(55, officerIncome * 0.40);
    else if (officerIncome <= 360) incomeDeduction = officerIncome * 0.30 + 8;
    else if (officerIncome <= 660) incomeDeduction = officerIncome * 0.20 + 44;
    else if (officerIncome <= 850) incomeDeduction = officerIncome * 0.10 + 110;
    else                           incomeDeduction = 195;
  }
  const officerSalaryIncome = Math.max(0, officerIncome - incomeDeduction);

  // Social insurance: corporate social insurance applies as an officer (health + employees' pension on officer compensation)
  // Freelance business income is not subject to social insurance (covered by the company-side insurance)
  const siRate = age >= 40 ? 0.1536 : 0.1445;
  const socialInsurance = officerIncome > 0
    ? officerIncome * siRate
    : Math.min(businessIncome * 0.08 + 20.4, businessIncome * 0.28); // no officer role: National Health Insurance + National Pension

  // Combined income = business income + employment income
  const totalNetIncome = businessNetIncome + officerSalaryIncome;
  const totalGross = businessIncome + officerIncome;

  // Basic deduction (determined by combined income)
  const basicDeduction = totalGross <= 2400 ? 48 : totalGross <= 2450 ? 32 : totalGross <= 2500 ? 16 : 0;

  // Taxable income
  const taxableIncome = Math.max(0, totalNetIncome - socialInsurance - basicDeduction - additionalDeductions);

  // Income tax (progressive, including the special income tax for reconstruction)
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

  // Resident tax 10% + per-capita levy
  const residentTax = taxableIncome * 0.10 + 0.5;

  return Math.max(0, totalGross - socialInsurance - incomeTax - residentTax);
}

// ── Pension estimate (10k yen/month) ─────────────────────────────────────────────
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
    // Part-time workers get National Pension only (employees' pension often does not apply). Contribution years are already reflected in workYears
    return basicPension;
  }
  // Employees' pension: standard monthly remuneration × 5.481‰ × months enrolled (monthly amount)
  const stdMonthly = Math.min(annualIncomeMean / 12, STD_REM_CAP_MONTHLY);
  const earningsRelated = (stdMonthly * 10000 * 0.005481 * workYears * 12) / 12 / 10000;
  // Public pension amounts do not depend on gender (gender gaps already show up as differences in work years and wages in workYears / annualIncomeMean)
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

  // Freelance / self-employed with officer compensation: employees' pension applies (based on officer compensation)
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
  let assetsDepleted   = false; // true when assets actually run out

  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const monthlyMortgagePayment = (housingType === "buy" && loanAmount > 0)
    ? calcMonthlyMortgage(loanAmount, mortgageRate, mortgagePeriod) : 0;

  // Corporate DC: add to investment assets
  investmentAssets += corporateDCBalance;

  // Total monthly investment (contributions stop after retirement, but it is still used as the denominator for the return calculation)
  const totalMonthlyInvestment = monthlyInvestment + nisaAccumulationMonthly + nisaGrowthMonthly
    + monthlyIdeco + shokiboKigyoMonthly + corporateDCMonthly;
  const nisaMonthlyBase = nisaAccumulationMonthly + nisaGrowthMonthly;

  // New NISA lifetime cap tracker (updated inside the loop)
  let nisaTotalContributed = 0;
  let nisaCapHit = false;

  // Running totals for the pension calculation
  let totalWorkYears         = 0;
  let totalIncomeForPension  = 0;
  let spouseTotalWorkYears         = 0;
  let spouseTotalIncomeForPension  = 0;
  let spousePensionMonthly = 0; // fixed when the spouse retires

  for (let currentAge = age; currentAge <= 100; currentAge++) {
    const yearsElapsed = currentAge - age;
    const year = currentYear + yearsElapsed;
    const isRetired = currentAge >= retirementAge;
    const spouseCurrentAge = hasSpouse ? spouseAge + yearsElapsed : null;
    const isSpouseRetired = (hasSpouse && spouseCurrentAge !== null)
      ? spouseCurrentAge >= effectiveSpouseRetirementAge : true;

    // ── Income deductions and tax credits ──────────────────────────────────
    // Spouse deduction (user still working and spouse is a full-time homemaker / low income)
    let additionalDeductions = 0;
    if (!isRetired && hasSpouse && spouseCurrentAge !== null) {
      const spouseIsDependent = spouseEmploymentType === "homemaker" || spouseAnnualIncome <= 103;
      if (spouseIsDependent) {
        additionalDeductions += spouseCurrentAge >= 70 ? 48 : 38; // elderly spouse deduction or the regular one
      }
    }
    // Dependent deduction (children aged 16-22; 15 and under get child allowance and are not eligible)
    if (!isRetired) {
      for (const child of children) {
        const childAge = currentAge - child.birthAge;
        if (childAge >= 19 && childAge <= 22) additionalDeductions += 63; // specified dependent deduction
        else if (childAge >= 16 && childAge <= 18) additionalDeductions += 38; // general dependent deduction
      }
    }
    // Small Business Mutual Aid contribution deduction (full income deduction for self-employed / freelancers)
    if (!isRetired && (employmentType === "self_employed" || employmentType === "freelance")) {
      additionalDeductions += shokiboKigyoMonthly * 12;
    }

    // Housing loan tax credit (balance × 0.7%, up to 210k yen/year, tax credit for 13 years after purchase)
    let housingLoanCredit = 0;
    if (housingType === "buy" && loanAmount > 0 && currentAge >= purchaseAge) {
      const loanAge = currentAge - purchaseAge;
      if (loanAge < 13) {
        const remainingRatio = Math.max(0, 1 - loanAge / mortgagePeriod);
        housingLoanCredit = Math.min(21, loanAmount * remainingRatio * 0.007);
      }
    }

    // ── User's income ─────────────────────────────────────────────
    let income = 0;
    if (!isRetired) {
      const grossPrimary = annualIncome * Math.pow(1 + incomeGrowthRate / 100, yearsElapsed);
      totalWorkYears++;

      if (isFreelanceWithOfficer) {
        // Freelancer who is also an officer: combined calculation
        const officerGross = officerAnnualIncome * Math.pow(1 + officerIncomeGrowthRate / 100, yearsElapsed);
        income += calcFreelanceOfficerNetIncome(grossPrimary, officerGross, currentAge, monthlyIdeco, additionalDeductions);
        // For the pension calculation: use officer compensation as the standard monthly remuneration for employees' pension
        totalIncomeForPension += Math.min(officerGross, STD_REM_CAP_MONTHLY * 12);
      } else {
        // Regular calculation
        totalIncomeForPension += Math.min(grossPrimary, STD_REM_CAP_MONTHLY * 12);
        income += calcNetIncome(grossPrimary, employmentType, currentAge, monthlyIdeco, additionalDeductions);
        if (sideIncomeMonthly > 0) {
          income += calcNetIncome(sideIncomeMonthly * 12, "freelance", currentAge, 0);
        }
      }
      income += housingLoanCredit; // housing loan tax credit (add the credited amount to take-home pay)
    }

    // Post-retirement income (work + pension)
    let pensionEstimate: number | undefined;
    if (isRetired) {
      if (postRetirementIncomeMonthly > 0 && currentAge <= postRetirementIncomeUntilAge) {
        income += calcNetIncome(postRetirementIncomeMonthly * 12, "part_time", currentAge, 0);
      }
      // Public pension (counted at face value since the public pension deduction makes it roughly tax-free)
      const avgIncome = totalWorkYears > 0 ? totalIncomeForPension / totalWorkYears : 0;
      // Freelancer who is also an officer gets employees' pension (equivalent to role: employee)
      const effectiveEmpType = isFreelanceWithOfficer ? "employee" : employmentType;
      const monthly = calcPensionMonthly(avgIncome, totalWorkYears, gender, effectiveEmpType);
      // Corporate pension / defined benefit pension
      const corpPension = corporatePensionMonthly > 0 ? corporatePensionMonthly * 12 : 0;
      pensionEstimate = monthly * 12 + corpPension;
      income += pensionEstimate;
    }

    // Retirement allowance (lump sum in the retirement year)
    if (currentAge === retirementAge && retirementAllowance > 0) {
      savingsAssets += calcRetirementAllowanceNet(retirementAllowance, totalWorkYears);
    }

    // ── Spouse's income ───────────────────────────────────────────
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
        // Pension after the spouse retires
        if (spouseEmploymentType === "homemaker") {
          // Category 3 insured person → National Pension (basic pension)
          const enrollYears = Math.min(Math.max(effectiveSpouseRetirementAge - 20, 0), 40);
          spouseIncome = KISO_NENKIN_MONTHLY * (enrollYears / 40) * 12;
        } else {
          // Has work history → employees' pension or National Pension
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

    // ── NISA cap check and dynamically blended return ─────────────────────
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

    // ── Expenses ───────────────────────────────────────────────────
    // Living expenses (grow each year with inflation; the old-age spending factor applies later)
    const ageCoeff = useAgeBasedSpendingCurve ? getSpendingAgeCoeff(currentAge) : 1.0;
    const livingExpense = monthlyLivingExpense * 12 * Math.pow(1 + inflRate, yearsElapsed) * ageCoeff;

    // Housing cost
    let housingCost = 0;
    if (housingType === "rent") {
      // Rent also tracks inflation
      housingCost = monthlyRent * 12 * Math.pow(1 + inflRate, yearsElapsed);
    } else if (housingType === "buy") {
      if (currentAge >= purchaseAge) {
        const loanAge = currentAge - purchaseAge;
        housingCost = loanAge < mortgagePeriod
          ? monthlyMortgagePayment * 12
          : 30; // after the loan is paid off: repairs and upkeep 300k yen/year
        housingCost += propertyPrice * PROPERTY_TAX_RATE; // fixed asset tax
        if (currentAge === purchaseAge) {
          savingsAssets -= downPayment; // down payment
        }
      }
    } else {
      // Owned home: upkeep + fixed asset tax
      housingCost = 30 + propertyPrice * PROPERTY_TAX_RATE;
    }

    // Education costs
    let educationCost = 0;
    for (const child of children) educationCost += calcChildEducationCost(child, currentAge);

    // Life events
    let lifeEventCost = 0;
    for (const event of lifeEvents) {
      if (event.age === currentAge) lifeEventCost += event.cost;
    }

    // Life insurance premiums (before retirement only)
    const insuranceCost = (!isRetired && lifeInsurancePremiumMonthly > 0)
      ? lifeInsurancePremiumMonthly * 12 : 0;

    // Medical and nursing care costs (age 70 and over)
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

    // ── Investment assets (monthly compounding, continues after retirement) ─────────────────────
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

    // ── Savings update ───────────────────────────────────────────────
    savingsAssets = savingsAssets + netCashFlow;
    if (!isRetired) savingsAssets -= totalMonthlyInvestment * 12;

    // If savings go negative, cover them from investments
    if (savingsAssets < 0 && investmentAssets > 0) {
      const draw = Math.min(-savingsAssets, investmentAssets);
      investmentAssets -= draw;
      savingsAssets    += draw;
    }

    // Asset depletion check: savings negative and investment assets at zero means effectively broke
    if (savingsAssets < 0 && investmentAssets === 0) assetsDepleted = true;

    // Ordinary deposit interest (0.1%/year)
    if (savingsAssets > 0) savingsAssets += savingsAssets * SAVINGS_INTEREST_RATE;

    // Actual total assets (negative values kept as-is so the chart shows depletion)
    const cumulativeAssets = savingsAssets + investmentAssets;
    cumulativeIncome  += totalIncome;
    cumulativeExpense += totalExpense;

    // Home value: land (60%) keeps its value, building (40%) depreciates with age (2%/year)
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
      cumulativeAssets,                          // actual total assets, including negative values
      investmentAssets: Math.max(0, investmentAssets),
      savingsAssets: Math.max(0, savingsAssets), // for display (floored at 0)
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

  // Fix the spouse's monthly pension
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

  // ── Diagnostic notes ────────────────────────────────────────────────
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
    // "Safe" only if assets never ran out during the simulation period
    isRetirementSafe: !assetsDepleted && finalAssets >= 0,
    pensionMonthly, spousePensionMonthly: finalSpousePensionMonthly,
    totalIncome: cumulativeIncome, totalExpense: cumulativeExpense, notes,
  };
}
