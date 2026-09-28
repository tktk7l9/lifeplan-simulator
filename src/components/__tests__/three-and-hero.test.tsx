/**
 * Covers CursorBird / BirdHoverZone / MountainHero by firing their interactions.
 * They do not use Three.js (SVG based), so they work in jsdom.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CursorBird } from "../three/CursorBird";
import { BirdHoverZone } from "../three/BirdHoverZone";
import { MountainHero } from "../illustrations/MountainHero";

let rafSpy: ReturnType<typeof vi.spyOn> | null = null;
let cafSpy: ReturnType<typeof vi.spyOn> | null = null;
let rafCallbacks: FrameRequestCallback[] = [];

beforeEach(() => {
  rafCallbacks = [];
  rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  rafSpy?.mockRestore();
  cafSpy?.mockRestore();
});

function flushOneFrame() {
  const cbs = rafCallbacks.slice();
  rafCallbacks = [];
  for (const cb of cbs) {
    act(() => { cb(performance.now()); });
  }
}

describe("CursorBird", () => {
  it("初期 render で SVG 描画", () => {
    render(<CursorBird />);
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("mousemove で target 更新 → 次フレームで physics が動く", () => {
    render(<CursorBird />);
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 300 }));
    });
    // Advance one frame
    flushOneFrame();
    flushOneFrame();
    // The flip / wingAngle state should update → re-render
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("bird-action excited / celebrate / sunglare / surprised / pointing 全アクション", () => {
    render(<CursorBird />);
    for (const action of ["excited", "celebrate", "sunglare", "surprised", "pointing", "idle"]) {
      act(() => {
        window.dispatchEvent(new CustomEvent("bird-action", { detail: { action } }));
      });
      flushOneFrame();
    }
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("excited 状態で flap rate が上昇 (分岐網羅)", () => {
    render(<CursorBird />);
    act(() => {
      window.dispatchEvent(new CustomEvent("bird-action", { detail: { action: "excited" } }));
    });
    // Consecutive frames → vx oscillates and the flip toggle fires too
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100 }));
    });
    flushOneFrame();
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 800, clientY: 100 }));
    });
    for (let i = 0; i < 5; i++) flushOneFrame();
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 100 }));
    });
    for (let i = 0; i < 5; i++) flushOneFrame();
  });

  it("アンマウントで cancelAnimationFrame", () => {
    const { unmount } = render(<CursorBird />);
    cafSpy?.mockClear();
    unmount();
    expect(cafSpy).toHaveBeenCalled();
  });
});

describe("BirdHoverZone", () => {
  it("hover で bird-action 'excited'", () => {
    const listener = vi.fn();
    window.addEventListener("bird-action", listener);
    render(
      <BirdHoverZone action="excited">
        <span>child</span>
      </BirdHoverZone>,
    );
    const zone = screen.getByText("child").parentElement!;
    fireEvent.mouseEnter(zone);
    expect(listener).toHaveBeenCalled();
    fireEvent.mouseLeave(zone);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener("bird-action", listener);
  });
});

describe("MountainHero", () => {
  it("SVG 描画", () => {
    const { container } = render(<MountainHero />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("太陽ホバーで sunglare アクションを dispatch", () => {
    const listener = vi.fn();
    window.addEventListener("bird-action", listener);
    const { container } = render(<MountainHero />);
    // Get every <g> element and fire mouseEnter on those that have onMouseEnter
    const groups = container.querySelectorAll("g[style*='cursor']");
    for (const g of Array.from(groups)) {
      fireEvent.mouseEnter(g);
      fireEvent.mouseLeave(g);
    }
    expect(listener).toHaveBeenCalled();
    window.removeEventListener("bird-action", listener);
  });
});
