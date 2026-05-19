/**
 * opengraph-image.tsx の test
 */
import { describe, it, expect, vi } from "vitest";

// next/og の ImageResponse を mock (jsdom では実体動作しない)
vi.mock("next/og", () => ({
  ImageResponse: vi.fn().mockImplementation((element: React.ReactNode, opts?: object) => ({
    element,
    opts,
    headers: new Headers(),
  })),
}));

import Image, { alt, size, contentType } from "../opengraph-image";

describe("opengraph-image", () => {
  it("メタデータが期待値", () => {
    expect(alt).toContain("ライフプラン");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("Image() が ImageResponse を返す", () => {
    const result = Image() as { element: React.ReactNode };
    expect(result).toBeTruthy();
    expect(result.element).toBeTruthy();
  });
});
