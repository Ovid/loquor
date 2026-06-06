import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "ifvms.js/**",
    "web-llm/**",
    "zork1/**",
    "zork2/**",
    "zork3/**",
    "scratch/**",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The VM/Glk boundary (ifvms + the vendored glkapi.js) is untyped
      // CommonJS, so `any` is unavoidable where protocol objects cross into our
      // code (engine, glk wrapper, bridge) and in the fixture-driven tests.
      // Keep it visible as a warning rather than a hard error.
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow intentionally-unused params/vars when prefixed with `_`
      // (e.g. interface methods we must declare but don't use).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
