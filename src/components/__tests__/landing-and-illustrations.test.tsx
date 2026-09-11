/**
 * Landing / illustrations / three ラッパの回帰ガード。
 *
 * これらは描画結果を検証できない（R3F は jsdom で描かれず、SVG は見た目そのもの）ため、
 * 担保できるのは「マウントが投げない」までと割り切る。同じ主張を 9 本に分けても
 * 捕まえられるものは増えないので、マウントは it.each 1 本に畳んである。
 * children を通すもの（LandingReveal / BirdHoverZone）は中身を主張できるので分けて書く。
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

const TINY_SPINNER_SHAPES = ["peak", "coin", "gem", "box", "ring"] as const;

describe("マウントが投げない（描画内容は検証対象外）", () => {
  it.each<[string, () => React.ReactElement]>([
    ["LandingNav", () => <LandingNav />],
    ["BelowFoldContent", () => <BelowFoldContent />],
    ["BelowFoldLoader", () => <BelowFoldLoader />],
    ["Hero3D", () => <Hero3D />],
    ["MountainHero", () => <MountainHero />],
    ["CursorBirdWrapper", () => <CursorBirdWrapper />],
    ["FloatingParticlesWrapper", () => <FloatingParticlesWrapper />],
    ["HeroCanvasWrapper", () => <HeroCanvasWrapper />],
    ...TINY_SPINNER_SHAPES.map(
      (shape) => [`TinySpinner shape=${shape}`, () => <TinySpinner shape={shape} />] as [string, () => React.ReactElement],
    ),
  ])("%s", (_name, el) => {
    expect(() => render(el())).not.toThrow();
  });
});

describe("children を素通しする", () => {
  it("LandingReveal", () => {
    const { getByText } = render(<LandingReveal><span>子</span></LandingReveal>);
    expect(getByText("子")).toBeTruthy();
  });

  it("BirdHoverZone", () => {
    const { getByText } = render(<BirdHoverZone action="test"><span>子</span></BirdHoverZone>);
    expect(getByText("子")).toBeTruthy();
  });
});
