// Worker entry (wrangler.jsonc "main"). Wraps the OpenNext worker so every HTML response gets
// a per-request script nonce instead of script-src 'unsafe-inline' (src/lib/worker-entry.ts,
// src/lib/csp-nonce.ts). Static assets (/_next/static/*, public/) are served by Workers Assets
// before this runs; none of them is HTML.
// https://opennext.js.org/cloudflare/howtos/custom-worker

// The file exists only after `opennextjs-cloudflare build`; wrangler resolves it when bundling.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- missing in CI typecheck (no build yet), present locally after a build
import openNextWorker from "./.open-next/worker.js";
import { type FetchHandler, withScriptNonceCsp } from "./src/lib/worker-entry";

export default withScriptNonceCsp(openNextWorker as { fetch: FetchHandler });
