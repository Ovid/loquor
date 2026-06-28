import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage/**',
    'ifvms.js/**',
    'web-llm/**',
    'zork1/**',
    'zork2/**',
    'zork3/**',
    'scratch/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
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
      // Allow intentionally-unused params/vars when prefixed with `_`
      // (e.g. interface methods we must declare but don't use).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // `no-explicit-any` stays an ERROR for ordinary app code (catches stray
    // `any` in pure logic/UI), but is turned OFF only where `any` is genuinely
    // unavoidable: the untyped VM/Glk boundary (ifvms + the vendored glkapi.js,
    // which have no usable types) and the fixture-driven tests that cast the
    // captured GlkOte protocol JSON. See tests/fixtures/PROTOCOL-NOTES.md.
    files: [
      'src/zmachine/**/*.{ts,tsx}',
      'src/glkote-react/bridge.ts',
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
