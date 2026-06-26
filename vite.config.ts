import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Vendored reference dirs (gitignored, but present on disk) that must stay out of
// the app's build pipeline. Vite doesn't read .gitignore, so we exclude them
// explicitly. See CLAUDE.md "Read-only vendored directories".
const vendored = ['web-llm', 'ifvms.js', 'zork1', 'zork2', 'zork3', 'scratch']

// The vendored glkapi.js (erkyrath/glkote, pinned by SHA) is CommonJS: it exposes
// `Glk`/`GlkClass` via a `try { exports.Glk = ... } catch {}` footer. Rollup
// (`vite build`) and Vitest apply CJS→ESM interop, so the named imports in glk.ts
// resolve there. The dev server does NOT — it serves source files as native ESM
// and only converts CommonJS for optimized node_modules deps, not for a CJS file
// in our own tree. So `import { GlkClass }` throws "does not provide an export
// named 'GlkClass'" in the browser. Both `Glk` and `GlkClass` are top-level vars,
// so appending an explicit ESM export makes the named imports resolve in dev. We
// scope this to `serve` and leave the on-disk file pristine (transform is
// in-memory); build/test keep using their own already-verified CJS interop.
function glkapiDevEsm(): Plugin {
  return {
    name: 'glkapi-cjs-to-esm-dev',
    apply: 'serve',
    transform(code, id) {
      if (id.includes('/vendor/glkote/glkapi.js')) {
        return { code: `${code}\nexport { Glk, GlkClass };\n`, map: null }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built app is position-independent: it can be served
  // from `/`, `/paad/zork/`, or any subpath without a rebuild. Vite rewrites all
  // bundled asset URLs (and index.html refs) as relative; the one runtime
  // string-fetch (game story files in catalog.ts) is relative for the same
  // reason. Caveat: the host must serve the directory with a trailing slash
  // (`/paad/zork/`), or document-relative URLs resolve one level too high.
  base: './',
  plugins: [react(), glkapiDevEsm()],
  optimizeDeps: {
    // Scan only the app's own entry. With `entries` unset, Vite globs **/*.html
    // from the project root and crawls the vendored web-llm examples, whose
    // imports aren't installed — that aborts the dependency scan and silently
    // skips pre-bundling (which CommonJS deps like `ifvms` rely on).
    entries: ['index.html'],
  },
  server: {
    // Don't watch the large vendored trees for changes.
    watch: { ignored: vendored.map(d => `**/${d}/**`) },
  },
})
