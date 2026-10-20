// Per-request script nonce for HTML responses, applied by the Worker entry (worker.ts).
//
// next.config.ts headers() serve the static CSP from src/lib/csp.ts, whose script-src has
// 'unsafe-inline' because Next writes its RSC payload as inline <script> (self.__next_f.push)
// and the landing page has two inline scripts of its own. Next 16's proxy (the usual nonce
// source) does not run on OpenNext, but every HTML response does pass through the Worker, so the
// Worker swaps 'unsafe-inline' in script-src for a fresh nonce and stamps that nonce on each
// inline <script> with HTMLRewriter (streaming, no buffering).
//
// 'strict-dynamic' is deliberately NOT added: 'self' keeps allowing /_next/static chunks and the
// scripts the hero loader inserts at runtime (/three.min.js, /hero3d.js), and the host source
// keeps allowing the Cloudflare Web Analytics beacon, none of which carry a nonce.
//
// Only inline JavaScript gets the nonce (isInlineJavaScript): external scripts (`src`, or the
// `href` of an SVG <script>) stay subject to the 'self' / host allowlist, and data blocks never
// run, so they need none.
//
// Trust boundary: HTMLRewriter cannot tell Next's own inline scripts from injected ones, so ANY
// inline <script> that reaches the HTML is stamped. The CSP still blocks injected event handlers,
// javascript: URLs and scripts inserted through the DOM, but not a <script> element that is
// already in the server-rendered HTML. The nonce is therefore safe only while the server never
// emits untrusted HTML: React escapes text, and the only raw HTML is the landing page's two
// constant inline scripts (src/components/landing/LandingNav.tsx and Hero3D.tsx).
// src/lib/__tests__/trust-boundary.test.ts enforces this: it fails when dangerouslySetInnerHTML
// appears outside its allowlist, or when an allowed __html stops being a constant string.
//
// Responses that are not HTML (RSC, JSON, images) keep the static header unchanged; they run no
// inline script. `next dev` / `next start` never reach this code and keep the static CSP.

export const CSP_HEADER = "Content-Security-Policy";

/** 128 random bits, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Replaces 'unsafe-inline' in the script-src directive with 'nonce-<nonce>'.
 * Returns null when script-src has no 'unsafe-inline' (nothing to tighten), so the caller
 * leaves the response untouched instead of stamping nonces nobody checks.
 */
export function withScriptNonce(policy: string, nonce: string): string | null {
  let replaced = false;
  const directives = policy.split(";").map((directive) => {
    const tokens = directive.trim().split(/\s+/);
    if (tokens[0] !== "script-src" || !tokens.includes("'unsafe-inline'")) return directive;
    replaced = true;
    const rewritten = tokens.map((t) => (t === "'unsafe-inline'" ? `'nonce-${nonce}'` : t)).join(" ");
    // Keep the original leading space so the joined policy reads the same as the input.
    return directive.startsWith(" ") ? ` ${rewritten}` : rewritten;
  });
  return replaced ? directives.join(";") : null;
}

/** The subset of Cloudflare's HTMLRewriter used here (no workers-types dependency). */
export interface ScriptElement {
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): unknown;
}

// The JavaScript MIME type essences. A <script> whose type is one of them (ASCII
// case-insensitive, surrounding whitespace stripped, no parameters) runs as a classic script;
// "module" runs as a module script; the browser runs no other type.
// https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element
// https://mimesniff.spec.whatwg.org/#javascript-mime-type
const JAVASCRIPT_TYPES = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
]);

/** The script's type string, derived from `type` / `language` as the HTML spec does. */
function scriptType(el: ScriptElement): string {
  const type = el.getAttribute("type");
  const language = el.getAttribute("language");
  if (type === "" || (type === null && !language)) return "text/javascript";
  if (type !== null) return type.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "");
  return `text/${language}`;
}

/**
 * True only for inline classic or module JavaScript, the one kind of <script> that needs the
 * nonce. Left unstamped:
 * - `src`: an external script. 'self' and the host sources decide whether it loads; a nonce
 *   would let it load from anywhere.
 * - `href` / `xlink:href`: an SVG <script> loads its file from these (it has no `src`), so a
 *   nonce would let an off-allowlist script load.
 * - any other type: data blocks such as application/ld+json never run; importmap and
 *   speculationrules are not used here and stay blocked.
 * HTMLRewriter hands over attribute values raw (character references are not decoded), so a
 * type spelled with one never matches and that script stays blocked: errors fall on the
 * blocking side.
 */
export function isInlineJavaScript(el: ScriptElement): boolean {
  if (el.hasAttribute("src") || el.hasAttribute("href") || el.hasAttribute("xlink:href")) {
    return false;
  }
  const type = scriptType(el).toLowerCase();
  return type === "module" || JAVASCRIPT_TYPES.has(type);
}
export interface Rewriter {
  on(selector: string, handlers: { element(el: ScriptElement): void }): Rewriter;
  transform(response: Response): Response;
}

function workersRewriter(): Rewriter {
  const ctor = (globalThis as { HTMLRewriter?: new () => Rewriter }).HTMLRewriter;
  if (!ctor) throw new Error("HTMLRewriter is not available outside the Workers runtime");
  return new ctor();
}

/**
 * Tightens the CSP of an HTML response to a per-request nonce and stamps that nonce on every
 * inline JavaScript <script> (isInlineJavaScript). External scripts are left alone ('self' /
 * host sources allow them), and so are data blocks.
 * Exactly one CSP header is kept: the static one is replaced, never appended to (two CSP
 * headers would both be enforced).
 */
export function applyScriptNonce(
  response: Response,
  { nonce = createNonce(), rewriter = workersRewriter }: { nonce?: string; rewriter?: () => Rewriter } = {},
): Response {
  if (!response.body) return response;
  if (!(response.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html")) {
    return response;
  }
  const policy = response.headers.get(CSP_HEADER);
  const tightened = policy === null ? null : withScriptNonce(policy, nonce);
  if (tightened === null) return response;

  const headers = new Headers(response.headers);
  headers.set(CSP_HEADER, tightened);
  // The body now differs per request: a validator would let a 304 pair an old body
  // (old nonce) with a new header (new nonce) and block every inline script.
  headers.delete("etag");
  headers.delete("content-length");

  const rewritten = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  return rewriter()
    .on("script", {
      element(el) {
        if (isInlineJavaScript(el)) el.setAttribute("nonce", nonce);
      },
    })
    .transform(rewritten);
}

// Next sends a CDN-directed Cache-Control for prerendered routes, and OpenNext's cache
// interception sends `s-maxage=31536000, stale-while-revalidate=2592000` for them. Vercel
// rewrites such a value to BROWSER_CACHE_CONTROL for browsers; Workers pass it on, so after a
// deploy Chrome would keep serving stale RSC payloads from its disk cache (stale-while-revalidate)
// and they would request chunks that no longer exist. Five sibling apps broke this way and got
// the same rewrite on 2026-10-20.
export const CACHE_CONTROL_HEADER = "Cache-Control";
export const BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate";
const S_MAXAGE_DIRECTIVE = /(^|,)\s*s-maxage\s*=/i;

/**
 * The Cache-Control the browser should get: BROWSER_CACHE_CONTROL when the value has an
 * `s-maxage` directive, otherwise the value as it is (null stays null).
 */
export function browserCacheControl(value: string | null): string | null {
  return value !== null && S_MAXAGE_DIRECTIVE.test(value) ? BROWSER_CACHE_CONTROL : value;
}

/** Applies browserCacheControl to any response (HTML, RSC payload, route handler), copying headers only when the value changes. */
export function applyBrowserCacheControl(response: Response): Response {
  const value = response.headers.get(CACHE_CONTROL_HEADER);
  const normalized = browserCacheControl(value);
  if (normalized === null || normalized === value) return response;
  const headers = new Headers(response.headers);
  headers.set(CACHE_CONTROL_HEADER, normalized);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
