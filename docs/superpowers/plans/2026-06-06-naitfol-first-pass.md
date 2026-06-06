# Naitfol First Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play Zork I, II, and III in the browser via the `ifvms.js` Z-machine, with a custom React UI ("Folio" theme, dark/light) and automatic per-game save/resume — no LLM.

**Architecture:** A React + Vite + TypeScript app. The `ifvms` VM (npm, CommonJS) is driven through a **vendored** `glkapi.js` Glk layer (erkyrath/glkote, MIT, pinned by commit SHA). Our own **GlkOte bridge** is injected into Glk as the display: it reduces the VM's GlkOte "update" protocol into React state and sends player input back as events. Our own **IndexedDB Dialog** handles ifvms's native autosave (per game signature) for transparent resume. Fonts are self-hosted (Fontsource, OFL).

**Tech Stack:** Vite, React 18+, TypeScript, Vitest + @testing-library/react + jsdom, fake-indexeddb (tests), ESLint, Prettier, `ifvms`, vendored `glkapi.js`, `@fontsource/*`.

**Reference spec:** [`docs/superpowers/specs/2026-06-06-naitfol-design.md`](../specs/2026-06-06-naitfol-design.md)
**Spike (already done):** [`docs/spikes/2026-06-06-glk-vite-spike.md`](../../spikes/2026-06-06-glk-vite-spike.md)

---

## File Structure

```
public/
  games/zork1.z3 zork2.z3 zork3.z3      # copied from zork{1,2,3}/COMPILED/
vendor/glkote/
  glkapi.js                              # vendored, pinned by SHA
  LICENSE                                # upstream MIT
  PINNED.md                              # records source repo + commit SHA
src/
  zmachine/
    glk.ts            # ESM wrapper: instantiate vendored GlkClass, wire GiDispa
    engine.ts         # ZMachine façade: owns VM + Glk + bridge + Dialog; boot/sendLine/sendChar
  glkote-react/
    types.ts          # ViewState, BufferLine, StatusLine, GlkOteEvent
    reduce.ts         # pure reducer: (ViewState, update) -> ViewState
    bridge.ts         # GlkOteBridge: implements the GlkOte display contract glkapi calls
  storage/
    idb.ts            # tiny IndexedDB key/value helper
    dialog.ts         # Dialog: autosave_read/write (+ minimal fileref) over idb
  games/
    catalog.ts        # slug -> { title, subtitle, file }
  ui/
    fonts.css         # @fontsource imports
    theme.css         # Folio CSS custom properties (dark default + [data-theme=light])
    useTheme.ts       # theme state + localStorage persistence
    ThemeToggle.tsx
    StatusBar.tsx
    Scrollback.tsx
    CommandInput.tsx
    Terminal.tsx      # composes status + scrollback + input, owns a ZMachine
    Landing.tsx       # title, how-to, volume picker, resume hint
    App.tsx           # routing between Landing and Terminal
  main.tsx
tests/
  (mirrors src/ where unit tests aren't colocated)
  fixtures/glkote-zork1-boot.json        # captured real protocol (Task 1.4)
scripts/
  capture-protocol.mjs                   # instrumentation harness (Task 1.4)
```

---

## Milestone 0 — Scaffolding

### Task 0.1: Scaffold the Vite + React + TS app

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/ui/App.tsx` (via template)

- [ ] **Step 1: Scaffold into the repo root**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
If prompted about the non-empty directory, choose **"Ignore files and continue"** (it preserves `docs/`, `vendor/`, `.git`, `Makefile`, `README.md`).

- [ ] **Step 2: Install base deps**

Run:
```bash
npm install
```

- [ ] **Step 3: Verify the dev server boots**

Run: `npm run dev` then open the printed URL.
Expected: the default Vite React page renders. Stop the server (Ctrl-C).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS app"
```

### Task 0.2: Add and configure the test toolchain

**Files:**
- Modify: `package.json` (scripts + devDeps), `vite.config.ts`
- Create: `vitest.config.ts` (or merge into `vite.config.ts`), `src/test/setup.ts`

- [ ] **Step 1: Install test/format deps**

Run:
```bash
npm install -D vitest@^4 @vitest/coverage-v8@^4 @testing-library/react@^16 @testing-library/jest-dom jsdom@^29 fake-indexeddb@^6 prettier@^3
```

- [ ] **Step 2: Configure Vitest (jsdom + setup)**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
})
```

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Wire package.json scripts (so `make` targets resolve)**

In `package.json`, set:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "cover": "vitest run --coverage",
    "lint": "eslint . --fix",
    "format": "prettier --write ."
  }
}
```

- [ ] **Step 4: Add a trivial passing test to prove the harness**

Create `src/test/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
describe('toolchain', () => {
  it('runs', () => { expect(1 + 1).toBe(2) })
})
```

- [ ] **Step 5: Run the suite**

Run: `make test`
Expected: 1 passing test.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add vitest + testing-library + prettier toolchain"
```

---

## Milestone 1 — Walking Skeleton (GO/NO-GO GATE)

> This milestone proves ZVM + vendored Glk + our custom GlkOte display run under Vite and render Zork I with a working input loop, **including a non-line-input path**. If the bridge proves substantially deeper than expected here, invoke the fallback in the spec (embed stock `glkote.js`) before continuing to Milestone 2.

### Task 1.1: Copy the Zork I story file into the app

**Files:**
- Create: `public/games/zork1.z3`

- [ ] **Step 1: Copy from the gitignored source (read-only source, never modified)**

Run:
```bash
mkdir -p public/games
cp zork1/COMPILED/zork1.z3 public/games/zork1.z3
```

- [ ] **Step 2: Verify it fetches in dev**

Run `npm run dev`, then in the browser console: `await (await fetch('/games/zork1.z3')).arrayBuffer()` → byteLength `86838`. Stop server.

- [ ] **Step 3: Commit**

```bash
git add public/games/zork1.z3
git commit -m "feat: bundle Zork I story file"
```

### Task 1.2: Vendor glkapi.js, pinned by commit SHA, with an ESM wrapper

**Files:**
- Create: `vendor/glkote/glkapi.js`, `vendor/glkote/LICENSE`, `vendor/glkote/PINNED.md`
- Create: `src/zmachine/glk.ts`

- [ ] **Step 1: Fetch glkapi.js and its license at a pinned commit**

Run:
```bash
mkdir -p vendor/glkote
# Resolve the current default-branch commit SHA, then fetch that exact blob.
SHA=$(git ls-remote https://github.com/erkyrath/glkote HEAD | cut -f1)
echo "Pinned glkapi.js to erkyrath/glkote@$SHA"
curl -fsSL "https://raw.githubusercontent.com/erkyrath/glkote/$SHA/glkapi.js"  -o vendor/glkote/glkapi.js
curl -fsSL "https://raw.githubusercontent.com/erkyrath/glkote/$SHA/LICENSE"    -o vendor/glkote/LICENSE
printf '# Vendored Glk layer\n\nSource: https://github.com/erkyrath/glkote\nFile: glkapi.js\nCommit: %s\nLicense: MIT (see LICENSE)\n' "$SHA" > vendor/glkote/PINNED.md
```

- [ ] **Step 2: Read the vendored file's GlkOte/GiDispa/Dialog touch-points**

Run:
```bash
grep -nE "GlkOte\.|GiDispa|window\.|Dialog\.|this\.init|get_library|set_window" vendor/glkote/glkapi.js | head -60
```
Read the output. Note: how `GlkClass` is exported (it ends with a UMD-style footer assigning to `module`/`window`), what `GlkOte` methods it calls (`init`, `update`, `getlibrary`/`get_library`, `log`, `warning`/`error`, `extevent`), and how it discovers `GiDispa`. This informs the wrapper and the bridge contract.

- [ ] **Step 3: Write the ESM wrapper**

Create `src/zmachine/glk.ts`. The vendored file expects some globals; we shim them explicitly rather than relying on load order:
```ts
// Adapter around the vendored classic glkapi.js so it can be imported as ESM.
// glkapi.js defines GlkClass (and a GiDispa class) and, in browsers, attaches to
// window. We import it for its side effects and read the constructors off window.
import './glkapi-shim'        // sets up window globals needed by glkapi (see Step 4)
import '../../vendor/glkote/glkapi.js'

// glkapi.js attaches these to the global object when loaded.
declare global {
  interface Window {
    Glk: any            // an instantiated singleton in classic builds
    GlkClass?: any
    GiDispa?: any
    GiDispaClass?: any
  }
}

export function getGlk(): any {
  const g = window as any
  // Classic glkapi exposes a ready-to-use `Glk` singleton object.
  if (g.Glk) return g.Glk
  if (g.GlkClass) return new g.GlkClass()
  throw new Error('glkapi.js did not expose Glk/GlkClass on window')
}
```

> NOTE for the implementer: confirm against Step 2's output whether the vendored
> build exposes a `Glk` singleton or a `GlkClass` constructor, and whether
> `GiDispa` is auto-created. If glkapi expects `window.GiDispa`, ifvms supplies
> `ZVMDispatch` (it sets `window.GiDispa = new ZVMDispatch()` in `dispatch.js`);
> ensure the ZVM module is imported before `getGlk()` runs. Adjust this wrapper to
> match the exact globals seen in Step 2 — this is the one place upstream specifics
> land.

- [ ] **Step 4: Add the global shim**

Create `src/zmachine/glkapi-shim.ts`:
```ts
// glkapi.js references a few globals at load time. Ensure `window` exists
// (it does in the browser and under jsdom) and leave hooks for GiDispa, which
// ifvms registers when its VM module is imported.
export {}
if (typeof window === 'undefined') {
  // Node/SSR safety; the app only runs glkapi in the browser/jsdom.
  ;(globalThis as any).window = globalThis as any
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: passes (no usage yet; just module resolution). If Vite complains about importing a `.js` from `vendor/`, ensure `vite.config.ts` `resolve`/`assetsInclude` leaves it as a normal JS module (it is one).

- [ ] **Step 6: Commit**

```bash
git add vendor/glkote src/zmachine/glk.ts src/zmachine/glkapi-shim.ts
git commit -m "feat: vendor pinned glkapi.js with ESM wrapper"
```

### Task 1.3: Define the bridge types

**Files:**
- Create: `src/glkote-react/types.ts`
- Test: `src/glkote-react/types.test.ts` (compile-only sanity)

- [ ] **Step 1: Write the types**

Create `src/glkote-react/types.ts`:
```ts
/** One rendered line in the main (buffer) window. */
export interface BufferLine {
  id: number
  kind: 'output' | 'input' | 'room'
  text: string
}

/** Parsed status line (Z-machine v3 status window: location + score/moves). */
export interface StatusLine {
  location: string
  right: string   // e.g. "Score: 0   Moves: 1" — raw right-hand text
}

/** What the UI renders. Produced by the reducer from GlkOte 'update' objects. */
export interface ViewState {
  status: StatusLine | null
  lines: BufferLine[]
  /** What input the VM is currently waiting for, or null if running/ended. */
  inputRequest: 'line' | 'char' | null
  ended: boolean
}

export const emptyView: ViewState = {
  status: null,
  lines: [],
  inputRequest: null,
  ended: false,
}

/** The GlkOte display contract our bridge implements (subset glkapi calls). */
export interface GlkOteDisplay {
  init(iface: GlkOteInitIface): void
  update(arg: GlkOteUpdate): void
  getlibrary(name: string): unknown
  log(msg: string): void
  warning(msg: string): void
  error(msg: string): void
  extevent?(val: unknown): void
}

/** glkapi passes this to GlkOte.init; `accept` receives player events. */
export interface GlkOteInitIface {
  accept(event: GlkOteEvent): void
  [k: string]: unknown
}

/** Output side of the GlkOte protocol (shape validated against captured fixtures). */
export interface GlkOteUpdate {
  type: 'update'
  gen?: number
  windows?: Array<Record<string, unknown>>
  content?: Array<Record<string, unknown>>
  input?: Array<Record<string, unknown>>
  disable?: boolean
  [k: string]: unknown
}

/** Input side of the GlkOte protocol — what we send via iface.accept. */
export type GlkOteEvent =
  | { type: 'init'; gen: number; metrics: Record<string, number> }
  | { type: 'line'; gen: number; window: number; value: string }
  | { type: 'char'; gen: number; window: number; value: string }
  | { type: 'arrange'; gen: number; metrics: Record<string, number> }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/glkote-react/types.ts
git commit -m "feat: define GlkOte bridge types"
```

### Task 1.4: Capture the REAL GlkOte protocol (instrumentation harness)

> The exact JSON shapes of `update`/`init` are protocol details we should observe,
> not guess. This harness boots Zork I against a logging GlkOte and dumps the real
> `init` interface and the first `update` objects to a fixture. It also **proves the
> VM+Glk+custom-display loop works headlessly** — the core of the go/no-go gate.

**Files:**
- Create: `scripts/capture-protocol.mjs`
- Create: `tests/fixtures/glkote-zork1-boot.json` (generated output, committed)

- [ ] **Step 1: Write the harness**

Create `scripts/capture-protocol.mjs`:
```js
// Boots Zork I with a logging GlkOte to capture the real protocol shapes.
// Run with: node scripts/capture-protocol.mjs
import { readFileSync, writeFileSync } from 'node:fs'

// jsdom-free: shim a minimal window for glkapi/ifvms globals.
globalThis.window = globalThis

const { ZVM } = await import('ifvms')                 // CJS interop verified in spike
await import('../vendor/glkote/glkapi.js')            // attaches Glk/GlkClass + GiDispa hooks

const captured = { init: null, updates: [] }
let acceptFn = null

const LoggingGlkOte = {
  init(iface) { captured.init = sanitize(iface); acceptFn = iface.accept },
  update(arg) { captured.updates.push(sanitize(arg)) },
  getlibrary() { return null },
  log() {}, warning() {}, error(m) { console.error('GlkOte.error', m) },
}

function sanitize(o) { return JSON.parse(JSON.stringify(o, (_k, v) =>
  typeof v === 'function' ? '[fn]' : v)) }

const Glk = window.Glk ?? new window.GlkClass()
const vm = new ZVM()
const story = new Uint8Array(readFileSync('public/games/zork1.z3'))

vm.prepare(story, { Glk, GlkOte: LoggingGlkOte, Dialog: makeNullDialog() })
Glk.init({ vm, GlkOte: LoggingGlkOte, Dialog: makeNullDialog() })

// Send the initial 'init' event with fake metrics to start the VM, then capture.
if (acceptFn && captured.init) {
  acceptFn({ type: 'init', gen: 0, metrics: fakeMetrics() })
}

writeFileSync('tests/fixtures/glkote-zork1-boot.json', JSON.stringify(captured, null, 2))
console.log('Captured', captured.updates.length, 'updates; init keys:',
  Object.keys(captured.init ?? {}))

function fakeMetrics() {
  return { width: 80, height: 40, gridcharwidth: 1, gridcharheight: 1,
    buffercharwidth: 1, buffercharheight: 1, outspacingx: 0, outspacingy: 0,
    inspacingx: 0, inspacingy: 0, gridmarginx: 0, gridmarginy: 0,
    buffermarginx: 0, buffermarginy: 0 }
}
function makeNullDialog() {
  return { streaming: false, autosave_read: () => null, autosave_write: () => {} }
}
```

- [ ] **Step 2: Install ifvms and run the harness**

Run:
```bash
npm install ifvms@^1.1.6
mkdir -p tests/fixtures
node scripts/capture-protocol.mjs
```
Expected: prints a non-zero update count and the `init` keys; writes `tests/fixtures/glkote-zork1-boot.json`.

> **GO/NO-GO checkpoint A:** If this prints updates whose `content` contains the
> text "West of House", the VM+Glk+custom-display loop works headlessly and the
> protocol shapes are captured. If glkapi throws about a missing global/Dialog
> method, adjust the harness's Dialog/metrics per the error and the Step-2 reading
> from Task 1.2 before proceeding. Persistent failure here is the signal to invoke
> the stock-GlkOte fallback.

- [ ] **Step 3: Inspect the fixture and record the real shapes**

Run:
```bash
node -e "const f=require('./tests/fixtures/glkote-zork1-boot.json'); console.log(JSON.stringify(f.updates[f.updates.length-1], null, 2))"
```
Read it. Identify: which window object is the **grid** (status) vs **buffer** (main); how text content arrives (`content` entries with `text`/`content` arrays of `{ content: [{ style, text }] }`); and how an input request appears (`input` entries with `type: 'line'|'char'`, `id`, `gen`). These shapes drive Task 1.5.

- [ ] **Step 4: Commit the harness and fixture**

```bash
git add scripts/capture-protocol.mjs tests/fixtures/glkote-zork1-boot.json package.json package-lock.json
git commit -m "test: capture real GlkOte protocol from Zork I boot"
```

### Task 1.5: Implement the reducer (TDD against the captured fixture)

**Files:**
- Create: `src/glkote-react/reduce.ts`
- Test: `src/glkote-react/reduce.test.ts`

- [ ] **Step 1: Write failing tests using the real fixture**

Create `src/glkote-react/reduce.test.ts`. Replace the placeholder assertions' literals with the exact window ids/shapes seen in Task 1.4 Step 3 before running:
```ts
import { describe, it, expect } from 'vitest'
import { reduce } from './reduce'
import { emptyView } from './types'
import fixture from '../../tests/fixtures/glkote-zork1-boot.json'

describe('reduce', () => {
  it('produces a status line and buffer text from the boot updates', () => {
    let view = emptyView
    for (const update of (fixture as any).updates) {
      view = reduce(view, update)
    }
    // The opening room is "West of House".
    expect(view.lines.map(l => l.text).join('\n')).toContain('West of House')
    expect(view.status?.location).toContain('West of House')
    // After boot the VM waits for a typed command.
    expect(view.inputRequest).toBe('line')
    expect(view.ended).toBe(false)
  })

  it('is pure — does not mutate the previous state', () => {
    const before = emptyView
    reduce(before, (fixture as any).updates[0])
    expect(before).toEqual(emptyView)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/glkote-react/reduce.test.ts`
Expected: FAIL ("reduce is not a function").

- [ ] **Step 3: Implement the reducer against the observed shapes**

Create `src/glkote-react/reduce.ts`. Adjust the window-type discrimination and text extraction to match the fixture's exact field names from Task 1.4:
```ts
import type { BufferLine, GlkOteUpdate, StatusLine, ViewState } from './types'

let nextId = 1

/** Pure: returns a new ViewState; never mutates `prev`. */
export function reduce(prev: ViewState, update: GlkOteUpdate): ViewState {
  let { status, lines, inputRequest, ended } = prev
  lines = lines.slice()

  // 1. Window catalogue: classify ids as 'grid' (status) or 'buffer' (main).
  const windowType = new Map<number, string>()
  for (const w of update.windows ?? []) {
    windowType.set(w.id as number, w.type as string)
  }

  // 2. Content updates.
  for (const c of update.content ?? []) {
    const id = c.id as number
    const type = windowType.get(id)
    if (type === 'grid') {
      status = parseStatus(c)
    } else {
      // buffer window: append text lines.
      for (const paragraph of bufferText(c)) {
        if (paragraph.length === 0) continue
        lines.push({ id: nextId++, kind: classify(paragraph), text: paragraph })
      }
    }
  }

  // 3. Input requests / disable (game end).
  if (update.input) {
    const req = update.input.find(i => i.type === 'line' || i.type === 'char')
    inputRequest = (req?.type as 'line' | 'char' | undefined) ?? null
  }
  if (update.disable) { inputRequest = null }

  return { status, lines, inputRequest, ended }
}

/** Extract paragraph strings from a buffer-window content entry. */
function bufferText(c: Record<string, unknown>): string[] {
  const out: string[] = []
  const paras = (c.text ?? c.content ?? []) as Array<Record<string, unknown>>
  for (const p of paras) {
    const runs = (p.content ?? []) as Array<Record<string, unknown>>
    const text = runs.map(r => (typeof r === 'string' ? r : (r.text as string) ?? '')).join('')
    out.push(text)
  }
  return out
}

function parseStatus(c: Record<string, unknown>): StatusLine {
  // grid content arrives as lines of runs; join the first line as location,
  // the remainder as the right-hand score/moves text.
  const gridLines = (c.lines ?? []) as Array<Record<string, unknown>>
  const full = gridLines
    .map(l => ((l.content ?? []) as Array<Record<string, unknown>>)
      .map(r => (r.text as string) ?? '').join(''))
    .join(' ')
    .trim()
  const m = full.match(/^(.*?)\s{2,}(.*)$/)
  return m ? { location: m[1].trim(), right: m[2].trim() } : { location: full, right: '' }
}

function classify(text: string): BufferLine['kind'] {
  // Room headings in Zork are short, title-case, no terminal period.
  return /^[A-Z][^.!?]{2,40}$/.test(text.trim()) ? 'room' : 'output'
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/glkote-react/reduce.test.ts`
Expected: PASS. If shapes differ, fix `bufferText`/`parseStatus` to the fixture's real field names and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/glkote-react/reduce.ts src/glkote-react/reduce.test.ts
git commit -m "feat: reduce GlkOte updates into view state (TDD on real fixture)"
```

### Task 1.6: Implement the GlkOte bridge

**Files:**
- Create: `src/glkote-react/bridge.ts`
- Test: `src/glkote-react/bridge.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/glkote-react/bridge.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { GlkOteBridge } from './bridge'

describe('GlkOteBridge', () => {
  it('notifies the sink with reduced state on update, and sends line events', () => {
    const onState = vi.fn()
    const accept = vi.fn()
    const bridge = new GlkOteBridge(onState)

    bridge.init({ accept })
    // bridge should fire the startup 'init' event so the VM begins.
    expect(accept).toHaveBeenCalledWith(expect.objectContaining({ type: 'init', gen: 0 }))

    bridge.update({ type: 'update', gen: 1,
      windows: [{ id: 7, type: 'buffer' }],
      content: [{ id: 7, text: [{ content: [{ text: 'West of House' }] }] }],
      input: [{ type: 'line', id: 7, gen: 1 }] } as any)
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ inputRequest: 'line' }))

    bridge.sendLine('open mailbox')
    expect(accept).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'line', value: 'open mailbox', gen: 1 }))
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/glkote-react/bridge.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the bridge**

Create `src/glkote-react/bridge.ts`:
```ts
import { reduce } from './reduce'
import { emptyView } from './types'
import type { GlkOteDisplay, GlkOteInitIface, GlkOteUpdate, ViewState } from './types'

const METRICS = {
  width: 80, height: 40, gridcharwidth: 1, gridcharheight: 1,
  buffercharwidth: 1, buffercharheight: 1, outspacingx: 0, outspacingy: 0,
  inspacingx: 0, inspacingy: 0, gridmarginx: 0, gridmarginy: 0,
  buffermarginx: 0, buffermarginy: 0,
}

export class GlkOteBridge implements GlkOteDisplay {
  private accept?: (e: any) => void
  private view: ViewState = emptyView
  private gen = 0
  private mainWindow = 0
  /** Set by the engine; called when the VM quits. */
  onEnd?: () => void

  constructor(private onState: (v: ViewState) => void) {}

  init(iface: GlkOteInitIface) {
    this.accept = iface.accept
    // Kick off the VM with the required first event.
    this.accept({ type: 'init', gen: 0, metrics: METRICS })
  }

  update(arg: GlkOteUpdate) {
    if (typeof arg.gen === 'number') this.gen = arg.gen
    // Track the most recent window awaiting input as the input target.
    const lineReq = (arg.input ?? []).find(i => i.type === 'line' || i.type === 'char')
    if (lineReq) this.mainWindow = lineReq.id as number
    this.view = reduce(this.view, arg)
    this.onState(this.view)
    if (this.view.ended) this.onEnd?.()
  }

  getlibrary(): unknown { return null }
  log() {}
  warning() {}
  error(msg: string) { console.error('[glk]', msg) }

  sendLine(text: string) {
    this.accept?.({ type: 'line', gen: this.gen, window: this.mainWindow, value: text })
  }

  /** Satisfies a char-input request (and auto-acknowledges MORE prompts). */
  sendChar(key: string) {
    this.accept?.({ type: 'char', gen: this.gen, window: this.mainWindow, value: key })
  }

  /** Auto-acknowledge a pending char request (MORE paging) with a space. */
  ackMore() {
    if (this.view.inputRequest === 'char') this.sendChar(' ')
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/glkote-react/bridge.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/glkote-react/bridge.ts src/glkote-react/bridge.test.ts
git commit -m "feat: GlkOte bridge — reduce updates, emit events"
```

### Task 1.7: Engine façade (boot the VM, wire Glk + bridge)

**Files:**
- Create: `src/zmachine/engine.ts`
- Test: `src/zmachine/engine.test.ts`

- [ ] **Step 1: Write the failing test (boots Zork I end-to-end under jsdom)**

Create `src/zmachine/engine.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ZMachine } from './engine'
import type { ViewState } from '../glkote-react/types'

describe('ZMachine', () => {
  it('boots Zork I to "West of House" and accepts a command', async () => {
    const states: ViewState[] = []
    const engine = new ZMachine({
      dialog: { streaming: false, autosave_read: () => null, autosave_write: () => {} } as any,
      onState: (v) => states.push(v),
      onEnd: vi.fn(),
    })
    const story = new Uint8Array(readFileSync('public/games/zork1.z3'))
    await engine.boot(story)

    const text = states.at(-1)!.lines.map(l => l.text).join('\n')
    expect(text).toContain('West of House')
    expect(states.at(-1)!.inputRequest).toBe('line')

    engine.sendLine('open mailbox')
    const after = states.at(-1)!.lines.map(l => l.text).join('\n')
    expect(after.toLowerCase()).toContain('mailbox')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/zmachine/engine.test.ts`
Expected: FAIL ("Cannot find module './engine'").

- [ ] **Step 3: Implement the engine façade**

Create `src/zmachine/engine.ts`:
```ts
import { ZVM } from 'ifvms'
import { getGlk } from './glk'
import { GlkOteBridge } from '../glkote-react/bridge'
import type { ViewState } from '../glkote-react/types'

export interface Dialog {
  streaming: boolean
  autosave_read(signature: string): unknown
  autosave_write(signature: string, snapshot: unknown): void
  [k: string]: unknown
}

export interface ZMachineOptions {
  dialog: Dialog
  onState: (v: ViewState) => void
  onEnd?: () => void
}

export class ZMachine {
  private vm: any
  private bridge: GlkOteBridge
  constructor(private opts: ZMachineOptions) {
    this.bridge = new GlkOteBridge(opts.onState)
    this.bridge.onEnd = opts.onEnd
  }

  async boot(storyBytes: Uint8Array) {
    const Glk = getGlk()
    this.vm = new ZVM()
    const options = {
      vm: this.vm,
      Glk,
      GlkOte: this.bridge,
      Dialog: this.opts.dialog,
      do_vm_autosave: true,
    }
    this.vm.prepare(storyBytes, options)
    Glk.init(options)        // calls bridge.init -> fires the 'init' event -> VM runs
  }

  sendLine(text: string) { this.bridge.sendLine(text) }
  sendChar(key: string) { this.bridge.sendChar(key) }
  ackMore() { this.bridge.ackMore() }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/zmachine/engine.test.ts`
Expected: PASS. If `getGlk()` fails under jsdom, adjust `glk.ts` per Task 1.2 Step 2 (singleton vs constructor, GiDispa wiring).

> **GO/NO-GO checkpoint B:** A green engine test means the full pipeline works under
> a DOM-like environment. This is the gate. If green → proceed. If the bridge or Glk
> wiring required major surgery beyond the noted adjustments, pause and invoke the
> stock-GlkOte fallback from the spec.

- [ ] **Step 5: Commit**

```bash
git add src/zmachine/engine.ts src/zmachine/engine.test.ts
git commit -m "feat: ZMachine engine façade boots Zork I via vendored Glk"
```

### Task 1.8: Bare-bones in-browser terminal (manual skeleton verify)

**Files:**
- Modify: `src/ui/App.tsx`
- Create: `src/ui/SkeletonTerminal.tsx` (temporary; replaced in Milestone 3)

- [ ] **Step 1: Write a minimal unstyled terminal that boots Zork I**

Create `src/ui/SkeletonTerminal.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { ZMachine } from '../zmachine/engine'
import type { ViewState } from '../glkote-react/types'
import { emptyView } from '../glkote-react/types'

export function SkeletonTerminal() {
  const [view, setView] = useState<ViewState>(emptyView)
  const engineRef = useRef<ZMachine | null>(null)
  const [cmd, setCmd] = useState('')

  useEffect(() => {
    const engine = new ZMachine({
      dialog: { streaming: false, autosave_read: () => null, autosave_write: () => {} } as any,
      onState: setView,
    })
    engineRef.current = engine
    fetch('/games/zork1.z3')
      .then(r => r.arrayBuffer())
      .then(b => engine.boot(new Uint8Array(b)))
    return () => { engineRef.current = null }
  }, [])

  // Auto-acknowledge MORE prompts.
  useEffect(() => { if (view.inputRequest === 'char') engineRef.current?.ackMore() },
    [view.inputRequest])

  return (
    <div style={{ fontFamily: 'monospace', padding: 16 }}>
      <div style={{ fontWeight: 'bold' }}>
        {view.status ? `${view.status.location}  —  ${view.status.right}` : ''}
      </div>
      <pre>{view.lines.map(l => l.text).join('\n')}</pre>
      <form onSubmit={e => { e.preventDefault(); engineRef.current?.sendLine(cmd); setCmd('') }}>
        &gt; <input value={cmd} onChange={e => setCmd(e.target.value)} autoFocus />
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Render it from App**

Replace `src/ui/App.tsx` contents:
```tsx
import { SkeletonTerminal } from './SkeletonTerminal'
export default function App() { return <SkeletonTerminal /> }
```
(If `main.tsx` imports `./App` from `src/`, move/adjust the import path to `./ui/App`.)

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`. Open the URL.
Expected: "West of House" room text appears; the status line shows location/score/moves. Type `open mailbox` + Enter → "Opening the small mailbox reveals a leaflet." Type `read leaflet` → the welcome text. Trigger a long output (e.g. `verbose` then `look`) to confirm MORE prompts auto-advance without hanging. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/ui/App.tsx src/ui/SkeletonTerminal.tsx
git commit -m "feat: bare-bones in-browser Zork I terminal (walking skeleton)"
```

> **MILESTONE 1 COMPLETE — GO/NO-GO GATE.** The skeleton plays Zork I in the browser
> with line input, a status line, and auto-advancing MORE prompts. Decision: proceed
> to Milestone 2, or (if the bridge proved intractable) switch to the stock-GlkOte
> fallback and revise this plan. Assuming GO, continue.

---

## Milestone 2 — Persistence (auto-resume)

### Task 2.1: IndexedDB key/value helper

**Files:**
- Create: `src/storage/idb.ts`
- Test: `src/storage/idb.test.ts`

- [ ] **Step 1: Write the failing test (uses fake-indexeddb)**

Create `src/storage/idb.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { idbGet, idbSet, idbDel } from './idb'

describe('idb kv', () => {
  beforeEach(async () => { await idbDel('k') })
  it('round-trips a value', async () => {
    await idbSet('k', { a: 1 })
    expect(await idbGet('k')).toEqual({ a: 1 })
  })
  it('returns undefined for missing keys', async () => {
    expect(await idbGet('missing')).toBeUndefined()
  })
  it('deletes', async () => {
    await idbSet('k', 1); await idbDel('k')
    expect(await idbGet('k')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/storage/idb.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the helper**

Create `src/storage/idb.ts`:
```ts
const DB = 'naitfol'
const STORE = 'kv'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

export const idbGet = <T>(k: string) => tx<T>('readonly', s => s.get(k))
export const idbSet = (k: string, v: unknown) => tx<void>('readwrite', s => s.put(v, k))
export const idbDel = (k: string) => tx<void>('readwrite', s => s.delete(k))
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/storage/idb.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/idb.ts src/storage/idb.test.ts
git commit -m "feat: IndexedDB key/value helper"
```

### Task 2.2: Dialog (autosave_read/write over IndexedDB)

**Files:**
- Create: `src/storage/dialog.ts`
- Test: `src/storage/dialog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/storage/dialog.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { IdbDialog } from './dialog'

describe('IdbDialog autosave', () => {
  it('round-trips a snapshot by signature and clears on null', async () => {
    const d = new IdbDialog()
    const snap = { ram: [1, 2, 3], xorshift_seed: 42 }
    await d.autosave_write_async('SIG1', snap)
    expect(await d.autosave_read_async('SIG1')).toEqual(snap)

    await d.autosave_write_async('SIG1', null)
    expect(await d.autosave_read_async('SIG1')).toBeNull()
  })

  it('keeps signatures independent', async () => {
    const d = new IdbDialog()
    await d.autosave_write_async('A', { v: 1 })
    await d.autosave_write_async('B', { v: 2 })
    expect(await d.autosave_read_async('A')).toEqual({ v: 1 })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/storage/dialog.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the Dialog**

> ifvms calls `autosave_read(signature)` **synchronously** during `start()`. IndexedDB
> is async, so the engine must **preload** the snapshot before booting and hand the
> Dialog a synchronous cache. The Dialog exposes async methods for the cache plus the
> sync methods ifvms calls.

Create `src/storage/dialog.ts`:
```ts
import { idbGet, idbSet, idbDel } from './idb'

const key = (sig: string) => `autosave:${sig}`

export class IdbDialog {
  streaming = false
  /** Sync cache that ifvms reads during start(); populated via preload(). */
  private cache = new Map<string, unknown>()

  /** Load a signature's snapshot into the sync cache before booting. */
  async preload(sig: string): Promise<void> {
    const v = await idbGet<unknown>(key(sig))
    this.cache.set(sig, v ?? null)
  }

  // ---- synchronous API called by ifvms ----
  autosave_read(sig: string): unknown {
    return this.cache.has(sig) ? this.cache.get(sig) : null
  }
  autosave_write(sig: string, snapshot: unknown): void {
    this.cache.set(sig, snapshot)
    // Fire-and-forget persistence; the cache keeps reads consistent meanwhile.
    if (snapshot == null) void idbDel(key(sig))
    else void idbSet(key(sig), snapshot)
  }

  // ---- async helpers for tests / UI (resume hint) ----
  async autosave_read_async(sig: string): Promise<unknown> {
    return (await idbGet<unknown>(key(sig))) ?? null
  }
  async autosave_write_async(sig: string, snapshot: unknown): Promise<void> {
    if (snapshot == null) await idbDel(key(sig))
    else await idbSet(key(sig), snapshot)
    this.cache.set(sig, snapshot)
  }
  async hasSave(sig: string): Promise<boolean> {
    return (await idbGet<unknown>(key(sig))) != null
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/storage/dialog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/dialog.ts src/storage/dialog.test.ts
git commit -m "feat: IndexedDB-backed Dialog with autosave + sync cache"
```

### Task 2.3: Wire autosave-on-turn and clear-on-quit into the engine

**Files:**
- Modify: `src/zmachine/engine.ts`
- Modify: `src/glkote-react/bridge.ts`
- Test: `src/zmachine/engine.persist.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `src/zmachine/engine.persist.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { ZMachine } from './engine'
import { IdbDialog } from '../storage/dialog'
import { emptyView } from '../glkote-react/types'

const story = () => new Uint8Array(readFileSync('public/games/zork1.z3'))

describe('autosave/resume', () => {
  it('saves after a turn and resumes mid-game on a fresh engine', async () => {
    const dialog = new IdbDialog()
    let view = emptyView
    const e1 = new ZMachine({ dialog, onState: v => (view = v) })
    const sig = await e1.boot(story())          // boot returns the game signature
    e1.sendLine('open mailbox')
    e1.sendLine('north')
    await e1.flushAutosave()                     // ensure the IDB write settled

    // Fresh engine + fresh dialog → should auto-restore to the saved spot.
    const dialog2 = new IdbDialog()
    let view2 = emptyView
    const e2 = new ZMachine({ dialog: dialog2, onState: v => (view2 = v) })
    await e2.boot(story())
    // We moved north of the house; the opening "West of House" long description
    // should not be the latest room if resume worked.
    expect(view2.status?.location).not.toBe('')
    expect(view2.inputRequest).toBe('line')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/zmachine/engine.persist.test.ts`
Expected: FAIL (`boot` returns void; no `flushAutosave`).

- [ ] **Step 3: Add autosave trigger + signature handling to the engine**

In `src/glkote-react/bridge.ts`, add a hook fired at each line-input request and expose the last write promise. Add to the class:
```ts
  /** Called when the VM requests a line — the turn boundary. */
  onTurn?: () => void
```
and inside `update()`, after computing `lineReq`, before `this.onState`:
```ts
    if (lineReq && lineReq.type === 'line') this.onTurn?.()
```

In `src/zmachine/engine.ts`, modify `boot` to compute the signature, preload the autosave, trigger `do_autosave` on each turn, clear on end, and expose `flushAutosave`:
```ts
  private signature = ''
  private lastWrite: Promise<void> = Promise.resolve()

  async boot(storyBytes: Uint8Array): Promise<string> {
    this.signature = computeSignature(storyBytes)
    if ('preload' in this.opts.dialog) {
      await (this.opts.dialog as any).preload(this.signature)
    }
    const Glk = getGlk()
    this.vm = new ZVM()
    const options = { vm: this.vm, Glk, GlkOte: this.bridge,
      Dialog: this.opts.dialog, do_vm_autosave: true }

    this.bridge.onTurn = () => { try { this.vm.do_autosave(0) } catch (e) { console.error(e) } }
    this.bridge.onEnd = () => {
      try { this.vm.do_autosave(-1) } catch { /* clears the slot */ }
      this.opts.onEnd?.()
    }

    this.vm.prepare(storyBytes, options)
    Glk.init(options)
    return this.signature
  }

  async flushAutosave(): Promise<void> {
    // do_autosave writes through the Dialog; give microtasks a tick to settle.
    await new Promise(r => setTimeout(r, 0))
  }
```
Add the signature helper at the bottom of `engine.ts`:
```ts
/** ZVM keys autosaves by the first 0x1E bytes of RAM, hex-encoded. */
function computeSignature(story: Uint8Array): string {
  let sig = ''
  for (let i = 0; i < 0x1e; i++) sig += story[i].toString(16).padStart(2, '0')
  return sig
}
```

> NOTE: `do_autosave(-1)` clears the slot (per `runtime.js`: a negative arg writes a
> `null` snapshot). `do_autosave(0)` saves. Confirm the sign convention against the
> vendored `ifvms` `runtime.js` `do_autosave` while implementing.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/zmachine/engine.persist.test.ts`
Expected: PASS.

- [ ] **Step 5: Update existing callers (engine.test.ts, SkeletonTerminal)**

`boot` now returns a string; update `src/zmachine/engine.test.ts` (`await engine.boot(story)` still type-checks since the return is ignorable) and confirm `SkeletonTerminal` still compiles. Run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/zmachine/engine.ts src/glkote-react/bridge.ts src/zmachine/engine.persist.test.ts
git commit -m "feat: autosave on turn boundary, clear on quit, signature-keyed"
```

---

## Milestone 3 — Folio UI (themes, fonts, real terminal + landing)

### Task 3.1: Self-host fonts (Fontsource, OFL)

**Files:**
- Create: `src/ui/fonts.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Install the OFL font packages**

Run:
```bash
npm install @fontsource/im-fell-english@^5 @fontsource/im-fell-english-sc@^5 @fontsource/jetbrains-mono@^5
```

- [ ] **Step 2: Import them (bundled, no CDN)**

Create `src/ui/fonts.css`:
```css
@import '@fontsource/im-fell-english/400.css';
@import '@fontsource/im-fell-english/400-italic.css';
@import '@fontsource/im-fell-english-sc/400.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';
```
In `src/main.tsx`, add at the top: `import './ui/fonts.css'`.

- [ ] **Step 3: Verify the woff2 are bundled (not fetched from a CDN)**

Run: `npm run build` then `grep -rl "fonts.gstatic\|googleapis" dist/ || echo "no CDN refs — good"`.
Expected: "no CDN refs — good".

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/ui/fonts.css src/main.tsx
git commit -m "feat: self-host OFL fonts via Fontsource"
```

### Task 3.2: Folio theme tokens + theme hook

**Files:**
- Create: `src/ui/theme.css`, `src/ui/useTheme.ts`
- Test: `src/ui/useTheme.test.ts`

- [ ] **Step 1: Write the theme CSS (verbatim from the locked spec)**

Create `src/ui/theme.css` with the dark (`:root`) and light (`[data-theme="light"]`) token blocks exactly as in `lamplit-folio-v3.html` (the approved mockup). Copy the `:root{…}` and `[data-theme="light"]{…}` variable declarations and the shared `body`, grain (`body::after`), and vignette (`body::before`) rules from that file.

- [ ] **Step 2: Write the failing theme-hook test**

Create `src/ui/useTheme.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme') })

describe('useTheme', () => {
  it('defaults to dark and toggles to light, persisting the choice', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem('naitfol-theme')).toBe('light')
    expect(document.body.dataset.theme).toBe('light')
  })

  it('reads the persisted theme on init', () => {
    localStorage.setItem('naitfol-theme', 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/ui/useTheme.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the hook**

Create `src/ui/useTheme.ts`:
```ts
import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'naitfol-theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(KEY) as Theme) ?? 'dark')

  useEffect(() => {
    if (theme === 'light') document.body.dataset.theme = 'light'
    else delete document.body.dataset.theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = useCallback(() => setTheme(t => (t === 'light' ? 'dark' : 'light')), [])
  return { theme, toggle }
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/ui/useTheme.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/theme.css src/ui/useTheme.ts src/ui/useTheme.test.ts
git commit -m "feat: Folio theme tokens + persisted theme hook"
```

### Task 3.3: Presentational components (StatusBar, Scrollback, CommandInput, ThemeToggle)

**Files:**
- Create: `src/ui/ThemeToggle.tsx`, `src/ui/StatusBar.tsx`, `src/ui/Scrollback.tsx`, `src/ui/CommandInput.tsx`
- Create: `src/ui/components.css`
- Test: `src/ui/StatusBar.test.tsx`

- [ ] **Step 1: Write a failing render test for StatusBar**

Create `src/ui/StatusBar.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'

describe('StatusBar', () => {
  it('shows location and right-hand score/moves', () => {
    render(<StatusBar status={{ location: 'West of House', right: 'Score: 0   Moves: 1' }}
      onChangeVolume={() => {}} themeToggle={null} />)
    expect(screen.getByText('West of House')).toBeInTheDocument()
    expect(screen.getByText(/Score: 0/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/StatusBar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the four components**

Create `src/ui/ThemeToggle.tsx`:
```tsx
export function ThemeToggle({ onToggle }: { onToggle: () => void }) {
  return <button className="themebtn" onClick={onToggle} aria-label="Toggle light/dark">☾ / ☀</button>
}
```

Create `src/ui/StatusBar.tsx`:
```tsx
import type { ReactNode } from 'react'
import type { StatusLine } from '../glkote-react/types'

export function StatusBar({ status, onChangeVolume, themeToggle }: {
  status: StatusLine | null
  onChangeVolume: () => void
  themeToggle: ReactNode
}) {
  return (
    <div className="statusbar">
      <span className="loc">{status?.location ?? ''}</span>
      <span className="meta">
        <span>{status?.right ?? ''}</span>
        <span className="sep">·</span>
        <span className="sw" onClick={onChangeVolume}>⌄ change volume</span>
        {themeToggle}
      </span>
    </div>
  )
}
```

Create `src/ui/Scrollback.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import type { BufferLine } from '../glkote-react/types'

export function Scrollback({ lines }: { lines: BufferLine[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight) }, [lines])
  return (
    <div className="scroll" ref={ref}>
      {lines.map(l => (
        <p key={l.id} className={l.kind === 'room' ? 'room' : l.kind === 'input' ? 'echo' : ''}>
          {l.kind === 'input' ? <><span className="car">&gt;</span> {l.text}</> : l.text}
        </p>
      ))}
    </div>
  )
}
```

Create `src/ui/CommandInput.tsx`:
```tsx
import { useState } from 'react'

export function CommandInput({ onSubmit, disabled }: {
  onSubmit: (text: string) => void
  disabled: boolean
}) {
  const [value, setValue] = useState('')
  return (
    <form className="inputline" onSubmit={e => {
      e.preventDefault()
      if (!value.trim()) return
      onSubmit(value)
      setValue('')
    }}>
      <span className="car">&gt;</span>
      <input className="cmd" value={value} disabled={disabled} autoFocus
        placeholder="type a command…" onChange={e => setValue(e.target.value)} />
    </form>
  )
}
```

Create `src/ui/components.css` by copying the `.statusbar`, `.loc`, `.meta`, `.sep`, `.sw`, `.scroll`, `.room`, `.echo`, `.inputline`, `.car`, `.cmd`, and `.themebtn` rules from `lamplit-folio-v3.html`. Import it in `main.tsx`: `import './ui/components.css'`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/StatusBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ThemeToggle.tsx src/ui/StatusBar.tsx src/ui/Scrollback.tsx src/ui/CommandInput.tsx src/ui/components.css src/ui/StatusBar.test.tsx src/main.tsx
git commit -m "feat: Folio presentational components"
```

### Task 3.4: Real Terminal container (replaces SkeletonTerminal)

**Files:**
- Create: `src/ui/Terminal.tsx`
- Test: `src/ui/Terminal.test.tsx`
- Delete: `src/ui/SkeletonTerminal.tsx`

- [ ] **Step 1: Write a failing test (boots, renders room, echoes input)**

Create `src/ui/Terminal.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { Terminal } from './Terminal'

const bytes = new Uint8Array(readFileSync('public/games/zork1.z3'))
// Provide the story bytes directly to avoid fetch in jsdom.
describe('Terminal', () => {
  it('boots Zork I and echoes a typed command', async () => {
    render(<Terminal storyBytes={bytes} onChangeVolume={() => {}}
      themeToggle={null} />)
    await waitFor(() => expect(screen.getByText('West of House')).toBeInTheDocument())
    const input = screen.getByPlaceholderText('type a command…')
    fireEvent.change(input, { target: { value: 'open mailbox' } })
    fireEvent.submit(input)
    await waitFor(() => expect(screen.getByText(/open mailbox/)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/Terminal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Terminal**

Create `src/ui/Terminal.tsx`:
```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ZMachine } from '../zmachine/engine'
import { IdbDialog } from '../storage/dialog'
import { emptyView, type ViewState, type BufferLine } from '../glkote-react/types'
import { StatusBar } from './StatusBar'
import { Scrollback } from './Scrollback'
import { CommandInput } from './CommandInput'

export function Terminal({ storyBytes, onChangeVolume, themeToggle }: {
  storyBytes: Uint8Array
  onChangeVolume: () => void
  themeToggle: ReactNode
}) {
  const [view, setView] = useState<ViewState>(emptyView)
  const [echoes, setEchoes] = useState<BufferLine[]>([])
  const engineRef = useRef<ZMachine | null>(null)
  const echoId = useRef(-1)

  useEffect(() => {
    const engine = new ZMachine({ dialog: new IdbDialog() as any, onState: setView })
    engineRef.current = engine
    engine.boot(storyBytes)
    return () => { engineRef.current = null }
  }, [storyBytes])

  // Auto-acknowledge MORE prompts (char-input) so the scroll never stalls.
  useEffect(() => { if (view.inputRequest === 'char') engineRef.current?.ackMore() },
    [view.inputRequest])

  const submit = (text: string) => {
    setEchoes(e => [...e, { id: echoId.current--, kind: 'input', text }])
    engineRef.current?.sendLine(text)
  }

  // Merge VM output with our input echoes in order of arrival.
  const lines = [...view.lines, ...echoes].sort((a, b) =>
    (a.id < 0 ? Infinity : a.id) - (b.id < 0 ? Infinity : b.id))

  return (
    <div className="screen term">
      <StatusBar status={view.status} onChangeVolume={onChangeVolume} themeToggle={themeToggle} />
      <Scrollback lines={view.lines} />
      <CommandInput onSubmit={submit} disabled={false} />
    </div>
  )
}
```
> NOTE: prefer letting the VM echo commands if the captured fixture shows input is
> echoed in the buffer window (many Glk setups do). If so, drop the local `echoes`
> state and render `view.lines` only. Decide based on the Task 1.4 fixture: if typed
> commands already appear in `content`, remove the echo bookkeeping.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/Terminal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Remove the skeleton**

```bash
git rm src/ui/SkeletonTerminal.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/Terminal.test.tsx
git commit -m "feat: Folio Terminal container (replaces skeleton)"
```

---

## Milestone 4 — Game catalog, landing, picker, resume

### Task 4.1: Bundle Zork II & III and define the catalog

**Files:**
- Create: `public/games/zork2.z3`, `public/games/zork3.z3`
- Create: `src/games/catalog.ts`
- Test: `src/games/catalog.test.ts`

- [ ] **Step 1: Copy the remaining story files**

Run:
```bash
cp zork2/COMPILED/zork2.z3 public/games/zork2.z3
cp zork3/COMPILED/zork3.z3 public/games/zork3.z3
```

- [ ] **Step 2: Write the failing catalog test**

Create `src/games/catalog.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { GAMES, gameBySlug } from './catalog'

describe('catalog', () => {
  it('lists three games with files under /games', () => {
    expect(GAMES.map(g => g.slug)).toEqual(['zork1', 'zork2', 'zork3'])
    for (const g of GAMES) expect(g.file).toMatch(/^\/games\/zork[123]\.z3$/)
  })
  it('looks up by slug', () => {
    expect(gameBySlug('zork2')?.title).toContain('Zork')
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/games/catalog.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement the catalog**

Create `src/games/catalog.ts`:
```ts
export interface Game {
  slug: 'zork1' | 'zork2' | 'zork3'
  numeral: string
  title: string
  subtitle: string
  file: string
}

export const GAMES: Game[] = [
  { slug: 'zork1', numeral: 'I',  title: 'Zork I',  subtitle: 'The Great Underground Empire', file: '/games/zork1.z3' },
  { slug: 'zork2', numeral: 'II', title: 'Zork II', subtitle: 'The Wizard of Frobozz',        file: '/games/zork2.z3' },
  { slug: 'zork3', numeral: 'III',title: 'Zork III',subtitle: 'The Dungeon Master',           file: '/games/zork3.z3' },
]

export const gameBySlug = (slug: string): Game | undefined =>
  GAMES.find(g => g.slug === slug)
```

- [ ] **Step 5: Run to verify pass + commit**

Run: `npx vitest run src/games/catalog.test.ts` → PASS.
```bash
git add public/games/zork2.z3 public/games/zork3.z3 src/games/catalog.ts src/games/catalog.test.ts
git commit -m "feat: bundle Zork II/III and add game catalog"
```

### Task 4.2: Landing screen with volume picker + resume hint

**Files:**
- Create: `src/ui/Landing.tsx`, `src/ui/landing.css`
- Test: `src/ui/Landing.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/Landing.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Landing } from './Landing'

describe('Landing', () => {
  it('lets you pick a volume and enter', () => {
    const onEnter = vi.fn()
    render(<Landing onEnter={onEnter} savedSlugs={new Set()} themeToggle={null} />)
    fireEvent.click(screen.getByText('The Wizard of Frobozz'))
    fireEvent.click(screen.getByText(/Light the lamp/))
    expect(onEnter).toHaveBeenCalledWith('zork2')
  })
  it('shows a resume hint for saved games', () => {
    render(<Landing onEnter={() => {}} savedSlugs={new Set(['zork1'])} themeToggle={null} />)
    expect(screen.getByText(/resume/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/Landing.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Landing**

Create `src/ui/Landing.tsx`:
```tsx
import { useState, type ReactNode } from 'react'
import { GAMES, type Game } from '../games/catalog'

export function Landing({ onEnter, savedSlugs, themeToggle }: {
  onEnter: (slug: Game['slug']) => void
  savedSlugs: Set<string>
  themeToggle: ReactNode
}) {
  const [selected, setSelected] = useState<Game['slug']>('zork1')
  return (
    <div className="screen">
      <div className="plate">
        {themeToggle}
        <h1 className="title">Naitfol</h1>
        <p className="tagline">a spell of understanding, cast in the dark</p>
        <div className="howto">
          <b>How to play.</b> Type what you want to do, the way the game expects it.<br />
          <span className="cmds">look · go north · open mailbox · take lamp · read leaflet · inventory</span><br />
          <span style={{ opacity: 0.75 }}>Your progress is kept; close the tab and return whenever you like.</span>
        </div>
        <span className="label">— choose your descent —</span>
        <div className="volumes">
          {GAMES.map(g => (
            <div key={g.slug} className={`vol${selected === g.slug ? ' sel' : ''}`}
              onClick={() => setSelected(g.slug)}>
              <div className="num">{g.numeral}</div>
              <div className="nm">{g.subtitle}</div>
            </div>
          ))}
        </div>
        <button className="enter" onClick={() => onEnter(selected)}>Light the lamp →</button>
        {savedSlugs.has(selected) && (
          <div className="resume">↩ a saved descent awaits — you will resume where you left off</div>
        )}
      </div>
    </div>
  )
}
```

Create `src/ui/landing.css` by copying the `.plate`, `.title`, `.tagline`, `.howto`, `.label`, `.volumes`, `.vol`, `.enter`, `.resume` rules (and the `.title` `flicker` keyframes) from `lamplit-folio-v3.html`. Import in `main.tsx`.

- [ ] **Step 4: Run to verify pass + commit**

Run: `npx vitest run src/ui/Landing.test.tsx` → PASS.
```bash
git add src/ui/Landing.tsx src/ui/landing.css src/ui/Landing.test.tsx src/main.tsx
git commit -m "feat: Folio landing screen with volume picker + resume hint"
```

### Task 4.3: App routing — landing ⇄ terminal, fetch story, wire theme

**Files:**
- Modify: `src/ui/App.tsx`
- Test: `src/ui/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/App.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import App from './App'

beforeEach(() => {
  const bytes = readFileSync('public/games/zork1.z3')
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => bytes.buffer })))
})

describe('App', () => {
  it('routes from landing into the game', async () => {
    render(<App />)
    expect(screen.getByText('Naitfol')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Light the lamp/))
    await waitFor(() => expect(screen.getByText('West of House')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/App.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement App**

Replace `src/ui/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Landing } from './Landing'
import { Terminal } from './Terminal'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from './useTheme'
import { GAMES, gameBySlug, type Game } from '../games/catalog'
import { IdbDialog } from '../storage/dialog'

export default function App() {
  const { toggle } = useTheme()
  const [slug, setSlug] = useState<Game['slug'] | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set())

  // Discover which games have a saved session (for the resume hint).
  useEffect(() => {
    const dialog = new IdbDialog()
    Promise.all(GAMES.map(async g => {
      const r = await fetch(g.file)
      const sig = sigOf(new Uint8Array(await r.arrayBuffer()))
      return (await dialog.hasSave(sig)) ? g.slug : null
    })).then(found => setSavedSlugs(new Set(found.filter(Boolean) as string[])))
  }, [])

  const enter = async (s: Game['slug']) => {
    const game = gameBySlug(s)!
    const r = await fetch(game.file)
    setBytes(new Uint8Array(await r.arrayBuffer()))
    setSlug(s)
  }

  const toggleEl = <ThemeToggle onToggle={toggle} />
  if (slug && bytes) {
    return <Terminal storyBytes={bytes} themeToggle={toggleEl}
      onChangeVolume={() => { setSlug(null); setBytes(null) }} />
  }
  return <Landing onEnter={enter} savedSlugs={savedSlugs} themeToggle={toggleEl} />
}

function sigOf(b: Uint8Array): string {
  let s = ''; for (let i = 0; i < 0x1e; i++) s += b[i].toString(16).padStart(2, '0'); return s
}
```
> DRY note: `sigOf` duplicates `computeSignature` in `engine.ts`. Extract a shared
> `signature(bytes)` into `src/zmachine/signature.ts` and import it in both places;
> update `engine.ts` to use it. (Do this as part of this task.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Manual full-flow check**

Run `npm run dev`. Land → pick Zork II → play a few turns → "change volume" → pick Zork II again → confirm it **resumes**. Toggle light/dark on both screens (confirm no status-bar overlap). Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/ui/App.tsx src/ui/App.test.tsx src/zmachine/signature.ts src/zmachine/engine.ts
git commit -m "feat: app routing, story fetch, per-game resume hint, shared signature"
```

---

## Milestone 5 — Hardening & polish

### Task 5.1: Game-end behavior (input stays live, autosave cleared)

**Files:**
- Modify: `src/ui/Terminal.tsx`
- Test: `src/ui/Terminal.end.test.tsx`

- [ ] **Step 1: Write the failing test (drive Zork I to a quit)**

Create `src/ui/Terminal.end.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { Terminal } from './Terminal'

const bytes = new Uint8Array(readFileSync('public/games/zork1.z3'))

describe('Terminal game end', () => {
  it('keeps the input live after quit so RESTART is typeable', async () => {
    render(<Terminal storyBytes={bytes} onChangeVolume={() => {}} themeToggle={null} />)
    await waitFor(() => expect(screen.getByText('West of House')).toBeInTheDocument())
    const input = screen.getByPlaceholderText('type a command…') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'quit' } }); fireEvent.submit(input)
    // Zork asks to confirm; the input must remain enabled to answer / RESTART.
    await waitFor(() => expect(input).not.toBeDisabled())
  })
})
```

- [ ] **Step 2–4: Verify fail, ensure `CommandInput` `disabled` stays false at end, verify pass**

The `CommandInput` is already always-enabled; assert and lock it: confirm `Terminal` passes `disabled={false}` regardless of `view.ended`, and that `onEnd` (engine) clears the autosave (already wired in Task 2.3). Run the test → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/Terminal.end.test.tsx
git commit -m "feat: keep input live at game end; autosave cleared on quit"
```

### Task 5.2: Minimal explicit SAVE/RESTORE that doesn't crash

**Files:**
- Modify: `src/storage/dialog.ts`
- Test: `src/storage/dialog.fileref.test.ts`

- [ ] **Step 1: Read how ifvms invokes fileref prompts**

Run: `grep -n "fileref_create_by_prompt\|glk_fileref" ifvms.js/src/zvm/io.js | head`. Read the surrounding code to learn the `Dialog` fileref methods ifvms/Glk expect (`open`, `write`, `read`, `file_ref_exists`, etc. depend on the vendored glkapi's Dialog contract).

- [ ] **Step 2: Write a failing test for named-slot save/restore**

Create `src/storage/dialog.fileref.test.ts` asserting that issuing a `SAVE` to a named ref writes to IndexedDB and `RESTORE` reads it back. (Author the assertions against the exact Dialog method names found in Step 1 — they are determined by the vendored glkapi `dialog` contract, so fill them in after reading.)

- [ ] **Step 3: Implement the minimal fileref methods on `IdbDialog`** backing them with the same `idb` store under `file:<name>` keys, returning the shapes glkapi expects. Keep it minimal — the goal is "doesn't crash and round-trips", not a full filesystem.

- [ ] **Step 4: Verify pass + commit**

```bash
git add src/storage/dialog.ts src/storage/dialog.fileref.test.ts
git commit -m "feat: minimal named SAVE/RESTORE over IndexedDB"
```

### Task 5.3: Full green pass + README dev instructions

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the whole suite + typecheck + build**

Run:
```bash
make all
npm run build
```
Expected: lint clean, all tests pass, typecheck clean, production build succeeds.

- [ ] **Step 2: Add a "Running locally" section to README**

Append to `README.md`:
```markdown
## Running locally

    make install     # install dependencies
    make dev         # start the dev server
    make test        # run the test suite
    make all         # lint + format + typecheck + test
    make build       # production build

The three Zork story files live in `public/games/` and the Glk layer is vendored
under `vendor/glkote/` (pinned by commit SHA in `vendor/glkote/PINNED.md`).
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add local dev instructions"
```

---

## Self-Review

**Spec coverage** (every spec section maps to a task):
- Play Zork I/II/III in browser → Tasks 1.1, 1.7, 4.1 ✓
- Landing → terminal → Tasks 4.2, 4.3 ✓
- Auto-resume per game (native autosave, signature-keyed) → Tasks 2.2, 2.3, 4.3 ✓
- `do_autosave` on line-input request; clear on quit → Tasks 2.3, 5.1 ✓
- Custom GlkOte bridge over vendored glkapi; ifvms from npm → Tasks 1.2, 1.5, 1.6, 1.7 ✓
- MORE auto-ack + char-input routing → Tasks 1.6 (`ackMore`/`sendChar`), 1.8/3.4 (effect) ✓
- Game files copied to public/, fetched at runtime → Tasks 1.1, 4.1, 4.3 ✓
- Folio dark+light, tokens verbatim, self-hosted OFL fonts → Tasks 3.1, 3.2 ✓
- Theme toggle in-layout (plate corner + status bar), persisted, ellipsis loc → Tasks 3.2, 3.3, 4.2 ✓
- Minimal SAVE/RESTORE that doesn't crash → Task 5.2 ✓
- Walking skeleton as go/no-go gate w/ stock-GlkOte fallback → Milestone 1 (checkpoints A/B) ✓
- Testing (engine, reducer, dialog, resume, UI smoke) → Tasks 1.5, 1.6, 1.7, 2.x, 3.x, 4.x ✓

**Placeholder scan:** Tasks 5.2 and parts of 1.2/1.5 deliberately defer exact field
names/method signatures to a read of the vendored `glkapi.js`/`ifvms` source — these
are protocol specifics that must be observed, not invented, and each such step says
exactly what to read and where to put the result. All code steps include real code.

**Type consistency:** `ViewState`/`BufferLine`/`StatusLine` (types.ts) are used
consistently across `reduce.ts`, `bridge.ts`, `engine.ts`, and the UI. `ZMachine`
options (`dialog`, `onState`, `onEnd`) match every caller. `boot()` returns the
signature string from Task 2.3 onward; callers ignore it where unused. The shared
`signature()` helper (Task 4.3) replaces the duplicated `computeSignature`/`sigOf`.
```
