/**
 * Test for opengraph-image.tsx
 */
import { describe, it, expect, vi } from "vitest";
import type React from "react";

// Mock ImageResponse from next/og (it does not really work in jsdom)
// In vitest 4, vi.fn().mockImplementation does not work as a constructor, so return a class
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
  it("exports the expected metadata", () => {
    expect(alt).toContain("ライフプラン");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("Image() returns an ImageResponse", () => {
    const result = Image() as unknown as { element: React.ReactNode };
    expect(result).toBeTruthy();
    expect(result.element).toBeTruthy();
  });
});
