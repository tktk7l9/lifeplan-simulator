/**
 * The code-splitting helpers that keep zod and the later steps out of the first paint:
 * lazyResolver / loadStepSchemas (form validation) and lazyStep (step components).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import type { FieldValues, ResolverOptions } from "react-hook-form";
import { lazyResolver, loadStepSchemas } from "../steps/lazy-resolver";
import { lazyStep, type StepProps } from "../steps/lazy-step";

const options = { fields: {}, shouldUseNativeValidation: false } as ResolverOptions<FieldValues>;

afterEach(() => {
  vi.doUnmock("../steps/schemas");
  vi.resetModules();
});

describe("lazyResolver", () => {
  it("validates with the step's schema once it has loaded it", async () => {
    const resolver = lazyResolver("expense");
    const ok = await resolver({ monthlyLivingExpense: 20, inflationRate: 1.5 }, undefined, options);
    expect(ok.errors).toEqual({});
    expect(ok.values).toEqual({ monthlyLivingExpense: 20, inflationRate: 1.5 });

    const bad = await resolver({ monthlyLivingExpense: 500, inflationRate: 1.5 }, undefined, options);
    expect(bad.values).toEqual({});
    // Same Japanese messages as before (zod-ja).
    expect(String(bad.errors.monthlyLivingExpense?.message)).toMatch(/[぀-ヿ一-鿿]/);
  });

  it("keeps BasicInfoStep's own age rule", async () => {
    const resolver = lazyResolver("basicInfo");
    const result = await resolver(
      {
        birthDate: "1900-01-01",
        retirementAge: 65,
        gender: "male",
        hasSpouse: false,
        spouseRetirementAge: 65,
        childrenCount: 0,
        children: [],
      },
      undefined,
      options,
    );
    expect(result.errors.birthDate?.message).toBe("18〜80歳の範囲で選んでください");
  });

  it("loads the schemas once and shares the import", () => {
    expect(loadStepSchemas()).toBe(loadStepSchemas());
  });

  it("forgets a failed load so the next validation tries again", async () => {
    vi.resetModules();
    vi.doMock("../steps/schemas", () => {
      throw new Error("offline");
    });
    const fresh = await import("../steps/lazy-resolver");
    await expect(fresh.loadStepSchemas()).rejects.toThrow();

    vi.doUnmock("../steps/schemas");
    const { resolvers } = await fresh.loadStepSchemas();
    expect(Object.keys(resolvers)).toContain("expense");
  });
});

function Counter({ onNext }: StepProps) {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => (n === 2 ? onNext() : setN(n + 1))}>
      count {n}
    </button>
  );
}

describe("lazyStep", () => {
  it("shows its own loading state until the step's code arrives, then the step", async () => {
    let resolve!: (c: typeof Counter) => void;
    const Step = lazyStep(() => new Promise((r) => (resolve = r)));
    render(<Step onNext={() => {}} />);
    expect(screen.getByText("読み込み中…")).toBeTruthy();
    await act(async () => resolve(Counter));
    expect(await screen.findByText("count 0")).toBeTruthy();
    expect(screen.queryByText("読み込み中…")).toBeNull();
  });

  it("renders without a loading state once preloaded", async () => {
    const load = vi.fn(async () => Counter);
    const Step = lazyStep(load);
    await Step.preload();
    await Step.preload();
    expect(load).toHaveBeenCalledTimes(1);
    render(<Step onNext={() => {}} />);
    expect(screen.queryByText("読み込み中…")).toBeNull();
    expect(screen.getByText("count 0")).toBeTruthy();
  });

  it("keeps the step mounted (and its state) when the parent re-renders after loading", async () => {
    let resolve!: (c: typeof Counter) => void;
    const Step = lazyStep(() => new Promise((r) => (resolve = r)));
    const onNext = vi.fn();
    function Parent({ tick }: { tick: number }) {
      return (
        <>
          <span>tick {tick}</span>
          <Step onNext={onNext} />
        </>
      );
    }
    const { rerender } = render(<Parent tick={0} />);
    await act(async () => resolve(Counter));
    fireEvent.click(await screen.findByText("count 0"));
    rerender(<Parent tick={1} />);
    expect(screen.getByText("count 1")).toBeTruthy();
    fireEvent.click(screen.getByText("count 1"));
    fireEvent.click(screen.getByText("count 2"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed preload", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(Counter);
    const Step = lazyStep(load);
    await expect(Step.preload()).rejects.toThrow("offline");
    await expect(Step.preload()).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
