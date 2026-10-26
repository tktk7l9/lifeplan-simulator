/**
 * Guards the shape of the call /api/evaluate makes through @anthropic-ai/sdk 1.x.
 *
 * SDK 1.x sends API version 2026-10-21, which rejects `temperature`, `top_p` and `top_k`
 * with a 400 on every model, so the request must not carry them. The client options keep
 * the route's latency bound: 30 s per attempt, 2 retries.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const constructed: unknown[] = [];
vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create };
    constructor(options: unknown) {
      constructed.push(options);
    }
  },
}));

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

beforeEach(() => {
  create.mockReset();
  constructed.length = 0;
  vi.resetModules();
});

describe("Anthropic SDK usage in /api/evaluate", () => {
  it("creates the client with a 30 s timeout and 2 retries and no explicit credential", async () => {
    await import("../route");
    expect(constructed).toEqual([{ timeout: 30_000, maxRetries: 2 }]);
  });

  it("sends one user message without sampling parameters", async () => {
    create.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: JSON.stringify({
          score: 75, rank: "A", summary: "良好",
          strengths: ["強み1"], improvements: ["改善1"], conclusion: "結論",
        }),
      }],
    });
    const { POST } = await import("../route");
    const res = await POST(new Request("http://localhost/api/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.1" },
      body: JSON.stringify({ input: validInput, result: validResult }),
    }));
    expect(res.status).toBe(200);

    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(params).sort()).toEqual(["max_tokens", "messages", "model"]);
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("top_p");
    expect(params).not.toHaveProperty("top_k");
    const messages = params.messages as { role: string; content: unknown }[];
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(typeof messages[0].content).toBe("string");
  });
});
