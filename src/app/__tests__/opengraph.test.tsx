/**
 * opengraph-image.tsx の test
 */
import { describe, it, expect, vi } from "vitest";
import type React from "react";

// next/og の ImageResponse を mock (jsdom では実体動作しない)
// vitest 4 では vi.fn().mockImplementation はコンストラクタとして動作しないため class を返す
vi.mock("next/og", () => ({
  ImageResponse: class {
    element: React.ReactNode;
    opts?: object;
    headers = new Headers();
    constructor(element: React.ReactNode, opts?: object) {
      this.element = element;
      this.opts = opts;
    }
  },
}));

import Image, { alt, size, contentType } from "../opengraph-image";

describe("opengraph-image", () => {
  it("メタデータが期待値", () => {
    expect(alt).toContain("ライフプラン");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("Image() が ImageResponse を返す", () => {
    const result = Image() as unknown as { element: React.ReactNode };
    expect(result).toBeTruthy();
    expect(result.element).toBeTruthy();
  });
});
