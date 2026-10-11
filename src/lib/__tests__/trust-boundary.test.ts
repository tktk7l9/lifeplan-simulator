// Guards the trust boundary that the per-request script nonce relies on (src/lib/csp-nonce.ts).
// The Worker stamps the nonce on every inline <script> in the HTML and cannot tell an injected
// one from Next's own, so the server must never emit untrusted HTML. React escapes everything it
// renders except dangerouslySetInnerHTML, so that prop is allowed only in the files listed in
// ALLOWED, and the HTML those files set must be a constant string (checked below).
// The scan reads the TypeScript AST: a mention in a comment or in JSX text does not count.
// A dependency that renders raw HTML internally is outside the scan; review one before adding it.
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");

/** The only files allowed to use dangerouslySetInnerHTML, each with why its HTML is trusted. */
const ALLOWED: Record<string, string> = {
  "src/components/landing/LandingNav.tsx": "static inline script (nav scroll state): a constant string",
  "src/components/landing/Hero3D.tsx": "static inline script (deferred 3D hero loader): a constant string",
};

const SCRIPT_KINDS: Record<string, ts.ScriptKind> = {
  ".ts": ts.ScriptKind.TS,
  ".mts": ts.ScriptKind.TS,
  ".cts": ts.ScriptKind.TS,
  ".tsx": ts.ScriptKind.TSX,
  ".js": ts.ScriptKind.JS,
  ".mjs": ts.ScriptKind.JS,
  ".cjs": ts.ScriptKind.JS,
  ".jsx": ts.ScriptKind.JSX,
};

/** App source under src/. Tests are skipped: they never reach the server-rendered HTML. */
function appSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : appSourceFiles(path);
    const isTest = /\.test\.[cm]?[jt]sx?$/.test(entry.name);
    return extname(entry.name) in SCRIPT_KINDS && !isTest ? [path] : [];
  });
}

function parse(code: string, ext: string): ts.SourceFile {
  return ts.createSourceFile(`x${ext}`, code, ts.ScriptTarget.Latest, true, SCRIPT_KINDS[ext]);
}

/**
 * True when the code names `name` as an identifier or a string: a JSX attribute, an object key,
 * an import specifier. Comments and JSX text do not count.
 */
function codeNames(code: string, ext: string, name: string): boolean {
  const visit = (node: ts.Node): boolean =>
    ((ts.isIdentifier(node) || ts.isStringLiteralLike(node)) && node.text === name) ||
    ts.forEachChild(node, visit) === true;
  return visit(parse(code, ext));
}

/** The value of every `__html: ...` property in the code. */
function htmlValues(code: string, ext: string): ts.Expression[] {
  const values: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === "__html"
    ) {
      values.push(node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(code, ext));
  return values;
}

describe("dangerouslySetInnerHTML", () => {
  const users = appSourceFiles(join(ROOT, "src"))
    .filter((file) => codeNames(readFileSync(file, "utf8"), extname(file), "dangerouslySetInnerHTML"))
    .map((file) => relative(ROOT, file).split(sep).join("/"));

  it("appears only in allowlisted files", () => {
    expect(users.filter((file) => !(file in ALLOWED))).toEqual([]);
  });

  it("is still used by every allowlisted file (no stale entries)", () => {
    expect(Object.keys(ALLOWED).filter((file) => !users.includes(file))).toEqual([]);
  });

  it("is detected in code but not in comments or JSX text", () => {
    const prop = "dangerouslySetInnerHTML";
    expect(codeNames("<div dangerouslySetInnerHTML={{ __html: x }} />", ".tsx", prop)).toBe(true);
    expect(codeNames('createElement("div", { dangerouslySetInnerHTML: { __html: x } })', ".js", prop)).toBe(true);
    expect(codeNames('const props = { ["dangerouslySetInnerHTML"]: html };', ".ts", prop)).toBe(true);
    expect(codeNames("// dangerouslySetInnerHTML is not used here\nexport {};", ".ts", prop)).toBe(false);
    expect(codeNames("const p = <p>dangerouslySetInnerHTML</p>;", ".tsx", prop)).toBe(false);
  });
});

describe("static inline scripts (the landing page)", () => {
  it.each(Object.keys(ALLOWED))("%s sets only a constant string that stays inside <script>", (file) => {
    const values = htmlValues(readFileSync(join(ROOT, file), "utf8"), extname(file));
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      // A plain string or a template without ${...}: nothing from a request can reach it.
      expect(ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value), value.getText()).toBe(true);
      const text = (value as ts.StringLiteralLike).text;
      expect(text).not.toMatch(/<\/script/i);
      expect(text).not.toContain("<!--");
    }
  });

  it("rejects an interpolated or computed __html", () => {
    const isConstant = (code: string) =>
      htmlValues(code, ".tsx").every((v) => ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v));
    expect(isConstant("<script dangerouslySetInnerHTML={{ __html: `a()` }} />")).toBe(true);
    expect(isConstant("<script dangerouslySetInnerHTML={{ __html: `a(${x})` }} />")).toBe(false);
    expect(isConstant("<script dangerouslySetInnerHTML={{ __html: code }} />")).toBe(false);
    expect(isConstant('<script dangerouslySetInnerHTML={{ "__html": "a()" + b }} />')).toBe(false);
  });
});
