// Zod schemas for the step forms. Steps load this module on a form's first validation through
// lazy-resolver.ts, and SimulatorApp prefetches it once the page is idle, so zod — the largest
// library in the simulator — stays out of the JavaScript needed for the first paint.
// The rules themselves are unchanged from when each step defined its schema inline.
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import "@/lib/zod-ja";
import { calcAge, MAX_AGE, MIN_AGE } from "./age";

export const basicInfoSchema = z.object({
  // A date restored from an old save can fall outside the picker's range; block it on submit
  // rather than silently saving an age the rest of the form rejects (SHIG 13, 45).
  birthDate: z
    .string()
    .min(1, "生年月日を入力してください")
    .refine((v) => {
      const age = calcAge(v);
      return age >= MIN_AGE && age <= MAX_AGE;
    }, "18〜80歳の範囲で選んでください"),
  retirementAge: z.number().min(50).max(80),
  gender: z.enum(["male", "female"]),
  hasSpouse: z.boolean(),
  spouseBirthDate: z.string().optional(),
  spouseRetirementAge: z.number().min(50).max(80),
  childrenCount: z.number().min(0).max(5),
  children: z.array(
    z.object({
      id: z.string(),
      birthAge: z.number().min(18).max(60),
      educationPath: z.enum(["public", "private", "mix"]),
    })
  ),
});

export const incomeSchema = z.object({
  employmentType: z.enum(["employee", "civil_servant", "employee_freelance", "self_employed", "freelance", "part_time"]),
  annualIncome: z.number().min(0).max(10000),
  incomeGrowthRate: z.number().min(0).max(20),
  hasSideIncome: z.boolean(),
  sideIncomeMonthly: z.number().min(0).max(200),
  hasPostRetirementIncome: z.boolean(),
  postRetirementIncomeMonthly: z.number().min(0).max(100),
  postRetirementIncomeUntilAge: z.number().min(60).max(80),
  spouseEmploymentType: z.enum(["employee", "civil_servant", "employee_freelance", "self_employed", "freelance", "part_time", "homemaker"]),
  spouseAnnualIncome: z.number().min(0).max(10000),
  spouseIncomeGrowthRate: z.number().min(0).max(20),
  hasSpouseCareerBreak: z.boolean(),
  spouseCareerBreakStartAge: z.number().min(20).max(55),
  spouseCareerBreakEndAge: z.number().min(20).max(60),
  spouseCareerBreakIncomeMonthly: z.number().min(0).max(50),
  retirementAllowance: z.number().min(0).max(5000),
  hasOfficerIncome: z.boolean(),
  officerAnnualIncome: z.number().min(0).max(5000),
  officerIncomeGrowthRate: z.number().min(0).max(20),
});

export const expenseSchema = z.object({
  monthlyLivingExpense: z.number().min(0).max(200),
  inflationRate: z.number().min(0).max(5),
});

export const housingSchema = z.object({
  housingType: z.enum(["rent", "buy", "own"]),
  monthlyRent: z.number().min(0).max(100),
  purchaseAge: z.number().min(18).max(80),
  propertyPrice: z.number().min(0).max(100000),
  downPayment: z.number().min(0).max(50000),
  mortgageRate: z.number().min(0).max(10),
  mortgagePeriod: z.number().min(5).max(50),
});

export const investmentSchema = z.object({
  currentSavings: z.number().min(0).max(100000),
  currentInvestmentAssets: z.number().min(0).max(100000),
  monthlyInvestment: z.number().min(0).max(100),
  investmentReturnRate: z.number().min(0).max(30),
  nisaAccumulationMonthly: z.number().min(0).max(10),
  nisaGrowthMonthly: z.number().min(0).max(20),
  nisaProductId: z.string(),
  nisaReturnRate: z.number().min(0).max(30),
  monthlyIdeco: z.number().min(0).max(6.8),
  idecoProductId: z.string(),
  idecoReturnRate: z.number().min(0).max(30),
  shokiboKigyoMonthly: z.number().min(0).max(7),
});

export const insuranceSchema = z.object({
  lifeInsurancePremiumMonthly: z.number().min(0).max(20),
  medicalCostMonthlyAt70: z.number().min(0).max(30),
  nursingCareStartAge: z.number().min(0).max(100),
  nursingCareCostMonthly: z.number().min(0).max(50),
  corporatePensionMonthly: z.number().min(0).max(50),
  corporateDCBalance: z.number().min(0).max(5000),
  corporateDCMonthly: z.number().min(0).max(10),
  useAgeBasedSpendingCurve: z.boolean(),
});

export type BasicInfoValues = z.infer<typeof basicInfoSchema>;
export type IncomeValues = z.infer<typeof incomeSchema>;
export type ExpenseValues = z.infer<typeof expenseSchema>;
export type HousingValues = z.infer<typeof housingSchema>;
export type InvestmentValues = z.infer<typeof investmentSchema>;
export type InsuranceValues = z.infer<typeof insuranceSchema>;

export const resolvers = {
  basicInfo: standardSchemaResolver(basicInfoSchema),
  income: standardSchemaResolver(incomeSchema),
  expense: standardSchemaResolver(expenseSchema),
  housing: standardSchemaResolver(housingSchema),
  investment: standardSchemaResolver(investmentSchema),
  insurance: standardSchemaResolver(insuranceSchema),
};
