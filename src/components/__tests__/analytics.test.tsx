import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Analytics } from "../Analytics";
import { BEACON_SRC, BEACON_TOKEN } from "@/lib/analytics";

const beacons = () => document.querySelectorAll(`script[src="${BEACON_SRC}"]`);

afterEach(() => {
  vi.unstubAllEnvs();
  for (const el of beacons()) el.remove();
});

describe("Analytics", () => {
  it("appends the beacon after hydration in production, as a module script without integrity", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<Analytics />);

    expect(container.innerHTML).toBe("");
    const [beacon] = beacons() as NodeListOf<HTMLScriptElement>;
    expect(beacons()).toHaveLength(1);
    expect(beacon.parentElement).toBe(document.body);
    expect(beacon.type).toBe("module");
    expect(JSON.parse(beacon.dataset.cfBeacon ?? "")).toEqual({ token: BEACON_TOKEN });
    // Cloudflare updates beacon.min.js in place; a pinned hash would silently stop the beacon.
    expect(beacon.hasAttribute("integrity")).toBe(false);
  });

  it("adds the beacon only once across remounts", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<Analytics />).unmount();
    render(<Analytics />);
    expect(beacons()).toHaveLength(1);
  });

  it("stays silent outside production (dev / tests)", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<Analytics />);
    expect(beacons()).toHaveLength(0);
  });
});
