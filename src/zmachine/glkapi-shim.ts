// glkapi.js references a few globals at load time. Ensure `window` exists
// (it does in the browser and under jsdom) and leave hooks for GiDispa, which
// ifvms registers when its VM module is imported.
export {}
if (typeof window === 'undefined') {
  // Node/SSR safety; the app only runs glkapi in the browser/jsdom.
  ;(globalThis as any).window = globalThis as any
}
