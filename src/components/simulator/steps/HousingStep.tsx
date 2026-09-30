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
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useStoreSync } from "./useStoreSync";

const schema = z.object({
  housingType: z.enum(["rent", "buy", "own"]),
  monthlyRent: z.number().min(0).max(100),
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
      monthlyRent: input.monthlyRent ?? 10,
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

  useStoreSync(form, (values) => values);

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
              <FormLabel className="text-base font-semibold" id="housing-type-label">
                住居タイプ
              </FormLabel>
              <div role="radiogroup" aria-labelledby="housing-type-label" className="grid grid-cols-3 gap-3 mt-2">
                {HOUSING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === opt.value}
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-medium text-sm transition-all duration-150",
                      field.value === opt.value
                        ? "border-amber-600 bg-amber-50 text-amber-700"
                        : "border-border text-muted-foreground hover:border-amber-300"
                    )}
                  >
                    <span className="text-2xl" aria-hidden="true">{opt.icon}</span>
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
                  <div className="flex flex-wrap items-center justify-between gap-y-1 mb-2">
                    <FormLabel className="text-base font-semibold">
                      購入予定年齢
                    </FormLabel>
                    <span className="text-2xl font-bold text-amber-700">
                      {field.value}歳
                    </span>
                  </div>
                  <FormControl>
                    <Slider thumbLabel="購入予定年齢"
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
                  <div className="flex flex-wrap items-center justify-between gap-y-1 mb-2">
                    <FormLabel className="text-base font-semibold">
                      物件価格
                    </FormLabel>
                    <NumberInput
                      label="物件価格"
                      value={field.value}
                      onValueChange={field.onChange}
                      min={0}
                      max={100000}
                      unit="万円"
                      className="w-28"
                    />
                  </div>
                  <FormControl>
                    <Slider thumbLabel="物件価格"
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
                  <div className="flex flex-wrap items-center justify-between gap-y-1 mb-2">
                    <FormLabel className="text-base font-semibold">
                      頭金
                    </FormLabel>
                    <NumberInput
                      label="頭金"
                      value={field.value}
                      onValueChange={field.onChange}
                      min={0}
                      max={propertyPrice}
                      unit="万円"
                      className="w-28"
                    />
                  </div>
                  <FormControl>
                    <Slider thumbLabel="頭金"
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
                    <NumberInput
                      label="金利"
                      value={field.value}
                      onValueChange={field.onChange}
                      min={0}
                      max={10}
                      unit="% / 年"
                      className="w-24"
                      wrapperClassName="mt-2"
                    />
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
                    <NumberInput
                      label="返済期間"
                      value={field.value}
                      onValueChange={field.onChange}
                      min={5}
                      max={50}
                      unit="年"
                      className="w-24"
                      wrapperClassName="mt-2"
                    />
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
                  <div className="text-xl font-bold text-amber-700">
                    {monthlyPayment > 0
                      ? `${Math.round(monthlyPayment).toLocaleString("ja-JP")}万円`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">総返済額</div>
                  <div className="text-xl font-bold text-amber-700">
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

        {/* Rent is asked here, right after choosing 賃貸 (SHIG 40, 32) */}
        {housingType === "rent" && (
          <FormField
            control={form.control}
            name="monthlyRent"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-wrap items-center justify-between gap-y-1 mb-2">
                  <FormLabel className="text-base font-semibold">月額家賃</FormLabel>
                  <NumberInput
                    label="月額家賃"
                    value={field.value}
                    onValueChange={field.onChange}
                    min={0}
                    max={100}
                    unit="万円 / 月"
                    className="w-24"
                  />
                </div>
                <FormControl>
                  <Slider
                    thumbLabel="月額家賃"
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
                  管理費・共益費を含む月額賃料。年間では{(field.value * 12).toLocaleString("ja-JP")}万円になります
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {housingType === "own" && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">
            持ち家の場合、年間20万円程度の維持費（修繕費・固定資産税など）が計上されます。
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
