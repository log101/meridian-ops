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
    "build/**",
    "next-env.d.ts",
    // Theseus checks the repo out into the sandbox's home directory, which
    // also holds the sandbox runtime's own files. Never lint those.
    ".ascii/**",
    ".pi/**",
    "data/**",
  ]),
]);

export default eslintConfig;
