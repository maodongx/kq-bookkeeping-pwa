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
    // HeroUI reference docs / demos — vendored for consultation only,
    // not part of the application. Linting them produces ~70 unrelated
    // errors that drown out real issues in our code.
    ".heroui-docs/**",
  ]),
]);

export default eslintConfig;
