/**
 * Landing + illustrations + three components の smoke test
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LandingNav } from "../landing/LandingNav";
import { BelowFoldContent } from "../landing/BelowFoldContent";
import { BelowFoldLoader } from "../landing/BelowFoldLoader";
import { LandingReveal } from "../landing/LandingReveal";
import { Hero3D } from "../landing/Hero3D";
import { MountainHero } from "../illustrations/MountainHero";
import { TinySpinner } from "../three/TinySpinner";
import { BirdHoverZone } from "../three/BirdHoverZone";
import { CursorBirdWrapper } from "../three/CursorBirdWrapper";
import { FloatingParticlesWrapper } from "../three/FloatingParticlesWrapper";
import { HeroCanvasWrapper } from "../three/HeroCanvasWrapper";

describe("Landing", () => {
  it("LandingNav", () => {
    expect(() => render(<LandingNav />)).not.toThrow();
  });
  it("BelowFoldContent", () => {
    expect(() => render(<BelowFoldContent />)).not.toThrow();
  });
  it("BelowFoldLoader", () => {
    expect(() => render(<BelowFoldLoader />)).not.toThrow();
  });
  it("LandingReveal: children を表示", () => {
    const { getByText } = render(<LandingReveal><span>子</span></LandingReveal>);
    expect(getByText("子")).toBeTruthy();
  });
  it("Hero3D", () => {
    expect(() => render(<Hero3D />)).not.toThrow();
  });
});

describe("Illustrations", () => {
  it("MountainHero", () => {
    expect(() => render(<MountainHero />)).not.toThrow();
  });
});

describe("Three wrappers (R3F は描画されないが mount は OK)", () => {
  it("TinySpinner", () => {
    expect(() => render(<TinySpinner shape="peak" />)).not.toThrow();
  });

  it("TinySpinner: 各 shape", () => {
    for (const s of ["peak", "coin", "gem", "box", "ring"] as const) {
      expect(() => render(<TinySpinner shape={s} />)).not.toThrow();
    }
  });

  it("BirdHoverZone: children を表示", () => {
    const { getByText } = render(<BirdHoverZone action={() => {}}><span>子</span></BirdHoverZone>);
    expect(getByText("子")).toBeTruthy();
  });

  it("CursorBirdWrapper", () => {
    expect(() => render(<CursorBirdWrapper />)).not.toThrow();
  });

  it("FloatingParticlesWrapper", () => {
    expect(() => render(<FloatingParticlesWrapper />)).not.toThrow();
  });

  it("HeroCanvasWrapper", () => {
    expect(() => render(<HeroCanvasWrapper />)).not.toThrow();
  });
});
