# Spike: pin the Glk layer + confirm Vite/CommonJS interop

**Date:** 2026-06-06
**For:** [Loquor first-pass design](../superpowers/specs/2026-06-06-loquor-design.md)
**Outcome:** **GO** on the custom-GlkOte-bridge architecture, with one correction:
the Glk layer is **vendored from source**, not installed from npm.

## Question 1 — which Glk layer, and can it take a custom display?

### What ZVM needs

ZVM calls a large, standard Glk surface (~38 `glk_*` functions plus `RefBox`,
`RefStruct`, `save_allstate`, `restore_allstate`, `update`). Reimplementing this is
out of the question — we must reuse a real Glk implementation. ZVM itself only
calls `GlkOte.log()` directly; everything else flows VM → Glk → GlkOte, so **our
"custom display" implements the GlkOte contract that the Glk layer drives**, not
Glk.

### There is no clean npm package for a browser Glk

Verified against the live registry (reachable: react 19.2.7, vite 8.0.16,
ifvms 1.1.6 all resolve):

| Candidate | Result |
|---|---|
| `asyncglk` | **404 — not on npm.** GitHub-only, v0.1.0, TypeScript + Svelte, no `main`/`exports`, builds via `tsc`. Modern (powers current Parchment) but early-stage; pinnable only by commit; drags in a Svelte GlkOte. |
| `glkote` / `glkapi` | **404 — not on npm.** |
| `parchment` (npm) | Resolves, but it's **quilljs/parchment** (Quill's editor model) — a name collision, *not* the IF interpreter. |
| `glkote-term` | On npm, but terminal-only (`ansi-escapes`, `mute-stream`); vendors its own classic Glk and depends on no glk package. |

### Decision: vendor `glkapi.js` (classic, erkyrath/glkote, MIT)

`glkapi.js` from [erkyrath/glkote](https://github.com/erkyrath/glkote) is the
battle-tested Glk implementation already paired with ifvms in Parchment. Crucially,
it **injects GlkOte as a swappable dependency** — callers pass a `GlkOte` instance
via `vm_options.GlkOte` (it falls back to `window.GlkOteClass` only if none is
given). It also accepts injected `Dialog` and `GiDispa`. This is exactly the seam
our React display + IndexedDB Dialog need.

- **Plan:** copy `glkapi.js` (and `dialog.js`/`glkote.js` for reference) into the
  repo under e.g. `vendor/glkote/`, **pinned by upstream commit SHA**, with its MIT
  `LICENSE`. Instantiate its `GlkClass` to get our `Glk`; inject our custom GlkOte
  and Dialog via options.
- **Module shape:** `glkapi.js` uses a `GlkClass` constructor and references
  `window.*` globals (`GiDispa`, `GlkOteClass`). Since we own the vendored copy, we
  add a thin ESM wrapper that exports `GlkClass` and wires the few globals
  explicitly — no reliance on script-tag global order.
- **GiDispa:** ifvms registers `window.GiDispa = new ZVMDispatch()` (`dispatch.js`);
  the wrapper must ensure that's available to glkapi.

**`asyncglk` rejected for the first pass:** unpublished, v0.1.0, and it brings its
own Svelte-based GlkOte — more integration surface than value for a PoC. Revisit if
we later want a modern TS Glk.

### GlkOte contract our bridge must implement

The methods `glkapi.js` calls on the injected GlkOte (`init`, `update`,
`getlibrary`/`get_library`, `extevent`, …) plus the GlkOte JSON protocol: window
types (grid = status, buffer = main), content/clear updates, and input requests
(line / char / hyperlink), with player input returned as line/char/init/arrange
events. The status grid window backs the brass status bar; the buffer window backs
the scrollback.

## Question 2 — Vite ↔ CommonJS interop for `ifvms`

**PASS.** `ifvms@1.1.6` is CommonJS (`exports.ZVM = require('./zvm.js')`). Verified
it loads and instantiates in a JS runtime:

```
$ node -e "const m=require('./ifvms.js/src/index.js'); ..."
exports keys: [ 'ZVM' ]
typeof ZVM: function
instantiated ZVM ok; has prepare: true
```

The VM core has no Node-only `require`s (those live only in `bin/`), so it's
browser-safe, and Vite's esbuild pre-bundling transparently wraps CJS — `import
{ ZVM } from 'ifvms'` will work.

## Net effect on the plan

- ✅ Custom-GlkOte-bridge architecture is sound; `glkapi.js` is designed for an
  injected display.
- 🔧 Spec correction: the Glk layer is **vendored by commit SHA**, not an npm
  dependency. `ifvms` stays an npm dependency.
- ✅ Vite/CJS interop confirmed.
- **Fallback unchanged:** if the custom GlkOte proves too deep at the walking
  skeleton, the same erkyrath repo ships `glkote.js` (the stock DOM display) to
  embed instead.
