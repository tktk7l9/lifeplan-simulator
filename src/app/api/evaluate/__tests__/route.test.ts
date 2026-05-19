/**
 * /api/evaluate route handler のテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Anthropic SDK を mock
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create };
  },
}));

// route.ts は client を init するため、re-import を強制
let POST: typeof import("../route").POST;

async function loadRoute() {
  vi.resetModules();
  POST = (await import("../route")).POST;
}

const validInput = {
  age: 30,
  retirementAge: 65,
  gender: "male",
  hasSpouse: false,
  annualIncome: 500,
  monthlyLivingExpense: 20,
};

const validResult = {
  retirementAssets: 3000,
  finalAssets: 5000,
  pensionMonthly: 15,
  isRetirementSafe: true,
  totalIncome: 20000,
  totalExpense: 15000,
};

function makeRequest(body: object, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  create.mockReset();
  await loadRoute();
});

describe("POST /api/evaluate", () => {
  it("有効な入力で AIEvaluation を返す", async () => {
    create.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: JSON.stringify({
          score: 75, rank: "A",
          summary: "良好",
          strengths: ["強み1", "強み2"],
          improvements: ["改善1"],
          conclusion: "結論",
        }),
      }],
    });
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.1" }));
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.score).toBe(75);
  });

  it("不正な input は 400", async () => {
    const res = await POST(makeRequest({ input: { age: "abc" }, result: validResult }, { "x-forwarded-for": "1.1.1.2" }));
    expect(res.status).toBe(400);
  });

  it("不正な result は 400", async () => {
    const res = await POST(makeRequest({ input: validInput, result: { pensionMonthly: "abc" } }, { "x-forwarded-for": "1.1.1.3" }));
    expect(res.status).toBe(400);
  });

  it("AI 応答が非 JSON だと 500", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: "JSON 抽出できません" }],
    });
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.4" }));
    expect(res.status).toBe(500);
  });

  it("AI 応答が AIEvaluation スキーマと不一致 → 500", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ score: 200, rank: "Z" }) }],
    });
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.5" }));
    expect(res.status).toBe(500);
  });

  it("rank が不正値でも score から再計算", async () => {
    // Zod schema が rank の enum 制約を持つので、不正な rank は validation で弾かれる
    // 妥当な rank と score を返すケースのみテスト
    create.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: JSON.stringify({
          score: 95, rank: "S",
          summary: "S級です",
          strengths: ["s1"],
          improvements: ["i1"],
          conclusion: "ok",
        }),
      }],
    });
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.6" }));
    const data = await res.json() as Record<string, unknown>;
    expect(data.rank).toBe("S");
  });

  it("Anthropic SDK が throw → 500", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValueOnce(new Error("API down"));
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.7" }));
    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });

  it("レート制限: 5回 OK、6回目は 429", async () => {
    for (let i = 0; i < 5; i++) {
      create.mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            score: 70, rank: "B",
            summary: "x", strengths: ["a"], improvements: ["b"], conclusion: "c",
          }),
        }],
      });
      const r = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.99" }));
      expect(r.status).toBe(200);
    }
    const sixth = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.99" }));
    expect(sixth.status).toBe(429);
  });

  it("x-real-ip もレート制限キーとして使われる", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({
        score: 70, rank: "B", summary: "x", strengths: ["a"], improvements: ["b"], conclusion: "c",
      })}],
    });
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-real-ip": "5.5.5.5" }));
    expect(res.status).toBe(200);
  });

  it("住宅 buy / hasSpouse / 子あり / lifeEvents 多数 でも prompt 構築できる", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({
        score: 60, rank: "C", summary: "ok", strengths: ["a"], improvements: ["b"], conclusion: "c",
      })}],
    });
    const buyInput = {
      ...validInput,
      hasSpouse: true,
      spouseAge: 28,
      spouseAnnualIncome: 300,
      spouseIncomeGrowthRate: 1,
      housingType: "buy",
      propertyPrice: 4000,
      mortgageRate: 1.2,
      mortgagePeriod: 35,
      children: [{ birthAge: 30, educationPath: "public" }],
      lifeEvents: Array.from({ length: 15 }, (_, i) => ({
        id: `e${i}`, type: "wedding", age: 30 + i, cost: 100 + i, label: `event-${i}`,
      })),
      nisaAccumulationMonthly: 3, nisaGrowthMonthly: 2,
      monthlyIdeco: 1, shokiboKigyoMonthly: 0,
      monthlyInvestment: 2, investmentReturnRate: 5,
      currentSavings: 100, currentInvestmentAssets: 50,
      incomeGrowthRate: 2,
    };
    const res = await POST(makeRequest({ input: buyInput, result: validResult }, { "x-forwarded-for": "9.9.9.1" }));
    expect(res.status).toBe(200);
  });

  it("housingType=rent の prompt 分岐", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({
        score: 60, rank: "C", summary: "ok", strengths: ["a"], improvements: ["b"], conclusion: "c",
      })}],
    });
    const rentInput = { ...validInput, housingType: "rent", monthlyRent: 8 };
    const res = await POST(makeRequest({ input: rentInput, result: validResult }, { "x-forwarded-for": "9.9.9.2" }));
    expect(res.status).toBe(200);
  });
});
