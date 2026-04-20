"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
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
import type { ChildInfo, EducationPath } from "@/lib/simulation/types";

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

const today = new Date();
const minDate = `${today.getFullYear() - 80}-01-01`;
const maxDate = `${today.getFullYear() - 18}-12-31`;

const schema = z.object({
  birthDate: z.string().min(1, "生年月日を入力してください"),
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

  function onSubmit(values: FormValues) {
    const age = calcAge(values.birthDate);
    const spouseAge = values.hasSpouse && values.spouseBirthDate
      ? calcAge(values.spouseBirthDate)
      : undefined;

    updateInput({
      age,
      birthDate: values.birthDate,
      retirementAge: values.retirementAge,
      gender: values.gender,
      hasSpouse: values.hasSpouse,
      spouseAge: values.hasSpouse ? (spouseAge ?? 30) : undefined,
      spouseBirthDate: values.hasSpouse ? (values.spouseBirthDate ?? undefined) : undefined,
      spouseRetirementAge: values.hasSpouse ? values.spouseRetirementAge : 0,
      children: values.children as ChildInfo[],
    });
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
                <FormLabel className="text-base font-semibold">生年月日</FormLabel>
                {currentAge !== null && currentAge >= 18 && currentAge <= 80 && (
                  <span className="text-2xl font-bold text-amber-600">{currentAge}歳</span>
                )}
                {currentAge !== null && (currentAge < 18 || currentAge > 80) && (
                  <span className="text-sm text-destructive font-medium">18〜80歳の範囲で入力</span>
                )}
              </div>
              <FormControl>
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </FormControl>
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
              <div className="flex gap-3 mt-2">
                {(
                  [
                    { value: "male", label: "男性" },
                    { value: "female", label: "女性" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150",
                      field.value === opt.value
                        ? "border-amber-600 bg-amber-50 text-amber-700"
                        : "border-border text-muted-foreground hover:border-amber-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
              <div className="flex gap-3 mt-2">
                {(
                  [
                    { value: false, label: "なし" },
                    { value: true, label: "あり" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150",
                      field.value === opt.value
                        ? "border-amber-600 bg-amber-50 text-amber-700"
                        : "border-border text-muted-foreground hover:border-amber-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
                  <FormLabel className="text-base font-semibold">配偶者の生年月日</FormLabel>
                  {spouseCurrentAge !== null && spouseCurrentAge >= 18 && spouseCurrentAge <= 80 && (
                    <span className="text-2xl font-bold text-amber-600">{spouseCurrentAge}歳</span>
                  )}
                  {spouseCurrentAge !== null && (spouseCurrentAge < 18 || spouseCurrentAge > 80) && (
                    <span className="text-sm text-destructive font-medium">18〜80歳の範囲で入力</span>
                  )}
                </div>
                <FormControl>
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                </FormControl>
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
          <label className="text-base font-semibold">子どもの数</label>
          <div className="flex gap-2 mt-2">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleChildrenCountChange(n)}
                className={cn(
                  "w-11 h-11 rounded-xl border-2 font-semibold text-sm transition-all duration-150",
                  childrenCount === n
                    ? "border-amber-600 bg-amber-50 text-amber-700"
                    : "border-border text-muted-foreground hover:border-amber-300"
                )}
              >
                {n}
              </button>
            ))}
          </div>
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
          className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-base"
        >
          次へ進む
        </Button>
      </form>
    </Form>
  );
}
