import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SimulationInput, SimulationResult, SavedSimulation, AIEvaluation } from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/calculator";

/** Index of the result ("summit") step; steps 0-6 are input forms. */
export const RESULT_STEP = 7;

/** What the user was looking at; handed back by destructive actions so they can be undone. */
export interface SessionSnapshot {
  currentStep: number;
  input: Partial<SimulationInput>;
  result: SimulationResult | null;
  resultKey: string | null;
  aiEvaluation: AIEvaluation | null;
}

interface SimulationStore {
  currentStep: number;
  input: Partial<SimulationInput>;
  result: SimulationResult | null;
  /** Serialized input the current result was computed from. */
  resultKey: string | null;
  isCalculating: boolean;
  savedSimulations: SavedSimulation[];
  aiEvaluation: AIEvaluation | null;

  updateInput: (patch: Partial<SimulationInput>) => void;
  setStep: (step: number) => void;
  calculate: () => void;
  saveSimulation: (name: string) => void;
  /** Loads a saved simulation and returns the replaced session (for undo), or null if not found. */
  loadSimulation: (id: string) => SessionSnapshot | null;
  /** Deletes a saved simulation and returns it with its position (for undo), or null if not found. */
  deleteSimulation: (id: string) => { sim: SavedSimulation; index: number } | null;
  restoreSimulation: (sim: SavedSimulation, index: number) => void;
  /** Starts over with default input and returns the discarded session (for undo). */
  resetInput: () => SessionSnapshot;
  restoreSession: (snapshot: SessionSnapshot) => void;
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

/** Fill every missing field with its default so the calculator gets a complete input. */
export function toFullInput(input: Partial<SimulationInput>): SimulationInput {
  return {
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
}

function snapshotOf(state: SessionSnapshot): SessionSnapshot {
  const { currentStep, input, result, resultKey, aiEvaluation } = state;
  return { currentStep, input, result, resultKey, aiEvaluation };
}

/** Stable key of the input a result was computed from; used to skip needless recalculation. */
function inputKey(input: Partial<SimulationInput>): string {
  return JSON.stringify(input);
}

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      input: defaultInput,
      result: null,
      resultKey: null,
      isCalculating: false,
      savedSimulations: [],
      aiEvaluation: null,

      updateInput: (patch) =>
        set((state) => ({ input: { ...state.input, ...patch } })),

      setStep: (step) => {
        set({ currentStep: step });
        // The result view always reflects the current input (SHIG 35); recompute only when it changed.
        if (step === RESULT_STEP) {
          const { result, resultKey, input } = get();
          if (!result || resultKey !== inputKey(input)) get().calculate();
        }
      },

      calculate: () => {
        set({ isCalculating: true });
        try {
          const { input } = get();
          const fullInput = toFullInput(input);
          const result = runSimulation(fullInput);
          set({ result, resultKey: inputKey(input), isCalculating: false, aiEvaluation: null });
        } catch {
          set({ isCalculating: false });
        }
      },

      saveSimulation: (name: string) => {
        const { input, result } = get();
        if (!result) return;
        const fullInput = toFullInput(input);
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
        const state = get();
        const sim = state.savedSimulations.find((s) => s.id === id);
        if (!sim) return null;
        const previous = snapshotOf(state);
        set({
          input: sim.input,
          result: sim.result,
          resultKey: inputKey(sim.input),
          aiEvaluation: null,
          currentStep: RESULT_STEP,
        });
        return previous;
      },

      deleteSimulation: (id: string) => {
        const list = get().savedSimulations;
        const index = list.findIndex((s) => s.id === id);
        if (index < 0) return null;
        const sim = list[index];
        set({ savedSimulations: list.filter((s) => s.id !== id) });
        return { sim, index };
      },

      restoreSimulation: (sim, index) => {
        set((state) => {
          if (state.savedSimulations.some((s) => s.id === sim.id)) return state;
          const next = [...state.savedSimulations];
          next.splice(Math.min(index, next.length), 0, sim);
          return { savedSimulations: next };
        });
      },

      resetInput: () => {
        const previous = snapshotOf(get());
        set({ input: defaultInput, result: null, resultKey: null, aiEvaluation: null, currentStep: 0 });
        return previous;
      },

      restoreSession: (snapshot) => set({ ...snapshot }),

      setAiEvaluation: (evaluation) => set({ aiEvaluation: evaluation }),
    }),
    {
      name: "lifeplan-simulator-store",
      // Keep what the user typed across reloads (SHIG 38, 97). The result is recomputed on demand.
      partialize: (state) => ({
        savedSimulations: state.savedSimulations,
        input: state.input,
        currentStep: state.currentStep,
        result: state.result,
        resultKey: state.resultKey,
      }),
    }
  )
);
