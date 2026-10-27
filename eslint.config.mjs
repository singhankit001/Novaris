import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    // Vendored, minified libraries used only by the demo-video compositions.
    "video/shared/*.min.js",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    ".claude/**",
  ]),
]);

export default eslintConfig;
