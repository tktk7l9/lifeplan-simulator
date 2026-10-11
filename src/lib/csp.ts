// Source of truth for the static Content-Security-Policy. next.config.ts headers() serves it on
// every route the Next server answers.
//
// script-src has 'unsafe-inline' here because Next writes its RSC payload as inline <script>
// (self.__next_f.push), and the landing page has two small inline scripts (LandingNav, Hero3D).
// In production every HTML response passes through worker.ts, which swaps that token for a
// per-request nonce (src/lib/csp-nonce.ts), so browsers never see 'unsafe-inline' in script-src on
// pages. Next 16's proxy/middleware (the usual nonce source) runs only on the Node runtime, which
// OpenNext on Cloudflare Workers cannot run. `next dev` / `next start` never reach the Worker and
// keep this static value.
//
// Two origins are allowed for Cloudflare Web Analytics: the beacon script is loaded from
// static.cloudflareinsights.com and measurements are POSTed to cloudflareinsights.com. If either
// is missing the page still looks fine while only the beacon is silently blocked, so
// csp.test.ts pins both.
//
// 'strict-dynamic' is deliberately absent (csp.test.ts / csp-nonce.test.ts block it): it would
// make 'self' and the host source be ignored, so scripts inserted at runtime without a nonce
// (/three.min.js and /hero3d.js from the hero loader, the analytics beacon) would be blocked.
export const BEACON_SCRIPT_ORIGIN = "https://static.cloudflareinsights.com";
export const BEACON_REPORT_ORIGIN = "https://cloudflareinsights.com";

export function contentSecurityPolicy({ dev = false }: { dev?: boolean } = {}): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' is only for the dev overlay / HMR; production never sends it.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} ${BEACON_SCRIPT_ORIGIN}`,
    // React style attributes need inline styles; Observatory does not deduct for style-src.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${BEACON_REPORT_ORIGIN}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
