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
import { Separator } from "@/components/ui/separator";
import { NISA_PRODUCTS, IDECO_PRODUCTS, type InvestmentProduct } from "@/lib/simulation/types";
import { MoneyForwardImportDialog } from "@/components/simulator/import/MoneyForwardImportDialog";

const RISK_LABEL: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};
const RISK_COLOR: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

function ProductPicker({
  products,
  selectedId,
  onSelect,
}: {
  products: InvestmentProduct[];
  selectedId: string;
  onSelect: (product: InvestmentProduct) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {products.map((p) => {
        const isSelected = selectedId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className={`text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
              isSelected
                ? "border-amber-500 bg-amber-50"
                : "border-border bg-white hover:border-amber-300 hover:bg-amber-50/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 w-3 h-3 rounded-full border-2 ${
                    isSelected ? "border-amber-500 bg-amber-500" : "border-muted-foreground"
                  }`}
                />
                <span className="font-semibold text-sm truncate">{p.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${RISK_COLOR[p.riskLevel]}`}
                >
                  リスク{RISK_LABEL[p.riskLevel]}
                </span>
                <span className="font-bold text-amber-600 text-sm whitespace-nowrap">
                  {p.expectedReturn}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-5">{p.description}</p>
          </button>
        );
      })}
    </div>
  );
}

const schema = z.object({
  currentSavings: z.number().min(0).max(100000),
  currentInvestmentAssets: z.number().min(0).max(100000),
  monthlyInvestment: z.number().min(0).max(100),
  investmentReturnRate: z.number().min(0).max(30),
  nisaAccumulationMonthly: z.number().min(0).max(10),
  nisaGrowthMonthly: z.number().min(0).max(20),
  nisaProductId: z.string(),
  nisaReturnRate: z.number().min(0).max(30),
  monthlyIdeco: z.number().min(0).max(6.8),
  idecoProductId: z.string(),
  idecoReturnRate: z.number().min(0).max(30),
  shokiboKigyoMonthly: z.number().min(0).max(7),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onNext: () => void;
}

export function InvestmentStep({ onNext }: Props) {
  const { input, updateInput } = useSimulationStore();

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      currentSavings: input.currentSavings ?? 200,
      currentInvestmentAssets: input.currentInvestmentAssets ?? 50,
      monthlyInvestment: input.monthlyInvestment ?? 3,
      investmentReturnRate: input.investmentReturnRate ?? 5,
      nisaAccumulationMonthly: input.nisaAccumulationMonthly ?? 5,
      nisaGrowthMonthly: input.nisaGrowthMonthly ?? 0,
      nisaProductId: input.nisaProductId ?? "allworld",
      nisaReturnRate: input.nisaReturnRate ?? 6.5,
      monthlyIdeco: input.monthlyIdeco ?? 1.2,
      idecoProductId: input.idecoProductId ?? "allworld",
      idecoReturnRate: input.idecoReturnRate ?? 6.5,
      shokiboKigyoMonthly: input.shokiboKigyoMonthly ?? 0,
    },
  });

  const nisaAccumulationMonthly = form.watch("nisaAccumulationMonthly");
  const nisaGrowthMonthly = form.watch("nisaGrowthMonthly");
  const nisaProductId = form.watch("nisaProductId");
  const monthlyIdeco = form.watch("monthlyIdeco");
  const idecoProductId = form.watch("idecoProductId");
  const monthlyInvestment = form.watch("monthlyInvestment");
  const shokiboKigyoMonthly = form.watch("shokiboKigyoMonthly");

  const totalMonthly =
    monthlyInvestment + nisaAccumulationMonthly + nisaGrowthMonthly + monthlyIdeco + shokiboKigyoMonthly;

  function handleNisaProductSelect(product: InvestmentProduct) {
    form.setValue("nisaProductId", product.id);
    form.setValue("nisaReturnRate", product.expectedReturn);
  }

  function handleIdecoProductSelect(product: InvestmentProduct) {
    form.setValue("idecoProductId", product.id);
    form.setValue("idecoReturnRate", product.expectedReturn);
  }

  function onSubmit(values: FormValues) {
    updateInput(values);
    onNext();
  }

  function handleMFApply(deposit: number, investment: number) {
    form.setValue("currentSavings", deposit);
    form.setValue("currentInvestmentAssets", investment);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── マネーフォワード連携バナー ── */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm text-blue-800">マネーフォワード ME CSV 連携</p>
            <p className="text-xs text-blue-700 mt-0.5">
              マネーフォワード MEの資産CSVをインポートすると、預貯金・投資資産を自動入力します。口座ごとに振り分けを確認できます。
            </p>
          </div>
          <MoneyForwardImportDialog onApply={handleMFApply} />
        </div>

        {/* Current assets */}
        <div className="space-y-6">
          <h2 className="font-semibold text-foreground">現在の資産状況</h2>

          <FormField
            control={form.control}
            name="currentSavings"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">現在の貯蓄額</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-28 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0}
                    />
                    <span className="text-sm text-muted-foreground">万円</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={5000} step={50}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span><span>5,000万円</span>
                </div>
                <FormDescription>現金・預貯金の合計</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currentInvestmentAssets"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">現在の投資資産</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-28 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0}
                    />
                    <span className="text-sm text-muted-foreground">万円</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={5000} step={50}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span><span>5,000万円</span>
                </div>
                <FormDescription>株式・投資信託・ETFなどの時価評価額</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* NISA section */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">NISA（非課税投資）</h2>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">非課税</span>
          </div>

          {/* Product picker */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">投資商品を選択</p>
            <ProductPicker
              products={NISA_PRODUCTS}
              selectedId={nisaProductId}
              onSelect={handleNisaProductSelect}
            />
          </div>

          {/* つみたて枠 */}
          <FormField
            control={form.control}
            name="nisaAccumulationMonthly"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <FormLabel className="text-base font-semibold">積立投資枠</FormLabel>
                    <span className="ml-2 text-xs text-muted-foreground">年120万円上限</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={10} step={0.5}
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
                  <span>0万円</span><span>10万円（年120万）</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 成長投資枠 */}
          <FormField
            control={form.control}
            name="nisaGrowthMonthly"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <FormLabel className="text-base font-semibold">成長投資枠</FormLabel>
                    <span className="ml-2 text-xs text-muted-foreground">年240万円上限</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={20} step={0.5}
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
                  <span>0万円</span><span>20万円（年240万）</span>
                </div>
                <FormDescription>
                  積立枠と合算で年360万円・生涯1,800万円の非課税枠
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* iDeCo section */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">iDeCo（個人型確定拠出年金）</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">所得控除</span>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">投資商品を選択</p>
            <ProductPicker
              products={IDECO_PRODUCTS}
              selectedId={idecoProductId}
              onSelect={handleIdecoProductSelect}
            />
          </div>

          <FormField
            control={form.control}
            name="monthlyIdeco"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">iDeCo月額</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={6.8} step={0.1}
                    />
                    <span className="text-sm text-muted-foreground">万円 / 月</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={6.8} step={0.1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(Math.round(v * 10) / 10)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span><span>6.8万円（会社員上限）</span>
                </div>
                <FormDescription>
                  掛金全額が所得控除。60歳まで引き出し不可
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* 小規模企業共済 */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">小規模企業共済</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">所得控除</span>
          </div>
          <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2.5 text-sm text-purple-800">
            <p className="font-medium mb-0.5">個人事業主・中小企業の経営者向け</p>
            <p className="text-xs text-purple-700">掛金全額が所得控除（年84万円まで）。共済金は退職所得として受取可能。想定利回り約1%。</p>
          </div>

          <FormField
            control={form.control}
            name="shokiboKigyoMonthly"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">月額掛金</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={7} step={0.1}
                    />
                    <span className="text-sm text-muted-foreground">万円 / 月</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={7} step={0.1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(Math.round(v * 10) / 10)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span><span>7万円（月額上限）</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* General investment */}
        <div className="space-y-5">
          <h2 className="font-semibold text-foreground">一般投資</h2>

          <FormField
            control={form.control}
            name="monthlyInvestment"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">月の投資額</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} step={0.5}
                    />
                    <span className="text-sm text-muted-foreground">万円 / 月</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={50} step={0.5}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0万円</span><span>50万円</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="investmentReturnRate"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="text-base font-semibold">一般投資の期待利回り</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 text-right font-bold text-amber-600"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      min={0} max={30} step={0.1}
                    />
                    <span className="text-sm text-muted-foreground">% / 年</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={0} max={15} step={0.1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="mb-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span><span>15%</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Summary card */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-sm font-semibold text-amber-800 mb-3">月次投資サマリー</div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">NISA積立枠</span>
              <span className="font-semibold">{nisaAccumulationMonthly.toFixed(1)}万円</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">NISA成長枠</span>
              <span className="font-semibold">{nisaGrowthMonthly.toFixed(1)}万円</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">iDeCo</span>
              <span className="font-semibold">{monthlyIdeco.toFixed(1)}万円</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">小規模企業共済</span>
              <span className="font-semibold">{shokiboKigyoMonthly.toFixed(1)}万円</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">一般投資</span>
              <span className="font-semibold">{monthlyInvestment.toFixed(1)}万円</span>
            </div>
            <div className="border-t border-amber-300 pt-1.5 mt-1 flex justify-between font-bold">
              <span>月次合計</span>
              <span className="text-amber-600">{totalMonthly.toFixed(1)}万円 / 月</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>年間合計</span>
              <span>{(totalMonthly * 12).toFixed(1)}万円 / 年</span>
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
