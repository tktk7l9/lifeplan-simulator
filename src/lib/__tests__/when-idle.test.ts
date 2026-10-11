import { afterEach, describe, expect, it, vi } from "vitest";
import { whenIdle } from "../when-idle";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("whenIdle", () => {
  it("waits for requestIdleCallback (with a timeout) and can be cancelled", () => {
    const request = vi.fn((cb: IdleRequestCallback, opts?: IdleRequestOptions) => {
      void cb;
      void opts;
      return 7;
    });
    const cancel = vi.fn();
    vi.stubGlobal("requestIdleCallback", request);
    vi.stubGlobal("cancelIdleCallback", cancel);
    const task = vi.fn();

    const stop = whenIdle(task, 1500);
    expect(request).toHaveBeenCalledWith(task, { timeout: 1500 });
    expect(task).not.toHaveBeenCalled();
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it("falls back to a short timeout where requestIdleCallback is missing (Safari)", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const task = vi.fn();

    whenIdle(task);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(task).toHaveBeenCalledTimes(1);

    const late = vi.fn();
    const stop = whenIdle(late);
    stop();
    vi.advanceTimersByTime(1000);
    expect(late).not.toHaveBeenCalled();
  });
});
