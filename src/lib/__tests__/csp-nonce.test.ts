import { afterEach, describe, expect, it, vi } from "vitest";
import { contentSecurityPolicy } from "../csp";
import {
  applyBrowserCacheControl,
  applyScriptNonce,
  BROWSER_CACHE_CONTROL,
  browserCacheControl,
  CACHE_CONTROL_HEADER,
  createNonce,
  CSP_HEADER,
  isInlineJavaScript,
  type Rewriter,
  type ScriptElement,
  withScriptNonce,
} from "../csp-nonce";

const STATIC_CSP = contentSecurityPolicy();

/** Records the handler so tests can feed it fake <script> elements. */
function fakeRewriter() {
  const calls: { selector: string; handler: (el: ScriptElement) => void }[] = [];
  const transformed: Response[] = [];
  const rewriter: Rewriter = {
    on(selector, handlers) {
      calls.push({ selector, handler: handlers.element });
      return rewriter;
    },
    transform(response) {
      transformed.push(response);
      return response;
    },
  };
  return { rewriter: () => rewriter, calls, transformed };
}

/** A fake <script>. Names are lowercase, as HTMLRewriter reports them. */
function script(attrs: Record<string, string>) {
  return {
    attrs,
    getAttribute: (name: string) => (name in attrs ? attrs[name] : null),
    hasAttribute: (name: string) => name in attrs,
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
  };
}

function html(headers: Record<string, string> = {}) {
  return new Response("<html><script>1</script></html>", {
    status: 200,
    statusText: "OK",
    headers: { "content-type": "text/html; charset=utf-8", [CSP_HEADER]: STATIC_CSP, ...headers },
  });
}

describe("createNonce", () => {
  it("returns 128 random bits as base64", () => {
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(atob(createNonce())).toHaveLength(16);
  });

  it("never repeats across calls", () => {
    const nonces = new Set(Array.from({ length: 1000 }, () => createNonce()));
    expect(nonces.size).toBe(1000);
  });
});

describe("withScriptNonce", () => {
  it("replaces 'unsafe-inline' in script-src only, keeping 'self' and the beacon host", () => {
    const out = withScriptNonce(STATIC_CSP, "abc");
    expect(out).toContain("script-src 'self' 'nonce-abc' https://static.cloudflareinsights.com;");
    // style-src keeps 'unsafe-inline' (React style attributes), which Observatory accepts.
    expect(out).toContain("style-src 'self' 'unsafe-inline';");
    expect(out).not.toMatch(/script-src[^;]*unsafe-inline/);
    // Only the script-src token changes; the rest of the policy is byte-identical.
    expect(out).toBe(STATIC_CSP.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'nonce-abc'"));
  });

  it("never adds 'strict-dynamic' (runtime-inserted scripts carry no nonce)", () => {
    expect(withScriptNonce(STATIC_CSP, "abc")).not.toContain("strict-dynamic");
  });

  it("handles script-src as the first directive", () => {
    expect(withScriptNonce("script-src 'unsafe-inline'; img-src 'self'", "n")).toBe(
      "script-src 'nonce-n'; img-src 'self'",
    );
  });

  it("returns null when there is nothing to tighten", () => {
    expect(withScriptNonce("default-src 'self'; script-src 'self'", "n")).toBeNull();
    expect(withScriptNonce("style-src 'unsafe-inline'", "n")).toBeNull();
  });
});

describe("isInlineJavaScript", () => {
  it.each<[string, Record<string, string>]>([
    ["no attributes (Next's own inline scripts)", {}],
    ["an empty type", { type: "" }],
    ["text/javascript", { type: "text/javascript" }],
    ["a JavaScript MIME type in any case", { type: "Application/JavaScript" }],
    ["a legacy JavaScript MIME type", { type: "text/x-ecmascript" }],
    ["a type wrapped in ASCII whitespace", { type: " text/javascript\n" }],
    ["type=module", { type: "module" }],
    ["type=MODULE", { type: "MODULE" }],
    ["an empty type that overrides language", { type: "", language: "vbscript" }],
    ["language=javascript without a type", { language: "JavaScript" }],
    ["an empty language without a type", { language: "" }],
    ["nomodule", { nomodule: "" }],
  ])("stamps %s", (_label, attrs) => {
    expect(isInlineJavaScript(script(attrs))).toBe(true);
  });

  it.each<[string, Record<string, string>]>([
    ["an external script", { src: "/_next/static/chunks/a.js" }],
    ["an empty src", { src: "" }],
    ["an external module", { type: "module", src: "/m.js" }],
    ["an SVG <script href> (SVG 2)", { href: "https://evil.example/x.js" }],
    ["an SVG <script xlink:href> (SVG 1.1)", { "xlink:href": "https://evil.example/x.js" }],
    ["application/ld+json (a data block)", { type: "application/ld+json" }],
    ["application/json", { type: "application/json" }],
    ["text/plain", { type: "text/plain" }],
    ["importmap", { type: "importmap" }],
    ["speculationrules", { type: "speculationrules" }],
    ["a JavaScript type with parameters (not an essence match)", { type: "text/javascript; charset=utf-8" }],
    ["a type wrapped in non-ASCII whitespace", { type: "\u00a0text/javascript" }],
    ["a type spelled with a character reference (arrives raw)", { type: "text&#47;javascript" }],
    ["language=vbscript without a type", { language: "vbscript" }],
  ])("does not stamp %s", (_label, attrs) => {
    expect(isInlineJavaScript(script(attrs))).toBe(false);
  });

  it("checks each JavaScript MIME type essence of the HTML spec", () => {
    const essences = [
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
    ];
    for (const type of essences) expect(isInlineJavaScript(script({ type })), type).toBe(true);
    expect(isInlineJavaScript(script({ type: "text/javascript1.6" }))).toBe(false);
  });
});

describe("applyScriptNonce", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("swaps the CSP for a nonce one and stamps every inline JavaScript script", () => {
    const fake = fakeRewriter();
    const out = applyScriptNonce(html({ etag: '"x"', "content-length": "31" }), {
      nonce: "N",
      rewriter: fake.rewriter,
    });

    expect(out.status).toBe(200);
    expect(out.statusText).toBe("OK");
    expect(out.headers.get(CSP_HEADER)).toBe(
      STATIC_CSP.replace("'unsafe-inline' https://static", "'nonce-N' https://static"),
    );
    expect(out.headers.get("etag")).toBeNull();
    expect(out.headers.get("content-length")).toBeNull();
    expect(out.headers.get("content-type")).toBe("text/html; charset=utf-8");

    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0].selector).toBe("script");
    // Next's RSC payload, the landing page's own loaders, a data block and external scripts.
    const rscPayload = script({});
    const heroLoader = script({});
    const typed = script({ type: "application/json" });
    const external = script({ src: "/_next/static/chunks/a.js" });
    const svgExternal = script({ href: "https://evil.example/x.js" });
    for (const el of [rscPayload, heroLoader, typed, external, svgExternal]) fake.calls[0].handler(el);
    expect(rscPayload.attrs.nonce).toBe("N");
    expect(heroLoader.attrs.nonce).toBe("N");
    // A data block never runs, so it needs no nonce.
    expect(typed.attrs.nonce).toBeUndefined();
    // External scripts are allowed by 'self' / the host source; a nonce would let any URL load.
    expect(external.attrs.nonce).toBeUndefined();
    expect(svgExternal.attrs.nonce).toBeUndefined();
  });

  it("keeps exactly one CSP header", () => {
    const out = applyScriptNonce(html(), { nonce: "N", rewriter: fakeRewriter().rewriter });
    expect(out.headers.get(CSP_HEADER)?.match(/default-src/g)).toHaveLength(1);
  });

  it("uses the same nonce in the header and on the scripts, and a fresh one per response", () => {
    const fake = fakeRewriter();
    const a = applyScriptNonce(html(), { rewriter: fake.rewriter });
    const b = applyScriptNonce(html(), { rewriter: fake.rewriter });
    const nonceOf = (r: Response) => r.headers.get(CSP_HEADER)?.match(/'nonce-([^']+)'/)?.[1];
    expect(nonceOf(a)).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(nonceOf(a)).not.toBe(nonceOf(b));

    const first = script({});
    fake.calls[0].handler(first);
    expect(first.attrs.nonce).toBe(nonceOf(a));
  });

  it.each([
    ["non-HTML", new Response("{}", { headers: { "content-type": "application/json", [CSP_HEADER]: STATIC_CSP } })],
    ["RSC payload", new Response("0:[]", { headers: { "content-type": "text/x-component", [CSP_HEADER]: STATIC_CSP } })],
    ["no content-type", new Response(new Uint8Array([120]), { headers: { [CSP_HEADER]: STATIC_CSP } })],
    ["no body", new Response(null, { status: 304, headers: { "content-type": "text/html" } })],
    ["no CSP", new Response("<p>", { headers: { "content-type": "text/html" } })],
    [
      "CSP without 'unsafe-inline'",
      new Response("<p>", { headers: { "content-type": "text/html", [CSP_HEADER]: "script-src 'self'" } }),
    ],
  ])("passes %s responses through untouched", (_label, response) => {
    const fake = fakeRewriter();
    expect(applyScriptNonce(response, { rewriter: fake.rewriter })).toBe(response);
    expect(fake.calls).toHaveLength(0);
  });

  it("matches the content type case-insensitively", () => {
    const fake = fakeRewriter();
    const upper = new Response("<p>", { headers: { "content-type": "Text/HTML", [CSP_HEADER]: STATIC_CSP } });
    expect(applyScriptNonce(upper, { nonce: "N", rewriter: fake.rewriter })).not.toBe(upper);
    expect(fake.calls).toHaveLength(1);
  });

  it("needs no options for responses it leaves alone", () => {
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    expect(applyScriptNonce(json)).toBe(json);
  });

  it("uses the Workers HTMLRewriter by default", () => {
    const fake = fakeRewriter();
    vi.stubGlobal(
      "HTMLRewriter",
      class {
        constructor() {
          return fake.rewriter();
        }
      },
    );
    applyScriptNonce(html(), { nonce: "N" });
    expect(fake.transformed).toHaveLength(1);
  });

  it("fails loudly outside the Workers runtime instead of serving a nonce nobody stamped", () => {
    expect(() => applyScriptNonce(html(), { nonce: "N" })).toThrow(/HTMLRewriter/);
  });
});

describe("browserCacheControl", () => {
  it("turns any CDN-directed value (s-maxage) into the revalidating browser value", () => {
    expect(browserCacheControl("s-maxage=31536000, stale-while-revalidate=2592000")).toBe(BROWSER_CACHE_CONTROL);
    expect(browserCacheControl("s-maxage=31536000")).toBe(BROWSER_CACHE_CONTROL);
    expect(browserCacheControl("public, S-MAXAGE = 60")).toBe(BROWSER_CACHE_CONTROL);
  });

  it("leaves browser-directed values and a missing header alone", () => {
    expect(browserCacheControl("private, no-cache, no-store, max-age=0, must-revalidate")).toBe(
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
    // "max-age" alone must not match the s-maxage pattern.
    expect(browserCacheControl("public, max-age=31536000, immutable")).toBe("public, max-age=31536000, immutable");
    expect(browserCacheControl(null)).toBeNull();
  });
});

describe("applyBrowserCacheControl", () => {
  it("rewrites the header, keeping status, the other headers and the body", async () => {
    const res = applyBrowserCacheControl(
      new Response("body", {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "text/html", [CACHE_CONTROL_HEADER]: "s-maxage=1", [CSP_HEADER]: STATIC_CSP },
      }),
    );
    expect(res.headers.get(CACHE_CONTROL_HEADER)).toBe(BROWSER_CACHE_CONTROL);
    expect(res.headers.get(CSP_HEADER)).toBe(STATIC_CSP);
    expect(res.status).toBe(404);
    expect(res.statusText).toBe("Not Found");
    expect(await res.text()).toBe("body");
  });

  it("returns the same response when there is nothing to rewrite", () => {
    const plain = new Response("x");
    expect(applyBrowserCacheControl(plain)).toBe(plain);
    const browser = new Response("x", { headers: { [CACHE_CONTROL_HEADER]: BROWSER_CACHE_CONTROL } });
    expect(applyBrowserCacheControl(browser)).toBe(browser);
  });
});
