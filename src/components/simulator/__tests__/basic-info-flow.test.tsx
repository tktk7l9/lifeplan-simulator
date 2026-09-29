/**
 * BasicInfoStep: the family-composition flow a user goes through first.
 * Assertions are on what the user sees and on what reaches the store.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { BasicInfoStep } from "../steps/BasicInfoStep";
import { useSimulationStore } from "@/store/simulationStore";

beforeEach(() => {
  localStorage.clear();
  useSimulationStore.setState({
    currentStep: 0,
    input: useSimulationStore.getInitialState().input,
    result: null,
    isCalculating: false,
    savedSimulations: [],
    aiEvaluation: null,
  });
});

const store = () => useSimulationStore.getState().input;

/** Presses a key one render at a time, as a person would (controlled sliders re-render in between). */
async function pressKey(el: HTMLElement, key: string, times = 1) {
  for (let i = 0; i < times; i++) {
    await act(async () => { fireEvent.keyDown(el, { key }); });
  }
}

describe("children", () => {
  it("choosing a count shows one panel per child, and lowering it removes the extra panels", async () => {
    render(<BasicInfoStep onNext={() => {}} />);
    const count = screen.getByRole("radiogroup", { name: "子どもの数" });

    await act(async () => { fireEvent.click(within(count).getByRole("radio", { name: "3" })); });
    expect(within(count).getByRole("radio", { name: "3" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("第3子")).toBeTruthy();
    await waitFor(() => expect(store().children).toHaveLength(3));

    await act(async () => { fireEvent.click(within(count).getByRole("radio", { name: "1" })); });
    expect(screen.getByText("第1子")).toBeTruthy();
    expect(screen.queryByText("第2子")).toBeNull();
    await waitFor(() => expect(store().children).toHaveLength(1));

    await act(async () => { fireEvent.click(within(count).getByRole("radio", { name: "0" })); });
    expect(screen.queryByText("第1子")).toBeNull();
    await waitFor(() => expect(store().children).toHaveLength(0));
  });

  it("each child's parent age can be adjusted with the keyboard and is kept on submit", async () => {
    const onNext = vi.fn();
    render(<BasicInfoStep onNext={onNext} />);
    await act(async () => {
      fireEvent.click(within(screen.getByRole("radiogroup", { name: "子どもの数" })).getByRole("radio", { name: "2" }));
    });
    const second = screen.getByRole("slider", { name: "第2子: 生まれた時の親の年齢" });
    await pressKey(second, "ArrowRight", 3);
    expect(second.getAttribute("aria-valuenow")).toBe("33");

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "次へ進む" })); });
    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(store().children?.map((c) => c.birthAge)).toEqual([30, 33]);
  });

  it("the education policy of each child is a labelled combobox", () => {
    useSimulationStore.setState({
      input: { ...store(), children: [{ id: "c1", birthAge: 30, educationPath: "private" }] },
    });
    render(<BasicInfoStep onNext={() => {}} />);
    const policy = screen.getByRole("combobox", { name: "教育方針" });
    expect(policy.textContent).toContain("私立中心");
  });
});

describe("birth year and month", () => {
  it("changing the month keeps the day inside the new month (31st -> 28th in February)", async () => {
    useSimulationStore.setState({ input: { ...store(), birthDate: "1990-01-31", age: 36 } });
    render(<BasicInfoStep onNext={() => {}} />);
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "生まれた月" }), { target: { value: "2" } });
    });
    await waitFor(() => expect(store().birthDate).toBe("1990-02-28"));
  });

  it("a stored birth year outside the selectable range is still shown, with an explanation", () => {
    const tooOld = new Date().getFullYear() - 90;
    useSimulationStore.setState({ input: { ...store(), birthDate: `${tooOld}-01-01`, age: 90 } });
    render(<BasicInfoStep onNext={() => {}} />);
    const year = screen.getByRole("combobox", { name: "生まれた年" }) as HTMLSelectElement;
    expect(year.value).toBe(String(tooOld));
    expect(screen.getByText("18〜80歳の範囲で入力")).toBeTruthy();
  });

  it("an out-of-range birth date blocks 次へ進む instead of being saved", async () => {
    const tooOld = new Date().getFullYear() - 90;
    useSimulationStore.setState({ input: { ...store(), birthDate: `${tooOld}-01-01`, age: 30 } });
    const onNext = vi.fn();
    render(<BasicInfoStep onNext={onNext} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "次へ進む" })); });
    expect(await screen.findByText("18〜80歳の範囲で選んでください")).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
    expect(store().age).toBe(30);

    // Choosing a valid year clears the message and lets the user continue
    const valid = new Date().getFullYear() - 40;
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "生まれた年" }), { target: { value: String(valid) } });
    });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "次へ進む" })); });
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("18〜80歳の範囲で選んでください")).toBeNull();
  });
});

describe("retirement ages", () => {
  it("the retirement age slider responds to arrow keys and the value is shown next to the label", async () => {
    render(<BasicInfoStep onNext={() => {}} />);
    const slider = screen.getByRole("slider", { name: "退職年齢" });
    await pressKey(slider, "ArrowLeft", 5);
    expect(slider.getAttribute("aria-valuenow")).toBe("60");
    expect(screen.getByText("60歳")).toBeTruthy();
    await waitFor(() => expect(store().retirementAge).toBe(60));
  });

  it("spouse fields appear only with a spouse, and the spouse retirement age is stored", async () => {
    render(<BasicInfoStep onNext={() => {}} />);
    expect(screen.queryByRole("slider", { name: "配偶者の退職年齢" })).toBeNull();

    const spouse = screen.getByRole("radiogroup", { name: "配偶者の有無" });
    await act(async () => { fireEvent.click(within(spouse).getByRole("radio", { name: "あり" })); });
    expect(screen.getByRole("combobox", { name: "配偶者の生まれた年" })).toBeTruthy();

    const slider = screen.getByRole("slider", { name: "配偶者の退職年齢" });
    await pressKey(slider, "End");
    expect(slider.getAttribute("aria-valuenow")).toBe("80");
    await waitFor(() => {
      expect(store().hasSpouse).toBe(true);
      expect(store().spouseRetirementAge).toBe(80);
    });

    await act(async () => { fireEvent.click(within(spouse).getByRole("radio", { name: "なし" })); });
    expect(screen.queryByRole("slider", { name: "配偶者の退職年齢" })).toBeNull();
    await waitFor(() => expect(store().spouseRetirementAge).toBe(0));
  });
});
