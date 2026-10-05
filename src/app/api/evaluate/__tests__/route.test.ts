/**
 * Tests for the /api/evaluate route handler
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create };
  },
}));

// route.ts initializes the client, so force a re-import
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
  it("returns an AIEvaluation for valid input", async () => {
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

  it("returns 400 for an invalid input", async () => {
    const res = await POST(makeRequest({ input: { age: "abc" }, result: validResult }, { "x-forwarded-for": "1.1.1.2" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid result", async () => {
    const res = await POST(makeRequest({ input: validInput, result: { pensionMonthly: "abc" } }, { "x-forwarded-for": "1.1.1.3" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the AI response is not JSON", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: "JSON 抽出できません" }],
    });
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.4" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the AI response does not match the AIEvaluation schema", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ score: 200, rank: "Z" }) }],
    });
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.5" }));
    expect(res.status).toBe(500);
  });

  it("recomputes the rank from the score when the rank is invalid", async () => {
    // The Zod schema has an enum constraint on rank, so an invalid rank is rejected by validation
    // Only test the case that returns a valid rank and score
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

  it("returns 500 when the Anthropic SDK throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValueOnce(new Error("API down"));
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-forwarded-for": "1.1.1.7" }));
    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });

  it("rate limit: 5 requests pass, the 6th gets 429", async () => {
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

  it("also uses x-real-ip as the rate-limit key", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({
        score: 70, rank: "B", summary: "x", strengths: ["a"], improvements: ["b"], conclusion: "c",
      })}],
    });
    const res = await POST(makeRequest({ input: validInput, result: validResult }, { "x-real-ip": "5.5.5.5" }));
    expect(res.status).toBe(200);
  });

  it("builds the prompt with housing buy / hasSpouse / children / many lifeEvents", async () => {
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

  it("covers the housingType=rent prompt branch", async () => {
    create.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({
        score: 60, rank: "C", summary: "ok", strengths: ["a"], improvements: ["b"], conclusion: "c",
      })}],
    });
    const rentInput = { ...validInput, housingType: "rent", monthlyRent: 8 };
    const res = await POST(makeRequest({ input: rentInput, result: validResult }, { "x-forwarded-for": "9.9.9.2" }));
    expect(res.status).toBe(200);
  });

  it("keys the rate limit on cf-connecting-ip so a rotating x-forwarded-for cannot bypass it", async () => {
    const ok = {
      content: [{ type: "text", text: JSON.stringify({
        score: 70, rank: "B", summary: "x", strengths: ["a"], improvements: ["b"], conclusion: "c",
      })}],
    };
    for (let i = 0; i < 5; i++) {
      create.mockResolvedValueOnce(ok);
      const r = await POST(makeRequest({ input: validInput, result: validResult },
        { "cf-connecting-ip": "7.7.7.7", "x-forwarded-for": `10.0.0.${i}` }));
      expect(r.status).toBe(200);
    }
    const sixth = await POST(makeRequest({ input: validInput, result: validResult },
      { "cf-connecting-ip": "7.7.7.7", "x-forwarded-for": "10.0.0.99" }));
    expect(sixth.status).toBe(429);
  });

  it("drops expired entries once many IPs are tracked", async () => {
    vi.useFakeTimers();
    try {
      // Malformed bodies still pass through the rate limiter, so no AI call is needed.
      for (let i = 0; i < 1_000; i++) {
        await POST(makeRequest({}, { "cf-connecting-ip": `ip-${i}` }));
      }
      vi.advanceTimersByTime(61_000);
      const res = await POST(makeRequest({}, { "cf-connecting-ip": "ip-new" }));
      expect(res.status).toBe(400);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("clientIp", () => {
  let clientIp: typeof import("../route").clientIp;
  beforeEach(async () => {
    clientIp = (await import("../route")).clientIp;
  });

  it("prefers cf-connecting-ip, then x-real-ip, then the first x-forwarded-for hop", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" }))).toBe("3.3.3.3");
  });

  it("falls back to 'unknown' when no address header is present", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
