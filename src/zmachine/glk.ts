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
import { Glk as GlkSingleton, GlkClass as GlkCtor } from '../../vendor/glkote/glkapi.js'

declare global {
  interface Window {
    Glk?: any      // not set by glkapi.js, but checked as fallback
    GlkClass?: any // not set by glkapi.js, but checked as fallback
    GiDispa?: any  // set by ifvms dispatch.js when the VM module is imported
  }
}

/**
 * Returns the ready-to-init Glk singleton from the vendored glkapi.js.
 *
 * glkapi.js creates `var Glk = new GlkClass()` at module scope and exports it
 * as a CJS-style export. The singleton is pre-constructed; callers must call
 * `Glk.init(vm_options)` to start the VM, passing (at minimum):
 *   - vm_options.vm       — the ZVM instance
 *   - vm_options.GlkOte   — our GlkOte bridge (the React display implementation)
 *   - vm_options.GiDispa  — the ifvms ZVMDispatch instance (or window.GiDispa)
 *
 * Fallback branches (window.Glk / new window.GlkClass()) are safety valves
 * for environments where the CJS named import resolution fails; in normal
 * Vite/esbuild builds the `GlkSingleton` branch is always taken.
 */
export function getGlk(): any {
  // Primary path: CJS named import resolved by esbuild/Rollup.
  if (GlkSingleton) return GlkSingleton
  // Safety valve: constructor import worked but singleton didn't (shouldn't happen).
  if (GlkCtor) return new GlkCtor()
  // Last resort: check window (glkapi.js does not set these, so this catches
  // only unusual bundler configurations that re-attach the globals manually).
  const g = window as any
  if (g.Glk) return g.Glk
  if (g.GlkClass) return new g.GlkClass()
  throw new Error('glkapi.js did not expose Glk/GlkClass — check bundler CJS interop')
}
