// Ambient type declaration for the vendored glkapi.js (erkyrath/glkote, MIT).
// The file exports a pre-constructed Glk singleton and its constructor via a
// CJS-style footer: `try { exports.Glk = Glk; exports.GlkClass = GlkClass; }`
// esbuild/Rollup detect this as CJS and make both names available as imports.
declare module '*/vendor/glkote/glkapi.js' {
  // GlkClass instance — pre-constructed singleton, ready to call .init(vm_options)
  const Glk: any
  // GlkClass constructor — used only if the singleton import resolves falsy
  const GlkClass: new () => any
  export { Glk, GlkClass }
}
