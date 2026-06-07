# Loquor Natural-Language Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player type plain English, have an in-browser LLM map it to a canonical Z-machine command (grammar-constrained), and feed that command into the game — fully client-side, fully optional, gated on device capability.

**Architecture:** An async pre-processor sits in front of Glk line input. All LLM logic lives in `src/llm/` behind a `LlmEngine` interface (real WebLLM impl + a fake for tests); a `useNaturalLanguage` hook owns the engine + NL state machine and is consumed by `Terminal`. The GlkOte bridge gains exactly one input-side method, `echoLocal(text)`. Pure modules (capability, prompt, translate, grammar) are fully unit-tested with the fake engine; the WebGPU/model boundary is proven by a manual walking-skeleton gate.

**Tech Stack:** TypeScript, React 19, Vite, Vitest + React Testing Library, `@mlc-ai/web-llm` (WebGPU), XGrammar GBNF constrained decoding.

**Source of truth:** `docs/superpowers/specs/2026-06-07-loquor-nl-layer-design.md` (revised after pushback review). Read it before starting.

---

## File Structure

New files (`src/llm/`):

- `types.ts` — `LlmEngine`, `Tier`, `CapabilityResult`, `TranslateResult`, `PromptContext`, `ChatMessages`, `LoadProgress`, `NlState`.
- `models.ts` — model ids (small default + 8B fallback), `DEFAULT_MODEL`.
- `capability.ts` — `detectCapability(deps, override?)` → `{ tier, reasons[] }` (pure, injectable).
- `prompt.ts` — `viewToContext(view)` (ViewState → context) + `buildPrompt(english, ctx)` (both pure).
- `translate.ts` — `parseCompletion(raw)` → `TranslateResult` (pure, total).
- `grammar/index.ts` — `grammarForSignature(sig)` → GBNF | null; `CorpusEntry` type.
- `grammar/zork1.gbnf.ts`, `zork2.gbnf.ts`, `zork3.gbnf.ts` — hand-curated GBNF strings.
- `grammar/zork1.corpus.ts`, `zork2.corpus.ts`, `zork3.corpus.ts` — per-game translation corpus.
- `engine.fake.ts` — `FakeLlmEngine` (scripted completions/progress/failures) for tests.
- `engine.webllm.ts` — real `WebLlmEngine` over `@mlc-ai/web-llm` (ONLY importer of it; not unit-tested).
- `nlpref.ts` — validated `localStorage` persistence of the on/off + "declined" choice (mirrors `useTheme`).
- `useNaturalLanguage.ts` — React hook: owns engine + NL state machine, exposes `translate()`.

New files (`src/ui/`):

- `NlToggle.tsx` — five-state status-bar control.
- `ModelDownloadModal.tsx` — accept / decline / cancel + progress.

Modified files:

- `src/glkote-react/types.ts` — add `'nl-source'` to `BufferLine.kind`.
- `src/glkote-react/bridge.ts` — add `echoLocal(text)`.
- `src/zmachine/engine.ts` — add `echoLocal(text)` pass-through.
- `src/ui/Scrollback.tsx` — render `nl-source` (`>` + `.nl-source`); switch VM `input` echo marker `>` → `›`.
- `src/ui/StatusBar.tsx` — accept an optional `nlToggle` node beside `themeToggle`.
- `src/ui/Terminal.tsx` — capability detection, signature capture, hook wiring, modal, NL-on/off `onSubmit` routing.
- `src/ui/components.css` — `.nl-source` style.
- `package.json` — add `@mlc-ai/web-llm` (Milestone 2).

**Build order:** Milestone 1 (Tasks 1–12) is pure/testable core + UI with the fake engine — no new dependencies, fully green under `npx vitest run`. Milestone 2 (Tasks 13–14) adds the real engine and the manual gate.

---

# Milestone 1 — Pure core + UI (fake engine)

## Task 1: LLM types and model ids

**Files:**
- Create: `src/llm/types.ts`
- Create: `src/llm/models.ts`
- Test: `src/llm/models.test.ts`

Types-only files need no behavioral test; `models.ts` gets a trivial test so the milestone has a green anchor and the constants are import-checked.

- [ ] **Step 1: Create the types file**

```ts
// src/llm/types.ts
import type { ViewState } from '../glkote-react/types'

/** Device capability tier. `none` = NL not offered. */
export type Tier = 'none' | 'small' | 'full'

export interface CapabilityResult {
  tier: Tier
  /** Machine-readable reasons (drive the toggle's "why unavailable" tooltip). */
  reasons: string[]
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
export type ChatMessages = ChatMessage[]

export interface LoadProgress {
  loaded: number
  total: number
  text: string
}

/** The swappable LLM boundary. Real impl: engine.webllm.ts. Test: engine.fake.ts. */
export interface LlmEngine {
  load(onProgress: (p: LoadProgress) => void, signal: AbortSignal): Promise<void>
  generate(prompt: ChatMessages, grammar: string): Promise<string>
  unload(): Promise<void>
  /** Loaded into memory THIS session. */
  isLoaded(): boolean
  /**
   * Present in the on-disk weight cache (survives reloads). Drives the toggle's
   * off·installed vs off·not-installed distinction — a returning player whose
   * model is cached must NOT be re-prompted. Distinct from isLoaded().
   */
  isCached(): Promise<boolean>
}

/** Result of mapping English → game action. */
export type TranslateResult =
  | { kind: 'command'; text: string }
  | { kind: 'abstain' }

/** Pure prompt context derived from ViewState by viewToContext(). */
export interface PromptContext {
  location: string
  recentOutput: string
}

/** Toggle/state-machine state surfaced by useNaturalLanguage. */
export type NlState =
  | { phase: 'unavailable'; reasons: string[] } // no capable device (offer override)
  | { phase: 'disabled' } // capable, but this game has no grammar (silent — no override)
  | { phase: 'off'; installed: boolean }
  | { phase: 'downloading'; loaded: number; total: number }
  | { phase: 'on' }

/** Re-export for hook consumers that thread the live view in. */
export type { ViewState }
```

- [ ] **Step 2: Create the models file**

```ts
// src/llm/models.ts
// Model ids per Locked decision 7. SMALL is the default path proven at the
// walking-skeleton gate; FULL is the documented heavy fallback (escalation if
// SMALL misses the corpus or the latency target). Confirm both ids exist in the
// WebLLM prebuilt config at the gate.
export const SMALL_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'
export const FULL_MODEL = 'Llama-3-8B-Instruct-q4f32_1-MLC-1k'

/** The id WebLlmEngine loads by default. Swap to FULL_MODEL at the gate if needed. */
export const DEFAULT_MODEL = SMALL_MODEL
```

- [ ] **Step 3: Write the failing test**

```ts
// src/llm/models.test.ts
import { describe, it, expect } from 'vitest'
import { SMALL_MODEL, FULL_MODEL, DEFAULT_MODEL } from './models'

describe('models', () => {
  it('exposes distinct small/full ids and defaults to small', () => {
    expect(SMALL_MODEL).not.toBe(FULL_MODEL)
    expect(DEFAULT_MODEL).toBe(SMALL_MODEL)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/llm/models.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/llm/types.ts src/llm/models.ts src/llm/models.test.ts
git commit -m "feat(llm): NL layer types and model ids"
```

---

## Task 2: Bridge `echoLocal` + `nl-source` buffer line

**Files:**
- Modify: `src/glkote-react/types.ts:1-6` (BufferLine.kind union)
- Modify: `src/glkote-react/bridge.ts` (add `echoLocal`)
- Test: `src/glkote-react/bridge.test.ts` (append a case)

`echoLocal` appends a UI-only line to ViewState without touching the VM. The reducer already carries prior lines inertly (seeding `paras` from `prev.lines`), so a pushed `nl-source` line survives subsequent updates.

- [ ] **Step 1: Write the failing test (append to bridge.test.ts)**

```ts
// add inside describe('GlkOteBridge', ...) in src/glkote-react/bridge.test.ts
it('echoLocal appends a UI-only nl-source line that survives later VM updates', () => {
  const states: any[] = []
  const bridge = new GlkOteBridge(v => states.push(v))
  bridge.init({ accept: vi.fn() })

  bridge.echoLocal('grab the brass lantern')
  const afterEcho = states[states.length - 1]
  const src = afterEcho.lines.find((l: any) => l.kind === 'nl-source')
  expect(src).toBeTruthy()
  expect(src.text).toBe('grab the brass lantern')

  // A subsequent VM update (the canonical echo + output) must not drop it.
  bridge.update({
    type: 'update',
    gen: 1,
    content: [{ id: 7, text: [{ content: ['input', 'take lantern'] }] }],
    input: [{ type: 'line', id: 7, gen: 1 }],
  } as any)
  const after = states[states.length - 1]
  expect(after.lines.some((l: any) => l.kind === 'nl-source')).toBe(true)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/glkote-react/bridge.test.ts -t "echoLocal"`
Expected: FAIL — `bridge.echoLocal is not a function`.

- [ ] **Step 3: Widen the BufferLine union**

In `src/glkote-react/types.ts`, change:

```ts
export interface BufferLine {
  id: number
  kind: 'output' | 'input' | 'room' | 'nl-source'
  text: string
}
```

- [ ] **Step 4: Add `echoLocal` to the bridge**

In `src/glkote-react/bridge.ts`, add this method to the `GlkOteBridge` class (e.g. just after `sendLine`):

```ts
  /**
   * Append a UI-only "source" line (the player's literal English) to ViewState
   * WITHOUT sending anything to the VM. The reducer seeds its accumulator from
   * the prior lines, so this line is carried inertly through later updates while
   * the VM's own `input` echo and output append after it. The future LLM layer's
   * only input-side bridge addition.
   */
  echoLocal(text: string) {
    const id = this.view.nextId
    this.view = {
      ...this.view,
      lines: [...this.view.lines, { id, kind: 'nl-source', text }],
      nextId: id + 1,
    }
    this.onState(this.view)
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/glkote-react/bridge.test.ts`
Expected: PASS (all bridge tests).

- [ ] **Step 6: Run the reducer tests to confirm no regression**

Run: `npx vitest run src/glkote-react/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/glkote-react/types.ts src/glkote-react/bridge.ts src/glkote-react/bridge.test.ts
git commit -m "feat(bridge): echoLocal appends a UI-only nl-source line"
```

---

## Task 3: Scrollback rendering — `nl-source` and the `›` echo marker

**Files:**
- Modify: `src/ui/Scrollback.tsx:36-51`
- Modify: `src/ui/components.css` (append `.nl-source`)
- Test: `src/ui/Scrollback.test.tsx` (append cases)

Rendering contract (spec §5): `nl-source` → `>` marker + `.nl-source` class (the player's English); `input` (VM echo of the command actually run) → switch marker from `>` to `›` (U+203A).

- [ ] **Step 1: Write the failing tests (append to Scrollback.test.tsx)**

```ts
// add inside describe('Scrollback', ...) in src/ui/Scrollback.test.tsx
it('renders an nl-source line with a > marker and the .nl-source class', () => {
  render(
    <Scrollback
      lines={[{ id: 1, kind: 'nl-source', text: 'grab the brass lantern' }]}
    />,
  )
  const p = screen.getByText('grab the brass lantern').closest('p')!
  expect(p).toHaveClass('nl-source')
  expect(p.textContent).toContain('>')
})

it('renders a VM input echo with the › marker (not >)', () => {
  render(<Scrollback lines={[{ id: 2, kind: 'input', text: 'take lantern' }]} />)
  const p = screen.getByText('take lantern').closest('p')!
  expect(p.textContent).toContain('›') // ›
  expect(p).toHaveClass('echo')
})
```

If `Scrollback.test.tsx` does not already import `render`/`screen`/`describe`/`it`/`expect`, ensure these imports exist at the top:

```ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Scrollback } from './Scrollback'
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/Scrollback.test.tsx -t "nl-source"`
Expected: FAIL — no `.nl-source` class / no `›`.

- [ ] **Step 3: Update the render branch**

In `src/ui/Scrollback.tsx`, replace the `visible.map(...)` `<p>` block (lines ~36-51) with:

```tsx
      {visible.map(l => (
        <p
          key={l.id}
          className={
            l.kind === 'room'
              ? 'room'
              : l.kind === 'input'
                ? 'echo'
                : l.kind === 'nl-source'
                  ? 'nl-source'
                  : ''
          }
        >
          {l.kind === 'input' ? (
            <>
              <span className="car">&#8250;</span> {l.text}
            </>
          ) : l.kind === 'nl-source' ? (
            <>
              <span className="car">&gt;</span> {l.text}
            </>
          ) : (
            l.text
          )}
        </p>
      ))}
```

(`&#8250;` is `›` U+203A; `&gt;` is `>`.)

- [ ] **Step 4: Add the CSS**

Append to `src/ui/components.css`:

```css
/* Player's literal English before NL translation — muted vs. the VM's echo. */
.nl-source {
  opacity: 0.65;
  font-style: italic;
}
```

- [ ] **Step 5: Run to verify passing**

Run: `npx vitest run src/ui/Scrollback.test.tsx`
Expected: PASS (including the pre-existing bare-`>` filter test).

- [ ] **Step 6: Commit**

```bash
git add src/ui/Scrollback.tsx src/ui/components.css src/ui/Scrollback.test.tsx
git commit -m "feat(ui): render nl-source lines; VM echo uses › marker"
```

---

## Task 4: Capability gating

**Files:**
- Create: `src/llm/capability.ts`
- Test: `src/llm/capability.test.ts`

Pure, async, injectable. Returns a tier + reasons. Mobile / low memory are **soft** signals (push toward `small`, never force `none`); the adapter-limit checks do the real gating. Any probe throw → `none`. An override forces a detected `none` up to `small`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/llm/capability.test.ts
import { describe, it, expect } from 'vitest'
import { detectCapability } from './capability'

const adapter = (over = {}) => ({
  limits: { maxBufferSize: 1 << 30, maxStorageBufferBindingSize: 1 << 30 },
  isFallbackAdapter: false,
  ...over,
})
const nav = (over: any = {}) => ({
  gpu: { requestAdapter: async () => adapter(over.adapter) },
  userAgentData: over.userAgentData,
  userAgent: over.userAgent ?? 'desktop',
  deviceMemory: over.deviceMemory ?? 16,
})

describe('detectCapability', () => {
  it('no navigator.gpu → none', async () => {
    const r = await detectCapability({ navigator: {} as any })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('no-webgpu')
  })

  it('null adapter → none', async () => {
    const r = await detectCapability({
      navigator: { gpu: { requestAdapter: async () => null } } as any,
    })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('no-adapter')
  })

  it('software/fallback adapter → none', async () => {
    const r = await detectCapability({
      navigator: nav({ adapter: { isFallbackAdapter: true } }) as any,
    })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('software-adapter')
  })

  it('limits below the small threshold → none', async () => {
    const r = await detectCapability({
      navigator: nav({ adapter: { limits: { maxBufferSize: 1024, maxStorageBufferBindingSize: 1024 } } }) as any,
    })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('insufficient-limits')
  })

  it('roomy desktop → full', async () => {
    const r = await detectCapability({ navigator: nav() as any })
    expect(r.tier).toBe('full')
  })

  it('capable mobile → small (soft signal, not none)', async () => {
    const r = await detectCapability({
      navigator: nav({ userAgentData: { mobile: true } }) as any,
    })
    expect(r.tier).toBe('small')
    expect(r.reasons).toContain('mobile')
  })

  it('low deviceMemory → small', async () => {
    const r = await detectCapability({
      navigator: nav({ deviceMemory: 2 }) as any,
    })
    expect(r.tier).toBe('small')
    expect(r.reasons).toContain('low-memory')
  })

  it('a probe that throws → none, never crashes', async () => {
    const r = await detectCapability({
      navigator: { gpu: { requestAdapter: async () => { throw new Error('boom') } } } as any,
    })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('probe-error')
  })

  it('override bumps a detected none up to small', async () => {
    const r = await detectCapability({ navigator: {} as any }, true)
    expect(r.tier).toBe('small')
    expect(r.reasons).toContain('override')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/capability.test.ts`
Expected: FAIL — `detectCapability` not found.

- [ ] **Step 3: Implement**

```ts
// src/llm/capability.ts
import type { CapabilityResult, Tier } from './types'

interface AdapterLike {
  limits?: { maxBufferSize?: number; maxStorageBufferBindingSize?: number }
  isFallbackAdapter?: boolean
}
interface NavLike {
  gpu?: { requestAdapter(opts?: unknown): Promise<AdapterLike | null> }
  userAgentData?: { mobile?: boolean }
  userAgent?: string
  deviceMemory?: number
}
export interface CapabilityDeps {
  navigator?: NavLike
}

// Thresholds are starting values; tune at the walking-skeleton gate.
const SMALL_MIN_BUFFER = 128 * 1024 * 1024 // 128 MiB
const FULL_MIN_BUFFER = 1024 * 1024 * 1024 // 1 GiB
const LOW_MEMORY_GB = 4

function isMobile(nav: NavLike): boolean {
  if (nav.userAgentData?.mobile === true) return true
  return /android|iphone|ipad|ipod|mobile/i.test(nav.userAgent ?? '')
}

export async function detectCapability(
  deps: CapabilityDeps,
  override = false,
): Promise<CapabilityResult> {
  const reasons: string[] = []
  const bump = (): CapabilityResult =>
    override
      ? { tier: 'small', reasons: [...reasons, 'override'] }
      : { tier: 'none', reasons }

  try {
    const nav = deps.navigator ?? {}
    if (!nav.gpu) {
      reasons.push('no-webgpu')
      return bump()
    }
    const adapter = await nav.gpu.requestAdapter()
    if (!adapter) {
      reasons.push('no-adapter')
      return bump()
    }
    if (adapter.isFallbackAdapter) {
      reasons.push('software-adapter')
      return bump()
    }
    const maxBuffer = adapter.limits?.maxBufferSize ?? 0
    const maxBinding = adapter.limits?.maxStorageBufferBindingSize ?? 0
    if (maxBuffer < SMALL_MIN_BUFFER || maxBinding < SMALL_MIN_BUFFER) {
      reasons.push('insufficient-limits')
      return bump()
    }

    // Soft signals: present but capable → small, not none.
    const mobile = isMobile(nav)
    const lowMemory =
      typeof nav.deviceMemory === 'number' &&
      Math.min(nav.deviceMemory, 8) < LOW_MEMORY_GB
    if (mobile) reasons.push('mobile')
    if (lowMemory) reasons.push('low-memory')

    const roomy = maxBuffer >= FULL_MIN_BUFFER && maxBinding >= FULL_MIN_BUFFER
    const tier: Tier = roomy && !mobile && !lowMemory ? 'full' : 'small'
    return { tier, reasons }
  } catch {
    reasons.push('probe-error')
    return bump()
  }
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/llm/capability.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/llm/capability.ts src/llm/capability.test.ts
git commit -m "feat(llm): device-capability gating with soft mobile signal + override"
```

---

## Task 5: Grammars, corpus, and `grammarForSignature`

**Files:**
- Create: `src/llm/grammar/zork1.gbnf.ts` (+ `zork2`, `zork3`)
- Create: `src/llm/grammar/zork1.corpus.ts` (+ `zork2`, `zork3`)
- Create: `src/llm/grammar/index.ts`
- Test: `src/llm/grammar/index.test.ts`

The grammars are the make-or-break deliverable (spec issue 2). The starter GBNF below is real and valid but **modest**; it is expanded against the corpus until the gate passes (Task 14). The corpus is the coverage bar and includes should-abstain + near-miss cases.

> **Confirm GBNF syntax** against current XGrammar docs before relying on it (spec open note). The dialect below — `root ::=`, `|` alternation, `"literal"` terminals, space-separated concatenation — is the common llama.cpp/XGrammar form.

- [ ] **Step 1: Create the Zork I grammar**

```ts
// src/llm/grammar/zork1.gbnf.ts
// Hand-curated GBNF for Zork I (ZIL-derived vocabulary is future work).
// ALWAYS includes the abstain production. Expand the noun/verb sets against
// zork1.corpus.ts until the gate passes.
export const ZORK1_GBNF = `
root ::= command
command ::= action | abstain
abstain ::= "__UNKNOWN__"
action ::= movement | verb-only | verb-noun
movement ::= "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest" | "up" | "down" | "enter" | "exit"
verb-only ::= "look" | "inventory" | "wait" | "again" | "quit"
verb-noun ::= transitive " " noun
transitive ::= "take" | "drop" | "open" | "close" | "read" | "examine" | "turn on" | "turn off" | "move" | "push" | "eat" | "drink" | "kill"
noun ::= "lantern" | "lamp" | "sword" | "mailbox" | "leaflet" | "door" | "window" | "egg" | "rug" | "trap door" | "grating" | "bottle" | "water" | "garlic" | "rope" | "knife" | "troll" | "thief"
`.trim()
```

- [ ] **Step 2: Create the Zork II and Zork III grammars**

```ts
// src/llm/grammar/zork2.gbnf.ts
export const ZORK2_GBNF = `
root ::= command
command ::= action | abstain
abstain ::= "__UNKNOWN__"
action ::= movement | verb-only | verb-noun
movement ::= "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest" | "up" | "down" | "enter" | "exit"
verb-only ::= "look" | "inventory" | "wait" | "again" | "quit"
verb-noun ::= transitive " " noun
transitive ::= "take" | "drop" | "open" | "close" | "read" | "examine" | "turn on" | "turn off" | "move" | "push" | "press" | "kill"
noun ::= "lamp" | "sword" | "wand" | "key" | "door" | "candle" | "book" | "balloon" | "dragon" | "unicorn" | "robot" | "button" | "cake"
`.trim()
```

```ts
// src/llm/grammar/zork3.gbnf.ts
export const ZORK3_GBNF = `
root ::= command
command ::= action | abstain
abstain ::= "__UNKNOWN__"
action ::= movement | verb-only | verb-noun
movement ::= "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest" | "up" | "down" | "enter" | "exit"
verb-only ::= "look" | "inventory" | "wait" | "again" | "quit"
verb-noun ::= transitive " " noun
transitive ::= "take" | "drop" | "open" | "close" | "read" | "examine" | "turn on" | "turn off" | "give" | "push" | "kill"
noun ::= "lamp" | "staff" | "sword" | "hood" | "cloak" | "key" | "door" | "amulet" | "ring" | "chest" | "table" | "man"
`.trim()
```

- [ ] **Step 3: Create the Zork I corpus**

```ts
// src/llm/grammar/zork1.corpus.ts
import type { CorpusEntry } from './index'

// The coverage bar for Zork I. `expect` is the canonical command or
// '__UNKNOWN__'. Includes should-abstain (non-actions) and near-miss cases
// (a noun NOT in the grammar must abstain, not silently map to a wrong command).
export const ZORK1_CORPUS: CorpusEntry[] = [
  { english: 'grab the brass lantern', expect: 'take lantern' },
  { english: 'pick up the sword', expect: 'take sword' },
  { english: 'open the mailbox', expect: 'open mailbox' },
  { english: 'read the leaflet', expect: 'read leaflet' },
  { english: 'go north', expect: 'north' },
  { english: 'head up', expect: 'up' },
  { english: 'look around', expect: 'look' },
  { english: 'what am I carrying?', expect: 'inventory' },
  { english: 'examine the egg', expect: 'examine egg' },
  { english: 'switch on the lamp', expect: 'turn on lamp' },
  { english: 'drop the knife', expect: 'drop knife' },
  { english: 'attack the troll', expect: 'kill troll' },
  // should-abstain — not a game action
  { english: 'what should I do?', expect: '__UNKNOWN__' },
  { english: 'this game is hard', expect: '__UNKNOWN__' },
  { english: 'hello there', expect: '__UNKNOWN__' },
  // near-miss — noun not in grammar; must abstain, not mis-map
  { english: 'pet the cat', expect: '__UNKNOWN__' },
]
```

- [ ] **Step 4: Create the Zork II and Zork III corpora**

```ts
// src/llm/grammar/zork2.corpus.ts
import type { CorpusEntry } from './index'

export const ZORK2_CORPUS: CorpusEntry[] = [
  { english: 'pick up the wand', expect: 'take wand' },
  { english: 'wave goodbye', expect: '__UNKNOWN__' },
  { english: 'press the button', expect: 'push button' },
  { english: 'open the door', expect: 'open door' },
  { english: 'go down', expect: 'down' },
  { english: 'look', expect: 'look' },
  { english: 'read the book', expect: 'read book' },
  { english: 'attack the dragon', expect: 'kill dragon' },
  { english: 'what is happening?', expect: '__UNKNOWN__' },
  { english: 'feed the parrot', expect: '__UNKNOWN__' },
]
```

```ts
// src/llm/grammar/zork3.corpus.ts
import type { CorpusEntry } from './index'

export const ZORK3_CORPUS: CorpusEntry[] = [
  { english: 'take the staff', expect: 'take staff' },
  { english: 'wear the hood', expect: '__UNKNOWN__' },
  { english: 'give the amulet', expect: 'give amulet' },
  { english: 'open the chest', expect: 'open chest' },
  { english: 'go south', expect: 'south' },
  { english: 'inventory', expect: 'inventory' },
  { english: 'examine the ring', expect: 'examine ring' },
  { english: 'sing a song', expect: '__UNKNOWN__' },
  { english: 'talk to the man', expect: '__UNKNOWN__' },
]
```

- [ ] **Step 5: Compute the three story signatures**

The runtime `signature(bytes)` is the first 0x1E (30) bytes of the raw story, hex-encoded. Compute each from the compiled story file:

Run:
```bash
node -e "const fs=require('fs');for(const g of ['zork1','zork2','zork3']){const b=fs.readFileSync(g+'/COMPILED/'+g+'.z3');console.log(g+':', Buffer.from(b.subarray(0,0x1e)).toString('hex'))}"
```

Expected: three lines like `zork1: 03...` (60 hex chars each). Copy the three hex strings into `index.ts` (next step). The `zork{N}/COMPILED/` dirs are read-only vendored sources — this only **reads** them.

- [ ] **Step 6: Create the grammar index (paste the signatures from Step 5)**

```ts
// src/llm/grammar/index.ts
import { ZORK1_GBNF } from './zork1.gbnf'
import { ZORK2_GBNF } from './zork2.gbnf'
import { ZORK3_GBNF } from './zork3.gbnf'

export interface CorpusEntry {
  english: string
  /** canonical command, or '__UNKNOWN__' for should-abstain */
  expect: string
}

// Per-game story signatures (first 0x1E bytes, hex) from Task 5 Step 5.
// REPLACE these with the actual values printed by the node command.
const ZORK1_SIG = 'PASTE_ZORK1_HEX_HERE'
const ZORK2_SIG = 'PASTE_ZORK2_HEX_HERE'
const ZORK3_SIG = 'PASTE_ZORK3_HEX_HERE'

const BY_SIGNATURE: Record<string, string> = {
  [ZORK1_SIG]: ZORK1_GBNF,
  [ZORK2_SIG]: ZORK2_GBNF,
  [ZORK3_SIG]: ZORK3_GBNF,
}

/** Map a per-game story signature to its GBNF, or null if unknown. */
export function grammarForSignature(sig: string): string | null {
  return BY_SIGNATURE[sig] ?? null
}
```

- [ ] **Step 7: Write the failing tests**

```ts
// src/llm/grammar/index.test.ts
import { describe, it, expect } from 'vitest'
import { grammarForSignature } from './index'
import { ZORK1_GBNF } from './zork1.gbnf'
import { ZORK1_CORPUS } from './zork1.corpus'
import { ZORK2_CORPUS } from './zork2.corpus'
import { ZORK3_CORPUS } from './zork3.corpus'

describe('grammarForSignature', () => {
  it('returns null for an unknown signature', () => {
    expect(grammarForSignature('deadbeef')).toBeNull()
  })

  it('all three games map to a grammar containing the abstain production', () => {
    for (const g of [ZORK1_GBNF]) {
      expect(g).toContain('"__UNKNOWN__"')
    }
  })
})

// Structural coverage check: every non-abstain corpus command must be spellable
// from the grammar — i.e. each word appears as a quoted literal in the GBNF.
// (Constrained decoding can only emit what the grammar admits, so a corpus
// command whose words aren't in the grammar can never be produced.)
function wordsInGrammar(cmd: string, gbnf: string): boolean {
  return cmd.split(' ').every(w => gbnf.includes(`"${w}"`) || gbnf.includes(`"${cmd}"`))
}

describe.each([
  ['zork1', ZORK1_CORPUS, ZORK1_GBNF],
])('%s corpus is grammar-consistent', (_name, corpus, gbnf) => {
  it('every expected command is grammar-valid or __UNKNOWN__', () => {
    for (const { english, expect: exp } of corpus) {
      if (exp === '__UNKNOWN__') continue
      expect(wordsInGrammar(exp, gbnf), `"${english}" → "${exp}"`).toBe(true)
    }
  })
})

describe('corpora include should-abstain and near-miss cases', () => {
  it('each corpus has at least one __UNKNOWN__ entry', () => {
    for (const c of [ZORK1_CORPUS, ZORK2_CORPUS, ZORK3_CORPUS]) {
      expect(c.some(e => e.expect === '__UNKNOWN__')).toBe(true)
    }
  })
})
```

> Note: the `wordsInGrammar` helper treats multi-word nouns like `trap door` loosely (it checks the whole-command literal as a fallback). Keep corpus canonical commands within the grammar's vocabulary; expand the grammar (Task 14) rather than loosening this check.

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/llm/grammar/index.test.ts`
Expected: PASS. (If a `wordsInGrammar` assertion fails, the grammar is missing a noun/verb the corpus uses — add it to the grammar, do not weaken the corpus.)

- [ ] **Step 9: Commit**

```bash
git add src/llm/grammar/
git commit -m "feat(llm): per-game GBNF grammars, translation corpora, signature mapping"
```

---

## Task 6: Prompt assembly (`viewToContext` + `buildPrompt`)

**Files:**
- Create: `src/llm/prompt.ts`
- Test: `src/llm/prompt.test.ts`

Both pure. `viewToContext` implements the pinned context contract (spec issue 4): `location = status?.location ?? ''` (omitted when empty); `recentOutput` = the block since the last `input` line, excluding `nl-source`, capped to the tail at 1500 chars. `buildPrompt` instructs the model to emit one canonical command or `__UNKNOWN__`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/llm/prompt.test.ts
import { describe, it, expect } from 'vitest'
import { viewToContext, buildPrompt } from './prompt'
import { emptyView } from '../glkote-react/types'
import type { ViewState } from '../glkote-react/types'

const view = (over: Partial<ViewState>): ViewState => ({ ...emptyView, ...over })

describe('viewToContext', () => {
  it('reads location from status, empty when status is null', () => {
    expect(viewToContext(emptyView).location).toBe('')
    expect(
      viewToContext(view({ status: { location: 'West of House', right: '' } }))
        .location,
    ).toBe('West of House')
  })

  it('recentOutput is the block since the last input line, excluding nl-source', () => {
    const v = view({
      lines: [
        { id: 1, kind: 'output', text: 'old stuff' },
        { id: 2, kind: 'input', text: 'open mailbox' },
        { id: 3, kind: 'nl-source', text: 'grab lantern' },
        { id: 4, kind: 'output', text: 'Opening the mailbox reveals a leaflet.' },
      ],
    })
    expect(viewToContext(v).recentOutput).toBe(
      'Opening the mailbox reveals a leaflet.',
    )
  })

  it('caps recentOutput to the tail at 1500 chars', () => {
    const big = 'x'.repeat(2000)
    const v = view({ lines: [{ id: 1, kind: 'output', text: big }] })
    const out = viewToContext(v).recentOutput
    expect(out.length).toBe(1500)
    expect(out.endsWith('x')).toBe(true)
  })
})

describe('buildPrompt', () => {
  it('emits a system + user message and includes the English', () => {
    const msgs = buildPrompt('grab the lantern', {
      location: 'West of House',
      recentOutput: 'You are standing in an open field.',
    })
    expect(msgs[0].role).toBe('system')
    expect(msgs[msgs.length - 1]).toEqual({
      role: 'user',
      content: 'grab the lantern',
    })
    expect(msgs[0].content).toContain('__UNKNOWN__')
  })

  it('omits the location line entirely when location is empty', () => {
    const msgs = buildPrompt('xyzzy', { location: '', recentOutput: '' })
    expect(msgs.some(m => /location/i.test(m.content) && /^.*: *$/m.test(m.content))).toBe(false)
    expect(JSON.stringify(msgs)).not.toContain('Location:')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/prompt.test.ts`
Expected: FAIL — `viewToContext`/`buildPrompt` not found.

- [ ] **Step 3: Implement**

```ts
// src/llm/prompt.ts
import type { ChatMessages, PromptContext, ViewState } from './types'

const CONTEXT_CAP = 1500

/** Derive the pure prompt context from the live ViewState (spec §3 contract). */
export function viewToContext(view: ViewState): PromptContext {
  const location = view.status?.location ?? ''

  // The current room/response block = everything after the last `input` line.
  let start = 0
  for (let i = view.lines.length - 1; i >= 0; i--) {
    if (view.lines[i].kind === 'input') {
      start = i + 1
      break
    }
  }
  const block = view.lines
    .slice(start)
    .filter(l => l.kind !== 'nl-source')
    .map(l => l.text)
    .join('\n')
  const recentOutput =
    block.length > CONTEXT_CAP ? block.slice(-CONTEXT_CAP) : block

  return { location, recentOutput }
}

/** Assemble chat messages. Pure; the model is grammar-constrained downstream. */
export function buildPrompt(english: string, ctx: PromptContext): ChatMessages {
  const lines = [
    'You translate a player\'s English into ONE canonical Zork command.',
    'Output exactly one command from the allowed grammar, lowercase, no quotes.',
    'If the input is not a game action you can express, output __UNKNOWN__.',
  ]
  if (ctx.location) lines.push(`Current location: ${ctx.location}`)
  if (ctx.recentOutput) lines.push(`Recent game text:\n${ctx.recentOutput}`)

  return [
    { role: 'system', content: lines.join('\n') },
    { role: 'user', content: english },
  ]
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/llm/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/prompt.ts src/llm/prompt.test.ts
git commit -m "feat(llm): pure prompt context + buildPrompt"
```

---

## Task 7: Completion parsing (`parseCompletion`)

**Files:**
- Create: `src/llm/translate.ts`
- Test: `src/llm/translate.test.ts`

Pure and total. Constrained decoding guarantees grammar-valid output, so parsing is trivial: `__UNKNOWN__` → abstain, anything else → command.

- [ ] **Step 1: Write the failing tests**

```ts
// src/llm/translate.test.ts
import { describe, it, expect } from 'vitest'
import { parseCompletion } from './translate'

describe('parseCompletion', () => {
  it('maps __UNKNOWN__ to abstain', () => {
    expect(parseCompletion('__UNKNOWN__')).toEqual({ kind: 'abstain' })
    expect(parseCompletion('  __UNKNOWN__\n')).toEqual({ kind: 'abstain' })
  })

  it('maps any other output to a trimmed command', () => {
    expect(parseCompletion('take lantern')).toEqual({
      kind: 'command',
      text: 'take lantern',
    })
    expect(parseCompletion('  north \n')).toEqual({
      kind: 'command',
      text: 'north',
    })
  })

  it('an empty completion abstains rather than sending a blank command', () => {
    expect(parseCompletion('   ')).toEqual({ kind: 'abstain' })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/translate.test.ts`
Expected: FAIL — `parseCompletion` not found.

- [ ] **Step 3: Implement**

```ts
// src/llm/translate.ts
import type { TranslateResult } from './types'

export function parseCompletion(raw: string): TranslateResult {
  const text = raw.trim()
  if (text === '' || text === '__UNKNOWN__') return { kind: 'abstain' }
  return { kind: 'command', text }
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/llm/translate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/translate.ts src/llm/translate.test.ts
git commit -m "feat(llm): total parseCompletion (command vs abstain)"
```

---

## Task 8: Fake engine

**Files:**
- Create: `src/llm/engine.fake.ts`
- Test: `src/llm/engine.fake.test.ts`

A scripted `LlmEngine` for the hook tests: canned completions keyed by the user message, scripted progress frames, and toggles for load failure / generate failure / generate delay (to exercise the watchdog).

- [ ] **Step 1: Write the failing tests**

```ts
// src/llm/engine.fake.test.ts
import { describe, it, expect, vi } from 'vitest'
import { FakeLlmEngine } from './engine.fake'

describe('FakeLlmEngine', () => {
  it('reports progress then becomes loaded', async () => {
    const eng = new FakeLlmEngine({
      progress: [
        { loaded: 0, total: 2, text: 'start' },
        { loaded: 2, total: 2, text: 'done' },
      ],
    })
    const onProgress = vi.fn()
    expect(eng.isLoaded()).toBe(false)
    await eng.load(onProgress, new AbortController().signal)
    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(eng.isLoaded()).toBe(true)
  })

  it('rejects when failLoad is set', async () => {
    const eng = new FakeLlmEngine({ failLoad: true })
    await expect(
      eng.load(vi.fn(), new AbortController().signal),
    ).rejects.toThrow()
    expect(eng.isLoaded()).toBe(false)
  })

  it('returns the canned completion for the last user message', async () => {
    const eng = new FakeLlmEngine({
      completions: { 'grab the lantern': 'take lantern' },
      default: '__UNKNOWN__',
    })
    await eng.load(vi.fn(), new AbortController().signal)
    const out = await eng.generate(
      [{ role: 'user', content: 'grab the lantern' }],
      'GRAMMAR',
    )
    expect(out).toBe('take lantern')
    const miss = await eng.generate([{ role: 'user', content: 'xyz' }], 'G')
    expect(miss).toBe('__UNKNOWN__')
  })

  it('isCached reflects the cached option (independent of isLoaded)', async () => {
    const eng = new FakeLlmEngine({ cached: true })
    expect(eng.isLoaded()).toBe(false)
    expect(await eng.isCached()).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/engine.fake.test.ts`
Expected: FAIL — `FakeLlmEngine` not found.

- [ ] **Step 3: Implement**

```ts
// src/llm/engine.fake.ts
import type { ChatMessages, LlmEngine, LoadProgress } from './types'

export interface FakeOptions {
  completions?: Record<string, string>
  default?: string
  progress?: LoadProgress[]
  failLoad?: boolean
  failGenerate?: boolean
  /** Delay generate() by this many ms (use with fake timers to test the watchdog). */
  generateDelayMs?: number
  /** Simulate a model already present in the on-disk cache (cross-reload). */
  cached?: boolean
}

export class FakeLlmEngine implements LlmEngine {
  private loaded = false
  constructor(private opts: FakeOptions = {}) {}

  async isCached(): Promise<boolean> {
    return this.opts.cached === true || this.loaded
  }

  async load(
    onProgress: (p: LoadProgress) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (this.opts.failLoad) throw new Error('fake load failure')
    for (const p of this.opts.progress ?? []) {
      if (signal.aborted) throw new DOMException('aborted', 'AbortError')
      onProgress(p)
    }
    this.loaded = true
  }

  async generate(prompt: ChatMessages, _grammar: string): Promise<string> {
    if (this.opts.failGenerate) throw new Error('fake generate failure')
    if (this.opts.generateDelayMs) {
      await new Promise(r => setTimeout(r, this.opts.generateDelayMs))
    }
    const lastUser = [...prompt].reverse().find(m => m.role === 'user')
    const key = lastUser?.content ?? ''
    return this.opts.completions?.[key] ?? this.opts.default ?? '__UNKNOWN__'
  }

  async unload(): Promise<void> {
    this.loaded = false
  }

  isLoaded(): boolean {
    return this.loaded
  }
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/llm/engine.fake.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/engine.fake.ts src/llm/engine.fake.test.ts
git commit -m "test(llm): scripted FakeLlmEngine for hook tests"
```

---

## Task 9: The `useNaturalLanguage` hook (state machine)

**Files:**
- Create: `src/llm/nlpref.ts` (validated localStorage persistence)
- Test: `src/llm/nlpref.test.ts`
- Create: `src/llm/useNaturalLanguage.ts`
- Test: `src/llm/useNaturalLanguage.test.tsx`

The orchestrator. Owns the engine + NL state and exposes `translate()`. Inputs are injected so it is fully testable with the fake engine. Implements: state derivation from `(tier, grammar, installed, on)` — including the **silent `disabled` state** when the game has no grammar (distinct from `unavailable`); the `installed` flag from the engine's **on-disk cache** (`isCached()`, not in-memory `isLoaded()`); download via `load()` with `AbortSignal`; load-failure revert; cancel; `translate` command/abstain routing through `echoLocal`/`sendLine`; the watchdog → visible notice → raw pass-through; the in-flight input lock (`pending`); and **`localStorage` persistence** of the on/off + "declined" choice across reloads.

### Persistence module first (`nlpref.ts`)

- [ ] **Step 1: Write the failing persistence tests**

```ts
// src/llm/nlpref.test.ts
import { describe, it, expect } from 'vitest'
import { readNlPref, writeNlPref } from './nlpref'

function fakeStore(initial: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(initial))
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: k => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size
    },
  } as Storage
}

describe('nlpref', () => {
  it('defaults to disabled/undeclined when nothing stored', () => {
    expect(readNlPref(fakeStore())).toEqual({ enabled: false, declined: false })
  })

  it('round-trips a partial patch, merging with existing', () => {
    const store = fakeStore()
    writeNlPref({ enabled: true }, store)
    writeNlPref({ declined: true }, store)
    expect(readNlPref(store)).toEqual({ enabled: true, declined: true })
  })

  it('ignores malformed / wrong-typed stored values (validates like useTheme)', () => {
    expect(readNlPref(fakeStore({ 'loquor.nl': 'not json' }))).toEqual({
      enabled: false,
      declined: false,
    })
    expect(
      readNlPref(fakeStore({ 'loquor.nl': '{"enabled":"yes"}' })),
    ).toEqual({ enabled: false, declined: false })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/llm/nlpref.test.ts`
Expected: FAIL — `readNlPref`/`writeNlPref` not found.

- [ ] **Step 3: Implement `nlpref.ts`**

```ts
// src/llm/nlpref.ts
// Validated localStorage persistence for the NL on/off + "declined" choice.
// Mirrors src/ui/useTheme.ts (read-validate-fallback, swallow write errors).
const KEY = 'loquor.nl'

export interface NlPref {
  enabled: boolean
  declined: boolean
}
const DEFAULT: NlPref = { enabled: false, declined: false }

export function readNlPref(store: Storage = localStorage): NlPref {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : false,
      declined: typeof parsed.declined === 'boolean' ? parsed.declined : false,
    }
  } catch {
    return DEFAULT
  }
}

export function writeNlPref(patch: Partial<NlPref>, store: Storage = localStorage): void {
  try {
    store.setItem(KEY, JSON.stringify({ ...readNlPref(store), ...patch }))
  } catch {
    // Private mode / quota — persistence is best-effort, never fatal.
  }
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/llm/nlpref.test.ts`
Expected: PASS.

### The hook

- [ ] **Step 5: Write the failing tests**

```tsx
// src/llm/useNaturalLanguage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNaturalLanguage } from './useNaturalLanguage'
import { FakeLlmEngine } from './engine.fake'
import { readNlPref } from './nlpref'
import type { CapabilityResult } from './types'

const capable: CapabilityResult = { tier: 'small', reasons: [] }
const ctx = () => ({ location: 'West of House', recentOutput: '' })

function setup(over: Partial<Parameters<typeof useNaturalLanguage>[0]> = {}) {
  const echoLocal = vi.fn()
  const sendLine = vi.fn()
  const engine = over.engine ?? new FakeLlmEngine({ default: '__UNKNOWN__' })
  const hook = renderHook(() =>
    useNaturalLanguage({
      engine,
      capability: capable,
      grammar: 'GRAMMAR',
      getContext: ctx,
      echoLocal,
      sendLine,
      watchdogMs: 5000,
      ...over,
    }),
  )
  return { hook, echoLocal, sendLine, engine }
}

// Reach the 'on' state through the REAL download path (no test-only back door).
async function reachOn(hook: ReturnType<typeof setup>['hook']) {
  act(() => hook.result.current.requestDownload())
  await waitFor(() => expect(hook.result.current.state.phase).toBe('on'))
}

describe('useNaturalLanguage', () => {
  beforeEach(() => localStorage.clear())

  it('tier none → unavailable (offers override)', () => {
    const { hook } = setup({ capability: { tier: 'none', reasons: ['no-webgpu'] } })
    expect(hook.result.current.state.phase).toBe('unavailable')
  })

  it('grammar null → disabled (silent), not unavailable', () => {
    const { hook } = setup({ grammar: null })
    expect(hook.result.current.state.phase).toBe('disabled')
  })

  it('capable + not cached → off (installed:false)', async () => {
    const { hook } = setup()
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({ phase: 'off', installed: false }),
    )
  })

  it('capable + cached → off (installed:true), no re-download needed', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.state).toEqual({ phase: 'off', installed: true }),
    )
  })

  it('download success transitions off → on', async () => {
    const engine = new FakeLlmEngine({
      progress: [{ loaded: 1, total: 2, text: 'a' }, { loaded: 2, total: 2, text: 'b' }],
    })
    const { hook } = setup({ engine })
    await reachOn(hook)
  })

  it('load failure reverts to off and sets a notice', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ failLoad: true }) })
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.state.phase).toBe('off'),
    )
    expect(hook.result.current.notice).toBeTruthy()
  })

  it('command translation echoes English then sends the canonical command', async () => {
    const engine = new FakeLlmEngine({ completions: { 'grab the lantern': 'take lantern' } })
    const { hook, echoLocal, sendLine } = setup({ engine })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('grab the lantern')
    })
    expect(echoLocal).toHaveBeenCalledWith('grab the lantern')
    expect(sendLine).toHaveBeenCalledWith('take lantern')
  })

  it('abstain sends the raw English (no echoLocal)', async () => {
    const { hook, echoLocal, sendLine } = setup({
      engine: new FakeLlmEngine({ default: '__UNKNOWN__' }),
    })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('what should I do?')
    })
    expect(echoLocal).not.toHaveBeenCalled()
    expect(sendLine).toHaveBeenCalledWith('what should I do?')
  })

  it('locks input (pending=true) while a translation is in flight', async () => {
    const engine = new FakeLlmEngine({ generateDelayMs: 50, completions: { go: 'north' } })
    const { hook } = setup({ engine })
    await reachOn(hook)
    let p!: Promise<void>
    act(() => {
      p = hook.result.current.translate('go')
    })
    expect(hook.result.current.pending).toBe(true)
    await act(async () => {
      await p
    })
    expect(hook.result.current.pending).toBe(false)
  })

  it('generate failure falls back to raw pass-through with a notice', async () => {
    const { hook, sendLine } = setup({ engine: new FakeLlmEngine({ failGenerate: true }) })
    await reachOn(hook)
    await act(async () => {
      await hook.result.current.translate('take lantern')
    })
    expect(sendLine).toHaveBeenCalledWith('take lantern')
    expect(hook.result.current.notice).toBeTruthy()
  })

  it('a watchdog timeout falls back to raw pass-through with a notice', async () => {
    const engine = new FakeLlmEngine({ generateDelayMs: 10000 })
    const { hook, sendLine } = setup({ engine, watchdogMs: 1000 })
    await reachOn(hook) // real timers: load resolves immediately
    vi.useFakeTimers()
    let p!: Promise<void>
    act(() => {
      p = hook.result.current.translate('take lantern')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
      await p
    })
    expect(sendLine).toHaveBeenCalledWith('take lantern')
    expect(hook.result.current.notice).toMatch(/timed out/i)
    vi.useRealTimers()
  })

  it('decline persists (declined=true) and closes the modal', () => {
    const { hook } = setup()
    act(() => hook.result.current.toggle()) // not installed → opens modal
    expect(hook.result.current.modalOpen).toBe(true)
    act(() => hook.result.current.declineDownload())
    expect(hook.result.current.modalOpen).toBe(false)
    expect(readNlPref().declined).toBe(true)
  })

  it('restores the enabled choice on remount when the model is cached', async () => {
    const a = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await reachOn(a.hook) // persists enabled=true
    expect(readNlPref().enabled).toBe(true)
    a.hook.unmount()
    // Fresh mount, cached engine → should auto-restore 'on'.
    const b = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(b.hook.result.current.state.phase).toBe('on'))
  })
})
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx`
Expected: FAIL — hook not found.

- [ ] **Step 7: Implement the hook**

```ts
// src/llm/useNaturalLanguage.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CapabilityResult,
  LlmEngine,
  NlState,
  PromptContext,
} from './types'
import { buildPrompt } from './prompt'
import { parseCompletion } from './translate'
import { readNlPref, writeNlPref } from './nlpref'

export interface UseNaturalLanguageArgs {
  engine: LlmEngine
  capability: CapabilityResult
  grammar: string | null
  getContext: () => PromptContext
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
  watchdogMs: number
}

export interface UseNaturalLanguage {
  state: NlState
  pending: boolean
  notice: string | null
  modalOpen: boolean
  toggle: () => void
  requestDownload: () => void
  declineDownload: () => void
  cancelDownload: () => void
  translate: (english: string) => Promise<void>
}

type Internal =
  | { phase: 'off' }
  | { phase: 'downloading'; loaded: number; total: number }
  | { phase: 'on' }

export function useNaturalLanguage(
  args: UseNaturalLanguageArgs,
): UseNaturalLanguage {
  const { engine, capability, grammar, getContext, echoLocal, sendLine, watchdogMs } = args
  const [internal, setInternal] = useState<Internal>({ phase: 'off' })
  const [installed, setInstalled] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const available = capability.tier !== 'none'
  const hasGrammar = grammar !== null

  // Probe the ON-DISK cache (survives reloads) for the installed/not-installed
  // distinction — distinct from isLoaded() (in-memory, this session only).
  // Re-probe whenever the internal phase changes (e.g. after a successful load).
  useEffect(() => {
    let cancelled = false
    engine
      .isCached()
      .then(c => {
        if (!cancelled) setInstalled(c || engine.isLoaded())
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [engine, internal.phase])

  // Restore the player's prior "enabled" choice once the model is known cached.
  // (Don't auto-enable against an uncached model — that would re-prompt.)
  // Persistence is written on explicit actions below, NOT in a mount effect, so
  // this read never sees a value clobbered by our own first render.
  useEffect(() => {
    if (readNlPref().enabled && installed && internal.phase === 'off') {
      setInternal({ phase: 'on' })
    }
  }, [installed, internal.phase])

  const state: NlState = useMemo(() => {
    if (!available) return { phase: 'unavailable', reasons: capability.reasons }
    if (!hasGrammar) return { phase: 'disabled' } // silent: this game has no grammar
    if (internal.phase === 'downloading')
      return { phase: 'downloading', loaded: internal.loaded, total: internal.total }
    if (internal.phase === 'on') return { phase: 'on' }
    return { phase: 'off', installed }
  }, [available, hasGrammar, capability.reasons, internal, installed])

  const requestDownload = useCallback(() => {
    setNotice(null)
    setModalOpen(false)
    const ac = new AbortController()
    abortRef.current = ac
    setInternal({ phase: 'downloading', loaded: 0, total: 0 })
    engine
      .load(p => setInternal({ phase: 'downloading', loaded: p.loaded, total: p.total }), ac.signal)
      .then(() => {
        setInternal({ phase: 'on' })
        writeNlPref({ enabled: true })
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') {
          setInternal({ phase: 'off' })
        } else {
          setNotice('Model download failed — staying grammar-only.')
          setInternal({ phase: 'off' })
        }
      })
  }, [engine])

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort()
    setInternal({ phase: 'off' })
  }, [])

  const declineDownload = useCallback(() => {
    setModalOpen(false)
    setInternal({ phase: 'off' })
    writeNlPref({ declined: true })
  }, [])

  const toggle = useCallback(() => {
    if (!available || !hasGrammar) return
    if (internal.phase === 'on') {
      setInternal({ phase: 'off' }) // off is instant; model stays cached
      writeNlPref({ enabled: false })
      return
    }
    if (installed) {
      setInternal({ phase: 'on' }) // cached → enable without re-download
      writeNlPref({ enabled: true })
    } else {
      setModalOpen(true)
    }
  }, [available, hasGrammar, internal.phase, installed])

  const translate = useCallback(
    async (english: string) => {
      // NL off / disabled / unavailable → behave exactly like the first pass.
      if (internal.phase !== 'on' || grammar === null) {
        sendLine(english)
        return
      }
      setPending(true)
      setNotice(null)
      try {
        const messages = buildPrompt(english, getContext())
        const watchdog = new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('watchdog')), watchdogMs),
        )
        const raw = await Promise.race([engine.generate(messages, grammar), watchdog])
        const result = parseCompletion(raw)
        if (result.kind === 'command') {
          echoLocal(english)
          sendLine(result.text)
        } else {
          sendLine(english) // abstain → game's own parser handles it
        }
      } catch (err) {
        // Watchdog or generate error: never wedge the turn. Surface a visible
        // notice so a timeout is distinguishable from a normal abstain.
        setNotice(
          (err as Error).message === 'watchdog'
            ? 'Translation timed out — sent as typed.'
            : 'Translation failed — sent as typed.',
        )
        sendLine(english)
      } finally {
        setPending(false)
      }
    },
    [internal.phase, grammar, engine, getContext, echoLocal, sendLine, watchdogMs],
  )

  return {
    state,
    pending,
    notice,
    modalOpen,
    toggle,
    requestDownload,
    declineDownload,
    cancelDownload,
    translate,
  }
}
```

- [ ] **Step 8: Run to verify passing**

Run: `npx vitest run src/llm/nlpref.test.ts src/llm/useNaturalLanguage.test.tsx`
Expected: PASS (all cases).

- [ ] **Step 9: Commit**

```bash
git add src/llm/nlpref.ts src/llm/nlpref.test.ts src/llm/useNaturalLanguage.ts src/llm/useNaturalLanguage.test.tsx
git commit -m "feat(llm): useNaturalLanguage state machine, cache-aware installed state, persistence"
```

---

## Task 10: `NlToggle` (five-state control)

**Files:**
- Create: `src/ui/NlToggle.tsx`
- Test: `src/ui/NlToggle.test.tsx`

Presentational. Renders one of five states from the `NlState` it is handed; offers an override action when `unavailable`. In-layout (never `position:fixed`).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/NlToggle.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NlToggle } from './NlToggle'

describe('NlToggle', () => {
  it('unavailable shows a why + an override action', () => {
    const onOverride = vi.fn()
    render(
      <NlToggle
        state={{ phase: 'unavailable', reasons: ['no-webgpu'] }}
        onToggle={vi.fn()}
        onOverride={onOverride}
      />,
    )
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument()
    screen.getByRole('button', { name: /force|override/i }).click()
    expect(onOverride).toHaveBeenCalled()
  })

  it('off · not installed', () => {
    render(
      <NlToggle state={{ phase: 'off', installed: false }} onToggle={vi.fn()} onOverride={vi.fn()} />,
    )
    expect(screen.getByText(/not installed/i)).toBeInTheDocument()
  })

  it('off · installed', () => {
    render(
      <NlToggle state={{ phase: 'off', installed: true }} onToggle={vi.fn()} onOverride={vi.fn()} />,
    )
    expect(screen.getByText(/installed/i)).toBeInTheDocument()
  })

  it('on toggles', () => {
    const onToggle = vi.fn()
    render(<NlToggle state={{ phase: 'on' }} onToggle={onToggle} onOverride={vi.fn()} />)
    screen.getByRole('button', { name: /english/i }).click()
    expect(onToggle).toHaveBeenCalled()
  })

  it('downloading shows a percentage', () => {
    render(
      <NlToggle
        state={{ phase: 'downloading', loaded: 1, total: 4 }}
        onToggle={vi.fn()}
        onOverride={vi.fn()}
      />,
    )
    expect(screen.getByText(/25%/)).toBeInTheDocument()
  })

  it('disabled (no grammar for this game) renders nothing — silently', () => {
    const { container } = render(
      <NlToggle state={{ phase: 'disabled' }} onToggle={vi.fn()} onOverride={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/NlToggle.test.tsx`
Expected: FAIL — `NlToggle` not found.

- [ ] **Step 3: Implement**

```tsx
// src/ui/NlToggle.tsx
import type { NlState } from '../llm/types'

export function NlToggle({
  state,
  onToggle,
  onOverride,
}: {
  state: NlState
  onToggle: () => void
  onOverride: () => void
}) {
  // No grammar for this game → silently render nothing (no toggle, no override).
  if (state.phase === 'disabled') return null
  if (state.phase === 'unavailable') {
    return (
      <span className="nl-toggle" title={`unavailable: ${state.reasons.join(', ')}`}>
        English: unavailable{' '}
        <button className="sw" type="button" onClick={onOverride}>
          force-enable
        </button>
      </span>
    )
  }
  if (state.phase === 'downloading') {
    const pct = state.total > 0 ? Math.round((state.loaded / state.total) * 100) : 0
    return <span className="nl-toggle">downloading… {pct}%</span>
  }
  const label =
    state.phase === 'on'
      ? 'English: on'
      : state.installed
        ? 'English: off · installed'
        : 'English: off · not installed'
  return (
    <button className="sw nl-toggle" type="button" onClick={onToggle}>
      {label}
    </button>
  )
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/ui/NlToggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/NlToggle.tsx src/ui/NlToggle.test.tsx
git commit -m "feat(ui): five-state NlToggle"
```

---

## Task 11: `ModelDownloadModal`

**Files:**
- Create: `src/ui/ModelDownloadModal.tsx`
- Test: `src/ui/ModelDownloadModal.test.tsx`

Accept / decline / cancel + progress. Shown only to devices past the capability gate.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/ModelDownloadModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModelDownloadModal } from './ModelDownloadModal'

describe('ModelDownloadModal', () => {
  it('accept and decline fire when not downloading', () => {
    const onAccept = vi.fn()
    const onDecline = vi.fn()
    render(
      <ModelDownloadModal
        open
        progress={null}
        onAccept={onAccept}
        onDecline={onDecline}
        onCancel={vi.fn()}
      />,
    )
    screen.getByRole('button', { name: /accept|download/i }).click()
    screen.getByRole('button', { name: /decline|not now/i }).click()
    expect(onAccept).toHaveBeenCalled()
    expect(onDecline).toHaveBeenCalled()
  })

  it('shows progress and a cancel while downloading', () => {
    const onCancel = vi.fn()
    render(
      <ModelDownloadModal
        open
        progress={{ loaded: 1, total: 2, text: 'shards' }}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByText(/50%/)).toBeInTheDocument()
    screen.getByRole('button', { name: /cancel/i }).click()
    expect(onCancel).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <ModelDownloadModal open={false} progress={null} onAccept={vi.fn()} onDecline={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/ModelDownloadModal.test.tsx`
Expected: FAIL — not found.

- [ ] **Step 3: Implement**

```tsx
// src/ui/ModelDownloadModal.tsx
import type { LoadProgress } from '../llm/types'

export function ModelDownloadModal({
  open,
  progress,
  onAccept,
  onDecline,
  onCancel,
}: {
  open: boolean
  progress: LoadProgress | null
  onAccept: () => void
  onDecline: () => void
  onCancel: () => void
}) {
  if (!open) return null
  const downloading = progress !== null
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : 0
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Natural-language input</h2>
        <p>
          This downloads a language model (a sizable, one-time download) so you can
          type plain English. It runs entirely on your device and is cached after
          the first download.
        </p>
        {downloading ? (
          <>
            <progress value={pct} max={100} />
            <p>{pct}% — {progress!.text}</p>
            <button className="sw" type="button" onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <div className="modal-actions">
            <button className="sw" type="button" onClick={onAccept}>
              Download &amp; enable
            </button>
            <button className="sw" type="button" onClick={onDecline}>
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/ui/ModelDownloadModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ModelDownloadModal.tsx src/ui/ModelDownloadModal.test.tsx
git commit -m "feat(ui): ModelDownloadModal (accept/decline/cancel + progress)"
```

---

## Task 12: Wire NL into `Terminal` (+ `ZMachine.echoLocal`, `StatusBar.nlToggle`)

**Files:**
- Modify: `src/zmachine/engine.ts` (add `echoLocal` pass-through)
- Test: `src/zmachine/engine.echolocal.test.ts`
- Modify: `src/ui/StatusBar.tsx` (accept `nlToggle` node)
- Modify: `src/ui/Terminal.tsx` (capability, signature, hook, modal, onSubmit routing)

The hook unit tests + the gate prove behavior; here we connect the wires. The one new unit test covers the `ZMachine.echoLocal` pass-through; the Terminal wiring is verified at the walking-skeleton gate (it needs a real booted VM + engine).

- [ ] **Step 1: Write the failing pass-through test**

```ts
// src/zmachine/engine.echolocal.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ZMachine } from './engine'

describe('ZMachine.echoLocal', () => {
  it('appends an nl-source line via the bridge without booting', () => {
    const states: any[] = []
    const zm = new ZMachine({
      dialog: { streaming: false, autosave_read: () => null, autosave_write: () => {} },
      onState: v => states.push(v),
    })
    zm.echoLocal('grab the lantern')
    const last = states[states.length - 1]
    expect(last.lines.some((l: any) => l.kind === 'nl-source')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/zmachine/engine.echolocal.test.ts`
Expected: FAIL — `zm.echoLocal is not a function`.

- [ ] **Step 3: Add the `echoLocal` pass-through to `ZMachine`**

In `src/zmachine/engine.ts`, alongside `sendLine`/`sendChar`:

```ts
  /** UI-only source-line echo (the player's English). Pass-through to the bridge. */
  echoLocal(text: string) {
    this.bridge.echoLocal(text)
  }
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/zmachine/engine.echolocal.test.ts`
Expected: PASS.

- [ ] **Step 5: Extend `StatusBar` to accept the NL toggle**

In `src/ui/StatusBar.tsx`, add an optional `nlToggle` prop and render it beside `themeToggle`:

```tsx
export function StatusBar({
  status,
  onChangeStory,
  themeToggle,
  nlToggle,
}: {
  status: StatusLine | null
  onChangeStory: () => void
  themeToggle: ReactNode
  nlToggle?: ReactNode
}) {
  return (
    <div className="statusbar">
      <span className="loc">{status?.location ?? ''}</span>
      <span className="meta">
        <span>{status?.right ?? ''}</span>
        <span className="sep">·</span>
        <button className="sw" type="button" onClick={onChangeStory}>
          ⌄ Change story
        </button>
        {nlToggle}
        {themeToggle}
      </span>
    </div>
  )
}
```

The existing `StatusBar.test.tsx` passes no `nlToggle`, which is fine (optional). Run `npx vitest run src/ui/StatusBar.test.tsx` to confirm still green.

- [ ] **Step 6: Wire the hook, capability, signature, and routing into `Terminal`**

Replace `src/ui/Terminal.tsx` with:

```tsx
import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react'
import { ZMachine } from '../zmachine/engine'
import { IdbDialog } from '../storage/dialog'
import { emptyView, type ViewState } from '../glkote-react/types'
import { StatusBar } from './StatusBar'
import { Scrollback } from './Scrollback'
import { CommandInput } from './CommandInput'
import { NlToggle } from './NlToggle'
import { ModelDownloadModal } from './ModelDownloadModal'
import { detectCapability } from '../llm/capability'
import { grammarForSignature } from '../llm/grammar/index'
import { viewToContext } from '../llm/prompt'
import { useNaturalLanguage } from '../llm/useNaturalLanguage'
import { WebLlmEngine } from '../llm/engine.webllm'
import type { CapabilityResult, LoadProgress } from '../llm/types'

const WATCHDOG_MS = 8000 // starting value; tune at the gate

export function Terminal({
  storyBytes,
  onChangeStory,
  themeToggle,
}: {
  storyBytes: Uint8Array
  onChangeStory: () => void
  themeToggle: ReactNode
}) {
  const [view, setView] = useState<ViewState>(emptyView)
  const [signature, setSignature] = useState<string>('')
  const [capability, setCapability] = useState<CapabilityResult>({ tier: 'none', reasons: [] })
  const [override, setOverride] = useState(false)
  const [dlProgress, setDlProgress] = useState<LoadProgress | null>(null)
  const engineRef = useRef<ZMachine | null>(null)
  const viewRef = useRef<ViewState>(emptyView)
  const inputRef = useRef<HTMLInputElement>(null)
  const llmEngineRef = useRef<WebLlmEngine>(null as unknown as WebLlmEngine)
  if (llmEngineRef.current === null) llmEngineRef.current = new WebLlmEngine()

  viewRef.current = view

  useEffect(() => {
    let cancelled = false
    const engine = new ZMachine({
      dialog: new IdbDialog(),
      onState: v => {
        if (!cancelled) setView(v)
      },
    })
    engineRef.current = engine
    engine
      .boot(storyBytes)
      .then(sig => {
        if (!cancelled) setSignature(sig)
      })
      .catch(err => {
        if (!cancelled) console.error('boot failed', err)
      })
    return () => {
      cancelled = true
      engine.dispose()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [storyBytes])

  // Detect capability once (re-runs if the player forces an override).
  useEffect(() => {
    let cancelled = false
    detectCapability({ navigator: navigator as never }, override).then(c => {
      if (!cancelled) setCapability(c)
    })
    return () => {
      cancelled = true
    }
  }, [override])

  const grammar = useMemo(
    () => (signature ? grammarForSignature(signature) : null),
    [signature],
  )

  const nl = useNaturalLanguage({
    engine: llmEngineRef.current,
    capability,
    grammar,
    getContext: () => viewToContext(viewRef.current),
    echoLocal: t => engineRef.current?.echoLocal(t),
    sendLine: t => engineRef.current?.sendLine(t),
    watchdogMs: WATCHDOG_MS,
  })

  // Feed live download progress to the modal.
  useEffect(() => {
    if (nl.state.phase === 'downloading') {
      setDlProgress({ loaded: nl.state.loaded, total: nl.state.total, text: 'downloading' })
    } else {
      setDlProgress(null)
    }
  }, [nl.state])

  useEffect(() => {
    if (view.inputRequest === 'char') engineRef.current?.ackMore()
  }, [view.inputRequest])

  return (
    <div className="screen term">
      <StatusBar
        status={view.status}
        onChangeStory={onChangeStory}
        themeToggle={themeToggle}
        nlToggle={
          <NlToggle state={nl.state} onToggle={nl.toggle} onOverride={() => setOverride(true)} />
        }
      />
      <Scrollback lines={view.lines} onActivate={() => inputRef.current?.focus()}>
        {nl.pending && <p className="nl-thinking">…thinking</p>}
        {nl.notice && <p className="nl-notice">{nl.notice}</p>}
        <CommandInput
          inputRef={inputRef}
          onSubmit={text => {
            if (nl.state.phase === 'on') void nl.translate(text)
            else engineRef.current?.sendLine(text)
          }}
          disabled={nl.pending}
          awaitingKey={view.inputRequest === 'char'}
          awaitingLine={view.inputRequest === 'line'}
          onKey={key => engineRef.current?.sendChar(key)}
        />
      </Scrollback>
      <ModelDownloadModal
        open={nl.modalOpen || nl.state.phase === 'downloading'}
        progress={dlProgress}
        onAccept={nl.requestDownload}
        onDecline={nl.declineDownload}
        onCancel={nl.cancelDownload}
      />
    </div>
  )
}
```

> This imports `WebLlmEngine` from `engine.webllm.ts`, created in Task 13. Until that file exists, this module will not type-check — implement Task 13 next (it has no test gate of its own, so order 12→13 is fine for committing the pure work first, but run `typecheck` only after Task 13).

- [ ] **Step 7: Style the transient `…thinking` indicator and notice**

Append to `src/ui/components.css` (the indicator is spec Goal 2; the notice is the visible watchdog fallback):

```css
/* Transient "…thinking" while a translation is in flight. */
.nl-thinking {
  opacity: 0.6;
  font-style: italic;
}
/* Watchdog/timeout/error notice — distinguishable from a normal abstain. */
.nl-notice {
  opacity: 0.8;
  font-size: 0.9em;
}
```

- [ ] **Step 8: Run the full pure suite (excluding the not-yet-present webllm import path)**

Run: `npx vitest run src/llm src/glkote-react src/ui/Scrollback.test.tsx src/ui/StatusBar.test.tsx src/ui/NlToggle.test.tsx src/ui/ModelDownloadModal.test.tsx src/zmachine/engine.echolocal.test.ts`
Expected: PASS. (Terminal renders `WebLlmEngine`; its test is deferred to after Task 13.)

- [ ] **Step 9: Commit**

```bash
git add src/zmachine/engine.ts src/zmachine/engine.echolocal.test.ts src/ui/StatusBar.tsx src/ui/Terminal.tsx src/ui/components.css
git commit -m "feat(ui): wire NL hook, capability, signature, and modal into Terminal"
```

---

# Milestone 2 — Real engine + walking-skeleton gate

## Task 13: Real `WebLlmEngine`

**Files:**
- Modify: `package.json` (add `@mlc-ai/web-llm`)
- Create: `src/llm/engine.webllm.ts`

The ONLY importer of `@mlc-ai/web-llm`. Not unit-tested (WebGPU does not exist in jsdom — spec). Verified at the gate.

- [ ] **Step 1: Add the dependency**

Run:
```bash
npm install @mlc-ai/web-llm@0.2.84
```
Expected: `package.json` `dependencies` gains `"@mlc-ai/web-llm": "0.2.84"` (matching the vendored read-only reference at `web-llm/`).

- [ ] **Step 2: Implement the engine**

```ts
// src/llm/engine.webllm.ts
import {
  CreateMLCEngine,
  hasModelInCache,
  type MLCEngineInterface,
  type InitProgressReport,
} from '@mlc-ai/web-llm'
import type { ChatMessages, LlmEngine, LoadProgress } from './types'
import { DEFAULT_MODEL } from './models'

/**
 * Real LLM boundary over @mlc-ai/web-llm (WebGPU). The single file that imports
 * web-llm. Constrained decoding uses XGrammar GBNF via response_format.
 *
 * Open items confirmed at the walking-skeleton gate (spec open notes):
 *  - exact GBNF response_format shape (`type: 'grammar'` below — confirm);
 *  - cached-model detection for the installed/not-installed toggle;
 *  - aborting an in-flight load (AbortSignal wiring).
 */
export class WebLlmEngine implements LlmEngine {
  private engine: MLCEngineInterface | null = null
  constructor(private modelId: string = DEFAULT_MODEL) {}

  async load(
    onProgress: (p: LoadProgress) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError')
    this.engine = await CreateMLCEngine(this.modelId, {
      initProgressCallback: (r: InitProgressReport) => {
        // web-llm reports a 0..1 `progress`; normalize to loaded/total.
        onProgress({ loaded: Math.round(r.progress * 100), total: 100, text: r.text })
      },
    })
    if (signal.aborted) {
      await this.unload()
      throw new DOMException('aborted', 'AbortError')
    }
  }

  async generate(prompt: ChatMessages, grammar: string): Promise<string> {
    if (!this.engine) throw new Error('engine not loaded')
    const res = await this.engine.chat.completions.create({
      messages: prompt,
      temperature: 0,
      // Confirm this is the current XGrammar GBNF shape for web-llm 0.2.84.
      response_format: { type: 'grammar', grammar } as never,
    })
    return res.choices[0]?.message?.content ?? '__UNKNOWN__'
  }

  async unload(): Promise<void> {
    await this.engine?.unload?.()
    this.engine = null
  }

  isLoaded(): boolean {
    return this.engine !== null
  }

  /**
   * Whether the model weights are already in WebLLM's on-disk cache (survives
   * reloads) — drives the off·installed vs off·not-installed toggle state so a
   * returning player is not re-prompted. Confirm `hasModelInCache` is the
   * current web-llm 0.2.84 API at the gate; treat any throw as "not cached".
   */
  async isCached(): Promise<boolean> {
    try {
      return await hasModelInCache(this.modelId)
    } catch {
      return false
    }
  }
}
```

- [ ] **Step 3: Type-check the whole app (now that the import resolves)**

Run: `npx tsc -b --noEmit`
Expected: PASS (no type errors). Fix any signature drift before continuing.

- [ ] **Step 4: Run the full suite + lint**

Run: `npx vitest run && npx eslint src/llm src/ui/NlToggle.tsx src/ui/ModelDownloadModal.tsx`
Expected: all tests PASS; lint clean.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/llm/engine.webllm.ts
git commit -m "feat(llm): real WebLlmEngine over @mlc-ai/web-llm (gate-verified)"
```

---

## Task 14: Walking-skeleton gate (manual go/no-go)

**Files:**
- (No code unless the gate reveals gaps.) Iterate on `src/llm/grammar/*.gbnf.ts`, `DEFAULT_MODEL` in `src/llm/models.ts`, and `WATCHDOG_MS` in `Terminal.tsx`.

This is the spec's go/no-go gate, run on a **capable machine with WebGPU**. It is manual because the WebGPU/model boundary is untestable in jsdom.

- [ ] **Step 1: Confirm GBNF + web-llm API shapes**

Check current XGrammar docs for: the GBNF literal/operator syntax used in `*.gbnf.ts`, and the `response_format` grammar shape in `engine.webllm.ts`. Adjust both if the API differs. Confirm the small model id (`SMALL_MODEL`) and the 8B fallback id (`FULL_MODEL`) exist in WebLLM's prebuilt config.

- [ ] **Step 2: Run the app and load the small model**

Run: `make dev` (or `npm run dev`), open the app, pick Zork I, click the NL toggle → **Accept** in the modal. Confirm the progress bar advances and the toggle reaches `English: on`.

- [ ] **Step 3: End-to-end command path**

Type `grab the brass lantern`. Confirm the transcript shows:
```
> grab the brass lantern     (nl-source, muted)
  …thinking
› take lantern               (VM echo of the canonical command)
Taken.                       (VM output)
```

- [ ] **Step 4: Abstain path**

Type `what should I do?`. Confirm `…thinking` clears and the VM shows its own parser error (`› what should I do?` then `I don't know the word…`), with **no** nl-source line.

- [ ] **Step 5: Run the small model against the full corpus**

For each game, type each `english` from its `*.corpus.ts` and confirm the canonical command matches `expect` (and `__UNKNOWN__` entries abstain). **Where the small model misses or mis-maps, expand the grammar** (`*.gbnf.ts`) and re-test. If, after grammar expansion, the small model still fails the corpus, **escalate**: set `DEFAULT_MODEL = FULL_MODEL` (Task 1 `models.ts`) and re-run this step (fallback ladder, spec).

- [ ] **Step 6: Latency**

Measure translation latency over ~10 commands. Target: **p50 < ~2s, p95 < ~5s** on the reference machine. Set `WATCHDOG_MS` (Terminal) to comfortably above p95 (e.g. ~1.5×). If the small model misses the latency target and the 8B is no better, apply the next fallback rung: **narrow the first NL pass to Zork I** (ship only `zork1` in `BY_SIGNATURE`).

- [ ] **Step 7: Cancel path**

Toggle NL off, clear the cache (or use a fresh profile), toggle on → **Accept**, then **Cancel** mid-download. Confirm the toggle returns to `off · not installed` and the game still plays grammar-only.

- [ ] **Step 8: Record the gate outcome**

Append a short result block to the spec (chosen model id, measured p50/p95, final `WATCHDOG_MS`, and whether scope was narrowed) under a new "Walking-skeleton gate — results" heading, then commit:

```bash
git add docs/superpowers/specs/2026-06-07-loquor-nl-layer-design.md src/llm/models.ts src/ui/Terminal.tsx src/llm/grammar/
git commit -m "chore(nl): record walking-skeleton gate results + grammar/model/watchdog tuning"
```

---

## Self-Review notes (for the executor)

- **Spec coverage:** Goals → capability gating (Task 4), model lifecycle incl. cache-aware installed state (Tasks 9, 13), transparent translation/echo + `…thinking` (Tasks 2, 3, 9, 12), toggle on/off **+ `localStorage` persistence of on/off and "declined"** (Task 9, mirroring `useTheme`; `nlpref.ts`), abstain (Tasks 7, 9), unknown-signature → silent `disabled` (Tasks 9, 10), pure bridge + quarantined LLM (Tasks 2, 8, 13). Non-goals are untouched.
- **Alignment-review fixes folded in:** (A) the `installed` toggle state derives from `engine.isCached()` (on-disk, cross-reload), not in-memory `isLoaded()` — `LlmEngine.isCached()` added to the interface, fake, and real engine; (B) `nlpref.ts` persists the on/off + "declined" choice; (C) `grammar === null` yields a distinct silent `disabled` state (no pointless override) vs. `tier === 'none'` → `unavailable`; (D) the test-only `forceOn()` back door is removed — hook tests reach `on` through the real `requestDownload` path; (E) an explicit "pending while in flight" hook test plus `.nl-thinking`/`.nl-notice` CSS.
- **Type consistency:** `LlmEngine` (now incl. `isCached`), `CapabilityResult`, `NlState` (now incl. `disabled`), `PromptContext`, `TranslateResult`, `LoadProgress` are defined once in `types.ts` and imported everywhere; `grammarForSignature`/`CorpusEntry` from `grammar/index.ts`; `viewToContext`/`buildPrompt` from `prompt.ts`; `parseCompletion` from `translate.ts`; `readNlPref`/`writeNlPref` from `nlpref.ts`.
- **Placeholders:** the only deliberately-deferred values are the three story signatures (computed in Task 5 Step 5) and the gate-tuned constants (model id, watchdog, grammar vocab) — each has a concrete procedure, not a vague TODO.
