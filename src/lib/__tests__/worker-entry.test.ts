import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contentSecurityPolicy } from "../csp";
import { CSP_HEADER, type Rewriter, type ScriptElement } from "../csp-nonce";
import { type FetchHandler, withScriptNonceCsp } from "../worker-entry";

const root = path.resolve(__dirname, "../../..");

/** wrangler.jsonc without comments and trailing commas, parsed. */
function wranglerConfig(): Record<string, unknown> {
  const jsonc = readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
  const json = jsonc
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(json);
}

describe("deploy wiring", () => {
  it("wrangler.jsonc points main at worker.ts (.open-next/worker.js would silently restore 'unsafe-inline')", () => {
    expect(wranglerConfig().main).toBe("worker.ts");
  });

  it("worker.ts default-exports the OpenNext worker wrapped by withScriptNonceCsp", () => {
    // worker.ts imports a file that exists only after an OpenNext build, so it is checked as text;
    // the wrapper itself is exercised below.
    const entry = readFileSync(path.join(root, "worker.ts"), "utf8");
    expect(entry).toMatch(/^import openNextWorker from "\.\/\.open-next\/worker\.js";$/m);
    expect(entry).toMatch(/^export default withScriptNonceCsp\(openNextWorker\b/m);
    expect(entry.match(/^export default/gm)).toHaveLength(1);
  });

  it("public/ holds no HTML, since Workers Assets would serve it without the Worker's nonce", () => {
    const html: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.html?$/i.test(entry.name)) html.push(path.relative(root, full));
      }
    };
    walk(path.join(root, "public"));
    expect(html).toEqual([]);
  });
});

describe("withScriptNonceCsp", () => {
  const openNextFetch = vi.fn<FetchHandler>();
  const worker = withScriptNonceCsp({ fetch: openNextFetch });
  const stamped: Record<string, string>[] = [];

  beforeEach(() => {
    stamped.length = 0;
    openNextFetch.mockReset();
    // Minimal HTMLRewriter: runs the element handler on one inline and one external script.
    vi.stubGlobal(
      "HTMLRewriter",
      class implements Rewriter {
        private handler?: (el: ScriptElement) => void;
        on(_selector: string, handlers: { element(el: ScriptElement): void }) {
          this.handler = handlers.element;
          return this;
        }
        transform(response: Response) {
          for (const attrs of [{}, { src: "/_next/static/chunks/a.js" }] as Record<string, string>[]) {
            this.handler?.({
              hasAttribute: (name) => name in attrs,
              setAttribute: (name, value) => (attrs[name] = value),
            });
            stamped.push(attrs);
          }
          return response;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const page = () =>
    new Response("<script>self.__next_f.push([])</script>", {
      headers: { "content-type": "text/html; charset=utf-8", [CSP_HEADER]: contentSecurityPolicy() },
    });

  it("delegates to the OpenNext worker and gives HTML a per-request nonce", async () => {
    openNextFetch.mockResolvedValue(page());
    const request = new Request("https://example.test/simulator");
    const env = { ASSETS: {} };
    const ctx = { waitUntil() {} };

    const response = await worker.fetch(request, env, ctx);

    expect(openNextFetch).toHaveBeenCalledWith(request, env, ctx);
    const csp = response.headers.get(CSP_HEADER) ?? "";
    const nonce = csp.match(
      /script-src 'self' 'nonce-([A-Za-z0-9+/]{22}==)' https:\/\/static\.cloudflareinsights\.com;/,
    )?.[1];
    expect(nonce).toBeDefined();
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    const [inline, external] = stamped;
    expect(inline.nonce).toBe(nonce);
    expect(external.nonce).toBeUndefined();
  });

  it("issues a different nonce on every request", async () => {
    openNextFetch.mockImplementation(async () => page());
    const a = await worker.fetch(new Request("https://example.test/"), {}, {});
    const b = await worker.fetch(new Request("https://example.test/"), {}, {});
    expect(a.headers.get(CSP_HEADER)).not.toBe(b.headers.get(CSP_HEADER));
  });

  it("returns non-HTML responses from OpenNext unchanged", async () => {
    const image = new Response(new Uint8Array([137, 80]), {
      headers: { "content-type": "image/png", [CSP_HEADER]: contentSecurityPolicy() },
    });
    openNextFetch.mockResolvedValue(image);
    expect(await worker.fetch(new Request("https://example.test/opengraph-image"), {}, {})).toBe(image);
  });
});
