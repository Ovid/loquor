// Capture the REAL GlkOte protocol shapes by booting Zork I against a logging
// GlkOte display, headlessly under Node. This is GO/NO-GO GATE A: it proves
// ZVM + the vendored Glk + a custom GlkOte display run without a DOM and play
// Zork I, and it dumps the real `init` interface and `update` objects to
// fixtures that Tasks 1.5/1.6 depend on.
//
// Wiring notes (verified from ifvms + glkapi source):
//  - ifvms is pure CommonJS; load it via createRequire in this .mjs.
//  - GiDispa is supplied by the caller (ZVMDispatch); ZVM never builds it.
//  - glkapi's init() touches document/window unconditionally, so we stub them
//    BEFORE Glk.init.
//  - Boot handshake: vm.prepare(bytes, vm_options) then Glk.init(vm_options).
//    glkapi sets vm_options.accept = accept_ui_event before calling our
//    GlkOte.init(vm_options); our init grabs iface.accept and immediately
//    accepts an {type:'init'} event with metrics to start the VM.

import { createRequire, Module } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

// glkapi.js is a bare CommonJS script (`var Glk = new GlkClass()` +
// `try { exports.Glk = Glk } catch {}`). The repo package.json has
// `"type": "module"`, so a normal require() of this `.js` file would treat it
// as ESM — where `exports` is undefined, the export assignment throws, and the
// catch swallows it, leaving empty exports. We compile the source explicitly as
// CommonJS to get the real `Glk` singleton. (We do NOT edit the vendored file.)
function requireAsCjs(filePath) {
  const src = readFileSync(filePath, 'utf8')
  const mod = new Module(filePath, null)
  mod.filename = filePath
  mod.paths = Module._nodeModulePaths(dirname(filePath))
  mod._compile(src, filePath)
  return mod.exports
}

// --- DOM/window stubs (glkapi.init references these unconditionally) --------
globalThis.window = globalThis
globalThis.document = {
  createElement: () => ({
    getContext: () => null,
    style: {},
    appendChild() {},
    setAttribute() {},
  }),
  getElementById: () => null,
  addEventListener() {},
  removeEventListener() {},
}

// --- CommonJS deps (must come AFTER stubs; glkapi reads window at load) -----
const { ZVM } = require('ifvms')
const ZVMDispatch = require('ifvms/src/zvm/dispatch.js')
const { Glk } = requireAsCjs(resolve(repoRoot, 'vendor/glkote/glkapi.js'))

// --- Capture state ---------------------------------------------------------
const captured = { init: null, updates: [] }
let acceptFn = null

// Circular-safe deep clone: functions become '[fn]', and any object already
// seen on the current path becomes '[circular]'. The `iface` passed to
// GlkOte.init is the whole vm_options (it contains `vm`, whose `.options`
// points back to vm_options), so a plain JSON.stringify would throw.
function sanitize(o) {
  const seen = new WeakSet()
  return JSON.parse(
    JSON.stringify(o, (_k, v) => {
      if (typeof v === 'function') return '[fn]'
      if (v && typeof v === 'object') {
        if (seen.has(v)) return '[circular]'
        seen.add(v)
      }
      return v
    }),
  )
}

function fakeMetrics() {
  return {
    width: 80,
    height: 50,
    gridcharwidth: 1,
    gridcharheight: 1,
    buffercharwidth: 1,
    buffercharheight: 1,
    outspacingx: 0,
    outspacingy: 0,
    inspacingx: 0,
    inspacingy: 0,
    gridmarginx: 0,
    gridmarginy: 0,
    buffermarginx: 0,
    buffermarginy: 0,
  }
}

const LoggingGlkOte = {
  init(iface) {
    captured.init = sanitize(iface)
    acceptFn = iface.accept
    acceptFn({ type: 'init', gen: 0, metrics: fakeMetrics() })
  },
  update(arg) {
    captured.updates.push(sanitize(arg))
  },
  // glkapi calls getlibrary('Dialog'); null = no Dialog (autosave is off).
  getlibrary() {
    return null
  },
  // glkapi may save its own state; provide a benign value.
  save_allstate() {
    return {}
  },
  log() {},
  warning() {},
  error(m) {
    console.error('GlkOte.error', m)
  },
}

// --- Boot ------------------------------------------------------------------
const storyBytes = new Uint8Array(
  readFileSync(resolve(repoRoot, 'public/games/zork1.z3')),
)

const vm = new ZVM()

// --- GiDispa version-bridge ------------------------------------------------
// The pinned vendored glkapi.js (erkyrath/glkote@366c8271) calls
// `GiDispa.init({ io, vm })` once during Glk.init — an OLDER dispatch contract.
// ifvms's ZVMDispatch only provides `set_vm(vm)` (the NEWER contract used by
// glkote-term's bundled glkapi). So the upstream glkapi never calls set_vm and
// ZVMDispatch has no init(). We bridge by giving the dispatch instance an
// init() that forwards to set_vm(). This is an upstream version skew worked
// around in the harness (NOT by editing the vendored file). The engine façade
// (Task 1.7) must apply the same shim.
const GiDispa = new ZVMDispatch()
if (typeof GiDispa.init !== 'function') {
  GiDispa.init = opts => GiDispa.set_vm(opts.vm)
}

const vm_options = {
  vm,
  Glk,
  GlkOte: LoggingGlkOte,
  GiDispa,
  Dialog: null,
  // autosave OFF for this capture harness
}

vm.prepare(storyBytes, vm_options)
Glk.init(vm_options)

// --- Session driver --------------------------------------------------------
// Use the LAST update's pending input request so we never invent gen/window.
function lastUpdate() {
  return captured.updates.at(-1) ?? {}
}
function pending() {
  const u = lastUpdate()
  return (u.input ?? []).find(i => i.type === 'line' || i.type === 'char')
}
function send(value) {
  const req = pending()
  if (!req) return false
  acceptFn({
    type: req.type,
    // glkote 'char'/'line' events use `window` for the target window id.
    window: req.id,
    value,
    gen: req.gen ?? lastUpdate().gen ?? 0,
  })
  return true
}

// 1. Drive several line commands (large verbose output included). NOTE: the
//    vendored glkapi.js does NOT implement [MORE] paging — paging is purely a
//    display-side concern in the stock glkote.js we are replacing. The Glk API
//    only emits a `char` input request when the GAME itself calls
//    glk_request_char_event. Zork I (a v3 game) uses line input exclusively and
//    never requests a char, so no [MORE]/char prompt can be captured here. We
//    still probe for one (and report its absence) so the finding is recorded.
const moreStart = captured.updates.length
send('verbose')
send('look')
send('diagnose')
send('inventory')

const charReq = captured.updates
  .slice(moreStart)
  .flatMap(u => u.input ?? [])
  .find(i => i.type === 'char')

// Defensive: if a char request ever did appear, ack it so the game advances.
let guard = 0
while (pending()?.type === 'char' && guard++ < 50) {
  send(' ')
}

// 2. Quit cleanly to capture the end-of-game update shape. Zork I's quit
//    confirmation ("Do you wish to leave the game? (Y is affirmative):") is a
//    LINE request, not a char request, so we answer with "yes".
const quitStart = captured.updates.length
send('quit')
guard = 0
while (pending() && guard++ < 10) {
  const req = pending()
  send(req.type === 'char' ? 'y' : 'yes')
}

// --- Write fixtures --------------------------------------------------------
mkdirSync(resolve(repoRoot, 'tests/fixtures'), { recursive: true })
writeFileSync(
  resolve(repoRoot, 'tests/fixtures/glkote-zork1-boot.json'),
  JSON.stringify(captured, null, 2),
)
writeFileSync(
  resolve(repoRoot, 'tests/fixtures/glkote-zork1-end.json'),
  JSON.stringify(
    {
      charReq: charReq ?? null,
      quit: captured.updates.slice(quitStart),
    },
    null,
    2,
  ),
)

const bootText = JSON.stringify(captured.updates)
console.log(
  'Captured',
  captured.updates.length,
  'updates; init keys:',
  Object.keys(captured.init ?? {}),
)
console.log('char-input request seen:', !!charReq)
console.log('contains "West of House":', bootText.includes('West of House'))
