// OpenNext (Cloudflare) config.
//
// incrementalCache: `/`, `/simulator` and the icon / OG image routes are prerendered at build
// time (○ in the build output), but without a cache implementation OpenNext cannot read that
// output and renders those pages again on every request (x-nextjs-cache: MISS), spending tens to
// hundreds of ms of Worker CPU per request and slowing the first byte; bursts of such requests
// are what hit Workers error 1102 (CPU limit) in ai-primer. staticAssetsIncrementalCache places
// the prerender output under cdn-cgi/_next_cache/ in Workers static assets (reachable only
// through the ASSETS binding) and serves it as is. It is read-only, which fits: neither ISR nor
// on-demand revalidation is used. /api/evaluate stays dynamic.
// The HTML still passes through worker.ts, so every response keeps its own script nonce.
//
// enableCacheInterception answers those prerendered routes before the Next server loads; without
// it every view started the Next server just to read the same file (x-nextjs-cache: HIT).
// Interception sends `s-maxage=31536000, stale-while-revalidate=2592000`, which worker.ts
// rewrites for browsers (applyBrowserCacheControl), or Chrome would reuse stale RSC payloads
// after a deploy.
// https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
