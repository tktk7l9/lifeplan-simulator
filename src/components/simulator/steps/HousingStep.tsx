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
import { cn } from "@/lib/utils";

const schema = z.object({
  housingType: z.enum(["rent", "buy", "own"]),
  purchaseAge: z.number().min(18).max(80),
  propertyPrice: z.number().min(0).max(100000),
  downPayment: z.number().min(0).max(50000),
  mortgageRate: z.number().min(0).max(10),
  mortgagePeriod: z.number().min(5).max(50),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onNext: () => void;
}

const HOUSING_OPTIONS = [
  {
    value: "rent" as const,
    label: "賃貸",
    icon: "🏢",
    description: "ずっと借り続ける",
  },
  {
    value: "buy" as const,
    label: "購入",
    icon: "🏡",
    description: "住宅ローンで購入",
  },
  {
    value: "own" as const,
    label: "持ち家あり",
    icon: "🏠",
    description: "すでに所有している",
  },
];

// Monthly mortgage payment
function calcPMT(
  principal: number,
  annualRate: number,
  periodYears: number
): number {
  if (annualRate === 0) return principal / (periodYears * 12);
  const r = annualRate / 100 / 12;
  const n = periodYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function HousingStep({ onNext }: Props) {
  const { input, updateInput } = useSimulationStore();

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      housingType: input.housingType ?? "rent",
      purchaseAge: input.purchaseAge ?? 35,
      propertyPrice: input.propertyPrice ?? 4000,
      downPayment: input.downPayment ?? 400,
      mortgageRate: input.mortgageRate ?? 1.0,
      mortgagePeriod: input.mortgagePeriod ?? 35,
    },
  });

  const housingType = form.watch("housingType");
  const propertyPrice = form.watch("propertyPrice");
  const downPayment = form.watch("downPayment");
  const mortgageRate = form.watch("mortgageRate");
  const mortgagePeriod = form.watch("mortgagePeriod");

  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const monthlyPayment =
    housingType === "buy" && loanAmount > 0
      ? calcPMT(loanAmount, mortgageRate, mortgagePeriod)
      : 0;

  function onSubmit(values: FormValues) {
    updateInput(values);
    onNext();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Housing type selection */}
        <FormField
          control={form.control}
          name="housingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">
                住居タイプ
              </FormLabel>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {HOUSING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-medium text-sm transition-all duration-150",
                      field.value === opt.value
                        ? "border-amber-600 bg-amber-50 text-amber-700"
                        : "border-border text-muted-foreground hover:border-amber-300"
                    )}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-bold">{opt.label}</span>
                    <span className="text-xs text-center">{opt.description}</span>
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Buy-specific fields */}
        {housingType === "buy" && (
          <>
            <FormField
              control={form.control}
              name="purchaseAge"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="text-base font-semibold">
                      購入予定年齢
                    </FormLabel>
                    <span className="text-2xl font-bold text-amber-600">
                      {field.value}歳
                    </span>
                  </div>
                  <FormControl>
                    <Slider
                      min={20}
                      max={70}
                      step={1}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      className="mb-2"
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>20歳</span>
                    <span>70歳</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="propertyPrice"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="text-base font-semibold">
                      物件価格
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-28 text-right font-bold text-amber-600"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min={0}
                        max={100000}
                      />
                      <span className="text-sm text-muted-foreground">万円</span>
                    </div>
                  </div>
                  <FormControl>
                    <Slider
                      min={500}
                      max={20000}
                      step={100}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      className="mb-2"
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>500万円</span>
                    <span>2億円</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="downPayment"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="text-base font-semibold">
                      頭金
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-28 text-right font-bold text-amber-600"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min={0}
                        max={propertyPrice}
                      />
                      <span className="text-sm text-muted-foreground">万円</span>
                    </div>
                  </div>
                  <FormControl>
                    <Slider
                      min={0}
                      max={Math.max(0, propertyPrice)}
                      step={50}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      className="mb-2"
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0万円</span>
                    <span>{propertyPrice.toLocaleString("ja-JP")}万円</span>
                  </div>
                  <FormDescription>
                    借入額: {loanAmount.toLocaleString("ja-JP")}万円（
                    {propertyPrice > 0
                      ? Math.round((loanAmount / propertyPrice) * 100)
                      : 0}
                    %）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mortgageRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      金利
                    </FormLabel>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        className="font-bold text-amber-600"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min={0}
                        max={10}
                        step={0.01}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">% / 年</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mortgagePeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      返済期間
                    </FormLabel>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        className="font-bold text-amber-600"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min={5}
                        max={50}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">年</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mortgage summary */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div className="text-sm font-semibold text-amber-700 mb-3">
                ローンシミュレーション
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">月々の返済額</div>
                  <div className="text-xl font-bold text-amber-600">
                    {monthlyPayment > 0
                      ? `${Math.round(monthlyPayment).toLocaleString("ja-JP")}万円`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">総返済額</div>
                  <div className="text-xl font-bold text-amber-600">
                    {monthlyPayment > 0
                      ? `${Math.round(monthlyPayment * mortgagePeriod * 12).toLocaleString("ja-JP")}万円`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">うち利息</div>
                  <div className="font-semibold">
                    {monthlyPayment > 0
                      ? `${Math.round(
                          monthlyPayment * mortgagePeriod * 12 - loanAmount
                        ).toLocaleString("ja-JP")}万円`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">借入額</div>
                  <div className="font-semibold">
                    {loanAmount.toLocaleString("ja-JP")}万円
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {housingType === "rent" && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
            家賃は前のステップ「支出」で設定した内容が使用されます。
          </div>
        )}

        {housingType === "own" && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">
            持ち家の場合、年間20万円程度の維持費（修繕費・固定資産税など）が計上されます。
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
