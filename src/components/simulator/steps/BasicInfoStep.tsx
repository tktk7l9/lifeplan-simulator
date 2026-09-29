"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import "@/lib/zod-ja";
import { useSimulationStore } from "@/store/simulationStore";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ChildInfo, EducationPath, SimulationInput } from "@/lib/simulation/types";
import { useStoreSync } from "./useStoreSync";

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function ageToBirthDate(age: number): string {
  const today = new Date();
  const year = today.getFullYear() - age;
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

const MIN_AGE = 18;
const MAX_AGE = 80;

/**
 * Birth year + month pickers. Only years that give an age of 18-80 can be chosen,
 * so an out-of-range birthday cannot be entered (SHIG 13, 43, 45).
 */
function BirthYearMonthField({
  yearLabel,
  monthLabel,
  value,
  onChange,
}: {
  yearLabel: string;
  monthLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const thisYear = new Date().getFullYear();
  const [y, m, d] = (value || ageToBirthDate(30)).split("-").map(Number);
  const years: number[] = [];
  for (let year = thisYear - MIN_AGE; year >= thisYear - MAX_AGE - 1; year--) years.push(year);
  if (!years.includes(y)) years.push(y);

  function compose(year: number, month: number) {
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(d || 1, lastDay);
    onChange(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }

  const selectClass =
    "h-11 rounded-lg border border-input bg-white px-3 text-foreground text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1";
  return (
    <div className="flex gap-2">
      <select
        aria-label={yearLabel}
        value={y}
        onChange={(e) => compose(Number(e.target.value), m)}
        className={cn(selectClass, "flex-1")}
      >
        {years.map((year) => (
          <option key={year} value={year}>{year}年（{thisYear - year}歳前後）</option>
        ))}
      </select>
      <select
        aria-label={monthLabel}
        value={m}
        onChange={(e) => compose(y, Number(e.target.value))}
        className={cn(selectClass, "w-24")}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <option key={month} value={month}>{month}月</option>
        ))}
      </select>
    </div>
  );
}

function ChoiceGroup<T extends string | boolean | number>({
  label,
  options,
  value,
  onChange,
  itemClassName,
  className = "flex gap-3 mt-2",
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  itemClassName: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            itemClassName,
            "rounded-xl border-2 font-medium text-sm transition-all duration-150",
            value === opt.value
              ? "border-amber-600 bg-amber-50 text-amber-700"
              : "border-border text-muted-foreground hover:border-amber-300"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const schema = z.object({
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

type FormValues = z.infer<typeof schema>;

interface Props {
  onNext: () => void;
}

function toPatch(values: FormValues): Partial<SimulationInput> {
  const spouseAge = values.hasSpouse && values.spouseBirthDate
    ? calcAge(values.spouseBirthDate)
    : undefined;
  return {
    age: calcAge(values.birthDate),
    birthDate: values.birthDate,
    retirementAge: values.retirementAge,
    gender: values.gender,
    hasSpouse: values.hasSpouse,
    spouseAge: values.hasSpouse ? (spouseAge ?? 30) : undefined,
    spouseBirthDate: values.hasSpouse ? (values.spouseBirthDate ?? undefined) : undefined,
    spouseRetirementAge: values.hasSpouse ? values.spouseRetirementAge : 0,
    children: (values.children ?? []) as ChildInfo[],
  };
}

export function BasicInfoStep({ onNext }: Props) {
  const { input, updateInput } = useSimulationStore();
  const [childrenCount, setChildrenCount] = useState(input.children?.length ?? 0);

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      birthDate: input.birthDate ?? ageToBirthDate(input.age ?? 30),
      retirementAge: input.retirementAge ?? 65,
      gender: input.gender ?? "male",
      hasSpouse: input.hasSpouse ?? false,
      spouseBirthDate: input.spouseBirthDate ?? ageToBirthDate(input.spouseAge ?? 30),
      spouseRetirementAge: input.spouseRetirementAge || input.retirementAge || 65,
      childrenCount: input.children?.length ?? 0,
      children: input.children?.length ? input.children : [],
    },
  });

  const hasSpouseValue = form.watch("hasSpouse");
  const birthDate = form.watch("birthDate");
  const spouseBirthDate = form.watch("spouseBirthDate");
  const childrenValue = form.watch("children") ?? [];

  const currentAge = birthDate ? calcAge(birthDate) : null;
  const spouseCurrentAge = spouseBirthDate ? calcAge(spouseBirthDate) : null;

  function handleChildrenCountChange(count: number) {
    setChildrenCount(count);
    const current = form.getValues("children") ?? [];
    if (count > current.length) {
      const additions: ChildInfo[] = [];
      for (let i = current.length; i < count; i++) {
        additions.push({
          id: `child-${i}-${Date.now()}`,
          birthAge: 30,
          educationPath: "public" as EducationPath,
        });
      }
      form.setValue("children", [...current, ...additions]);
    } else {
      form.setValue("children", current.slice(0, count));
    }
    form.setValue("childrenCount", count);
  }

  useStoreSync(form, (values) => {
    const age = calcAge(values.birthDate);
    if (!(age >= MIN_AGE && age <= MAX_AGE)) return null;
    return toPatch(values);
  });

  function onSubmit(values: FormValues) {
    updateInput(toPatch(values));
    onNext();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Birth date */}
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between mb-2">
                <FormLabel className="text-base font-semibold">生まれた年月</FormLabel>
                {currentAge !== null && currentAge >= 18 && currentAge <= 80 && (
                  <span className="text-2xl font-bold text-amber-600">{currentAge}歳</span>
                )}
                {currentAge !== null && (currentAge < 18 || currentAge > 80) && (
                  <span className="text-sm text-destructive font-medium">18〜80歳の範囲で入力</span>
                )}
              </div>
              <BirthYearMonthField yearLabel="生まれた年" monthLabel="生まれた月" value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Retirement Age */}
        <FormField
          control={form.control}
          name="retirementAge"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between mb-2">
                <FormLabel className="text-base font-semibold">退職年齢</FormLabel>
                <span className="text-2xl font-bold text-amber-600">{field.value}歳</span>
              </div>
              <FormControl>
                <Slider
                  min={50} max={80} step={1}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                  className="mb-2"
                  thumbLabel="退職年齢"
                />
              </FormControl>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50歳</span>
                <span>80歳</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">性別</FormLabel>
              <ChoiceGroup
                label="性別"
                options={[
                  { value: "male", label: "男性" },
                  { value: "female", label: "女性" },
                ] as const}
                value={field.value}
                onChange={field.onChange}
                itemClassName="flex-1 py-3"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Has Spouse */}
        <FormField
          control={form.control}
          name="hasSpouse"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">配偶者の有無</FormLabel>
              <ChoiceGroup
                label="配偶者の有無"
                options={[
                  { value: false, label: "なし" },
                  { value: true, label: "あり" },
                ] as const}
                value={field.value}
                onChange={field.onChange}
                itemClassName="flex-1 py-3"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Spouse fields (conditional) */}
        {hasSpouseValue && (
          <FormField
            control={form.control}
            name="spouseBirthDate"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">配偶者の生まれた年月</FormLabel>
                  {spouseCurrentAge !== null && spouseCurrentAge >= 18 && spouseCurrentAge <= 80 && (
                    <span className="text-2xl font-bold text-amber-600">{spouseCurrentAge}歳</span>
                  )}
                  {spouseCurrentAge !== null && (spouseCurrentAge < 18 || spouseCurrentAge > 80) && (
                    <span className="text-sm text-destructive font-medium">18〜80歳の範囲で入力</span>
                  )}
                </div>
                <BirthYearMonthField yearLabel="配偶者の生まれた年" monthLabel="配偶者の生まれた月" value={field.value ?? ""} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {hasSpouseValue && (
          <FormField
            control={form.control}
            name="spouseRetirementAge"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">配偶者の退職年齢</FormLabel>
                  <span className="text-2xl font-bold text-amber-600">{field.value}歳</span>
                </div>
                <FormControl>
                  <Slider
                    min={50} max={80} step={1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                    thumbLabel="配偶者の退職年齢"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50歳</span>
                  <span>80歳</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Children count */}
        <div className="space-y-2">
          <div className="text-base font-semibold">子どもの数</div>
          <ChoiceGroup
            label="子どもの数"
            options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
            value={childrenCount}
            onChange={handleChildrenCountChange}
            itemClassName="w-11 h-11 font-semibold"
            className="flex gap-2 mt-2"
          />
        </div>

        {/* Children details */}
        {childrenValue.length > 0 && (
          <div className="space-y-4">
            {childrenValue.map((child, index) => (
              <div
                key={child.id}
                className="p-4 rounded-xl bg-slate-50 border border-border space-y-4"
              >
                <div className="font-semibold text-sm text-muted-foreground">第{index + 1}子</div>

                <FormField
                  control={form.control}
                  name={`children.${index}.birthAge`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel className="text-sm">生まれた時の親の年齢</FormLabel>
                        <span className="text-base font-bold text-amber-600">{field.value}歳</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={18} max={60} step={1}
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                          thumbLabel={`第${index + 1}子: 生まれた時の親の年齢`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`children.${index}.educationPath`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">教育方針</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">公立中心</SelectItem>
                          <SelectItem value="private">私立中心</SelectItem>
                          <SelectItem value="mix">ミックス</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl text-base"
        >
          次へ進む
        </Button>
      </form>
    </Form>
  );
}
