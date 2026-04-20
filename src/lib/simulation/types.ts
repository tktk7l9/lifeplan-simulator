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
  | "employee"           // 会社員（正社員）
  | "civil_servant"      // 公務員
  | "employee_freelance" // 会社員兼フリーランス
  | "self_employed"      // 自営業
  | "freelance"          // フリーランス
  | "part_time";         // パート・アルバイト

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
  useAgeBasedSpendingCurve?: boolean; // 年齢別支出カーブ（70代以降の支出低下）

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
  // 小規模企業共済
  shokiboKigyoMonthly: number;

  // Simulation parameters
  inflationRate: number;        // 物価上昇率 (% / year, default 1.5)
  spouseRetirementAge: number;  // 配偶者の退職年齢 (0 = 本人と同じ)
  retirementAllowance: number;  // 退職金 (万円)

  // Insurance & healthcare
  lifeInsurancePremiumMonthly: number;  // 生命保険料 (万円/月)
  medicalCostMonthlyAt70: number;       // 70歳以降の医療費追加分 (万円/月)
  nursingCareStartAge: number;          // 介護開始年齢 (0=なし)
  nursingCareCostMonthly: number;       // 介護費用 (万円/月)

  // Corporate pension & DC
  corporatePensionMonthly: number;      // 企業年金/確定給付年金 (万円/月、退職後)
  corporateDCBalance: number;           // 企業型DC現在残高 (万円)
  corporateDCMonthly: number;           // 企業型DC掛金 (万円/月)

  // Freelance + officer income (フリーランス兼会社役員)
  officerAnnualIncome: number;          // 役員報酬 (万円/年) — フリーランス/自営業者が法人役員も兼ねる場合
  officerIncomeGrowthRate: number;      // 役員報酬の年増加率 (%)
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
