"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "@/lib/utils";
import type { EmploymentType, SpouseEmploymentType } from "@/lib/simulation/types";
import { calcNetIncome, calcFreelanceOfficerNetIncome } from "@/lib/simulation/calculator";
import { NenkinImportDialog } from "@/components/simulator/import/NenkinImportDialog";
import type { NenkinParseResult } from "@/lib/import/nenkinCSV";

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string; desc: string }[] = [
  { value: "employee",           label: "会社員",          desc: "厚生年金あり" },
  { value: "civil_servant",      label: "公務員",          desc: "厚生年金あり" },
  { value: "employee_freelance", label: "会社員＋副業",    desc: "厚生年金あり・副業収入を別途入力" },
  { value: "self_employed",      label: "自営業",          desc: "事業所得・国民年金" },
  { value: "freelance",          label: "フリーランス",    desc: "事業所得・役員報酬設定可" },
  { value: "part_time",          label: "パート",          desc: "年金は簡易計算" },
];

const FREELANCE_TYPES = new Set<EmploymentType>(["freelance", "self_employed"]);

const SPOUSE_EMPLOYMENT_OPTIONS: { value: SpouseEmploymentType; label: string; desc: string }[] = [
  { value: "employee",           label: "会社員",          desc: "厚生年金あり" },
  { value: "civil_servant",      label: "公務員",          desc: "厚生年金あり" },
  { value: "employee_freelance", label: "会社員＋副業",    desc: "厚生年金あり" },
  { value: "self_employed",      label: "自営業",          desc: "国民年金のみ" },
  { value: "freelance",          label: "フリーランス",    desc: "国民年金のみ" },
  { value: "part_time",          label: "パート",          desc: "年金は簡易計算" },
  { value: "homemaker",          label: "専業主婦・主夫",  desc: "第3号被保険者" },
];

const schema = z.object({
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

type FormValues = z.infer<typeof schema>;

interface Props {
  onNext: () => void;
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  displayMin,
  displayMax,
  inputWidth = "w-24",
  description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  displayMin: string;
  displayMax: string;
  inputWidth?: string;
  description?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <FormLabel className="text-base font-semibold">{label}</FormLabel>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className={cn(inputWidth, "text-right font-bold text-amber-600")}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
          />
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="mb-2"
        thumbLabel={label}
      />
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{displayMin}</span>
        <span>{displayMax}</span>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function IncomeStep({ onNext }: Props) {
  const { input, updateInput } = useSimulationStore();

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      employmentType: input.employmentType ?? "employee",
      annualIncome: input.annualIncome ?? 500,
      incomeGrowthRate: input.incomeGrowthRate ?? 2,
      hasSideIncome: (input.sideIncomeMonthly ?? 0) > 0,
      sideIncomeMonthly: input.sideIncomeMonthly ?? 0,
      hasPostRetirementIncome: (input.postRetirementIncomeMonthly ?? 0) > 0,
      postRetirementIncomeMonthly: input.postRetirementIncomeMonthly ?? 10,
      postRetirementIncomeUntilAge: input.postRetirementIncomeUntilAge ?? 70,
      spouseEmploymentType: input.spouseEmploymentType ?? "employee",
      spouseAnnualIncome: input.spouseAnnualIncome ?? 300,
      spouseIncomeGrowthRate: input.spouseIncomeGrowthRate ?? 1,
      hasSpouseCareerBreak: (input.spouseCareerBreakStartAge ?? 0) > 0,
      spouseCareerBreakStartAge: input.spouseCareerBreakStartAge || 30,
      spouseCareerBreakEndAge: input.spouseCareerBreakEndAge || 33,
      spouseCareerBreakIncomeMonthly: input.spouseCareerBreakIncomeMonthly ?? 0,
      retirementAllowance: input.retirementAllowance ?? 0,
      hasOfficerIncome: (input.officerAnnualIncome ?? 0) > 0,
      officerAnnualIncome: input.officerAnnualIncome ?? 0,
      officerIncomeGrowthRate: input.officerIncomeGrowthRate ?? 0,
    },
  });

  const [nenkinNotice, setNenkinNotice] = useState<string | null>(null);

  const annualIncome = form.watch("annualIncome");
  const watchedEmploymentType = form.watch("employmentType");
  const hasSideIncome = form.watch("hasSideIncome");
  const sideIncomeMonthly = form.watch("sideIncomeMonthly");
  const hasPostRetirementIncome = form.watch("hasPostRetirementIncome");
  const spouseEmploymentType = form.watch("spouseEmploymentType");
  const hasSpouseCareerBreak = form.watch("hasSpouseCareerBreak");
  const hasOfficerIncome = form.watch("hasOfficerIncome");
  const officerAnnualIncome = form.watch("officerAnnualIncome");

  const isFreelanceType = FREELANCE_TYPES.has(watchedEmploymentType);
  const totalMonthly = Math.round(annualIncome / 12 * 10) / 10;
  const officerMonthly = Math.round(officerAnnualIncome / 12 * 10) / 10;

  // 手取り推計 (代表年齢35歳で計算)
  const estimatedNetAnnual = (isFreelanceType && hasOfficerIncome && officerAnnualIncome > 0)
    ? Math.round(calcFreelanceOfficerNetIncome(annualIncome, officerAnnualIncome, 35, 0))
    : Math.round(calcNetIncome(annualIncome, watchedEmploymentType, 35, 0));
  const estimatedNetMonthly = Math.round(estimatedNetAnnual / 12 * 10) / 10;
  const totalGrossMonthly = Math.round((annualIncome + (hasOfficerIncome ? officerAnnualIncome : 0)) / 12 * 10) / 10;

  function onSubmit(values: FormValues) {
    updateInput({
      employmentType: values.employmentType,
      annualIncome: values.annualIncome,
      incomeGrowthRate: values.incomeGrowthRate,
      sideIncomeMonthly: values.hasSideIncome ? values.sideIncomeMonthly : 0,
      postRetirementIncomeMonthly: values.hasPostRetirementIncome ? values.postRetirementIncomeMonthly : 0,
      postRetirementIncomeUntilAge: values.postRetirementIncomeUntilAge,
      spouseEmploymentType: values.spouseEmploymentType,
      spouseAnnualIncome: values.spouseEmploymentType === "homemaker" ? 0 : values.spouseAnnualIncome,
      spouseIncomeGrowthRate: values.spouseIncomeGrowthRate,
      spouseCareerBreakStartAge: values.hasSpouseCareerBreak ? values.spouseCareerBreakStartAge : 0,
      spouseCareerBreakEndAge: values.hasSpouseCareerBreak ? values.spouseCareerBreakEndAge : 0,
      spouseCareerBreakIncomeMonthly: values.hasSpouseCareerBreak ? values.spouseCareerBreakIncomeMonthly : 0,
      retirementAllowance: values.retirementAllowance,
      officerAnnualIncome: values.hasOfficerIncome ? values.officerAnnualIncome : 0,
      officerIncomeGrowthRate: values.officerIncomeGrowthRate,
    });
    onNext();
  }

  function handleNenkinApply(result: NenkinParseResult) {
    if (result.empMonths > 0 && form.getValues("employmentType") === "self_employed") {
      form.setValue("employmentType", "employee");
    }
    updateInput({});
    setNenkinNotice(
      `厚生年金 ${result.empMonths}ヶ月 / 国民年金 ${result.citizenMonths}ヶ月 ／ 推計年金 ${(result.pensionMonthlyEst / 10000).toFixed(1)}万円/月`
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── ねんきんネット連携バナー ── */}
        <div className="space-y-2">
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-green-800">ねんきんネット CSV 連携</p>
              <p className="text-xs text-green-700 mt-0.5">
                ねんきんネットの「年金記録照会」CSVをインポートすると、加入月数・標準報酬月額から推計年金額を自動計算します。
              </p>
            </div>
            <NenkinImportDialog onApply={handleNenkinApply} />
          </div>
          {nenkinNotice && (
            <div className="rounded-lg bg-green-100 border border-green-300 px-3 py-2.5 flex items-start gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-800">読み込みました</p>
                <p className="text-xs text-green-700 mt-0.5">{nenkinNotice}</p>
                <p className="text-xs text-green-600/80 mt-0.5">※ 推計は参考値です。年金額の精緻化には雇用形態・年収の正確な入力が重要です。</p>
              </div>
              <button
                type="button"
                onClick={() => setNenkinNotice(null)}
                className="ml-auto flex-shrink-0 text-green-600 hover:text-green-800"
                aria-label="閉じる"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* ── あなたの収入 ── */}
        <div className="space-y-6">
          <h2 className="font-semibold text-foreground">あなたの収入</h2>

          {/* 雇用形態 */}
          <FormField
            control={form.control}
            name="employmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">雇用形態</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        field.onChange(opt.value);
                        if (opt.value === "employee_freelance") form.setValue("hasSideIncome", true);
                      }}
                      className={cn(
                        "flex flex-col items-start px-3 py-2.5 rounded-xl border-2 text-left transition-all",
                        field.value === opt.value
                          ? "border-amber-500 bg-amber-50"
                          : "border-border hover:border-amber-300"
                      )}
                    >
                      <span className={cn("font-semibold text-sm", field.value === opt.value ? "text-amber-700" : "text-foreground")}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 年収 / 事業収入 */}
          <FormField
            control={form.control}
            name="annualIncome"
            render={({ field }) => (
              <FormItem>
                <SliderField
                  label={isFreelanceType ? "事業収入（年間・売上）" : "年収（額面）"}
                  value={field.value}
                  onChange={field.onChange}
                  min={0} max={3000} step={10}
                  unit="万円"
                  displayMin="0万円"
                  displayMax="3,000万円"
                  description={isFreelanceType
                    ? "経費差引前の年間売上。青色申告特別控除65万円を自動で適用して手取りを計算します"
                    : "税込・社会保険料控除前の額面年収"}
                />
                <div className="mt-1 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 space-y-1">
                  {hasOfficerIncome && isFreelanceType ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">事業収入（月換算）</span>
                        <span className="font-semibold text-amber-700">{totalMonthly.toFixed(1)}万円/月</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">役員報酬（月換算）</span>
                        <span className="font-semibold text-amber-700">{officerMonthly.toFixed(1)}万円/月</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-amber-100 pt-1">
                        <span className="text-muted-foreground">合算総収入（月換算）</span>
                        <span className="font-semibold text-amber-700">{totalGrossMonthly.toFixed(1)}万円/月</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-amber-100 pt-1">
                        <span className="text-muted-foreground">推計手取り（合算・税社保控除後）</span>
                        <span className="font-bold text-emerald-600">{estimatedNetMonthly.toFixed(1)}万円/月</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{isFreelanceType ? "事業収入（月換算）" : "額面（月換算）"}</span>
                        <span className="font-semibold text-amber-700">{totalMonthly.toFixed(1)}万円/月</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-amber-100 pt-1">
                        <span className="text-muted-foreground">推計手取り（税・社保控除後）</span>
                        <span className="font-bold text-emerald-600">{estimatedNetMonthly.toFixed(1)}万円/月</span>
                      </div>
                    </>
                  )}
                  <p className="text-muted-foreground text-[11px]">※ 35歳・iDeCo未反映の概算。シミュレーションは毎年の実年齢で再計算します。</p>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 役員報酬（フリーランス/自営業のみ表示） */}
          {isFreelanceType && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <FormField
                  control={form.control}
                  name="hasOfficerIncome"
                  render={({ field }) => (
                    <ToggleSwitch
                      checked={field.value}
                      onChange={field.onChange}
                      label="会社役員報酬（不動産管理会社等）あり"
                      description="家族法人や不動産管理会社から役員報酬を受け取る場合"
                    />
                  )}
                />
              </div>

              {hasOfficerIncome && (
                <div className="pl-4 border-l-2 border-amber-300 space-y-4">
                  <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 space-y-1">
                    <p className="font-semibold">税・社保の計算について</p>
                    <p>役員報酬には<strong>給与所得控除</strong>を適用し、事業収入（青色申告控除65万円適用後）と合算して累進課税します。</p>
                    <p>社会保険は役員報酬をベースに法人の健保・厚生年金を適用し、<strong>年金は厚生年金（比例報酬部分）が加算</strong>されます。</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="officerAnnualIncome"
                    render={({ field }) => (
                      <FormItem>
                        <SliderField
                          label="役員報酬（年額）"
                          value={field.value}
                          onChange={field.onChange}
                          min={0} max={2000} step={12}
                          unit="万円 / 年"
                          displayMin="0万円"
                          displayMax="2,000万円"
                          description="法人から支払われる役員報酬の年額。給与所得控除が適用されます。"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="officerIncomeGrowthRate"
                    render={({ field }) => (
                      <FormItem>
                        <SliderField
                          label="役員報酬の増加率"
                          value={field.value}
                          onChange={field.onChange}
                          min={0} max={10} step={0.5}
                          unit="% / 年"
                          inputWidth="w-20"
                          displayMin="0%"
                          displayMax="10%"
                          description="役員報酬の年間増加率。法人業績に応じて設定してください。0%で固定額。"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {/* 年収上昇率 */}
          <FormField
            control={form.control}
            name="incomeGrowthRate"
            render={({ field }) => (
              <FormItem>
                <SliderField
                  label="年収上昇率"
                  value={field.value}
                  onChange={field.onChange}
                  min={0} max={10} step={0.1}
                  unit="% / 年"
                  inputWidth="w-20"
                  displayMin="0%"
                  displayMax="10%"
                  description="毎年の昇給率。日本の平均は約1.5〜2%"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 副業収入 */}
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="hasSideIncome"
              render={({ field }) => (
                <ToggleSwitch
                  checked={field.value}
                  onChange={field.onChange}
                  label="副業・その他収入"
                  description="退職まで毎月一定額の副収入がある場合"
                />
              )}
            />
            {hasSideIncome && (
              <FormField
                control={form.control}
                name="sideIncomeMonthly"
                render={({ field }) => (
                  <FormItem className="pl-3 border-l-2 border-amber-200">
                    <SliderField
                      label="副業月収"
                      value={field.value}
                      onChange={field.onChange}
                      min={0} max={100} step={0.5}
                      unit="万円 / 月"
                      displayMin="0万円"
                      displayMax="100万円"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* 退職後の再雇用 */}
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="hasPostRetirementIncome"
              render={({ field }) => (
                <ToggleSwitch
                  checked={field.value}
                  onChange={field.onChange}
                  label="退職後の再雇用・パート収入"
                  description="定年後も一定期間働く場合"
                />
              )}
            />
            {hasPostRetirementIncome && (
              <div className="pl-3 border-l-2 border-amber-200 space-y-4">
                <FormField
                  control={form.control}
                  name="postRetirementIncomeMonthly"
                  render={({ field }) => (
                    <FormItem>
                      <SliderField
                        label="再雇用月収"
                        value={field.value}
                        onChange={field.onChange}
                        min={0} max={50} step={0.5}
                        unit="万円 / 月"
                        displayMin="0万円"
                        displayMax="50万円"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postRetirementIncomeUntilAge"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-sm font-semibold">働く期間（終了年齢）</FormLabel>
                        <span className="font-bold text-amber-600">{field.value}歳まで</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={60} max={80} step={1}
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          className="mb-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>60歳</span><span>80歳</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* 退職金 */}
          <FormField
            control={form.control}
            name="retirementAllowance"
            render={({ field }) => (
              <FormItem>
                <SliderField
                  label="退職金（予定額）"
                  value={field.value}
                  onChange={field.onChange}
                  min={0} max={5000} step={50}
                  unit="万円"
                  displayMin="0万円"
                  displayMax="5,000万円"
                  description="退職時に一括受取する退職金。退職所得控除（勤続年数が長いほど非課税枠大）を適用して計上します。0の場合は計上しません。"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── 配偶者の収入 ── */}
        {input.hasSpouse && (
          <>
            <Separator />
            <div className="space-y-6">
              <h2 className="font-semibold text-foreground">配偶者の収入</h2>

              {/* 配偶者の雇用形態 */}
              <FormField
                control={form.control}
                name="spouseEmploymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">配偶者の雇用形態</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {SPOUSE_EMPLOYMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            "flex flex-col items-start px-3 py-2.5 rounded-xl border-2 text-left transition-all",
                            field.value === opt.value
                              ? "border-amber-500 bg-amber-50"
                              : "border-border hover:border-amber-300"
                          )}
                        >
                          <span className={cn("font-semibold text-sm", field.value === opt.value ? "text-amber-700" : "text-foreground")}>
                            {opt.label}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 配偶者の年収（専業主婦以外） */}
              {spouseEmploymentType !== "homemaker" && (
                <>
                  <FormField
                    control={form.control}
                    name="spouseAnnualIncome"
                    render={({ field }) => (
                      <FormItem>
                        <SliderField
                          label="配偶者の年収（額面）"
                          value={field.value}
                          onChange={field.onChange}
                          min={0} max={3000} step={10}
                          unit="万円"
                          displayMin="0万円"
                          displayMax="3,000万円"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="spouseIncomeGrowthRate"
                    render={({ field }) => (
                      <FormItem>
                        <SliderField
                          label="配偶者の年収上昇率"
                          value={field.value}
                          onChange={field.onChange}
                          min={0} max={10} step={0.1}
                          unit="% / 年"
                          inputWidth="w-20"
                          displayMin="0%"
                          displayMax="10%"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* キャリアブレーク */}
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="hasSpouseCareerBreak"
                      render={({ field }) => (
                        <ToggleSwitch
                          checked={field.value}
                          onChange={field.onChange}
                          label="キャリアブレーク（産休・育休など）"
                          description="一定期間、収入が減少する場合"
                        />
                      )}
                    />
                    {hasSpouseCareerBreak && (
                      <div className="pl-3 border-l-2 border-amber-200 space-y-4">
                        <FormField
                          control={form.control}
                          name="spouseCareerBreakStartAge"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-2">
                                <FormLabel className="text-sm font-semibold">ブレーク開始年齢</FormLabel>
                                <span className="font-bold text-amber-600">{field.value}歳</span>
                              </div>
                              <FormControl>
                                <Slider min={20} max={55} step={1} value={[field.value]} onValueChange={([v]) => field.onChange(v)} className="mb-2" />
                              </FormControl>
                              <div className="flex justify-between text-xs text-muted-foreground"><span>20歳</span><span>55歳</span></div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="spouseCareerBreakEndAge"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-2">
                                <FormLabel className="text-sm font-semibold">復帰年齢</FormLabel>
                                <span className="font-bold text-amber-600">{field.value}歳</span>
                              </div>
                              <FormControl>
                                <Slider min={20} max={60} step={1} value={[field.value]} onValueChange={([v]) => field.onChange(v)} className="mb-2" />
                              </FormControl>
                              <div className="flex justify-between text-xs text-muted-foreground"><span>20歳</span><span>60歳</span></div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="spouseCareerBreakIncomeMonthly"
                          render={({ field }) => (
                            <FormItem>
                              <SliderField
                                label="ブレーク中の月収"
                                value={field.value}
                                onChange={field.onChange}
                                min={0} max={30} step={0.5}
                                unit="万円 / 月"
                                displayMin="0万円"
                                displayMax="30万円"
                                description="育児休業給付金など。0の場合は収入なし"
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <Button
          type="submit"
          className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-base"
        >
          次へ進む
        </Button>
      </form>
    </Form>
  );
}
