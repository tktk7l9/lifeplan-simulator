import { applyScriptNonce } from "./csp-nonce";

export type FetchHandler = (request: Request, env: unknown, ctx: unknown) => Promise<Response>;

/**
 * Wraps the OpenNext worker (.open-next/worker.js) so every HTML response leaves with a
 * per-request script nonce instead of script-src 'unsafe-inline' (src/lib/csp-nonce.ts).
 * worker.ts applies it; it lives here so tests can run it without an OpenNext build.
 */
export function withScriptNonceCsp(openNext: { fetch: FetchHandler }): { fetch: FetchHandler } {
  return {
    async fetch(request, env, ctx) {
      return applyScriptNonce(await openNext.fetch(request, env, ctx));
    },
  };
}
