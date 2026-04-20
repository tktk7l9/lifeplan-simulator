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
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const schema = z.object({
  monthlyLivingExpense: z.number().min(0).max(200),
  monthlyRent: z.number().min(0).max(100),
  inflationRate: z.number().min(0).max(5),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onNext: () => void;
}

export function ExpenseStep({ onNext }: Props) {
  const { input, updateInput } = useSimulationStore();

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      monthlyLivingExpense: input.monthlyLivingExpense ?? 20,
      monthlyRent: input.monthlyRent ?? 10,
      inflationRate: input.inflationRate ?? 1.5,
    },
  });

  const housingType = input.housingType ?? "rent";

  function onSubmit(values: FormValues) {
    updateInput(values);
    onNext();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
          住居費（家賃・ローン）は次の「住宅」ステップで設定します。ここでは食費・光熱費・通信費などの生活費を入力してください。
        </div>

        <FormField
          control={form.control}
          name="monthlyLivingExpense"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-wrap items-center justify-between gap-y-1 mb-2">
                <FormLabel className="text-base font-semibold">
                  月の生活費
                </FormLabel>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24 text-right font-bold text-amber-600"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    min={0}
                    max={200}
                  />
                  <span className="text-sm text-muted-foreground">万円 / 月</span>
                </div>
              </div>
              <FormControl>
                <Slider
                  min={5}
                  max={80}
                  step={1}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                  className="mb-2"
                />
              </FormControl>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5万円</span>
                <span>80万円</span>
              </div>
              <FormDescription>
                食費・光熱費・通信費・交際費など（住居費を除く）
                <br />
                年間では{(field.value * 12).toLocaleString("ja-JP")}万円になります
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {housingType === "rent" && (
          <FormField
            control={form.control}
            name="monthlyRent"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-wrap items-center justify-between gap-y-1 mb-2">
                  <FormLabel className="text-base font-semibold">
                    月額家賃
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground">万円 / 月</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={3}
                    max={50}
                    step={0.5}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>3万円</span>
                  <span>50万円</span>
                </div>
                <FormDescription>
                  管理費・共益費を含む月額賃料
                  <br />
                  年間では{(field.value * 12).toLocaleString("ja-JP")}万円になります
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Inflation rate */}
        <FormField
          control={form.control}
          name="inflationRate"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-wrap items-center justify-between gap-y-1 mb-2">
                <FormLabel className="text-base font-semibold">物価上昇率（インフレ率）</FormLabel>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-amber-600">{field.value.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">% / 年</span>
                </div>
              </div>
              <FormControl>
                <Slider
                  min={0} max={5} step={0.1}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                  className="mb-2"
                />
              </FormControl>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>0%（固定）</span>
                <span className="text-center">1.5%（標準）</span>
                <span>5%（高め）</span>
              </div>
              <p className="text-xs text-muted-foreground">
                生活費・家賃がこの割合で毎年上昇します。日銀目標は2%、直近の実績は2〜3%程度です。
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Summary card */}
        <div className="rounded-xl bg-slate-50 border border-border p-4">
          <div className="text-sm font-semibold text-muted-foreground mb-3">
            年間支出の概算
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>生活費</span>
              <span className="font-semibold">
                {(form.watch("monthlyLivingExpense") * 12).toLocaleString(
                  "ja-JP"
                )}
                万円
              </span>
            </div>
            {housingType === "rent" && (
              <div className="flex justify-between">
                <span>家賃</span>
                <span className="font-semibold">
                  {(form.watch("monthlyRent") * 12).toLocaleString("ja-JP")}万円
                </span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>合計</span>
              <span className="text-amber-600">
                {(
                  form.watch("monthlyLivingExpense") * 12 +
                  (housingType === "rent"
                    ? form.watch("monthlyRent") * 12
                    : 0)
                ).toLocaleString("ja-JP")}
                万円 / 年
              </span>
            </div>
          </div>
        </div>

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
