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

// Content-Security-Policy injected into the PRODUCTION index.html only (F-p).
//
// Why a build-only plugin and not a meta tag in index.html: a static
// `<meta http-equiv=CSP>` applies in dev too, where `@vitejs/plugin-react`
// injects an un-nonced inline React-refresh preamble script and HMR opens a
// `ws:` connection — both of which a meaningful CSP blocks. Scoping to
// `apply:'build'` ships the policy in production while leaving dev (localhost,
// lower risk) unconstrained, mirroring the `apply:'serve'` glkapi shim above.
//
// Why a meta tag and not an HTTP header: Loquor is a backend-less static app
// served from an unknown host/subpath (`base:'./'`), so a header isn't ours to
// set. Meta-CSP can't express `frame-ancestors`/`sandbox` (those are dropped);
// the directives we DO care about — `script-src`, `connect-src`, `object-src`,
// `base-uri` — are honoured.
//
// Directive rationale:
//  - default-src 'self'                 — same-origin by default (bundle, story
//                                         files, self-hosted fonts).
//  - script-src 'self' 'wasm-unsafe-eval'
//        The compensating control for F-p: WebLLM runs model-lib WASM via
//        WebAssembly.instantiate. The installed web-llm dist uses NO eval /
//        new Function (verified), so the narrow 'wasm-unsafe-eval' is enough —
//        NOT the broad 'unsafe-eval'. Vite's production HTML has no inline
//        scripts, so 'self' alone covers the app (no 'unsafe-inline').
//  - style-src 'self' 'unsafe-inline'   — React sets inline style attributes.
//  - connect-src                        — same-origin (story-file fetches) plus
//        the documented egress: HF weights + GitHub-raw WASM. The wildcards
//        pre-cover HF's LFS/Xet 302-redirect CDNs (cdn-lfs*, cas-bridge.*.hf.co).
//  - worker-src 'self'                  — the main-thread CreateMLCEngine path
//        spawns no worker: the production bundle has ZERO `new Worker` /
//        createObjectURL (the unused WebWorker/ServiceWorker engine classes
//        tree-shake away), so blob: only widened an XSS pivot for dead code.
//        Re-add blob: if a web-llm bump moves inference to a blob worker — the
//        console names the CSP violation.
//  - font-src 'self' data:              — self-hosted woff2/woff subsets. The
//        build inlines small ones (< assetsInlineLimit) as url(data:font;base64)
//        in the bundled CSS, so data: is REQUIRED or those @font-face loads are
//        blocked in production (e.g. the Cyrillic / Latin-Ext subsets), silently
//        degrading to system fonts — a regression the F-p download checklist
//        never exercises. data: fonts are same-document, not an exfil vector.
//  - img-src 'self' data:               — favicon + any data: images.
//  - object-src 'none'; base-uri 'self'; form-action 'none' — standard hardening.
//
// CANNOT be verified by the test suite (jsdom enforces no CSP) NOR by the build
// (the policy isn't exercised until a real download). The gate is MANUAL — see
// the F-p checklist: `make build && make preview`, opt into the model, and
// confirm weights fetch + WASM loads + inference runs. If a download breaks,
// the fallback is to widen `connect-src` to the actual redirect host reported in
// the console's CSP-violation message (or, if a web-llm bump relocates
// model_lib, add that host). The base (non-LLM) game does not depend on any of
// the external hosts, so it is unaffected regardless.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function cspBuildHtml(): Plugin {
  return {
    name: 'csp-meta-build',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return {
          html,
          tags: [
            {
              tag: 'meta',
              attrs: {
                'http-equiv': 'Content-Security-Policy',
                content: CSP,
              },
              injectTo: 'head-prepend',
            },
          ],
        }
      },
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
  plugins: [react(), glkapiDevEsm(), cspBuildHtml()],
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
