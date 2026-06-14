// Seeded full-game walkthrough capture (output-translation spec §7.3).
// Deterministic: Math.random is replaced with mulberry32(seed) BEFORE boot, so
// troll/thief combat replays identically for a given seed. Iterate
// --seed/script until the win assertion passes, then commit the fixture; the
// coverage gate (CI) runs the matcher over the FIXTURE — no replay, no RNG.
//
// ifvms rolls ALL randomness through Math.random (ifvms.js/src/zvm/runtime.js),
// so a seeded PRNG installed before Glk.init/vm.prepare makes every combat
// round, thief move, and "random" message replay identically.
//
// Wiring is copied from scripts/capture-protocol.mjs (the proven Gate-A
// harness): requireAsCjs for the vendored glkapi, DOM stubs, the GiDispa
// version-bridge shim, and the send()/pending()/lastUpdate() driver.
//
// Usage: node scripts/capture-walkthrough.mjs [--seed N] [--verbose]

import { createRequire, Module } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

// --- CLI ---------------------------------------------------------------------
const seedArg = process.argv.indexOf('--seed')
const seed = seedArg >= 0 ? Number(process.argv[seedArg + 1]) : 1
const verbose = process.argv.includes('--verbose')

// --- Seeded PRNG (MUST be installed before the VM boots) ---------------------
function mulberry32(s) {
  return function () {
    let t = (s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
Math.random = mulberry32(seed)

// glkapi.js is a bare CommonJS script; the repo is "type":"module", so compile
// it explicitly as CJS to get the real `Glk` singleton (see capture-protocol).
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
const captured = { updates: [] }
let acceptFn = null

// Circular-safe deep clone (functions → '[fn]', cycles → '[circular]').
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
    acceptFn = iface.accept
    acceptFn({ type: 'init', gen: 0, metrics: fakeMetrics() })
  },
  update(arg) {
    captured.updates.push(sanitize(arg))
  },
  getlibrary() {
    return null
  },
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

// GiDispa version-bridge: vendored glkapi calls GiDispa.init({io, vm}); ifvms's
// ZVMDispatch only has set_vm. Shim init → set_vm (see capture-protocol.mjs).
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
}

vm.prepare(storyBytes, vm_options)
Glk.init(vm_options)

// --- Session driver ----------------------------------------------------------
function lastUpdate() {
  return captured.updates.at(-1) ?? {}
}
function pending() {
  const u = lastUpdate()
  return (u.input ?? []).find(i => i.type === 'line' || i.type === 'char')
}

// Pull the buffer text emitted since update index `from` (for --verbose).
function textSince(from) {
  let out = ''
  for (const u of captured.updates.slice(from)) {
    for (const c of u.content ?? []) {
      for (const para of c.text ?? []) {
        const content = para.content ?? []
        let line = ''
        for (let i = 1; i < content.length; i += 2) {
          if (typeof content[i] === 'string') line += content[i]
        }
        out += line + '\n'
      }
    }
  }
  return out
}

function send(value) {
  const req = pending()
  if (!req) return false
  const from = captured.updates.length
  acceptFn({
    type: req.type,
    window: req.id,
    value,
    gen: req.gen ?? lastUpdate().gen ?? 0,
  })
  if (verbose) {
    console.log(`\n> ${value}`)
    console.log(textSince(from).trimEnd())
  }
  return true
}

// --- Drive the walkthrough script ---------------------------------------------
const scriptPath = resolve(repoRoot, 'scripts/walkthrough/zork1.txt')
const script = readFileSync(scriptPath, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l !== '' && !l.startsWith('#'))

for (const command of script) {
  if (!pending()) {
    console.error(
      `VM stopped accepting input before command "${command}" (seed ${seed}).`,
    )
    break
  }
  send(command)
}

// --- Win assertion + fixture ---------------------------------------------------
const transcript = JSON.stringify(captured.updates)
if (!transcript.includes('Inside the Barrow')) {
  console.error(
    `walkthrough did NOT reach the win (seed ${seed}). Re-run with --verbose, fix the script or try another seed.`,
  )
  process.exit(1)
}

mkdirSync(resolve(repoRoot, 'src/test'), { recursive: true })
writeFileSync(
  resolve(repoRoot, 'src/test/zork1.walkthrough.en.json'),
  JSON.stringify(captured.updates),
)
console.log(
  `OK seed=${seed}: ${script.length} commands, ${captured.updates.length} updates → src/test/zork1.walkthrough.en.json`,
)
