import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { NumberInput, normalizeNumericText, parseLenientNumber } from "../number-input";
import { useStoreSync } from "@/components/simulator/steps/useStoreSync";
import { useSimulationStore } from "@/store/simulationStore";

describe("normalizeNumericText / parseLenientNumber (SHIG 50)", () => {
  it("normalizes full-width digits, separators and minus signs", () => {
    expect(normalizeNumericText("１，２３４．５")).toBe("1234.5");
    expect(normalizeNumericText(" 1 000 ")).toBe("1000");
    expect(normalizeNumericText("ー3")).toBe("-3");
  });
  it("distinguishes empty, invalid and numeric text", () => {
    expect(parseLenientNumber("")).toBeNull();
    expect(Number.isNaN(parseLenientNumber("1.2.3"))).toBe(true);
    expect(parseLenientNumber(".5")).toBe(0.5);
    expect(parseLenientNumber("10.")).toBe(10);
  });
});

describe("NumberInput", () => {
  it("clamps below the minimum and explains it", async () => {
    const onValueChange = vi.fn();
    render(<NumberInput label="返済期間" value={35} onValueChange={onValueChange} min={5} max={50} unit="年" />);
    const field = screen.getByRole("textbox", { name: "返済期間" });
    await act(async () => { fireEvent.change(field, { target: { value: "2" } }); });
    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(screen.getByText("5年以上で入力してください（5年で計算します）")).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });

  it("drops an abandoned non-number on blur but keeps a range notice", async () => {
    render(<NumberInput label="x" value={3} onValueChange={() => {}} max={10} />);
    const field = screen.getByRole("textbox", { name: "x" }) as HTMLInputElement;
    await act(async () => { fireEvent.change(field, { target: { value: "a" } }); });
    await act(async () => { fireEvent.blur(field); });
    expect(screen.queryByText("数字で入力してください")).toBeNull();
    expect(field.value).toBe("3");
    await act(async () => { fireEvent.change(field, { target: { value: "99" } }); });
    await act(async () => { fireEvent.blur(field); });
    expect(screen.getByText(/10までで入力してください/)).toBeTruthy();
  });
});

describe("useStoreSync", () => {
  it("skips the store while toPatch returns null", async () => {
    const before = useSimulationStore.getState().input;
    const { result } = renderHook(() => {
      const form = useForm<{ a: number }>({ defaultValues: { a: 1 } });
      useStoreSync(form, () => null);
      return form;
    });
    await act(async () => { result.current.setValue("a", 2); });
    expect(useSimulationStore.getState().input).toBe(before);
  });
});
