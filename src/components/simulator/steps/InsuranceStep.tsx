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
  lifeInsurancePremiumMonthly: z.number().min(0).max(20),
  medicalCostMonthlyAt70: z.number().min(0).max(30),
  nursingCareStartAge: z.number().min(0).max(100),
  nursingCareCostMonthly: z.number().min(0).max(50),
  corporatePensionMonthly: z.number().min(0).max(50),
  corporateDCBalance: z.number().min(0).max(5000),
  corporateDCMonthly: z.number().min(0).max(10),
  useAgeBasedSpendingCurve: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onNext: () => void;
}

export function InsuranceStep({ onNext }: Props) {
  const { input, updateInput } = useSimulationStore();

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      lifeInsurancePremiumMonthly: input.lifeInsurancePremiumMonthly ?? 0.8,
      medicalCostMonthlyAt70: input.medicalCostMonthlyAt70 ?? 1.5,
      nursingCareStartAge: input.nursingCareStartAge ?? 80,
      nursingCareCostMonthly: input.nursingCareCostMonthly ?? 0,
      corporatePensionMonthly: input.corporatePensionMonthly ?? 0,
      corporateDCBalance: input.corporateDCBalance ?? 0,
      corporateDCMonthly: input.corporateDCMonthly ?? 0,
      useAgeBasedSpendingCurve: input.useAgeBasedSpendingCurve ?? true,
    },
  });

  const nursingCareStartAge = form.watch("nursingCareStartAge");
  const nursingCareCostMonthly = form.watch("nursingCareCostMonthly");
  const useAgeBasedSpendingCurve = form.watch("useAgeBasedSpendingCurve");

  function onSubmit(values: FormValues) {
    updateInput(values);
    onNext();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* Life Insurance */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-amber-900 border-b border-amber-100 pb-2">
            🛡️ 生命保険・団信
          </h2>
          <FormField
            control={form.control}
            name="lifeInsurancePremiumMonthly"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">月額保険料</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={20} step={0.1}
                    />
                    <span className="text-sm text-muted-foreground">万円 / 月</span>
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
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span>
                  <span>5万円</span>
                </div>
                <FormDescription>
                  生命保険・医療保険等の月払い保険料（退職まで費用計上）
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Healthcare & nursing care */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-amber-900 border-b border-amber-100 pb-2">
            🏥 老後の医療・介護費
          </h2>

          <FormField
            control={form.control}
            name="medicalCostMonthlyAt70"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">70歳以降の月額医療費（追加分）</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={30} step={0.5}
                    />
                    <span className="text-sm text-muted-foreground">万円 / 月</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={10} step={0.5}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span>
                  <span>10万円</span>
                </div>
                <FormDescription>
                  70歳以降に増加する医療費の月額追加分。生活費に加算されます。
                  日本の高齢者の平均的な医療費の自己負担は月1〜3万円程度です。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nursingCareStartAge"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">介護開始年齢</FormLabel>
                  <span className="text-2xl font-bold text-amber-600">
                    {field.value === 0 ? "なし" : `${field.value}歳〜`}
                  </span>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={95} step={1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>なし（0）</span>
                  <span>95歳</span>
                </div>
                <FormDescription>
                  0に設定すると介護費用は計上しません。平均的な介護開始は80歳前後です。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {nursingCareStartAge > 0 && (
            <FormField
              control={form.control}
              name="nursingCareCostMonthly"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="text-base font-semibold">月額介護費用</FormLabel>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24 text-right font-bold text-amber-600"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min={0} max={50} step={0.5}
                      />
                      <span className="text-sm text-muted-foreground">万円 / 月</span>
                    </div>
                  </div>
                  <FormControl>
                    <Slider
                      min={0} max={30} step={0.5}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      className="mb-2"
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0万円</span>
                    <span>30万円</span>
                  </div>
                  <FormDescription>
                    在宅介護: 約5〜15万円/月、施設入居: 約10〜30万円/月が目安です。
                    <br />
                    年間では{(field.value * 12).toLocaleString("ja-JP")}万円になります。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Corporate pension & DC */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-amber-900 border-b border-amber-100 pb-2">
            🏢 企業型DC・企業年金
          </h2>

          <FormField
            control={form.control}
            name="corporateDCBalance"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">企業型DC 現在残高</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={5000} step={10}
                    />
                    <span className="text-sm text-muted-foreground">万円</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={2000} step={10}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span>
                  <span>2,000万円</span>
                </div>
                <FormDescription>
                  現在の企業型確定拠出年金（企業型DC）の残高。投資資産として運用されます。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="corporateDCMonthly"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">企業型DC 月額拠出（会社負担含む）</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={10} step={0.1}
                    />
                    <span className="text-sm text-muted-foreground">万円 / 月</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={5.5} step={0.1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span>
                  <span>5.5万円（上限）</span>
                </div>
                <FormDescription>
                  会社が拠出する掛金（マッチング拠出含む）。法定上限は月5.5万円です。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="corporatePensionMonthly"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">確定給付年金（DB）月額</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={50} step={0.5}
                    />
                    <span className="text-sm text-muted-foreground">万円 / 月</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={20} step={0.5}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span>
                  <span>20万円</span>
                </div>
                <FormDescription>
                  退職後に受け取る確定給付型企業年金の月額（DB年金・厚生年金基金など）。
                  公的年金に加算されます。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Age-based spending curve */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-amber-900 border-b border-amber-100 pb-2">
            📉 高齢期の支出カーブ
          </h2>
          <FormField
            control={form.control}
            name="useAgeBasedSpendingCurve"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-border">
                  <div>
                    <FormLabel className="text-base font-semibold">年齢別支出カーブを使用する</FormLabel>
                    <FormDescription className="mt-1">
                      ONの場合: 70代0.85倍 / 75代0.75倍 / 80代以降0.65倍（実態に近い）
                      <br />
                      OFFの場合: 全年齢で同じ生活費（保守的な見積もり）
                    </FormDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${field.value ? "bg-amber-500" : "bg-gray-300"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
                {useAgeBasedSpendingCurve && (
                  <div className="text-xs text-muted-foreground mt-2 px-1 space-y-0.5">
                    <div>• 70〜74歳: 生活費 × 0.85（外出・交際費が減少）</div>
                    <div>• 75〜79歳: 生活費 × 0.75（行動範囲縮小）</div>
                    <div>• 80歳以降: 生活費 × 0.65（在宅中心、ただし介護費は別途加算）</div>
                  </div>
                )}
              </FormItem>
            )}
          />
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-slate-50 border border-border p-4">
          <div className="text-sm font-semibold text-muted-foreground mb-3">設定内容のサマリー</div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span>生命保険料（年間）</span>
              <span className="font-semibold">{(form.watch("lifeInsurancePremiumMonthly") * 12).toLocaleString("ja-JP")}万円</span>
            </div>
            <div className="flex justify-between">
              <span>70歳以降の医療費追加（年間）</span>
              <span className="font-semibold">{(form.watch("medicalCostMonthlyAt70") * 12).toLocaleString("ja-JP")}万円</span>
            </div>
            {nursingCareStartAge > 0 && (
              <div className="flex justify-between">
                <span>介護費用（{nursingCareStartAge}歳〜、年間）</span>
                <span className="font-semibold">{(nursingCareCostMonthly * 12).toLocaleString("ja-JP")}万円</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>企業DC残高</span>
              <span className="font-semibold">{form.watch("corporateDCBalance").toLocaleString("ja-JP")}万円</span>
            </div>
            <div className="flex justify-between">
              <span>企業年金（退職後・月額）</span>
              <span className="font-semibold">{form.watch("corporatePensionMonthly").toLocaleString("ja-JP")}万円 / 月</span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-base"
        >
          次へ進む（シミュレーション実行）
        </Button>
      </form>
    </Form>
  );
}
