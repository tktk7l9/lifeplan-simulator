/**
 * Regression guard for Landing / illustrations / three wrappers.
 *
 * Their rendered output cannot be verified (R3F does not draw in jsdom, and SVG is the visuals themselves),
 * so all we can assert is "mounting does not throw". Splitting that same claim into 9 tests
 * would not catch anything more, so the mounts are folded into a single it.each.
 * Components that pass children through (LandingReveal / BirdHoverZone) can assert their contents, so they are written separately.
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

describe("landing footer sits outside <main>", () => {
  it("BelowFoldContent has no footer; LandingFooter is the footer", async () => {
    const { LandingFooter } = await import("../landing/BelowFoldContent");
    const content = render(<BelowFoldContent />);
    expect(content.container.querySelector("footer")).toBeNull();
    content.unmount();
    const footer = render(<LandingFooter />);
    expect(footer.container.firstElementChild?.tagName).toBe("FOOTER");
  });

  it('BelowFoldLoader part="footer" mounts only the footer', async () => {
    const { container, findByRole } = render(<BelowFoldLoader part="footer" />);
    await findByRole("contentinfo");
    expect(container.querySelectorAll("section")).toHaveLength(0);
  });
});
