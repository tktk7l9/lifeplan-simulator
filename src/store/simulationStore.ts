import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SimulationInput, SimulationResult, SavedSimulation, AIEvaluation } from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/calculator";

interface SimulationStore {
  currentStep: number;
  input: Partial<SimulationInput>;
  result: SimulationResult | null;
  isCalculating: boolean;
  savedSimulations: SavedSimulation[];
  aiEvaluation: AIEvaluation | null;

  updateInput: (patch: Partial<SimulationInput>) => void;
  setStep: (step: number) => void;
  calculate: () => void;
  saveSimulation: (name: string) => void;
  loadSimulation: (id: string) => void;
  deleteSimulation: (id: string) => void;
  setAiEvaluation: (evaluation: AIEvaluation | null) => void;
}

const defaultInput: Partial<SimulationInput> = {
  age: 30,
  retirementAge: 65,
  gender: "male",
  hasSpouse: false,
  spouseAge: 30,
  children: [],

  employmentType: "employee",
  annualIncome: 500,
  incomeGrowthRate: 2,
  sideIncomeMonthly: 0,
  postRetirementIncomeMonthly: 0,
  postRetirementIncomeUntilAge: 70,
  spouseEmploymentType: "employee",
  spouseAnnualIncome: 300,
  spouseIncomeGrowthRate: 1,
  spouseCareerBreakStartAge: 0,
  spouseCareerBreakEndAge: 0,
  spouseCareerBreakIncomeMonthly: 0,

  monthlyLivingExpense: 20,
  monthlyRent: 10,

  housingType: "rent",
  purchaseAge: 35,
  propertyPrice: 4000,
  downPayment: 400,
  mortgageRate: 1.0,
  mortgagePeriod: 35,

  lifeEvents: [
    { id: "default-wedding", type: "wedding", age: 32, cost: 300, label: "結婚式" },
    { id: "default-car", type: "car", age: 35, cost: 300, label: "マイカー購入" },
  ],

  currentSavings: 200,
  currentInvestmentAssets: 50,
  monthlyInvestment: 3,
  investmentReturnRate: 5,
  nisaAccumulationMonthly: 5,
  nisaGrowthMonthly: 0,
  nisaProductId: "allworld",
  nisaReturnRate: 6.5,
  monthlyIdeco: 1.2,
  idecoProductId: "allworld",
  idecoReturnRate: 6.5,
  shokiboKigyoMonthly: 0,

  inflationRate: 1.5,
  spouseRetirementAge: 0,
  retirementAllowance: 0,

  lifeInsurancePremiumMonthly: 0.8,
  medicalCostMonthlyAt70: 1.5,
  nursingCareStartAge: 0,
  nursingCareCostMonthly: 0,
  corporatePensionMonthly: 0,
  corporateDCBalance: 0,
  corporateDCMonthly: 0,

  officerAnnualIncome: 0,
  officerIncomeGrowthRate: 0,

  useAgeBasedSpendingCurve: true,
};

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      input: defaultInput,
      result: null,
      isCalculating: false,
      savedSimulations: [],
      aiEvaluation: null,

      updateInput: (patch) =>
        set((state) => ({ input: { ...state.input, ...patch } })),

      setStep: (step) => set({ currentStep: step }),

      calculate: () => {
        set({ isCalculating: true });
        try {
          const { input } = get();
          const fullInput: SimulationInput = {
            age: input.age ?? 30,
            retirementAge: input.retirementAge ?? 65,
            gender: input.gender ?? "male",
            hasSpouse: input.hasSpouse ?? false,
            spouseAge: input.spouseAge ?? 30,
            children: input.children ?? [],
            employmentType: input.employmentType ?? "employee",
            annualIncome: input.annualIncome ?? 500,
            incomeGrowthRate: input.incomeGrowthRate ?? 2,
            sideIncomeMonthly: input.sideIncomeMonthly ?? 0,
            postRetirementIncomeMonthly: input.postRetirementIncomeMonthly ?? 0,
            postRetirementIncomeUntilAge: input.postRetirementIncomeUntilAge ?? 70,
            spouseEmploymentType: input.spouseEmploymentType ?? "employee",
            spouseAnnualIncome: input.spouseAnnualIncome ?? 0,
            spouseIncomeGrowthRate: input.spouseIncomeGrowthRate ?? 1,
            spouseCareerBreakStartAge: input.spouseCareerBreakStartAge ?? 0,
            spouseCareerBreakEndAge: input.spouseCareerBreakEndAge ?? 0,
            spouseCareerBreakIncomeMonthly: input.spouseCareerBreakIncomeMonthly ?? 0,
            monthlyLivingExpense: input.monthlyLivingExpense ?? 20,
            monthlyRent: input.monthlyRent ?? 10,
            housingType: input.housingType ?? "rent",
            purchaseAge: input.purchaseAge ?? 35,
            propertyPrice: input.propertyPrice ?? 4000,
            downPayment: input.downPayment ?? 400,
            mortgageRate: input.mortgageRate ?? 1.0,
            mortgagePeriod: input.mortgagePeriod ?? 35,
            lifeEvents: input.lifeEvents ?? [],
            currentSavings: input.currentSavings ?? 200,
            currentInvestmentAssets: input.currentInvestmentAssets ?? 0,
            monthlyInvestment: input.monthlyInvestment ?? 3,
            investmentReturnRate: input.investmentReturnRate ?? 5,
            nisaAccumulationMonthly: input.nisaAccumulationMonthly ?? 0,
            nisaGrowthMonthly: input.nisaGrowthMonthly ?? 0,
            nisaProductId: input.nisaProductId ?? "allworld",
            nisaReturnRate: input.nisaReturnRate ?? 6.5,
            monthlyIdeco: input.monthlyIdeco ?? 0,
            idecoProductId: input.idecoProductId ?? "allworld",
            idecoReturnRate: input.idecoReturnRate ?? 6.5,
            shokiboKigyoMonthly: input.shokiboKigyoMonthly ?? 0,
            inflationRate: input.inflationRate ?? 1.5,
            spouseRetirementAge: input.spouseRetirementAge ?? 0,
            retirementAllowance: input.retirementAllowance ?? 0,
            lifeInsurancePremiumMonthly: input.lifeInsurancePremiumMonthly ?? 0.8,
            medicalCostMonthlyAt70: input.medicalCostMonthlyAt70 ?? 1.5,
            nursingCareStartAge: input.nursingCareStartAge ?? 0,
            nursingCareCostMonthly: input.nursingCareCostMonthly ?? 0,
            corporatePensionMonthly: input.corporatePensionMonthly ?? 0,
            corporateDCBalance: input.corporateDCBalance ?? 0,
            corporateDCMonthly: input.corporateDCMonthly ?? 0,
            officerAnnualIncome: input.officerAnnualIncome ?? 0,
            officerIncomeGrowthRate: input.officerIncomeGrowthRate ?? 0,
            useAgeBasedSpendingCurve: input.useAgeBasedSpendingCurve ?? true,
          };
          const result = runSimulation(fullInput);
          set({ result, isCalculating: false, aiEvaluation: null });
        } catch {
          set({ isCalculating: false });
        }
      },

      saveSimulation: (name: string) => {
        const { input, result } = get();
        if (!result) return;
        const fullInput: SimulationInput = {
          age: input.age ?? 30,
          retirementAge: input.retirementAge ?? 65,
          gender: input.gender ?? "male",
          hasSpouse: input.hasSpouse ?? false,
          spouseAge: input.spouseAge ?? 30,
          children: input.children ?? [],
          employmentType: input.employmentType ?? "employee",
          annualIncome: input.annualIncome ?? 500,
          incomeGrowthRate: input.incomeGrowthRate ?? 2,
          sideIncomeMonthly: input.sideIncomeMonthly ?? 0,
          postRetirementIncomeMonthly: input.postRetirementIncomeMonthly ?? 0,
          postRetirementIncomeUntilAge: input.postRetirementIncomeUntilAge ?? 70,
          spouseEmploymentType: input.spouseEmploymentType ?? "employee",
          spouseAnnualIncome: input.spouseAnnualIncome ?? 0,
          spouseIncomeGrowthRate: input.spouseIncomeGrowthRate ?? 1,
          spouseCareerBreakStartAge: input.spouseCareerBreakStartAge ?? 0,
          spouseCareerBreakEndAge: input.spouseCareerBreakEndAge ?? 0,
          spouseCareerBreakIncomeMonthly: input.spouseCareerBreakIncomeMonthly ?? 0,
          monthlyLivingExpense: input.monthlyLivingExpense ?? 20,
          monthlyRent: input.monthlyRent ?? 10,
          housingType: input.housingType ?? "rent",
          purchaseAge: input.purchaseAge ?? 35,
          propertyPrice: input.propertyPrice ?? 4000,
          downPayment: input.downPayment ?? 400,
          mortgageRate: input.mortgageRate ?? 1.0,
          mortgagePeriod: input.mortgagePeriod ?? 35,
          lifeEvents: input.lifeEvents ?? [],
          currentSavings: input.currentSavings ?? 200,
          currentInvestmentAssets: input.currentInvestmentAssets ?? 0,
          monthlyInvestment: input.monthlyInvestment ?? 3,
          investmentReturnRate: input.investmentReturnRate ?? 5,
          nisaAccumulationMonthly: input.nisaAccumulationMonthly ?? 0,
          nisaGrowthMonthly: input.nisaGrowthMonthly ?? 0,
          nisaProductId: input.nisaProductId ?? "allworld",
          nisaReturnRate: input.nisaReturnRate ?? 6.5,
          monthlyIdeco: input.monthlyIdeco ?? 0,
          idecoProductId: input.idecoProductId ?? "allworld",
          idecoReturnRate: input.idecoReturnRate ?? 6.5,
          shokiboKigyoMonthly: input.shokiboKigyoMonthly ?? 0,
          inflationRate: input.inflationRate ?? 1.5,
          spouseRetirementAge: input.spouseRetirementAge ?? 0,
          retirementAllowance: input.retirementAllowance ?? 0,
          lifeInsurancePremiumMonthly: input.lifeInsurancePremiumMonthly ?? 0.8,
          medicalCostMonthlyAt70: input.medicalCostMonthlyAt70 ?? 1.5,
          nursingCareStartAge: input.nursingCareStartAge ?? 0,
          nursingCareCostMonthly: input.nursingCareCostMonthly ?? 0,
          corporatePensionMonthly: input.corporatePensionMonthly ?? 0,
          corporateDCBalance: input.corporateDCBalance ?? 0,
          corporateDCMonthly: input.corporateDCMonthly ?? 0,
          officerAnnualIncome: input.officerAnnualIncome ?? 0,
          officerIncomeGrowthRate: input.officerIncomeGrowthRate ?? 0,
          useAgeBasedSpendingCurve: input.useAgeBasedSpendingCurve ?? true,
        };
        const saved: SavedSimulation = {
          id: `sim_${Date.now()}`,
          name,
          savedAt: new Date().toISOString(),
          input: fullInput,
          result,
        };
        set((state) => ({
          savedSimulations: [saved, ...state.savedSimulations],
        }));
      },

      loadSimulation: (id: string) => {
        const { savedSimulations } = get();
        const sim = savedSimulations.find((s) => s.id === id);
        if (!sim) return;
        set({
          input: sim.input,
          result: sim.result,
          currentStep: 7,
        });
      },

      deleteSimulation: (id: string) => {
        set((state) => ({
          savedSimulations: state.savedSimulations.filter((s) => s.id !== id),
        }));
      },

      setAiEvaluation: (evaluation) => set({ aiEvaluation: evaluation }),
    }),
    {
      name: "lifeplan-simulator-store",
      partialize: (state) => ({
        savedSimulations: state.savedSimulations,
      }),
    }
  )
);
