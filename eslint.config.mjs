import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // OpenNext / wrangler build output (generated)
    ".open-next/**",
    ".wrangler/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Minified vendored library (three.js) — not source, don't lint.
    "public/**",
    // Generated coverage reports.
    "coverage/**",
  ]),
  {
    rules: {
      // Respect the `_` prefix convention for intentionally-unused bindings.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // React Compiler is not enabled here; this advisory rule only fires on
      // react-hook-form's function-returning APIs and is non-actionable.
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
