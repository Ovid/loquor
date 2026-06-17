# Loquor Preferences Panel, Debug Echo & Menu-Bar Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide NL-translated canonical echoes (`> up`) from the transcript by default behind a persisted **debug** preference housed in a new accessible Preferences modal, and tidy two menu-bar inconsistencies.

**Architecture:** A new `BufferLine` kind `nl-canonical` tags *every* VM-echoed canonical command of a translated turn — marked at the **send seam** (the NL pipeline flags canonical sends; the bridge carries the flag into the pure reducer) so compound clauses 2..n are tagged too, not just the first. The display layer (`Scrollback`) renders/filters by that kind under a `debug` flag from a `useDebug` hook; a `PreferencesModal` (reusing the existing modal chrome + `useFocusTrap`) houses the toggle.

**Tech Stack:** React + TypeScript, Vite, Vitest + @testing-library/react. localStorage for persistence. Existing patterns: `useTheme.ts`, `ModelDownloadModal.tsx`, `useFocusTrap.ts`, `LS_KEYS`.

**Source spec:** `docs/superpowers/specs/2026-06-17-loquor-preferences-debug-design.md`

---

## File Structure

**Modify:**
- `src/glkote-react/types.ts` — add `'nl-canonical'` to `BufferLine['kind']`.
- `src/glkote-react/reduce.ts` — accept a `canonicalEcho` arg; tag/carry `nl-canonical`.
- `src/glkote-react/bridge.ts` — `canonicalEcho` flag + `sendLineCanonical()`; pass flag to `reduce`.
- `src/zmachine/engine.ts` — `sendLineCanonical()` passthrough.
- `src/llm/translatePipeline.ts` — `sendTracked` gains a `canonical` arg; `TranslateDeps.sendCanonical`; tag translated-clause sends.
- `src/llm/useNaturalLanguage.ts` — thread `sendCanonical` into `createTranslate`.
- `src/ui/Terminal.tsx` — wire `sendCanonical`, own `useDebug`, render `⚙` + `PreferencesModal`, pass `debug` to `Scrollback`, mark status bar `inert` while open.
- `src/ui/Scrollback.tsx` — `debug` prop: filter/render `nl-canonical`, render `nl-source` as `>`-line vs pill, suppress live region across a toggle.
- `src/ui/StatusBar.tsx` — accept a `prefsToggle` node slot; fix the "Change story" glyph.
- `src/ui/NlLanguagePicker.tsx` — remove the visible `Language:` text.
- `src/ui/components.css` — `.you-pill` styling.
- `src/storageKeys.ts` — add `debug` key.

**Create:**
- `src/ui/useDebug.ts` — `[debug, toggle]` hook (mirrors `useTheme`).
- `src/ui/PreferencesModal.tsx` — localized modal with the Debug-mode checkbox.
- `src/ui/PreferencesModal.test.tsx` — a11y + localization tests.
- `src/ui/useDebug.test.ts` — persistence tests.

**Test files touched:** `src/glkote-react/reduce.test.ts`, `src/glkote-react/bridge.test.ts`, `src/llm/translatePipeline.test.ts`, `src/ui/Scrollback.test.tsx`, `src/ui/StatusBar.test.tsx`, `src/ui/NlLanguagePicker.test.tsx`, `src/ui/Terminal.test.tsx`.

---

## Task 1: Reducer tags `nl-canonical`

**Files:**
- Modify: `src/glkote-react/types.ts:4`
- Modify: `src/glkote-react/reduce.ts`
- Test: `src/glkote-react/reduce.test.ts`

- [ ] **Step 1: Add the kind to the union**

In `src/glkote-react/types.ts`, change the `BufferLine` kind union:

```ts
export interface BufferLine {
  id: number
  kind: 'output' | 'input' | 'room' | 'nl-source' | 'nl-canonical'
  text: string
}
```

- [ ] **Step 2: Write the failing reducer tests**

Add to `src/glkote-react/reduce.test.ts` (import `reduce` and `emptyView` are already in that file):

```ts
describe('nl-canonical tagging', () => {
  // A buffer "input echo" paragraph: append:true onto the tail, run style 'input'.
  const echoUpdate = (cmd: string) => ({
    type: 'update' as const,
    content: [{ text: [{ append: true, content: ['input', cmd] }] }],
  })
  const outputUpdate = (txt: string) => ({
    type: 'update' as const,
    content: [{ text: [{ content: ['normal', txt] }] }],
  })
  const withNlSource = {
    ...emptyView,
    lines: [{ id: 1, kind: 'nl-source' as const, text: 'arriba' }],
    nextId: 2,
  }

  it('tags a translated echo nl-canonical when canonicalEcho is set', () => {
    const v = reduce(withNlSource, echoUpdate('up'), true)
    const last = v.lines[v.lines.length - 1]
    expect(last).toMatchObject({ kind: 'nl-canonical', text: 'up' })
  })

  it('leaves the echo as input when canonicalEcho is false', () => {
    const v = reduce(withNlSource, echoUpdate('up'), false)
    const last = v.lines[v.lines.length - 1]
    expect(last).toMatchObject({ kind: 'input', text: 'up' })
  })

  it('carries nl-canonical inertly across a later update', () => {
    const v1 = reduce(withNlSource, echoUpdate('up'), true)
    const v2 = reduce(v1, outputUpdate('You climb up.'), false)
    const canon = v2.lines.find(l => l.text === 'up')
    expect(canon?.kind).toBe('nl-canonical')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/glkote-react/reduce.test.ts -t "nl-canonical"`
Expected: FAIL (reduce takes 2 args / tagging not implemented).

- [ ] **Step 4: Implement the reducer change**

In `src/glkote-react/reduce.ts`:

(a) Add `canonical` to the `Para` interface:

```ts
interface Para {
  text: string
  input: boolean
  canonical?: boolean
  prev?: BufferLine
}
```

(b) Give `bufferParagraphs` the flag and tag the input paragraphs. Change its signature and the three emit branches:

```ts
function bufferParagraphs(
  c: Record<string, unknown>,
  previous: Para[],
  canonicalEcho: boolean,
): Para[] {
```

In the bare-`>` echo branch:

```ts
    if (isInput && para.append && last && last.text.trim() === '>') {
      // Echoed command: drop the prompt char, keep the command, mark as input.
      emitted[emitted.length - 1] = {
        text,
        input: true,
        canonical: canonicalEcho,
        prev: last.prev,
      }
    } else if (para.append && last && !lastIsNlSource) {
      // Merge onto the previous line (preserving its identity/input/canonical flag).
      emitted[emitted.length - 1] = {
        text: last.text + text,
        input: last.input || isInput,
        canonical: last.canonical,
        prev: last.prev,
      }
    } else {
      emitted.push({ text, input: isInput, canonical: isInput && canonicalEcho })
    }
```

(c) Thread the flag through `reduce`. Change its signature and the seed + kind map + call:

```ts
export function reduce(
  prev: ViewState,
  update: GlkOteUpdate,
  canonicalEcho = false,
): ViewState {
```

Seed (carry the prior kind so an already-tagged line stays tagged):

```ts
  let paras: Para[] = lines.map(l => ({
    text: l.text,
    input: l.kind === 'input',
    canonical: l.kind === 'nl-canonical',
    prev: l,
  }))
```

The `bufferParagraphs` call inside the loop:

```ts
      paras = bufferParagraphs(entry, paras, canonicalEcho)
```

The kind map (check `canonical` first, before `input` and the `nl-source` carry):

```ts
  const newLines: BufferLine[] = paras.map(p => {
    const kind = p.canonical
      ? 'nl-canonical'
      : p.input
        ? 'input'
        : p.prev?.kind === 'nl-source'
          ? 'nl-source'
          : classify(p.text)
    if (p.prev && p.prev.text === p.text && p.prev.kind === kind) return p.prev
    return { id: p.prev ? p.prev.id : nextId++, kind, text: p.text }
  })
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/glkote-react/reduce.test.ts`
Expected: PASS (new + all existing reduce tests — the new arg defaults `false`, so existing callers are unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/glkote-react/types.ts src/glkote-react/reduce.ts src/glkote-react/reduce.test.ts
git commit -m "feat(glk): tag NL canonical echoes as nl-canonical in the reducer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Bridge carries the canonical-send flag

**Files:**
- Modify: `src/glkote-react/bridge.ts`
- Test: `src/glkote-react/bridge.test.ts`

- [ ] **Step 1: Write the failing bridge test**

Add to `src/glkote-react/bridge.test.ts`:

```ts
describe('canonical send flagging', () => {
  // Input-echo update shape (matches reduce's buffer-paragraph contract).
  const echoUpdate = (cmd: string) => ({
    type: 'update' as const,
    content: [{ text: [{ append: true, content: ['input', cmd] }] }],
    input: [{ type: 'line', id: 1, gen: 0 }],
  })

  it('sendLineCanonical makes the next echo render nl-canonical', () => {
    let view: ViewState = emptyView
    const bridge = new GlkOteBridge(v => (view = v))
    bridge.init({ accept: () => {} })
    bridge.echoLocal('arriba') // the player's Spanish, UI-only
    bridge.sendLineCanonical('up') // canonical send → arms the flag
    bridge.update(echoUpdate('up'))
    expect(view.lines.at(-1)).toMatchObject({ kind: 'nl-canonical', text: 'up' })
  })

  it('plain sendLine leaves the next echo as input', () => {
    let view: ViewState = emptyView
    const bridge = new GlkOteBridge(v => (view = v))
    bridge.init({ accept: () => {} })
    bridge.sendLine('up')
    bridge.update(echoUpdate('up'))
    expect(view.lines.at(-1)).toMatchObject({ kind: 'input', text: 'up' })
  })
})
```

(If `ViewState` / `emptyView` aren't already imported in the test file, add them from `'./types'`.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/glkote-react/bridge.test.ts -t "canonical send"`
Expected: FAIL (`sendLineCanonical` is not a function).

- [ ] **Step 3: Implement the flag and method**

In `src/glkote-react/bridge.ts`, add a field beside `charIsMore`:

```ts
  /**
   * Whether the most recent send was an NL-translated canonical command (set by
   * sendLineCanonical, cleared by sendLine). Read in update() and handed to the
   * reducer so EVERY echo of a translated turn — including compound clauses that
   * land after intervening output — is tagged nl-canonical, not just the first.
   * A labelling concern only: the command sent to the VM is identical.
   */
  private canonicalEcho = false
```

Pass it into the reducer in `update()` (the existing line `this.view = reduce(this.view, arg)`):

```ts
    this.view = reduce(this.view, arg, this.canonicalEcho)
```

Set/clear it on the two send paths. Replace the existing `sendLine`:

```ts
  sendLine(text: string) {
    this.canonicalEcho = false
    this.accept?.({
      type: 'line',
      gen: this.gen,
      window: this.mainWindow,
      value: text,
    })
  }

  /**
   * Like sendLine, but marks the send as an NL-translated canonical command so
   * its VM echo renders as nl-canonical (hidden in debug-off). Used by the NL
   * pipeline for every translated clause of a turn.
   */
  sendLineCanonical(text: string) {
    this.canonicalEcho = true
    this.accept?.({
      type: 'line',
      gen: this.gen,
      window: this.mainWindow,
      value: text,
    })
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/glkote-react/bridge.test.ts`
Expected: PASS (new + existing bridge tests).

- [ ] **Step 5: Commit**

```bash
git add src/glkote-react/bridge.ts src/glkote-react/bridge.test.ts
git commit -m "feat(glk): bridge sendLineCanonical arms the canonical-echo flag

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Engine passthrough

**Files:**
- Modify: `src/zmachine/engine.ts:194-196`

- [ ] **Step 1: Add the passthrough**

In `src/zmachine/engine.ts`, beside the existing `sendLine`:

```ts
  sendLine(text: string) {
    this.bridge.sendLine(text)
  }

  /** Canonical (NL-translated) send — see GlkOteBridge.sendLineCanonical. */
  sendLineCanonical(text: string) {
    this.bridge.sendLineCanonical(text)
  }
```

`// ponytail: one-line delegate, no dedicated test — exercised by the pipeline (Task 4) and Terminal (Task 9) suites.`

- [ ] **Step 2: Typecheck**

Run: `make typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/zmachine/engine.ts
git commit -m "feat(engine): expose sendLineCanonical passthrough

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Pipeline marks translated-clause sends canonical

**Files:**
- Modify: `src/llm/translatePipeline.ts`
- Modify: `src/llm/useNaturalLanguage.ts:249-290`
- Test: `src/llm/translatePipeline.test.ts`

- [ ] **Step 1: Write the failing pipeline test**

In `src/llm/translatePipeline.test.ts`, first extend the `makeTranslate` harness `opts` (around line 303) to accept the two new callbacks:

```ts
function makeTranslate(opts: {
  engine: FakeLlmEngine
  internalOn: Internal & { phase: 'on' }
  setNotice: TranslateDeps['setNotice']
  demote: () => void
  educatedRef: { current: boolean }
  sendLine?: (text: string) => void
  sendCanonical?: (text: string) => void
  echoLocal?: (text: string) => void
  watchdogMs?: number
}): (english: string) => Promise<string | null> {
```

and inside the `deps` object replace the `echoLocal` / `sendLine` lines with:

```ts
    echoLocal: opts.echoLocal ?? (() => {}),
    sendLine: opts.sendLine ?? (() => {}),
    sendCanonical: opts.sendCanonical ?? (() => {}),
```

Then add the test (in the `createTranslate` describe block):

```ts
  it('compound: every translated clause is sent canonical, with ONE nl-source echo', async () => {
    // Both clauses are non-vocab/non-direction → stage 7 (llm). The fake returns
    // a valid full-vocab command for each, so each clause translates and sends.
    const engine = new FakeLlmEngine({
      default: '{"verb":"open","object":"mailbox"}',
    })
    const sendCanonical = vi.fn()
    const sendLine = vi.fn()
    let echoCount = 0
    const t = makeTranslate({
      engine,
      internalOn: on('fr', 'full'),
      setNotice: vi.fn(),
      demote: vi.fn(),
      educatedRef: { current: false },
      sendLine,
      sendCanonical,
      echoLocal: () => {
        echoCount++
      },
    })
    await t('frobnique le gadget et frobnique encore')
    expect(echoCount).toBe(1) // one UI-only nl-source line for the whole compound
    expect(sendCanonical).toHaveBeenCalledTimes(2) // BOTH echoes tagged canonical
    expect(sendLine).not.toHaveBeenCalled() // translated sends never go raw
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/llm/translatePipeline.test.ts -t "every translated clause is sent canonical"`
Expected: FAIL (`sendCanonical` missing on `TranslateDeps`; `sendTracked` always uses `sendLine`).

- [ ] **Step 3: Add `sendCanonical` to the pipeline deps**

In `src/llm/translatePipeline.ts`, add to the `TranslateDeps` interface beside `sendLine` (line 376):

```ts
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
  /** Like sendLine, but marks the send NL-canonical (its echo renders as
   * nl-canonical, hidden in debug-off). Used for every translated-clause send. */
  sendCanonical: (text: string) => void
```

Destructure it in `createTranslate` (beside `sendLine`, line ~415):

```ts
    echoLocal,
    sendLine,
    sendCanonical,
```

- [ ] **Step 4: Make `sendTracked` route canonical sends**

In `createTranslate`, change `sendTracked` (line 521) to take a `canonical` flag:

```ts
    const sendTracked = (text: string, source: string = text, canonical = false) => {
      recordEcho?.(text, source)
      turnBox.pending = raceTurn()
      ;(canonical ? sendCanonical : sendLine)(text)
    }
```

Pass `echoed` at the two translated-clause send sites (lines 723 and 731). `echoed` is true exactly for a turn that fired `echoLocal` (a `TRANSLATED_STAGES` clause that isn't an EN identity echo), so it precisely matches the "translated turn" definition:

```ts
        if (total === 1) {
          sendTracked(result.text, clause, echoed)
          done++
          break // single command: Terminal's observe handles the turn
        }
```

and:

```ts
        sendTracked(result.text, clause, echoed)
        done++
```

Leave every other `sendTracked` call (confirmation reply 598, quoted 607, raw/EN paths 539/803/814/902, `abstainOnError` 539) unchanged — they default `canonical=false`, so a non-translated turn's echo stays `input` and emits no `nl-source` line.

- [ ] **Step 5: Thread `sendCanonical` through the hook**

In `src/llm/useNaturalLanguage.ts`, the `useNaturalLanguage` arg type already declares `sendLine`. Add `sendCanonical` beside it (find the props interface near `echoLocal: (text: string) => void` at line 33):

```ts
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
  sendCanonical: (text: string) => void
```

Destructure it where `sendLine` is pulled from props (near line 97), then pass it into `createTranslate` and add it to the `useCallback` deps (lines 251-290):

```ts
        echoLocal,
        sendLine,
        sendCanonical,
        recordEcho,
```

and in the dependency array:

```ts
      echoLocal,
      sendLine,
      sendCanonical,
      recordEcho,
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/llm/translatePipeline.test.ts`
Expected: PASS (new + existing — the existing harness call sites now supply `sendCanonical` via the default).

- [ ] **Step 7: Commit**

```bash
git add src/llm/translatePipeline.ts src/llm/useNaturalLanguage.ts src/llm/translatePipeline.test.ts
git commit -m "feat(nl): route translated-clause sends through the canonical seam

Every echo of a translated turn (incl. compound clauses 2..n) is now flagged
canonical at send time, so debug-off hides the whole set, not just the first.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `debug` storage key

**Files:**
- Modify: `src/storageKeys.ts:16-23`

- [ ] **Step 1: Add the key**

In `src/storageKeys.ts`, inside `LS_KEYS`:

```ts
  /** Output-translation corpus-miss ring buffer. Owner: src/translate/missLog.ts */
  miss: 'loquor.xlate.misses',
  /** Debug-view preference ('1' = on). Owner: src/ui/useDebug.ts */
  debug: 'loquor.debug',
} as const
```

- [ ] **Step 2: Typecheck**

Run: `make typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/storageKeys.ts
git commit -m "chore: register loquor.debug localStorage key

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `useDebug` hook

**Files:**
- Create: `src/ui/useDebug.ts`
- Test: `src/ui/useDebug.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/useDebug.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebug } from './useDebug'
import { LS_KEYS } from '../storageKeys'

afterEach(() => localStorage.clear())

describe('useDebug', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useDebug())
    expect(result.current[0]).toBe(false)
  })

  it('toggles and persists', () => {
    const { result } = renderHook(() => useDebug())
    act(() => result.current[1]())
    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem(LS_KEYS.debug)).toBe('1')
  })

  it('reads a persisted true value on mount', () => {
    localStorage.setItem(LS_KEYS.debug, '1')
    const { result } = renderHook(() => useDebug())
    expect(result.current[0]).toBe(true)
  })

  it('treats any non-sentinel value as false', () => {
    localStorage.setItem(LS_KEYS.debug, 'true')
    const { result } = renderHook(() => useDebug())
    expect(result.current[0]).toBe(false)
  })

  it('survives a throwing localStorage (defaults false, no crash)', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked')
      })
    try {
      const { result } = renderHook(() => useDebug())
      expect(result.current[0]).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ui/useDebug.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the hook**

Create `src/ui/useDebug.ts` (mirrors `useTheme.ts`; `'1'` sentinel):

```ts
import { useCallback, useEffect, useState } from 'react'
import { LS_KEYS } from '../storageKeys'

const KEY = LS_KEYS.debug

/**
 * Debug-view preference: whether NL-translated canonical echoes (`> up`) and the
 * `‹you›` pill are shown. Display-only — see PreferencesModal / Scrollback.
 * Validated on read; try/catch because localStorage itself throws when cookies
 * are blocked (mirrors useTheme).
 */
export function useDebug(): [boolean, () => void] {
  const [debug, setDebug] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      if (debug) localStorage.setItem(KEY, '1')
      else localStorage.removeItem(KEY)
    } catch {
      // Blocked/quota'd storage — the preference still applies, it just won't stick.
    }
  }, [debug])

  const toggle = useCallback(() => setDebug(d => !d), [])
  return [debug, toggle]
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ui/useDebug.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/useDebug.ts src/ui/useDebug.test.ts
git commit -m "feat(ui): useDebug hook persisting the debug-view preference

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Scrollback debug rendering + live-region suppression

**Files:**
- Modify: `src/ui/Scrollback.tsx`
- Test: `src/ui/Scrollback.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/ui/Scrollback.test.tsx` (it already renders `Scrollback` with `DisplayLine[]`; reuse its line-builder or inline objects):

```ts
import { rerender as _ } from '@testing-library/react' // (use the render() result's rerender)

describe('debug view', () => {
  const lines = [
    { id: 1, kind: 'nl-source' as const, text: 'arriba' },
    { id: 2, kind: 'nl-canonical' as const, text: 'up' },
    { id: 3, kind: 'output' as const, text: 'You climb up.' },
  ]

  it('debug OFF: hides the canonical echo and renders nl-source as a command', () => {
    render(<Scrollback lines={lines} debug={false} />)
    // nl-source shows as a typed command line, not the pill:
    expect(screen.getByText('arriba')).toBeInTheDocument()
    expect(screen.queryByText('you')).not.toBeInTheDocument()
    // canonical echo is gone entirely (not just hidden):
    expect(screen.queryByText('up')).not.toBeInTheDocument()
  })

  it('debug ON: shows the pill and the canonical echo', () => {
    render(<Scrollback lines={lines} debug={true} />)
    expect(screen.getByText('you')).toBeInTheDocument() // the pill label
    expect(screen.getByText('up')).toBeInTheDocument() // the canonical echo
  })

  it('suppresses the live region across a debug toggle', () => {
    const { rerender } = render(<Scrollback lines={lines} debug={false} />)
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
    rerender(<Scrollback lines={lines} debug={true} />)
    // The toggle commit must not announce the bulk re-render.
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'off')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ui/Scrollback.test.tsx -t "debug view"`
Expected: FAIL (`Scrollback` has no `debug` prop; renders nl-source pill always; doesn't filter nl-canonical).

- [ ] **Step 3: Implement the rendering rules**

Replace `src/ui/Scrollback.tsx` with:

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import type { DisplayLine } from '../translate/useOutputTranslation'

export function Scrollback({
  lines,
  debug = false,
  onActivate,
  children,
}: {
  lines: DisplayLine[]
  /** Debug view: show nl-canonical echoes and the ‹you› pill (default off). */
  debug?: boolean
  /** Focus the prompt when the player clicks into the transcript. */
  onActivate?: () => void
  /** The inline command prompt, rendered at the end of the transcript. */
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo?.(0, ref.current.scrollHeight)
  }, [lines])

  // Toggling debug re-renders the whole history at once; that bulk mutation must
  // NOT be announced (it's a settings action, not game output). Mute the live
  // region for the toggle commit, then restore on the next render driven by real
  // output. prevDebugRef is READ during render and synced in an effect.
  const prevDebugRef = useRef(debug)
  const toggled = prevDebugRef.current !== debug
  useEffect(() => {
    prevDebugRef.current = debug
  }, [debug])

  // The game prints a bare '>' prompt; the inline CommandInput already shows it,
  // so drop bare-'>' lines (kind-aware so a pathological nl-source '>' survives,
  // review S13). In debug-OFF also drop nl-canonical lines entirely — so screen
  // readers don't announce the hidden '> up'.
  const visible = lines.filter(l => {
    if (l.kind === 'nl-canonical') return debug
    return l.kind === 'nl-source' || l.text.trim() !== '>'
  })

  return (
    <div
      className="scroll"
      ref={ref}
      onMouseUp={() => {
        if (onActivate && !window.getSelection()?.toString()) onActivate()
      }}
    >
      <div
        role="log"
        aria-live={toggled ? 'off' : 'polite'}
        aria-relevant="additions"
        aria-label="Game transcript"
      >
        {visible.map(l => {
          // nl-canonical renders exactly like a typed command echo.
          const asCommand = l.kind === 'input' || l.kind === 'nl-canonical'
          // nl-source: the ‹you› pill in debug, else a plain command line.
          const asPill = l.kind === 'nl-source' && debug
          return (
            <p
              key={l.id}
              lang={l.lang}
              className={
                (l.kind === 'room'
                  ? 'room'
                  : asCommand || (l.kind === 'nl-source' && !debug)
                    ? 'echo'
                    : asPill
                      ? 'nl-source'
                      : '') + (l.pending ? ' xl-pending' : '')
              }
            >
              {asPill ? (
                <>
                  <span className="you-pill" lang="en">
                    you
                  </span>{' '}
                  {l.text}
                </>
              ) : asCommand || l.kind === 'nl-source' ? (
                <>
                  <span className="car">&gt;</span> {l.text}
                </>
              ) : (
                l.text
              )}
            </p>
          )
        })}
      </div>
      {children}
    </div>
  )
}
```

Note: the pill label keeps the class `you-pill` (Task 11 styles it as an inverted badge); the old bare `you` text becomes the `‹you›` pill in debug and disappears in debug-off (the line renders as `> arriba`).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ui/Scrollback.test.tsx`
Expected: PASS. If any pre-existing test asserted `getByText('you')` for an nl-source line in the default (no-`debug`) render, update it: nl-source now renders as `> {text}` unless `debug` is set.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Scrollback.tsx src/ui/Scrollback.test.tsx
git commit -m "feat(ui): debug-gated rendering of nl-canonical echoes and the you pill

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: PreferencesModal component

**Files:**
- Create: `src/ui/PreferencesModal.tsx`
- Test: `src/ui/PreferencesModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/PreferencesModal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PreferencesModal, PREFS_COPY } from './PreferencesModal'

const noop = () => {}

describe('PreferencesModal', () => {
  it('is a labelled modal dialog when open', () => {
    render(
      <PreferencesModal open debug={false} onToggleDebug={noop} onClose={noop} />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName(PREFS_COPY.en.heading)
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <PreferencesModal
        open={false}
        debug={false}
        onToggleDebug={noop}
        onClose={noop}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes the debug checkbox by its accessible name and reflects state', () => {
    render(
      <PreferencesModal open debug onToggleDebug={noop} onClose={noop} />,
    )
    const box = screen.getByRole('checkbox', { name: PREFS_COPY.en.debugLabel })
    expect(box).toBeChecked()
    expect(box).toHaveAccessibleDescription(PREFS_COPY.en.debugHelp)
  })

  it('calls onToggleDebug when the checkbox is clicked', async () => {
    const onToggleDebug = vi.fn()
    render(
      <PreferencesModal
        open
        debug={false}
        onToggleDebug={onToggleDebug}
        onClose={noop}
      />,
    )
    await userEvent.click(
      screen.getByRole('checkbox', { name: PREFS_COPY.en.debugLabel }),
    )
    expect(onToggleDebug).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape (reuses useFocusTrap)', async () => {
    const onClose = vi.fn()
    render(
      <PreferencesModal open debug={false} onToggleDebug={noop} onClose={onClose} />,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has copy for every NL language', () => {
    for (const lang of ['en', 'fr', 'de', 'es'] as const) {
      const c = PREFS_COPY[lang]
      expect(c.heading).toBeTruthy()
      expect(c.debugLabel).toBeTruthy()
      expect(c.debugHelp).toBeTruthy()
      expect(c.close).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ui/PreferencesModal.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the modal**

Create `src/ui/PreferencesModal.tsx` (mirrors `ModelDownloadModal.tsx`: `.modal-backdrop`/`.modal` chrome, `useFocusTrap`, localized `COPY`):

```tsx
import { useRef } from 'react'
import type { ActiveLanguage } from '../llm/types'
import { useFocusTrap } from './useFocusTrap'

interface PrefsCopy {
  heading: string
  debugLabel: string
  debugHelp: string
  close: string
  /** aria-label for the status-bar ⚙ opener (Terminal reads this). */
  openLabel: string
}

export const PREFS_COPY: Record<ActiveLanguage, PrefsCopy> = {
  en: {
    heading: 'Preferences',
    debugLabel: 'Debug mode',
    debugHelp: 'Show translated commands (e.g. “> up”) in the transcript.',
    close: 'Done',
    openLabel: 'Preferences',
  },
  fr: {
    heading: 'Préférences',
    debugLabel: 'Mode débogage',
    debugHelp: 'Afficher les commandes traduites (par ex. « > up ») dans la transcription.',
    close: 'Terminé',
    openLabel: 'Préférences',
  },
  de: {
    heading: 'Einstellungen',
    debugLabel: 'Debug-Modus',
    debugHelp: 'Übersetzte Befehle (z. B. „> up“) im Protokoll anzeigen.',
    close: 'Fertig',
    openLabel: 'Einstellungen',
  },
  es: {
    heading: 'Preferencias',
    debugLabel: 'Modo de depuración',
    debugHelp: 'Mostrar los comandos traducidos (p. ej. «> up») en la transcripción.',
    close: 'Hecho',
    openLabel: 'Preferencias',
  },
}

/** Localized aria-label for the status-bar ⚙ button. */
export function prefsOpenLabel(lang: ActiveLanguage): string {
  return PREFS_COPY[lang].openLabel
}

export function PreferencesModal({
  open,
  debug,
  lang = 'en',
  onToggleDebug,
  onClose,
}: {
  open: boolean
  debug: boolean
  /** Active NL language — renders the panel chrome in this language (3.1.2). */
  lang?: ActiveLanguage
  onToggleDebug: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Same focus contract as the download modal (2.4.3 / 2.1.2): trap Tab, move
  // focus in on open, restore to the ⚙ opener on close, Escape closes.
  useFocusTrap(dialogRef, { active: open, onEscape: onClose })

  if (!open) return null
  const copy = PREFS_COPY[lang]

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prefs-modal-title"
      ref={dialogRef}
    >
      <div className="modal">
        <h2 id="prefs-modal-title">{copy.heading}</h2>
        <label className="prefs-row">
          <input
            type="checkbox"
            checked={debug}
            aria-describedby="prefs-debug-help"
            onChange={onToggleDebug}
          />{' '}
          {copy.debugLabel}
        </label>
        <p id="prefs-debug-help" className="prefs-help">
          {copy.debugHelp}
        </p>
        <div className="modal-actions">
          <button className="sw" type="button" onClick={onClose}>
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ui/PreferencesModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/PreferencesModal.tsx src/ui/PreferencesModal.test.tsx
git commit -m "feat(ui): localized PreferencesModal housing the debug toggle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: StatusBar `⚙` slot + Change-story glyph

**Files:**
- Modify: `src/ui/StatusBar.tsx`
- Test: `src/ui/StatusBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/ui/StatusBar.test.tsx`:

```tsx
it('renders the prefsToggle node between the picker and theme toggle', () => {
  render(
    <StatusBar
      status={null}
      onChangeStory={() => {}}
      themeToggle={<button>theme</button>}
      nlToggle={<span data-testid="nl">nl</span>}
      prefsToggle={<button>prefs</button>}
    />,
  )
  expect(screen.getByRole('button', { name: 'prefs' })).toBeInTheDocument()
})

it('Change story uses the trailing ▾ glyph (decorative, aria-hidden)', () => {
  render(
    <StatusBar
      status={null}
      onChangeStory={() => {}}
      themeToggle={<button>theme</button>}
    />,
  )
  const btn = screen.getByRole('button', { name: 'Change story' })
  expect(btn.textContent).toContain('▾')
  expect(btn.textContent).not.toContain('⌄')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ui/StatusBar.test.tsx -t "prefsToggle"`
Expected: FAIL (`prefsToggle` prop unknown; button still uses leading `⌄`).

- [ ] **Step 3: Implement the changes**

In `src/ui/StatusBar.tsx`, add the `prefsToggle` prop and re-order the glyph. Replace the props block and the meta span:

```tsx
export function StatusBar({
  status,
  onChangeStory,
  themeToggle,
  nlToggle,
  prefsToggle,
  inert = false,
}: {
  status: StatusLine | null
  onChangeStory: () => void
  themeToggle: ReactNode
  nlToggle?: ReactNode
  /** The ⚙ Preferences opener, rendered between the picker and theme toggle. */
  prefsToggle?: ReactNode
  /** Make the bar inert while a modal/overlay is open (M9). */
  inert?: boolean
}) {
```

and the button + slot order:

```tsx
        <button className="sw" type="button" onClick={onChangeStory}>
          Change story <span aria-hidden="true">▾</span>
        </button>
        {nlToggle}
        {prefsToggle}
        {themeToggle}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ui/StatusBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/StatusBar.tsx src/ui/StatusBar.test.tsx
git commit -m "feat(ui): status-bar prefs slot; unify Change-story caret to trailing ▾

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Remove the visible `Language:` text

**Files:**
- Modify: `src/ui/NlLanguagePicker.tsx:39-41`
- Test: `src/ui/NlLanguagePicker.test.tsx`

- [ ] **Step 1: Write/confirm the regression test**

Add to `src/ui/NlLanguagePicker.test.tsx` (the picker requires an `NlState`; reuse the suite's existing `state` builder — an `phase:'on'` state renders the combobox):

```tsx
it('drops the visible "Language:" text but keeps the combobox accessible name', () => {
  render(
    <NlLanguagePicker
      state={{ phase: 'on', language: 'fr', model: 'grammar', canUpgrade: true }}
      onSelect={() => {}}
      onUpgrade={() => {}}
    />,
  )
  // The accessible name comes from aria-label on the combobox, not visible text:
  expect(
    screen.getByRole('combobox', { name: 'Language' }),
  ).toBeInTheDocument()
  expect(screen.queryByText(/^Language:/)).not.toBeInTheDocument()
})
```

(Match the exact `NlState` shape the suite already constructs — copy an existing `phase:'on'` state literal from the file if the fields differ.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx -t "drops the visible"`
Expected: FAIL (the `Language:` text is still rendered).

- [ ] **Step 3: Remove the text**

In `src/ui/NlLanguagePicker.tsx`, delete the visible label (lines 40-41) — the `<span className="nl-toggle">` opens straight onto the combobox:

```tsx
  return (
    <span className="nl-toggle">
      <LanguageCombobox
```

(Remove the `Language:{' '}` line. The `LanguageCombobox` keeps `label="Language"`, so its accessible name is unchanged — no a11y regression.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/NlLanguagePicker.tsx src/ui/NlLanguagePicker.test.tsx
git commit -m "feat(ui): drop redundant 'Language:' label; keep combobox aria-label

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Pill CSS

**Files:**
- Modify: `src/ui/components.css` (the `.you` block, ~line 225)

- [ ] **Step 1: Replace the `.you` rule with an inverted pill**

In `src/ui/components.css`, replace the existing `.you` block with `.you-pill`. The pill inverts the theme's fg/bg pair (same contrast ratio in both themes, per spec); shape + padding is the non-colour cue (1.4.1):

```css
/* Inverted ‹you› badge for the player's pre-translation line in debug view.
   bg = theme foreground, text = theme background: an fg/bg inversion, so it
   keeps the theme's WCAG AA ratio in both themes; the pill shape is a
   non-colour cue (1.4.1). The label text stays lang="en" ("you"). */
.you-pill {
  display: inline-block;
  padding: 0 6px;
  margin-right: 6px;
  border-radius: 8px;
  font-size: 0.78em;
  font-style: normal;
  letter-spacing: 0.04em;
  background: var(--text);
  color: var(--bg-base);
}
```

(`--text` is the theme foreground and `--bg-base` the theme background — both defined per-theme in `src/ui/theme.css`, so the inversion tracks the active theme automatically.)

- [ ] **Step 2: Verify build/typecheck (CSS has no unit test)**

Run: `make build`
Expected: PASS (Vite compiles the CSS).

`// ponytail: CSS-only, no test — visual contrast is asserted by the design's fg/bg-inversion invariant, not a unit test.`

- [ ] **Step 3: Commit**

```bash
git add src/ui/components.css
git commit -m "style(ui): inverted you-pill badge for debug-view nl-source lines

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Terminal integration

**Files:**
- Modify: `src/ui/Terminal.tsx`
- Test: `src/ui/Terminal.test.tsx`

- [ ] **Step 1: Write the failing integration tests**

Add to `src/ui/Terminal.test.tsx` (reuse the suite's existing `renderTerminal`/boot helper — it already mounts a Terminal with a story):

```tsx
describe('preferences', () => {
  it('opens the Preferences modal from the ⚙ button and toggles debug', async () => {
    renderTerminal() // existing helper in this suite
    const open = await screen.findByRole('button', { name: /preferences/i })
    await userEvent.click(open)
    const dialog = screen.getByRole('dialog', { name: /preferences/i })
    expect(dialog).toBeInTheDocument()
    const box = screen.getByRole('checkbox', { name: /debug mode/i })
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    expect(box).toBeChecked()
  })

  it('restores focus to the ⚙ opener when the modal closes (Escape)', async () => {
    renderTerminal()
    const open = await screen.findByRole('button', { name: /preferences/i })
    await userEvent.click(open)
    await userEvent.keyboard('{Escape}')
    expect(open).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "preferences"`
Expected: FAIL (no ⚙ button / modal wired).

- [ ] **Step 3: Wire the Terminal**

In `src/ui/Terminal.tsx`:

(a) Add imports near the other UI imports:

```tsx
import { PreferencesModal, prefsOpenLabel } from './PreferencesModal'
import { useDebug } from './useDebug'
```

(b) Pass the canonical send into the NL hook (the new `sendCanonical` prop from Task 4) — beside the existing `sendLine` line (118):

```tsx
    sendLine: t => engineRef.current?.sendLine(t),
    sendCanonical: t => engineRef.current?.sendLineCanonical(t),
```

(c) Add state near the other hook calls (after `const nl = useNaturalLanguage(...)`):

```tsx
  const [debug, toggleDebug] = useDebug()
  const [prefsOpen, setPrefsOpen] = useState(false)
```

(d) Fold the modal into the inert/backdrop gating (line 166):

```tsx
  const modalOpen = nl.modalOpen || nl.state.phase === 'downloading' || prefsOpen
  const bgInert = backgroundInert || modalOpen
```

(e) Pass `prefsToggle` into `StatusBar` (the `⚙` button — `.sw` for keyboard parity, localized aria-label):

```tsx
        prefsToggle={
          <button
            className="sw"
            type="button"
            aria-label={prefsOpenLabel(activeLang)}
            onClick={() => setPrefsOpen(true)}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        }
```

(f) Pass `debug` to `Scrollback` (line 186):

```tsx
        <Scrollback
          lines={xl.lines}
          debug={debug}
          onActivate={() => inputRef.current?.focus()}
        >
```

(g) Render the modal as a sibling beside `ModelDownloadModal` (after it, before the closing `</div>`):

```tsx
      <PreferencesModal
        open={prefsOpen}
        debug={debug}
        lang={activeLang}
        onToggleDebug={toggleDebug}
        onClose={() => setPrefsOpen(false)}
      />
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ui/Terminal.test.tsx`
Expected: PASS (new + existing). `useState` is already imported in Terminal.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/Terminal.test.tsx
git commit -m "feat(ui): wire Preferences modal, debug view, and canonical send seam

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite + checks**

Run: `make all`
Expected: lint + format + typecheck + full `vitest run` all PASS, with no stray `console.error`/`console.warn` or React `act(...)` warnings (the pristine-output rule).

- [ ] **Step 2: Manual smoke (optional but recommended)**

Run: `make dev`, pick Spanish, type a compound (`ve al norte y coge la lámpara`). Confirm: debug-OFF shows only `> ve al norte y coge la lámpara` (no `> north` / `> take lamp`); open ⚙ → enable Debug mode → the `‹you›` pill + `> north` + `> take lamp` appear; toggling does not re-announce history to a screen reader.

- [ ] **Step 3: Final commit (if any formatting changed)**

```bash
git add -A
git commit -m "chore: format

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

**Spec coverage:**
- Debug pref (default false, localStorage, live re-render) → Tasks 5, 6, 7.
- `nl-canonical` line kind + reducer change → Task 1; send-seam marking (compounds) → Tasks 2-4.
- `you` pill (debug-on), inverted fg/bg, non-colour cue → Tasks 7, 11.
- Preferences panel (⚙ button, modal chrome, focus trap, localized copy, `inert`) → Tasks 8, 9, 12.
- Menu-bar polish (drop `Language:`, unify `▾`) → Tasks 9, 10.
- Live-toggle no-flood a11y → Task 7.
- "Translated turn" definition (echoLocal gate) + mixed-stage compound → Task 4 (the `echoed`-driven canonical flag), reducer carry → Task 1.
- Testing section (reduce tagging, Scrollback both modes, ⚙ by role, focus restore, checkbox by name, picker regression, glyph aria-hidden, persistence, localization) → covered across Tasks 1, 7, 8, 9, 10, 12.

**Type consistency:** `sendLineCanonical` (bridge/engine), `sendCanonical` (pipeline/hook deps + Terminal callback), `canonicalEcho` (bridge field + reduce arg + Para flag), `nl-canonical` (kind), `you-pill` (CSS + Scrollback class), `PREFS_COPY`/`prefsOpenLabel`/`prefsToggle` — names are used identically across the tasks that define and consume them.

**Open verification for the implementer:** the exact `NlState` literal in Task 10's test must match the suite's existing builder (copy a `phase:'on'` state from the file if fields differ). The CSS tokens (`--text` / `--bg-base`) are confirmed against `src/ui/theme.css`.
