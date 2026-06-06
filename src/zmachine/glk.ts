// Adapter around the vendored classic glkapi.js so it can be imported as ESM.
//
// glkapi.js (erkyrath/glkote@366c8271) defines `GlkClass` (a constructor) and
// creates a ready-to-use `Glk` singleton via `new GlkClass()`. It exports both
// via a CJS-compatible footer:
//
//   try { exports.Glk = Glk; exports.GlkClass = GlkClass; } catch (ex) {};
//
// esbuild (Vite's bundler) detects the `exports` identifier at module scope and
// wraps the file as CommonJS, making `Glk` and `GlkClass` available as named
// imports. We import the shim first to ensure `window` exists before glkapi
// runs its `window.console` check at load time.
//
// NOTE: glkapi.js does NOT assign window.Glk or window.GlkClass — so the
// window-fallback branches below are safety valves only. The primary path is
// always the named import `Glk`.
//
// NOTE: GiDispa is NOT read from window at load time by glkapi; it is taken
// from `vm_options.GiDispa` at `Glk.init(vm_options)` call time. The caller
// (engine façade, Task 1.7) must pass the ifvms ZVMDispatch instance there.
// ifvms does register `window.GiDispa = new ZVMDispatch()` in its dispatch.js,
// but glkapi reads it from vm_options, not window, so import order is fine.

import './glkapi-shim' // ensure window exists before glkapi.js runs

// glkapi.d.ts (sibling) provides the ambient module declaration that satisfies
// TypeScript. esbuild/Rollup detect the CJS export pattern in glkapi.js and
// make `Glk` (singleton) and `GlkClass` (constructor) available as named imports.
import {
  Glk as GlkSingleton,
  GlkClass as GlkCtor,
} from '../../vendor/glkote/glkapi.js'

declare global {
  interface Window {
    Glk?: any // not set by glkapi.js, but checked as fallback
    GlkClass?: any // not set by glkapi.js, but checked as fallback
    GiDispa?: any // set by ifvms dispatch.js when the VM module is imported
  }
}

/**
 * Returns a FRESH Glk instance from the vendored glkapi.js.
 *
 * glkapi.js keeps all its mutable library state — `event_generation`,
 * `gli_windowlist`, `has_exited`, the autosave flags, etc. — as `var`s inside
 * the `GlkClass` function closure, so each `new GlkClass()` is fully isolated.
 * The module-level `Glk = new GlkClass()` singleton it exports is therefore
 * SINGLE-USE: once a game has run through it, `event_generation` is non-zero and
 * `gli_windowlist` is populated, so a second `Glk.init()` on the same instance
 * fails (autorestore even throws "module has already been launched", and input
 * events are rejected with "wrong generation number").
 *
 * Because the engine may boot more than once in a single JS context (the
 * autosave/resume tests boot two engines; navigating landing⇄terminal without a
 * page reload would too), we construct a fresh GlkClass per call so each
 * ZMachine gets a clean Glk. Callers then call `Glk.init(vm_options)` with:
 *   - vm_options.vm       — the ZVM instance
 *   - vm_options.GlkOte   — our GlkOte bridge (the React display implementation)
 *   - vm_options.GiDispa  — the ifvms ZVMDispatch instance (or window.GiDispa)
 *
 * The singleton / window fallbacks remain only for unusual bundler configs where
 * the constructor import fails to resolve.
 */
export function getGlk(): any {
  // Primary path: a fresh, isolated instance via the constructor.
  if (GlkCtor) return new GlkCtor()
  // Fallback: window-attached constructor (unusual bundler configs).
  const g = window as any
  if (g.GlkClass) return new g.GlkClass()
  // Last resort: the pre-constructed singleton (single-use; see above).
  if (GlkSingleton) return GlkSingleton
  if (g.Glk) return g.Glk
  throw new Error(
    'glkapi.js did not expose Glk/GlkClass — check bundler CJS interop',
  )
}
