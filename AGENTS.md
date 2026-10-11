<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Content-Security-Policy

- Static baseline: `src/lib/csp.ts`, served by `headers()` in `next.config.ts`. Its `script-src` keeps `'unsafe-inline'` only as the token the Worker replaces.
- Production nonce: `wrangler.jsonc` `main` is `worker.ts`, which wraps `.open-next/worker.js` (`src/lib/worker-entry.ts`). For every `text/html` response it swaps that `'unsafe-inline'` for a fresh 128-bit `'nonce-…'` and stamps the nonce on each inline `<script>` with HTMLRewriter (`src/lib/csp-nonce.ts`, streaming). The header is replaced, never appended: exactly one CSP per response. ETag / Content-Length are dropped because the body differs per request. Next 16's proxy/middleware (the usual nonce source) runs only on Node, which OpenNext on Workers cannot run.
- **Never point `main` back at `.open-next/worker.js`**: it silently restores `'unsafe-inline'` (`src/lib/__tests__/worker-entry.test.ts` guards it).
- **Never add `'strict-dynamic'`**: it makes `'self'` and host sources be ignored, which blocks `/three.min.js` and `/hero3d.js` (inserted by the hero loader) and the analytics beacon, none of which carry a nonce.
- Inline scripts must be in the server-rendered HTML (that is where the nonce is stamped). Code inserted at runtime must be an external file from `'self'`. Do not put HTML in `public/`: Workers Assets serve it before the Worker runs, without the nonce.
- No `'unsafe-eval'` in production, so Zod runs `jitless` (`src/lib/zod-ja.ts`); its eval probe would otherwise be reported as a CSP violation.
- Cloudflare Web Analytics: the beacon is appended after hydration (`src/components/Analytics.tsx`), not written as `<script src>` in the HTML (Observatory subresource-integrity). **Never add `integrity`**: Cloudflare updates `beacon.min.js` in place, so a pinned hash silently stops the beacon. The CSP keeps `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`.
- `next dev` / `next start` do not run the Worker and keep the static header (dev adds `'unsafe-eval'` for HMR).
