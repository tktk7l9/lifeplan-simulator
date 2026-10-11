import { describe, expect, it } from "vitest";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
import config from "../../../open-next.config";

describe("open-next.config.ts", () => {
  it("serves prerendered pages from the static assets cache instead of rendering them per request", async () => {
    const override = config.default.override?.incrementalCache;
    expect(typeof override).toBe("function");
    // defineCloudflareConfig wraps the cache in a lazy loader; it must hand back that cache.
    const cache = await (override as () => Promise<unknown>)();
    expect(cache).toBe(staticAssetsIncrementalCache);
  });
});
