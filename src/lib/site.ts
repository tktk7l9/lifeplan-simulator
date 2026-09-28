/**
 * Default canonical URL of the site.
 *
 * metadataBase / OGP read this. If NEXT_PUBLIC_SITE_URL is set, it takes
 * precedence (note that it is inlined at build time).
 *
 * Migrated from Vercel (lifeplan-simulator.vercel.app) to Cloudflare Workers
 * on 2026-08-16. The Vercel account returns 402 across the board after exceeding Fair Use, so
 * keeping the old URL as canonical would make a dead page the canonical one.
 */
export const SITE_URL = "https://lifeplan-simulator.saitotakuya0719.workers.dev";
