export type Gender = "male" | "female";

export type EducationPath = "public" | "private" | "mix";

export type HousingType = "rent" | "buy" | "own";

export type RiskLevel = "low" | "medium" | "high";

export interface InvestmentProduct {
  id: string;
  name: string;
  expectedReturn: number;
  riskLevel: RiskLevel;
  description: string;
}

export const NISA_PRODUCTS: InvestmentProduct[] = [
  { id: "sp500", name: "S&P500インデックス", expectedReturn: 7.0, riskLevel: "high", description: "米国大型株500社に分散投資" },
  { id: "allworld", name: "全世界株式（オルカン）", expectedReturn: 6.5, riskLevel: "high", description: "全世界約3,000銘柄への分散投資" },
  { id: "jp_stock", name: "日本株インデックス", expectedReturn: 4.0, riskLevel: "medium", description: "TOPIX・日経225に連動" },
  { id: "balance", name: "バランスファンド", expectedReturn: 4.0, riskLevel: "medium", description: "株式・債券を組み合わせたバランス型" },
  { id: "bond", name: "債券インデックス", expectedReturn: 1.5, riskLevel: "low", description: "国内・海外債券への分散投資" },
];

export const IDECO_PRODUCTS: InvestmentProduct[] = [
  { id: "sp500", name: "S&P500インデックス", expectedReturn: 7.0, riskLevel: "high", description: "米国大型株500社に分散投資" },
  { id: "allworld", name: "全世界株式（オルカン）", expectedReturn: 6.5, riskLevel: "high", description: "全世界約3,000銘柄への分散投資" },
  { id: "balance", name: "バランスファンド", expectedReturn: 4.0, riskLevel: "medium", description: "株式・債券を組み合わせたバランス型" },
  { id: "bond", name: "債券インデックス", expectedReturn: 1.5, riskLevel: "low", description: "国内・海外債券への分散投資" },
  { id: "teiki", name: "定期預金（元本確保）", expectedReturn: 0.2, riskLevel: "low", description: "元本保証。運用リスクなし" },
];

export type EmploymentType =
  | "employee"           // company employee (full-time)
  | "civil_servant"      // civil servant
  | "employee_freelance" // company employee + freelancer
  | "self_employed"      // self-employed
  | "freelance"          // freelancer
  | "part_time";         // part-time / side job

export type SpouseEmploymentType = EmploymentType | "homemaker";

export type LifeEventType =
  | "wedding"
  | "car"
  | "travel"
  | "baby"
  | "caregiving"
  | "other";

export interface ChildInfo {
  id: string;
  birthAge: number;
  educationPath: EducationPath;
}

export interface LifeEvent {
  id: string;
  type: LifeEventType;
  age: number;
  cost: number;
  label: string;
}

export interface SimulationInput {
  // Basic info
  age: number;
  birthDate?: string;        // ISO date string (YYYY-MM-DD) — stored to restore form accurately
  retirementAge: number;
  gender: Gender;
  hasSpouse: boolean;
  spouseAge: number;
  spouseBirthDate?: string;  // ISO date string (YYYY-MM-DD)
  children: ChildInfo[];

  // Simulation options
  useAgeBasedSpendingCurve?: boolean; // age-based spending curve (spending declines from the 70s onward)

  // Income
  employmentType: EmploymentType;
  annualIncome: number;
  incomeGrowthRate: number;
  sideIncomeMonthly: number;
  postRetirementIncomeMonthly: number;
  postRetirementIncomeUntilAge: number;
  spouseEmploymentType: SpouseEmploymentType;
  spouseAnnualIncome: number;
  spouseIncomeGrowthRate: number;
  spouseCareerBreakStartAge: number;
  spouseCareerBreakEndAge: number;
  spouseCareerBreakIncomeMonthly: number;

  // Expense
  monthlyLivingExpense: number;
  monthlyRent: number;

  // Housing
  housingType: HousingType;
  purchaseAge: number;
  propertyPrice: number;
  downPayment: number;
  mortgageRate: number;
  mortgagePeriod: number;

  // Life events
  lifeEvents: LifeEvent[];

  // Investment & savings
  currentSavings: number;
  currentInvestmentAssets: number;
  monthlyInvestment: number;
  investmentReturnRate: number;
  // NISA
  nisaAccumulationMonthly: number;
  nisaGrowthMonthly: number;
  nisaProductId: string;
  nisaReturnRate: number;
  // iDeCo
  monthlyIdeco: number;
  idecoProductId: string;
  idecoReturnRate: number;
  // Small Business Mutual Aid (小規模企業共済)
  shokiboKigyoMonthly: number;

  // Simulation parameters
  inflationRate: number;        // inflation rate (% / year, default 1.5)
  spouseRetirementAge: number;  // spouse's retirement age (0 = same as the user)
  retirementAllowance: number;  // retirement allowance (10k yen)

  // Insurance & healthcare
  lifeInsurancePremiumMonthly: number;  // life insurance premium (10k yen/month)
  medicalCostMonthlyAt70: number;       // additional medical costs from age 70 (10k yen/month)
  nursingCareStartAge: number;          // nursing care start age (0 = none)
  nursingCareCostMonthly: number;       // nursing care cost (10k yen/month)

  // Corporate pension & DC
  corporatePensionMonthly: number;      // corporate pension / defined benefit pension (10k yen/month, after retirement)
  corporateDCBalance: number;           // current corporate DC balance (10k yen)
  corporateDCMonthly: number;           // corporate DC contribution (10k yen/month)

  // Freelance + officer income (freelancer who is also a company officer)
  officerAnnualIncome: number;          // officer compensation (10k yen/year) — when a freelancer / self-employed person is also a company officer
  officerIncomeGrowthRate: number;      // annual growth rate of officer compensation (%)
}

export interface YearlyData {
  year: number;
  age: number;
  income: number;
  spouseIncome: number;
  livingExpense: number;
  housingCost: number;
  educationCost: number;
  lifeEventCost: number;
  medicalCost: number;
  totalExpense: number;
  netCashFlow: number;
  cumulativeAssets: number;
  investmentAssets: number;
  savingsAssets: number;
  propertyValue?: number;
  pensionEstimate?: number;
}

export interface MonteCarloDataPoint {
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface MonteCarloResult {
  dataPoints: MonteCarloDataPoint[];
  failureProbability: number;
}

export interface SensitivityDataPoint {
  parameter: string;
  label: string;
  low: number;
  base: number;
  high: number;
}

export interface SimulationResult {
  yearlyData: YearlyData[];
  retirementAssets: number;
  finalAssets: number;
  isRetirementSafe: boolean;
  pensionMonthly: number;
  spousePensionMonthly: number;
  totalIncome: number;
  totalExpense: number;
  notes: string[];
}

export interface SavedSimulation {
  id: string;
  name: string;
  savedAt: string;
  input: SimulationInput;
  result: SimulationResult;
}

export type AIRank = "S" | "A" | "B" | "C" | "D" | "F";

export interface AIEvaluation {
  score: number;
  rank: AIRank;
  summary: string;
  strengths: string[];
  improvements: string[];
  conclusion: string;
}
