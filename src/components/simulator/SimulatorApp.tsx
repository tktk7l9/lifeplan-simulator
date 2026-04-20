"use client";

import { useSimulationStore } from "@/store/simulationStore";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { FloatingParticlesWrapper } from "@/components/three/FloatingParticlesWrapper";
import { TinySpinner, type SpinnerShape } from "@/components/three/TinySpinner";
import { IncomeStep } from "./steps/IncomeStep";
import { ExpenseStep } from "./steps/ExpenseStep";
import { HousingStep } from "./steps/HousingStep";
import { LifeEventsStep } from "./steps/LifeEventsStep";
import { InvestmentStep } from "./steps/InvestmentStep";
import { InsuranceStep } from "./steps/InsuranceStep";
import { ResultsView } from "./results/ResultsView";
import { SavedSimulationsDrawer } from "./SavedSimulationsDrawer";
import { cn } from "@/lib/utils";
import type { SimulationInput } from "@/lib/simulation/types";

const STEPS = [
  { label: "ベースキャンプ", sublabel: "基本情報・家族構成", icon: "🏕️", short: "BC" },
  { label: "一合目", sublabel: "収入・年収", icon: "💴", short: "1" },
  { label: "二合目", sublabel: "生活費・支出", icon: "🛒", short: "2" },
  { label: "三合目", sublabel: "住宅・ローン", icon: "🏠", short: "3" },
  { label: "四合目", sublabel: "ライフイベント", icon: "🎉", short: "4" },
  { label: "五合目", sublabel: "投資・貯蓄", icon: "📈", short: "5" },
  { label: "六合目", sublabel: "保険・医療・企業DC", icon: "🛡️", short: "6" },
  { label: "山　頂", sublabel: "シミュレーション結果", icon: "🏔️", short: "🚩" },
];

const STEP_SHAPES: SpinnerShape[] = ["peak", "coin", "gem", "box", "ring", "gem", "ring", "peak"];

const EMP_LABELS: Record<string, string> = {
  employee: "会社員", civil_servant: "公務員", employee_freelance: "会社員＋副業",
  self_employed: "自営業", freelance: "フリーランス", part_time: "パート",
};
const HOUSING_LABELS: Record<string, string> = { rent: "賃貸", buy: "購入予定", own: "持ち家" };

function getStepSummary(stepIndex: number, input: Partial<SimulationInput>): string | null {
  switch (stepIndex) {
    case 0: {
      const parts = [`${input.age ?? "--"}歳`];
      if (input.hasSpouse) parts.push("配偶者あり");
      if ((input.children?.length ?? 0) > 0) parts.push(`子${input.children!.length}人`);
      return parts.join(" / ");
    }
    case 1:
      return input.annualIncome != null
        ? `${EMP_LABELS[input.employmentType ?? ""] ?? ""} / 年収${input.annualIncome}万円`
        : null;
    case 2:
      return input.monthlyLivingExpense != null
        ? `生活費 ${input.monthlyLivingExpense}万円/月`
        : null;
    case 3: {
      const ht = input.housingType;
      if (ht === "rent") return `賃貸 ${input.monthlyRent ?? 0}万円/月`;
      if (ht === "buy") return `購入 ${(input.propertyPrice ?? 0).toLocaleString("ja-JP")}万円`;
      if (ht === "own") return "持ち家";
      return null;
    }
    case 4:
      return `イベント ${(input.lifeEvents ?? []).length}件`;
    case 5:
      return input.monthlyInvestment != null
        ? `月投資 ${input.monthlyInvestment}万円`
        : null;
    case 6:
      return `保険料 ${input.lifeInsurancePremiumMonthly ?? 0}万円/月`;
    default:
      return null;
  }
}

const STEP_COMPONENTS = [
  BasicInfoStep, IncomeStep, ExpenseStep,
  HousingStep, LifeEventsStep, InvestmentStep, InsuranceStep,
];

/* ── Trail sidebar ───────────────────────────────────────── */
function TrailSidebar({ currentStep, onJumpTo }: { currentStep: number; onJumpTo: (i: number) => void }) {
  const { input } = useSimulationStore();
  const totalSteps = STEPS.length;
  const pct = Math.round((currentStep / (totalSteps - 1)) * 100);

  return (
    <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden sticky top-20">

      {/* Header gradient band */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-400 to-amber-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3L2 21h20L14 3l-3 6-3-6z" />
          </svg>
          <span className="text-white text-xs font-bold tracking-widest uppercase">登山ルート</span>
        </div>
        <span className="text-white/90 text-xs font-black">{pct}%</span>
      </div>

      {/* Elevation progress */}
      <div className="h-1.5 bg-amber-100">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="p-3">
        <div className="relative">
          {/* Vertical trail line */}
          <div
            className="absolute left-[18px] top-5"
            style={{ width: 2, bottom: 20 }}
          >
            {Array.from({ length: totalSteps - 1 }, (_, i) => (
              <div
                key={i}
                className="absolute transition-colors duration-300"
                style={{
                  top: `${(i / (totalSteps - 1)) * 100}%`,
                  height: `${(1 / (totalSteps - 1)) * 100}%`,
                  left: 0,
                  right: 0,
                  borderLeft: `2px ${i < currentStep ? "solid" : "dashed"} ${i < currentStep ? "#d97706" : "#fcd34d"}`,
                }}
              />
            ))}
          </div>

          <nav aria-label="ステップ一覧">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isSummit = index === totalSteps - 1;
              const summary = isCompleted ? getStepSummary(index, input as Partial<SimulationInput>) : null;

              return (
                <button
                  key={index}
                  onClick={() => onJumpTo(index)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 px-1 py-2 text-left rounded-xl transition-all duration-150 relative group",
                    isActive && "bg-amber-50",
                    !isActive && "hover:bg-amber-50/60"
                  )}
                >
                  {/* Waypoint dot */}
                  <div className={cn(
                    "relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                    isActive && "bg-amber-500 border-amber-400 shadow-lg shadow-amber-200 scale-110",
                    isCompleted && !isActive && "bg-white border-amber-400",
                    !isCompleted && !isActive && !isSummit && "bg-white border-amber-200",
                    isSummit && !isActive && !isCompleted && "bg-white border-dashed border-amber-300",
                  )}>
                    {isCompleted && !isActive ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isActive ? (
                      <span className="text-sm leading-none">🥾</span>
                    ) : isSummit ? (
                      <span className="text-sm leading-none">🚩</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-300">{step.short}</span>
                    )}
                  </div>

                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <div className={cn(
                      "text-xs font-bold leading-tight truncate",
                      isActive ? "text-amber-800" : isCompleted ? "text-amber-700" : "text-amber-400"
                    )}>
                      {step.icon} {step.label}
                    </div>
                    {summary ? (
                      <div className="text-[10px] leading-tight mt-0.5 truncate text-amber-600/80">
                        {summary}
                      </div>
                    ) : (
                      <div className={cn(
                        "text-[10px] leading-tight mt-0.5 truncate",
                        isActive ? "text-amber-600" : "text-amber-400/70"
                      )}>
                        {step.sublabel}
                      </div>
                    )}
                  </div>

                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile trail bar ────────────────────────────────────── */
function MobileTrailBar({ currentStep, onJumpTo }: { currentStep: number; onJumpTo: (i: number) => void }) {
  return (
    <div className="lg:hidden w-full mb-5">
      <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-amber-100">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="px-3 py-2.5">
          {/* Current step label */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-xs">
                <span className="text-white">🥾</span>
              </div>
              <div>
                <div className="text-xs font-bold text-amber-800">{STEPS[currentStep]?.icon} {STEPS[currentStep]?.label}</div>
                <div className="text-[10px] text-amber-500">{STEPS[currentStep]?.sublabel}</div>
              </div>
            </div>
            <span className="text-xs font-black text-amber-600">{Math.round((currentStep / (STEPS.length - 1)) * 100)}%</span>
          </div>

          {/* Dot trail */}
          <div className="relative flex items-center gap-0">
            {/* Background line */}
            <div className="absolute left-3.5 right-3.5 top-1/2 -translate-y-1/2 h-0.5 bg-amber-100" />
            <div
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
              style={{ width: `calc(${(currentStep / (STEPS.length - 1)) * 100}% - 1.75rem + ${(currentStep / (STEPS.length - 1)) * 1.75}rem)` }}
            />
            <div className="relative flex justify-between w-full px-0">
              {STEPS.map((step, i) => {
                const isActive = i === currentStep;
                const isDone = i < currentStep;
                return (
                  <button
                    key={i}
                    onClick={() => onJumpTo(i)}
                    className={cn(
                      "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black border-2 transition-all",
                      isActive && "bg-amber-500 border-amber-400 text-white scale-110 shadow-md shadow-amber-200/60",
                      isDone && !isActive && "bg-white border-amber-400 text-amber-600",
                      !isDone && !isActive && "bg-white border-amber-200 text-amber-300 hover:border-amber-300",
                    )}
                    title={step.sublabel}
                    aria-label={`${step.short !== step.icon ? step.short + ": " : ""}${step.sublabel}`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isDone && !isActive ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isActive ? "🥾" : step.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export function SimulatorApp() {
  const { currentStep, setStep, calculate } = useSimulationStore();

  const RESULT_STEP = 7;
  const isResultStep = currentStep === RESULT_STEP;
  const StepComponent = !isResultStep && currentStep < STEP_COMPONENTS.length
    ? STEP_COMPONENTS[currentStep] : null;

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    if (currentStep === RESULT_STEP - 1) { calculate(); setStep(RESULT_STEP); }
    else if (currentStep < RESULT_STEP) setStep(currentStep + 1);
    scrollToTop();
  }
  function handleBack() {
    if (currentStep > 0) setStep(currentStep - 1);
    scrollToTop();
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/50 to-yellow-50/30">
      {/* Subtle 3D particles in background */}
      <FloatingParticlesWrapper count={40} opacity={0.10} />
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/92 backdrop-blur-md border-b-2 border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <a href="/" className="flex items-center gap-2 font-black text-amber-800 hover:text-amber-900 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3L2 21h20L14 3l-3 6-3-6z" />
            </svg>
            ライフプランシミュレーター
          </a>
          <div className="flex items-center gap-3">
            <SavedSimulationsDrawer />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              🥾 {STEPS[currentStep]?.label}
            </span>
          </div>
        </div>
        {/* Elevation progress bar */}
        <div className="h-1.5 bg-amber-100 relative">
          <div
            className="h-full bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-400 transition-all duration-700"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
          {/* Mountain silhouette over progress */}
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 1000 6" preserveAspectRatio="none" aria-hidden>
            <path d="M 0 6 L 250 3 L 350 4.5 L 500 1 L 650 3.5 L 750 4 L 1000 2 L 1000 6 Z" fill="#92400e" />
          </svg>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0">
          <TrailSidebar currentStep={currentStep} onJumpTo={(i) => { setStep(i); scrollToTop(); }} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <MobileTrailBar currentStep={currentStep} onJumpTo={(i) => { setStep(i); scrollToTop(); }} />

          {isResultStep ? (
            <ResultsView onBack={handleBack} />
          ) : (
            <div className="bg-white border-2 border-amber-100 shadow-sm"
              style={{ borderRadius: "3px 16px 4px 12px / 12px 3px 16px 4px" }}>

              {/* Step header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-amber-50 bg-gradient-to-r from-amber-50/60 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-xl sm:text-2xl shrink-0"
                    style={{ borderRadius: "3px 12px 3px 10px / 10px 3px 12px 3px" }}>
                    {STEPS[currentStep]?.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-amber-500 tracking-wider uppercase mb-0.5">
                      {STEPS[currentStep]?.label}
                    </div>
                    <h1 className="text-base sm:text-lg font-black text-amber-900 truncate">
                      {STEPS[currentStep]?.sublabel}
                    </h1>
                  </div>
                  <div className="hidden sm:block ml-auto opacity-50 pointer-events-none shrink-0">
                    <TinySpinner shape={STEP_SHAPES[currentStep]} size={40} />
                  </div>
                </div>
              </div>

              {/* Step content */}
              <div className="p-4 sm:p-6">
                {StepComponent && <StepComponent onNext={handleNext} />}
              </div>

              {/* Navigation */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t-2 border-amber-50 flex items-center justify-between bg-amber-50/30">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                    currentStep === 0
                      ? "text-amber-300 cursor-not-allowed"
                      : "text-amber-700 hover:bg-amber-100"
                  )}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  前へ
                </button>

                {/* Sketch elevation fraction */}
                <div className="flex items-center gap-1.5">
                  <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden>
                    <path d="M 2 12 L 8 4 L 14 8 L 20 2 L 26 6" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs text-amber-500 font-semibold">{currentStep + 1}/{STEPS.length}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
