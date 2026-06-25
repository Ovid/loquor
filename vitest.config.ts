import { defineConfig, coverageConfigDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec,types-test}.{ts,tsx}',
      'scripts/**/*.{test,spec}.mjs',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Measure OUR code only. The 37% headline was the vendored ~6k-line
      // glkapi.js (which we must never modify, per CLAUDE.md) dragging the mean
      // down. Scoping `include` to src/ reports every source file there — even
      // ones no test imports (Vitest 4 dropped the old `all` flag; a non-empty
      // `include` now does this) — while dropping things that can't be
      // meaningfully unit-tested: the Vite entrypoint, ambient type decls, the
      // test harness, and the vendored Glk.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/main.tsx',
        'src/test/**',
        'src/**/*.d.ts',
        'vendor/**',
      ],
      // Regression gate. Set a few points below the measured numbers (≈97%
      // stmts / 99% lines / 95% funcs / 87% branches) so ordinary changes have
      // slack but a real coverage drop fails `make cover`. Raise these as
      // coverage climbs; don't lower them to make a red run pass.
      thresholds: {
        statements: 95,
        branches: 84,
        functions: 92,
        lines: 97,
      },
    },
  },
})
