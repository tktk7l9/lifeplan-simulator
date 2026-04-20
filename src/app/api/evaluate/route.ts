import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AIEvaluation, AIRank } from "@/lib/simulation/types";

const client = new Anthropic({ timeout: 30_000, maxRetries: 2 });

// ── Input validation schemas ───────────────────────────────────────────────

const LifeEventSchema = z.object({
  id: z.string().max(64).optional(),
  type: z.string().max(30),
  age: z.number().min(0).max(120),
  cost: z.number().min(0).max(100_000),
  label: z.string().max(50),
});

const ChildSchema = z.object({
  id: z.string().max(64).optional(),
  birthAge: z.number().min(0).max(80),
  educationPath: z.string().max(20),
});

// Permissive schema — focuses on preventing injection, not enforcing business rules.
// Use wide ranges and .optional() to avoid rejecting valid simulator output.
const num = (max = 1_000_000) => z.number().min(-max).max(max).optional();

const SimulationInputSchema = z.object({
  age: z.number().min(0).max(150),
  retirementAge: z.number().min(0).max(150),
  gender: z.enum(["male", "female"]).optional(),
  hasSpouse: z.boolean().optional(),
  spouseAge: z.number().min(0).max(150).optional(),
  children: z.array(ChildSchema).max(10).optional(),

  employmentType: z.string().max(30).optional(),
  annualIncome: num(100_000),
  incomeGrowthRate: num(100),
  spouseAnnualIncome: num(100_000),
  spouseIncomeGrowthRate: num(100),
  spouseEmploymentType: z.string().max(30).optional(),

  monthlyLivingExpense: num(10_000),
  monthlyRent: num(10_000),
  housingType: z.string().max(10).optional(),
  propertyPrice: num(10_000_000),
  mortgageRate: num(100),
  mortgagePeriod: num(100),

  currentSavings: num(1_000_000),
  currentInvestmentAssets: num(1_000_000),
  monthlyInvestment: num(10_000),
  investmentReturnRate: num(100),
  nisaAccumulationMonthly: num(1_000),
  nisaGrowthMonthly: num(1_000),
  monthlyIdeco: num(1_000),
  shokiboKigyoMonthly: num(1_000),

  lifeEvents: z.array(LifeEventSchema).max(50).optional(),
}).passthrough();

const SimulationResultSchema = z.object({
  retirementAssets: z.number(),
  finalAssets: z.number(),
  pensionMonthly: z.number().min(0).max(1_000),
  isRetirementSafe: z.boolean(),
  totalIncome: z.number(),
  totalExpense: z.number(),
}).passthrough();

const AIEvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  rank: z.enum(["S", "A", "B", "C", "D", "F"]),
  summary: z.string().max(500),
  strengths: z.array(z.string().max(50)).min(1).max(4),
  improvements: z.array(z.string().max(50)).min(1).max(4),
  conclusion: z.string().max(300),
});

// ── Rate limiting (in-memory, per-IP, 5 req/min) ─────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// ── Prompt builder ────────────────────────────────────────────────────────

function buildPrompt(
  input: z.infer<typeof SimulationInputSchema>,
  result: z.infer<typeof SimulationResultSchema>,
): string {
  const housingTypeLabel = (input.housingType ? { rent: "賃貸", buy: "購入", own: "持ち家" }[input.housingType] : undefined) ?? "不明";
  const retirementYear = new Date().getFullYear() + (input.retirementAge - input.age);

  // Limit life events to prevent excessively large prompts
  const eventSummary = (input.lifeEvents ?? [])
    .slice(0, 10)
    .map((e) => `${String(e.label).slice(0, 20)}(${e.age}歳,${e.cost}万円)`)
    .join("、") || "なし";

  return `あなたはFP（ファイナンシャルプランナー）として、以下のライフプランシミュレーション結果を評価してください。

## 入力情報
- 現在年齢: ${input.age}歳 / 退職年齢: ${input.retirementAge}歳（${retirementYear}年）
- 性別: ${input.gender === "male" ? "男性" : "女性"}
- 配偶者: ${input.hasSpouse ? `あり（${input.spouseAge}歳）` : "なし"}
- 子どもの数: ${(input.children ?? []).length}人
- 住居形態: ${housingTypeLabel}

## 収支情報
- 年収: ${input.annualIncome}万円（年${input.incomeGrowthRate}%上昇）
${input.hasSpouse ? `- 配偶者年収: ${input.spouseAnnualIncome}万円（年${input.spouseIncomeGrowthRate}%上昇）` : ""}
- 月生活費: ${input.monthlyLivingExpense}万円
${input.housingType === "rent" ? `- 月家賃: ${input.monthlyRent}万円` : ""}
${input.housingType === "buy" ? `- 住宅購入価格: ${input.propertyPrice ?? 0}万円、金利${input.mortgageRate ?? 0}%、期間${input.mortgagePeriod ?? 0}年` : ""}
- ライフイベント: ${eventSummary}

## 資産情報
- 現在の貯蓄: ${input.currentSavings}万円
- 現在の投資資産: ${input.currentInvestmentAssets}万円
- 月投資額: ${input.monthlyInvestment}万円（利回り${input.investmentReturnRate}%）
- NISA積立枠: ${input.nisaAccumulationMonthly}万円/月 / NISA成長枠: ${input.nisaGrowthMonthly}万円/月 / iDeCo: ${input.monthlyIdeco}万円/月 / 小規模企業共済: ${input.shokiboKigyoMonthly}万円/月

## シミュレーション結果
- 退職時資産（${input.retirementAge}歳）: ${result.retirementAssets.toFixed(0)}万円
- 100歳時の資産: ${result.finalAssets.toFixed(0)}万円
- 年金月額（概算）: ${result.pensionMonthly.toFixed(1)}万円
- 老後安全度: ${result.isRetirementSafe ? "安全（100歳まで資産持続）" : "要注意（資産枯渇リスクあり）"}
- 生涯総収入: ${result.totalIncome.toFixed(0)}万円
- 生涯総支出: ${result.totalExpense.toFixed(0)}万円
- 生涯収支: ${(result.totalIncome - result.totalExpense).toFixed(0)}万円

以下のJSON形式で回答してください。JSONのみ出力し、前後に余計なテキストを含めないでください：

{
  "score": <0〜100の整数。老後の安全度・資産形成・収支バランス・リスク分散を総合評価>,
  "rank": <"S"|"A"|"B"|"C"|"D"|"F"。S=90点以上、A=80-89、B=70-79、C=60-69、D=50-59、F=49以下>,
  "summary": <全体的な総評を2〜3文で。具体的な数字を交えた日本語で>,
  "strengths": [<優れている点を2〜4個、各30字以内の日本語で>],
  "improvements": [<改善すべき点を2〜4個、各30字以内の日本語で>],
  "conclusion": <FPとしての締めくくりコメントを1〜2文で。前向きなアドバイスを含む日本語で>
}`;
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "リクエストが多すぎます。しばらく待ってからお試しください。" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const inputParsed = SimulationInputSchema.safeParse(body.input);
    const resultParsed = SimulationResultSchema.safeParse(body.result);

    if (!inputParsed.success || !resultParsed.success) {
      return Response.json({ error: "入力データが不正です。" }, { status: 400 });
    }

    const prompt = buildPrompt(inputParsed.data, resultParsed.data);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON — prefer extracting the first complete object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI response parse failed" }, { status: 500 });
    }

    // Validate AI response with Zod
    const evalParsed = AIEvaluationSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!evalParsed.success) {
      return Response.json({ error: "AI response validation failed" }, { status: 500 });
    }

    const evaluation: AIEvaluation = evalParsed.data as AIEvaluation;

    // Fallback rank if score/rank mismatch
    const validRanks: AIRank[] = ["S", "A", "B", "C", "D", "F"];
    if (!validRanks.includes(evaluation.rank)) {
      evaluation.rank = scoreToRank(evaluation.score);
    }

    return Response.json(evaluation);
  } catch (error) {
    // Log sanitized error — no stack traces in production
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`[evaluate] handler error: ${message}`);
    return Response.json({ error: "評価の取得に失敗しました" }, { status: 500 });
  }
}

function scoreToRank(score: number): AIRank {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}
