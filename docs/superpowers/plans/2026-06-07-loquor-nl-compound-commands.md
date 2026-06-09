# Loquor NL Compound Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player type a compound natural-language instruction (e.g. `Ouvrez la boîte aux lettres and prends-le`) and have it run as a sequence of canonical Zork commands, one per turn, each translated against the live post-previous-clause scene, stopping cleanly on the first clause that can't be translated, fails in-game, or lands on an interactive prompt.

**Architecture:** A pure `splitClauses` splitter breaks the input on `and`/`then`/`et`/`puis`/`ensuite`/`.`/`;`. A new self-bounding `awaitTurn()` seam on the GlkOte bridge resolves at the next line-input boundary (paging through any MORE prompt, stopping on a genuine key prompt or game-end). The `useNaturalLanguage` hook gains a compound branch that issues each clause, awaits its turn, observes the resulting scene itself (suppressing Terminal's observe via an `inSequenceRef` latch to avoid a double-observe race), and stops on the documented conditions — setting a `Ran N of M actions.` notice when a sequence truncates.

**Tech Stack:** TypeScript, React (hooks), Vitest + @testing-library/react, the vendored ifvms/glkapi VM behind our `GlkOteBridge`.

**Spec:** `docs/superpowers/specs/2026-06-07-loquor-nl-compound-commands-design.md` (read it first; locked decisions 1–9 are referenced by number below).

---

## File Structure

- **`src/llm/translate.ts`** — add pure `splitClauses()` and `clauseFailed()` (both vocab-aware-only where noted, no React, no engine). Tests in `src/llm/translate.test.ts`.
- **`src/glkote-react/types.ts`** — add the `TurnResult` type.
- **`src/glkote-react/bridge.ts`** — add `awaitTurn()` + the turn-resolver plumbing inside `update()`. Tests in `src/glkote-react/bridge.test.ts`.
- **`src/zmachine/engine.ts`** — add the `awaitTurn()` pass-through façade.
- **`src/llm/useNaturalLanguage.ts`** — extract a `generateRaw()` helper (refactor), then add the compound branch + `inSequenceRef`/`isSequencing()` + the new `awaitTurn` arg. Tests in `src/llm/useNaturalLanguage.test.tsx`.
- **`src/ui/Terminal.tsx`** — wire `awaitTurn` into the hook and guard the observe effect with `nl.isSequencing()`.

Implementation order is bottom-up (pure helpers → bridge seam → façade → hook refactor → hook feature → UI wiring) so each task's tests can run in isolation against already-built lower layers.

---

## Task 1: `splitClauses` — pure clause splitter

**Files:**
- Modify: `src/llm/translate.ts`
- Test: `src/llm/translate.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/llm/translate.test.ts`. First extend the existing import line at the top of the file so `splitClauses` is imported (the file already imports `parseCommand, isMetaCommand, isConfirmationPrompt, isDisambiguationPrompt` from `'./translate'` — add `splitClauses` to that list).

Then append this describe block to the file:

```ts
describe('splitClauses', () => {
  it('returns a single-element array when there is no separator', () => {
    expect(splitClauses('open the mailbox')).toEqual(['open the mailbox'])
  })

  it('splits on the word separators (case-insensitive): and/then/et/puis/ensuite', () => {
    expect(splitClauses('open mailbox and take leaflet')).toEqual([
      'open mailbox',
      'take leaflet',
    ])
    expect(splitClauses('open mailbox THEN read it')).toEqual([
      'open mailbox',
      'read it',
    ])
    expect(splitClauses('ouvre la boîte et prends-le')).toEqual([
      'ouvre la boîte',
      'prends-le',
    ])
    expect(splitClauses('va au nord puis ouvre la porte')).toEqual([
      'va au nord',
      'ouvre la porte',
    ])
    expect(splitClauses('regarde ensuite prends la lampe')).toEqual([
      'regarde',
      'prends la lampe',
    ])
  })

  it('splits on "." and ";" punctuation', () => {
    expect(splitClauses('open mailbox. read leaflet')).toEqual([
      'open mailbox',
      'read leaflet',
    ])
    expect(splitClauses('open mailbox; read leaflet')).toEqual([
      'open mailbox',
      'read leaflet',
    ])
  })

  it('does NOT treat a comma as a separator', () => {
    expect(splitClauses('take the lamp, sword and key')).toEqual([
      'take the lamp, sword',
      'key',
    ])
  })

  it('does not false-split substrings like "sand" or "strengthen"', () => {
    expect(splitClauses('dig in the sand')).toEqual(['dig in the sand'])
    expect(splitClauses('strengthen the rope')).toEqual(['strengthen the rope'])
  })

  it('trims clauses and drops empties', () => {
    expect(splitClauses('  open mailbox  and  ')).toEqual(['open mailbox'])
    expect(splitClauses('open mailbox..')).toEqual(['open mailbox'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/llm/translate.test.ts -t "splitClauses"`
Expected: FAIL — `splitClauses is not a function` / not exported.

- [ ] **Step 3: Implement `splitClauses`**

Add to `src/llm/translate.ts` (place it just below the `ABSTAIN` export so it sits with the other top-level helpers):

```ts
/**
 * Split a compound English/French instruction into ordered clauses. Separators are
 * the sequential words `and`/`then`/`et`/`puis`/`ensuite` (each surrounded by
 * whitespace so substrings like "sand"/"strengthen" never trip it) and the
 * sentence punctuation `.`/`;`. Commas are NOT separators (locked decision 1). A
 * single clause (no separator) returns a length-1 array — the caller treats that
 * as "not compound" and uses the existing single-command path. Pure, total,
 * vocab-free.
 */
export function splitClauses(english: string): string[] {
  return english
    .split(/\s+(?:and|then|et|puis|ensuite)\s+|\s*[.;]\s*/i)
    .map(clause => clause.trim())
    .filter(clause => clause.length > 0)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/llm/translate.test.ts -t "splitClauses"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/llm/translate.ts src/llm/translate.test.ts
git commit -m "feat(nl): splitClauses — deterministic compound-command splitter

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `clauseFailed` — in-game no-op / absence detector

**Files:**
- Modify: `src/llm/translate.ts`
- Test: `src/llm/translate.test.ts`

Detects whether a clause's turn output is a no-op/refusal (`failurePat`) or an absence (`absencePat`). `ABSENCE_PAT` is a **global** (`/gi`) regex, so calling `.test()` on the shared instance is stateful (its `lastIndex` advances between calls). Mirror `tracker.ts`'s `suppressed()`: build a fresh `RegExp` from `.source`/`.flags` per call. `FAILURE_PAT` is non-global (`/i`), so `.test()` on it is safe.

- [ ] **Step 1: Write the failing tests**

In `src/llm/translate.test.ts`, extend the existing patterns import. The file already imports `{ TAKE_ACK, DROP_ACK, ABSENCE_PAT } from './grammar/patterns'` — add `FAILURE_PAT`. Also add `clauseFailed` to the `'./translate'` import. Then append:

```ts
describe('clauseFailed', () => {
  const v: Vocab = { ...vocab, failurePat: FAILURE_PAT }

  it('is true on a no-op failure phrase (failurePat)', () => {
    expect(clauseFailed('It is already open.', v)).toBe(true)
  })

  it('is true on an absence phrase (absencePat)', () => {
    expect(clauseFailed("You can't see any grue here.", v)).toBe(true)
  })

  it('is false on ordinary success output', () => {
    expect(clauseFailed('Opening the small mailbox reveals a leaflet.', v)).toBe(
      false,
    )
  })

  it('is not stateful across calls (rebuilds the global absencePat each time)', () => {
    const out = "You can't see any grue here."
    expect(clauseFailed(out, v)).toBe(true)
    expect(clauseFailed(out, v)).toBe(true)
  })

  it('tolerates a vocab with no failurePat', () => {
    expect(clauseFailed('It is already open.', vocab)).toBe(false)
  })
})
```

(`vocab` is the module-level test vocab already defined at the top of `translate.test.ts`; it has no `failurePat`, which is exactly the last case.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/llm/translate.test.ts -t "clauseFailed"`
Expected: FAIL — `clauseFailed is not a function`.

- [ ] **Step 3: Implement `clauseFailed`**

Add to `src/llm/translate.ts`, just below `isDisambiguationPrompt`:

```ts
/**
 * True when a clause's turn output signals an in-game no-op/refusal (`failurePat`,
 * e.g. "It is already open.") or an absence (`absencePat`, e.g. "You can't see any
 * grue here."). Used to STOP a compound sequence after a clause that didn't take
 * effect (locked decision 3). `absencePat` is a global regex, so a fresh instance
 * is built per call — `.test()` on the shared one is stateful (mirrors
 * tracker.ts's suppressed()).
 */
export function clauseFailed(recentOutput: string, vocab: Vocab): boolean {
  if (vocab.failurePat?.test(recentOutput)) return true
  const absence = new RegExp(vocab.absencePat.source, vocab.absencePat.flags)
  return absence.test(recentOutput)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/llm/translate.test.ts -t "clauseFailed"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/llm/translate.ts src/llm/translate.test.ts
git commit -m "feat(nl): clauseFailed — no-op/absence stop signal for sequences

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `TurnResult` type + bridge `awaitTurn()`

**Files:**
- Modify: `src/glkote-react/types.ts`
- Modify: `src/glkote-react/bridge.ts`
- Test: `src/glkote-react/bridge.test.ts`

`awaitTurn()` resolves at the next turn boundary. It pages through a MORE prompt (only when an awaiter is pending, so the existing no-awaiter MORE behavior is untouched), resolves `reason:'line'` on a line boundary, `reason:'key'` on a genuine single-key prompt, and `reason:'end'` on game-end (locked decision 8). Real Zork I–III never issue `char` requests (see the class comment / PROTOCOL-NOTES.md), so `'key'` and MORE-paging are defensive/test-only — but they are exercised via the synthetic `more` marker and a synthetic `char` update.

- [ ] **Step 1: Add the `TurnResult` type**

In `src/glkote-react/types.ts`, add (next to the other exported interfaces):

```ts
/** Result of GlkOteBridge.awaitTurn() — how the turn settled (locked decision 8). */
export interface TurnResult {
  view: ViewState
  reason: 'line' | 'key' | 'end'
}
```

- [ ] **Step 2: Write the failing tests**

Append to `src/glkote-react/bridge.test.ts` (inside the existing `describe('GlkOteBridge', …)` block):

```ts
it('awaitTurn resolves reason:"line" with the settled view on a line update', async () => {
  const bridge = new GlkOteBridge(vi.fn())
  bridge.init({ accept: vi.fn() })
  const p = bridge.awaitTurn()
  bridge.update({
    type: 'update',
    gen: 1,
    windows: [{ id: 7, type: 'buffer' }],
    content: [{ id: 7, text: [{ content: ['normal', 'West of House'] }] }],
    input: [{ type: 'line', id: 7, gen: 1 }],
  } as any)
  const r = await p
  expect(r.reason).toBe('line')
  expect(r.view.inputRequest).toBe('line')
})

it('awaitTurn pages through a MORE prompt then resolves on the next line', async () => {
  const bridge = new GlkOteBridge(vi.fn())
  const accept = vi.fn()
  bridge.init({ accept })
  const p = bridge.awaitTurn()
  // A MORE char prompt: with an awaiter pending, the bridge auto-acks with space…
  bridge.update({
    type: 'update',
    gen: 2,
    windows: [{ id: 7, type: 'buffer' }],
    input: [{ type: 'char', id: 7, gen: 2 }],
    more: true,
  } as any)
  expect(accept).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: 'char', value: ' ' }),
  )
  // …and only resolves once the real line boundary arrives.
  bridge.update({
    type: 'update',
    gen: 3,
    windows: [{ id: 7, type: 'buffer' }],
    input: [{ type: 'line', id: 7, gen: 3 }],
  } as any)
  await expect(p).resolves.toMatchObject({ reason: 'line' })
})

it('awaitTurn resolves reason:"key" on a genuine single-key prompt', async () => {
  const bridge = new GlkOteBridge(vi.fn())
  bridge.init({ accept: vi.fn() })
  const p = bridge.awaitTurn()
  bridge.update({
    type: 'update',
    gen: 2,
    windows: [{ id: 7, type: 'buffer' }],
    input: [{ type: 'char', id: 7, gen: 2 }],
  } as any)
  await expect(p).resolves.toMatchObject({ reason: 'key' })
})

it('awaitTurn resolves reason:"end" when the game ends', async () => {
  const bridge = new GlkOteBridge(vi.fn())
  bridge.init({ accept: vi.fn() })
  const p = bridge.awaitTurn()
  bridge.update({ type: 'update', gen: 1, exit: true } as any)
  await expect(p).resolves.toMatchObject({ reason: 'end' })
})

it('multiple concurrent awaiters all resolve on the same line boundary', async () => {
  const bridge = new GlkOteBridge(vi.fn())
  bridge.init({ accept: vi.fn() })
  const a = bridge.awaitTurn()
  const b = bridge.awaitTurn()
  bridge.update({
    type: 'update',
    gen: 1,
    windows: [{ id: 7, type: 'buffer' }],
    input: [{ type: 'line', id: 7, gen: 1 }],
  } as any)
  const both = await Promise.all([a, b])
  expect(both.map(r => r.reason)).toEqual(['line', 'line'])
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/glkote-react/bridge.test.ts -t "awaitTurn"`
Expected: FAIL — `bridge.awaitTurn is not a function`.

- [ ] **Step 4: Implement `awaitTurn` + resolver plumbing**

In `src/glkote-react/bridge.ts`:

(a) Extend the type import to include `TurnResult`:

```ts
import type {
  GlkOteDisplay,
  GlkOteInitIface,
  GlkOteUpdate,
  ViewState,
  TurnResult,
} from './types'
```

(b) Add a resolver list field next to the other private fields (e.g. just after `private charIsMore = false`):

```ts
  /** Pending awaitTurn() resolvers, drained at the next turn boundary. */
  private turnResolvers: Array<(r: TurnResult) => void> = []
```

(c) Replace the tail of `update()` — the block from the `// Turn boundary:` comment through the `onEnd` guard — with this. The line-request path keeps firing `onTurn?.()` exactly as before; the new code only adds turn-resolution:

```ts
    // Turn boundary handling. The line path still fires onTurn AFTER onState so
    // observers see the settled view; the native autosave fires here too.
    const reqType = (req as { type?: string } | undefined)?.type
    if (reqType === 'line') {
      this.onTurn?.()
      this.resolveTurn('line')
    } else if (reqType === 'char' && this.charIsMore) {
      // Page through MORE transparently, but only when a sequence is awaiting a
      // turn — otherwise leave the existing (Terminal-effect) MORE handling alone.
      if (this.turnResolvers.length > 0) this.ackMore()
    } else if (this.awaitingKey()) {
      // A genuine single-key prompt: no clean line boundary for a next command.
      this.resolveTurn('key')
    }
    // `ended` latches true in the reducer, so guard against re-firing onEnd on
    // every subsequent update.
    if (this.view.ended && !this.endedFired) {
      this.endedFired = true
      this.onEnd?.()
      this.resolveTurn('end')
    }
```

(d) Add the `awaitTurn` and `resolveTurn` methods (e.g. just after `awaitingKey()`):

```ts
  /**
   * Resolve at the next turn boundary with the settled view and how it ended
   * (locked decision 8). Registers a resolver that update() drains. Used by the
   * NL compound-command loop to wait one clause's turn before issuing the next.
   */
  awaitTurn(): Promise<TurnResult> {
    return new Promise<TurnResult>(resolve => {
      this.turnResolvers.push(resolve)
    })
  }

  /** Drain and settle all pending awaitTurn() resolvers with the current view. */
  private resolveTurn(reason: TurnResult['reason']) {
    if (this.turnResolvers.length === 0) return
    const resolvers = this.turnResolvers
    this.turnResolvers = []
    const result: TurnResult = { view: this.view, reason }
    for (const resolve of resolvers) resolve(result)
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/glkote-react/bridge.test.ts`
Expected: PASS — the 5 new `awaitTurn` tests plus all pre-existing bridge tests (the MORE/key/onEnd tests are unchanged because auto-ack is now gated on a pending awaiter, and `resolveTurn` no-ops with zero awaiters).

- [ ] **Step 6: Commit**

```bash
git add src/glkote-react/types.ts src/glkote-react/bridge.ts src/glkote-react/bridge.test.ts
git commit -m "feat(bridge): self-bounding awaitTurn turn-boundary seam

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: engine `awaitTurn()` façade

**Files:**
- Modify: `src/zmachine/engine.ts`

A one-line pass-through, consistent with the existing `sendLine`/`ackMore`/`awaitingKey` façades. Verified by typecheck and exercised end-to-end via the Terminal wiring (Task 7); no dedicated unit test (the behavior lives in the bridge, already tested in Task 3).

- [ ] **Step 1: Add the `TurnResult` import**

In `src/zmachine/engine.ts`, add (or extend the existing `glkote-react/types` import) at the top:

```ts
import type { TurnResult } from '../glkote-react/types'
```

- [ ] **Step 2: Add the façade method**

In `src/zmachine/engine.ts`, just after `awaitingKey()`:

```ts
  /** Resolve at the next turn boundary (locked decision 8). Pass-through to the bridge. */
  awaitTurn(): Promise<TurnResult> {
    return this.bridge.awaitTurn()
  }
```

- [ ] **Step 3: Typecheck**

Run: `make typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/zmachine/engine.ts
git commit -m "feat(engine): awaitTurn pass-through façade to the bridge

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Refactor — extract `generateRaw()` in the hook (no behavior change)

**Files:**
- Modify: `src/llm/useNaturalLanguage.ts`
- Test (regression only): `src/llm/useNaturalLanguage.test.tsx`

Extract the "load-if-needed + watchdog-raced single inference" core out of `translate()` into a reusable `generateRaw()` so the compound loop (Task 6) can call it per clause. This is a pure refactor: the single-command path must behave identically, so the existing hook tests are the regression guard (no new test).

- [ ] **Step 1: Confirm the current single-path tests are green (baseline)**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx`
Expected: PASS (all existing tests). This is the baseline the refactor must preserve.

- [ ] **Step 2: Add the `ChatMessages` type import**

In `src/llm/useNaturalLanguage.ts`, extend the existing `'./types'` type import to include `ChatMessages`:

```ts
import type {
  CapabilityResult,
  ChatMessages,
  LlmEngine,
  NlState,
  PromptContext,
  ViewContext,
} from './types'
```

- [ ] **Step 3: Add the `generateRaw` helper**

In `src/llm/useNaturalLanguage.ts`, add this `useCallback` just above the `translate` definition (it owns its own `AbortController` and watchdog so each call — single command or one clause — is independently bounded and independently abortable):

```ts
  // One bounded inference: load the model if it isn't resident yet, then race
  // generate() against a watchdog. Throws WatchdogTimeout on timeout (aborting the
  // orphaned generate) or the underlying error on failure. Shared by the single-
  // command path and the per-clause compound loop.
  const generateRaw = useCallback(
    async (messages: ChatMessages, grammar: string): Promise<string> => {
      const ac = new AbortController()
      let watchdogId: ReturnType<typeof setTimeout>
      try {
        if (!engine.isLoaded()) await engine.load(() => {}, ac.signal)
        const watchdog = new Promise<never>((_, rej) => {
          watchdogId = setTimeout(() => {
            // Reject FIRST so the watchdog wins the race (keeping the "timed out"
            // notice accurate), THEN abort the now-orphaned generate.
            rej(new WatchdogTimeout())
            ac.abort()
          }, watchdogMs)
        })
        return await Promise.race([
          engine.generate(messages, grammar, ac.signal),
          watchdog,
        ])
      } finally {
        clearTimeout(watchdogId!)
      }
    },
    [engine, watchdogMs],
  )
```

- [ ] **Step 4: Rewrite `translate()`'s try/catch/finally to use `generateRaw`**

The current `translate` (after the bypass pre-checks) declares `let watchdogId` and `const ac = new AbortController()` *before* the `try`, inlines the load/watchdog/race/clearTimeout inside the `try`, and the `catch` opens with `clearTimeout(watchdogId!)`. After extraction those become dead/dangling (and the unused `watchdogId`/`ac` would fail lint). Replace the whole region — from the line `let watchdogId: ReturnType<typeof setTimeout>` down to and including the closing `}` of the `finally` block — with this self-contained version (the watchdog/abort now live entirely in `generateRaw`, so neither `watchdogId` nor `ac` appears here, and the `catch` no longer calls `clearTimeout`):

```ts
      try {
        const scene = tracker.scene()
        const grammar = buildGrammar(vocab, scene)
        const base = getContext()
        const ctx: PromptContext = {
          ...base,
          inScope: scene.inScope.map(o => o.canonical),
          antecedent: scene.antecedent,
        }
        const raw = await generateRaw(buildPrompt(english, ctx), grammar)
        const result = parseCommand(raw, scene, vocab)
        // TEMP gate diagnostics — what the scene fed the model vs. what it emitted.
        // Remove once translation quality is tuned.
        console.log(
          '[nl debug]',
          JSON.stringify({
            english,
            antecedent: scene.antecedent,
            inScope: scene.inScope.map(o => o.canonical),
            raw,
            result,
          }),
        )
        if (result.kind === 'command') {
          lastCommandRef.current = result.text // latch for the next observe()
          echoLocal(english)
          sendLine(result.text)
        } else {
          lastCommandRef.current = null // abstain → raw send, no acted-object
          sendLine(english) // abstain → game's own parser handles it
        }
      } catch (err) {
        lastCommandRef.current = null
        // A genuine generate failure (vs. a benign watchdog timeout) is otherwise
        // swallowed by the notice below; log it so it stays diagnosable.
        if (!(err instanceof WatchdogTimeout))
          console.error('[nl] translation failed:', err)
        setNotice(
          err instanceof WatchdogTimeout
            ? 'Translation timed out — sent as typed.'
            : 'Translation failed — sent as typed.',
        )
        sendLine(english)
      } finally {
        translatingRef.current = false
        setPending(false)
      }
```

- [ ] **Step 5: Add `generateRaw` to the `translate` dependency array**

In the `translate` `useCallback` dependency array, add `generateRaw` (and keep all existing deps):

```ts
    [
      internal.phase,
      vocab,
      engine,
      getContext,
      echoLocal,
      sendLine,
      watchdogMs,
      generateRaw,
    ],
```

- [ ] **Step 6: Run the hook tests to verify they still pass**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx`
Expected: PASS — identical to the Step 1 baseline (command echo+send, abstain raw-send, pending lock, generate-failure notice, watchdog-timeout notice, meta/confirm/disambig bypass, French dependent replay).

- [ ] **Step 7: Commit**

```bash
git add src/llm/useNaturalLanguage.ts
git commit -m "refactor(nl): extract generateRaw (bounded single inference)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Compound branch in `useNaturalLanguage`

**Files:**
- Modify: `src/llm/useNaturalLanguage.ts`
- Test: `src/llm/useNaturalLanguage.test.tsx`

Adds the `awaitTurn` arg, the `inSequenceRef`/`isSequencing()` latch (locked decision 9), and the sequential compound loop (locked decisions 1–8). The hook owns observation during a sequence; `inSequenceRef` is set synchronously on entering the sequence branch (before the first `await`) so Terminal's effect can early-return.

- [ ] **Step 1: Write the failing tests**

In `src/llm/useNaturalLanguage.test.tsx`:

(a) Extend the patterns import to add `FAILURE_PAT`:

```ts
import { TAKE_ACK, DROP_ACK, ABSENCE_PAT, FAILURE_PAT } from './grammar/patterns'
```

(b) Add a default `awaitTurn` to the `setup()` helper so every existing test keeps working. In the `useNaturalLanguage({ … })` call inside `setup`, add this line just above `watchdogMs: 5000,`:

```ts
      awaitTurn: async () => ({ view: emptyView, reason: 'line' as const }),
```

(c) Extend the existing top-of-file glkote-react types import to add `TurnResult`. The file currently has `import type { ViewState, BufferLine } from '../glkote-react/types'` — change it to:

```ts
import type { ViewState, BufferLine, TurnResult } from '../glkote-react/types'
```

Then add a small scripted-turn helper near the top of the file (after the `viewState` helper, not as an import):

```ts
/** An awaitTurn that returns the given views in order (last one repeats). */
function turnScript(views: ViewState[]): () => Promise<TurnResult> {
  let i = 0
  return async () => ({
    view: views[Math.min(i++, views.length - 1)],
    reason: 'line' as const,
  })
}
```

(d) Append these tests inside the `describe('useNaturalLanguage', …)` block:

```ts
it('compound: runs each clause against the live scene (open mailbox + prends-le)', async () => {
  const engine = new FakeLlmEngine({
    cached: true,
    completions: {
      'Ouvrez la boîte aux lettres': '{"verb":"open","object":"mailbox"}',
      'prends-le': '{"verb":"take","object":"leaflet"}',
    },
    default: '{"verb":"__UNKNOWN__"}',
  })
  const revealView = viewState(
    'West of House',
    ['open mailbox', 'Opening the small mailbox reveals a leaflet.'],
    'open mailbox',
  )
  const afterTake = viewState('West of House', ['take leaflet', 'Taken.'], 'take leaflet')
  const { hook, echoLocal, sendLine } = setup({
    engine,
    awaitTurn: turnScript([revealView, afterTake]),
  })
  await reachOn(hook)
  act(() =>
    hook.result.current.observe(
      viewState('West of House', ['There is a small mailbox here.']),
    ),
  )
  await act(async () => {
    await hook.result.current.translate('Ouvrez la boîte aux lettres and prends-le')
  })
  expect(echoLocal).toHaveBeenCalledTimes(1)
  expect(echoLocal).toHaveBeenCalledWith('Ouvrez la boîte aux lettres and prends-le')
  expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox', 'take leaflet'])
  expect(hook.result.current.notice).toBeNull()
})

it('compound: stops and notices when a later clause cannot be translated', async () => {
  const engine = new FakeLlmEngine({
    cached: true,
    completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
    default: '{"verb":"__UNKNOWN__"}',
  })
  const revealView = viewState(
    'West of House',
    ['open mailbox', 'Opening the small mailbox reveals a leaflet.'],
    'open mailbox',
  )
  const { hook, sendLine } = setup({ engine, awaitTurn: turnScript([revealView]) })
  await reachOn(hook)
  act(() =>
    hook.result.current.observe(
      viewState('West of House', ['There is a small mailbox here.']),
    ),
  )
  await act(async () => {
    await hook.result.current.translate('open mailbox and xyzzy the grue')
  })
  expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
  expect(hook.result.current.notice).toBe('Ran 1 of 2 actions.')
})

it('compound: stops after an in-game no-op (failurePat) on the first clause', async () => {
  const engine = new FakeLlmEngine({
    cached: true,
    completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
    default: '{"verb":"__UNKNOWN__"}',
  })
  const noop = viewState('West of House', ['open mailbox', 'It is already open.'], 'open mailbox')
  const { hook, sendLine } = setup({
    engine,
    vocab: { ...TEST_VOCAB, failurePat: FAILURE_PAT },
    awaitTurn: turnScript([noop]),
  })
  await reachOn(hook)
  act(() =>
    hook.result.current.observe(
      viewState('West of House', ['There is a small mailbox here.']),
    ),
  )
  await act(async () => {
    await hook.result.current.translate('open mailbox and take leaflet')
  })
  expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
  expect(hook.result.current.notice).toBe('Ran 1 of 2 actions.')
})

it('compound: stops when a clause lands on a disambiguation prompt', async () => {
  const engine = new FakeLlmEngine({
    cached: true,
    completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
    default: '{"verb":"__UNKNOWN__"}',
  })
  const disambig = viewState(
    'West of House',
    ['open mailbox', 'Which mailbox do you mean, the brass mailbox or the small mailbox?'],
    'open mailbox',
  )
  const { hook, sendLine } = setup({ engine, awaitTurn: turnScript([disambig]) })
  await reachOn(hook)
  act(() =>
    hook.result.current.observe(
      viewState('West of House', ['There is a small mailbox here.']),
    ),
  )
  await act(async () => {
    await hook.result.current.translate('open mailbox and take leaflet')
  })
  expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
  expect(hook.result.current.notice).toBe('Ran 1 of 2 actions.')
})

it('compound: a never-settling turn times out, stops, and re-enables input', async () => {
  const engine = new FakeLlmEngine({
    cached: true,
    completions: {
      'open mailbox': '{"verb":"open","object":"mailbox"}',
      'take leaflet': '{"verb":"take","object":"leaflet"}',
    },
    default: '{"verb":"__UNKNOWN__"}',
  })
  const neverSettle = () => new Promise<TurnResult>(() => {})
  const { hook, sendLine } = setup({ engine, watchdogMs: 1000, awaitTurn: neverSettle })
  await reachOn(hook)
  act(() =>
    hook.result.current.observe(
      viewState('West of House', ['There is a small mailbox here.', 'a leaflet']),
    ),
  )
  vi.useFakeTimers()
  let p!: Promise<void>
  act(() => {
    p = hook.result.current.translate('open mailbox and take leaflet')
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1100)
    await p
  })
  expect(sendLine.mock.calls.map(c => c[0])).toEqual(['open mailbox'])
  expect(hook.result.current.pending).toBe(false)
  expect(hook.result.current.notice).toBe('Ran 1 of 2 actions.')
  vi.useRealTimers()
})

it('compound: first clause untranslatable → raw-send the whole input, no notice', async () => {
  const { hook, echoLocal, sendLine } = setup({
    engine: new FakeLlmEngine({ cached: true, default: '{"verb":"__UNKNOWN__"}' }),
  })
  await reachOn(hook)
  await act(async () => {
    await hook.result.current.translate('foo the bar and baz the qux')
  })
  expect(sendLine).toHaveBeenCalledWith('foo the bar and baz the qux')
  expect(echoLocal).not.toHaveBeenCalled()
  expect(hook.result.current.notice).toBeNull()
})

it('a prompt reply containing "and" is bypassed, not split or translated', async () => {
  const engine = new FakeLlmEngine({ cached: true, default: '{"verb":"look"}' })
  const generateSpy = vi.spyOn(engine, 'generate')
  const getContext = () => ({
    location: '',
    recentOutput: 'Do you wish to restart? (Y is affirmative): ',
  })
  const { hook, sendLine } = setup({ engine, getContext })
  await reachOn(hook)
  await act(async () => {
    await hook.result.current.translate('yes and restart')
  })
  expect(sendLine).toHaveBeenCalledWith('yes and restart')
  expect(generateSpy).not.toHaveBeenCalled()
})

it('isSequencing() is true while a clause turn is pending, false at rest', async () => {
  const engine = new FakeLlmEngine({
    cached: true,
    completions: { 'open mailbox': '{"verb":"open","object":"mailbox"}' },
    default: '{"verb":"__UNKNOWN__"}',
  })
  let release!: (r: TurnResult) => void
  const gate = new Promise<TurnResult>(res => {
    release = res
  })
  const { hook } = setup({ engine, awaitTurn: () => gate })
  await reachOn(hook)
  act(() =>
    hook.result.current.observe(
      viewState('West of House', ['There is a small mailbox here.']),
    ),
  )
  expect(hook.result.current.isSequencing()).toBe(false)
  let p!: Promise<void>
  act(() => {
    p = hook.result.current.translate('open mailbox and take it')
  })
  // inSequenceRef is set synchronously on entering the sequence branch.
  expect(hook.result.current.isSequencing()).toBe(true)
  await act(async () => {
    release({
      view: viewState(
        'West of House',
        ['open mailbox', 'Opening the small mailbox reveals a leaflet.'],
        'open mailbox',
      ),
      reason: 'line',
    })
    await p
  })
  expect(hook.result.current.isSequencing()).toBe(false)
})
```

(Note on the last test: clause 2 `take it` has no completion → returns the `default` abstain → the sequence stops after clause 1, so the single `gate` is only awaited once.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx -t "compound|isSequencing|bypassed"`
Expected: FAIL — `awaitTurn` not accepted / `isSequencing is not a function` / sequences not implemented (only the first clause, or the whole input, gets sent).

- [ ] **Step 3: Add the `awaitTurn` arg, the new imports, and `MAX_CLAUSES`**

In `src/llm/useNaturalLanguage.ts`:

(a) Extend the `'./translate'` import to add `splitClauses` and `clauseFailed`:

```ts
import {
  parseCommand,
  isMetaCommand,
  isConfirmationPrompt,
  isDisambiguationPrompt,
  splitClauses,
  clauseFailed,
} from './translate'
```

(b) Extend the glkote-react types import to add `TurnResult`:

```ts
import type { ViewState, TurnResult } from '../glkote-react/types'
```

(c) Add `TranslateResult` and `Scene` to the relevant type imports (alongside the existing `SceneEvent` import):

```ts
import type { SceneEvent, Scene } from './scene/types'
import type { TranslateResult } from './types'
```

(`TranslateResult` is exported from `./types`; add it to the existing `'./types'` type import list rather than a second statement if you prefer.)

(d) Add `MAX_CLAUSES` as a module-level const near `WatchdogTimeout`:

```ts
/** Safety cap: at most this many clauses run per compound input (locked decision 6). */
const MAX_CLAUSES = 8
```

(e) Add `awaitTurn` to `UseNaturalLanguageArgs`:

```ts
export interface UseNaturalLanguageArgs {
  engine: LlmEngine
  capability: CapabilityResult
  vocab: Vocab | null
  getContext: () => ViewContext
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
  awaitTurn: () => Promise<TurnResult>
  watchdogMs: number
}
```

(f) Add `isSequencing` to the `UseNaturalLanguage` return interface:

```ts
  /** True while a compound sequence is mid-flight (Terminal's observe effect defers to the hook). */
  isSequencing: () => boolean
```

(g) Destructure `awaitTurn` from `args`:

```ts
  const {
    engine,
    capability,
    vocab,
    getContext,
    echoLocal,
    sendLine,
    awaitTurn,
    watchdogMs,
  } = args
```

(h) Add the `inSequenceRef` ref next to `translatingRef`:

```ts
  // True for the duration of a compound sequence so Terminal's view-driven observe
  // effect defers to the hook's in-order, per-clause observes (locked decision 9).
  const inSequenceRef = useRef(false)
```

- [ ] **Step 4: Add the compound branch to `translate()`**

In `translate`, the structure is: the existing pre-checks (off/disabled, meta, confirm/disambig, concurrency guard, `setPending(true)`/`setNotice(null)`) stay first and unchanged. Then the `try { … } finally { … }` wraps a split-based dispatch. Replace the current `try { <single-command body> } catch (err) { … } finally { … }` with:

```ts
      const generateClause = async (
        clause: string,
        scene: Scene,
      ): Promise<TranslateResult> => {
        const grammar = buildGrammar(vocab, scene)
        const base = getContext()
        const ctx: PromptContext = {
          ...base,
          inScope: scene.inScope.map(o => o.canonical),
          antecedent: scene.antecedent,
        }
        const raw = await generateRaw(buildPrompt(clause, ctx), grammar)
        return parseCommand(raw, scene, vocab)
      }

      // Bounded wait for the clause's turn boundary: race awaitTurn() against a
      // timer so a clause can never wedge the sequence (locked decision 8). Turns
      // run synchronously in the VM, so the timer is a defensive backstop; reusing
      // watchdogMs keeps a single tunable knob.
      const raceTurn = async (): Promise<TurnResult | 'timeout'> => {
        let timer: ReturnType<typeof setTimeout>
        const timeout = new Promise<'timeout'>(res => {
          timer = setTimeout(() => res('timeout'), watchdogMs)
        })
        try {
          return await Promise.race([awaitTurn(), timeout])
        } finally {
          clearTimeout(timer!)
        }
      }

      try {
        const clauses = splitClauses(english)

        if (clauses.length <= 1) {
          // SINGLE-COMMAND PATH (unchanged behavior).
          const scene = tracker.scene()
          const result = await generateClause(english, scene)
          if (result.kind === 'command') {
            lastCommandRef.current = result.text
            echoLocal(english)
            sendLine(result.text)
          } else {
            lastCommandRef.current = null
            sendLine(english)
          }
          return
        }

        // COMPOUND PATH (locked decisions 1–9).
        inSequenceRef.current = true
        const total = clauses.length
        const limit = Math.min(total, MAX_CLAUSES)
        let done = 0
        for (let i = 0; i < limit; i++) {
          const clause = clauses[i]
          const scene = tracker.scene()
          let result: TranslateResult
          try {
            result = await generateClause(clause, scene)
          } catch {
            break // untranslatable (timeout/error) → stop (locked decision 4)
          }
          if (result.kind !== 'command') break // abstain → stop

          if (done === 0) echoLocal(english) // echo the full English once (decision 5)
          lastCommandRef.current = result.text
          sendLine(result.text)
          done++

          const turn = await raceTurn()
          if (turn === 'timeout' || turn.reason !== 'line') break // decision 8

          const vc = viewToContext(turn.view)
          // The hook owns observe during a sequence (decision 9).
          tracker.observe({
            location: vc.location,
            outputText: vc.recentOutput,
            lastCommand: lastCommandRef.current,
          })
          if (clauseFailed(vc.recentOutput, vocab)) break // no-op / absence
          if (
            isConfirmationPrompt(vc.recentOutput) ||
            isDisambiguationPrompt(vc.recentOutput)
          )
            break // mid-sequence interactive prompt (decision 3)
        }

        if (done === 0) {
          // First clause untranslatable, nothing ran → raw-send the original input
          // (today's abstain behavior preserved; decision 4 exception). No notice.
          lastCommandRef.current = null
          sendLine(english)
        } else if (done < total) {
          // Truncated sequence → make it visible (decision 7).
          setNotice(`Ran ${done} of ${total} actions.`)
        }
      } catch (err) {
        lastCommandRef.current = null
        if (!(err instanceof WatchdogTimeout))
          console.error('[nl] translation failed:', err)
        setNotice(
          err instanceof WatchdogTimeout
            ? 'Translation timed out — sent as typed.'
            : 'Translation failed — sent as typed.',
        )
        sendLine(english)
      } finally {
        translatingRef.current = false
        setPending(false)
        inSequenceRef.current = false
      }
```

Notes for the implementer:
- The single-command path's `catch` (timeout/failure → notice → raw-send) is preserved by the outer `catch`: in the single branch `generateClause` is awaited *outside* any inner try, so a thrown `WatchdogTimeout`/error propagates to the outer `catch` exactly as before. The `[nl debug]` `console.log` from Task 5 is dropped here for brevity — if you want to keep it, re-add it in the single branch after `parseCommand`.
- In the compound branch, a clause's own `generateClause` throw is caught locally (`try { … } catch { break }`) so a mid-sequence failure stops the sequence (keeping what ran) rather than discarding via the outer catch.

- [ ] **Step 5: Add `isSequencing` and return it**

Add the callback (near `observe`):

```ts
  const isSequencing = useCallback(() => inSequenceRef.current, [])
```

Add `awaitTurn` and `generateRaw` to the `translate` dependency array, and add `isSequencing` to the returned object:

```ts
    [
      internal.phase,
      vocab,
      engine,
      getContext,
      echoLocal,
      sendLine,
      awaitTurn,
      watchdogMs,
      generateRaw,
    ],
```

```ts
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
    observe,
    isSequencing,
  }
```

- [ ] **Step 6: Run the hook tests to verify they pass**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx`
Expected: PASS — all new compound/isSequencing/bypass tests plus every pre-existing test (single-command, abstain, watchdog, meta/confirm/disambig, French replay).

- [ ] **Step 7: Commit**

```bash
git add src/llm/useNaturalLanguage.ts src/llm/useNaturalLanguage.test.tsx
git commit -m "feat(nl): sequential compound-command translation in the hook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire `awaitTurn` + the observe guard into Terminal

**Files:**
- Modify: `src/ui/Terminal.tsx`
- Test (regression): `src/ui/Terminal.test.tsx`, `src/ui/Terminal.end.test.tsx`

The hook now requires `awaitTurn`, and Terminal's observe effect must defer to the hook during a sequence (locked decision 9). `isSequencing()` returns false outside a sequence, so single-command behavior — and the existing Terminal tests — are unchanged.

- [ ] **Step 1: Pass `awaitTurn` to the hook**

In `src/ui/Terminal.tsx`, in the `useNaturalLanguage({ … })` call, add the `awaitTurn` arg (just above `watchdogMs: WATCHDOG_MS,`). It uses `viewRef.current` for the (practically unreachable) null-engine fallback so it doesn't capture a stale render `view`:

```tsx
    awaitTurn: () =>
      engineRef.current?.awaitTurn() ??
      Promise.resolve({ view: viewRef.current, reason: 'line' as const }),
```

- [ ] **Step 2: Guard the observe effect with `isSequencing()`**

Replace the existing observe effect:

```tsx
  useEffect(() => {
    if (view.inputRequest === 'line') nl.observe(view)
  }, [view, nl])
```

with:

```tsx
  useEffect(() => {
    // During a compound sequence the hook owns observe (in-order, per-clause);
    // defer so an intermediate view isn't observed with a mismatched last command
    // (locked decision 9).
    if (nl.isSequencing()) return
    if (view.inputRequest === 'line') nl.observe(view)
  }, [view, nl])
```

- [ ] **Step 3: Typecheck**

Run: `make typecheck`
Expected: no errors (the hook's required `awaitTurn` arg is now supplied).

- [ ] **Step 4: Run the Terminal tests to verify they still pass**

Run: `npx vitest run src/ui/Terminal.test.tsx src/ui/Terminal.end.test.tsx`
Expected: PASS — unchanged (the guard is inert when not sequencing).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Terminal.tsx
git commit -m "feat(ui): wire awaitTurn + sequence-aware observe guard into Terminal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite**

Run: `make all`
Expected: lint clean, prettier clean, typecheck clean, and all tests pass (`vitest run`).

- [ ] **Step 2: If `make all` reports formatting changes, commit them**

```bash
git add -A
git commit -m "style(nl): apply prettier formatting from make all

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3: Manual smoke check (optional but recommended)**

Run: `make dev`, open Zork I, enable NL (download the model if needed), and type a compound French/English instruction such as `open the mailbox and read the leaflet`. Confirm: the English echoes once, the two canonical commands appear in order, and a half-translatable input (e.g. `open the mailbox and frobnicate the wug`) runs the first action then shows `Ran 1 of 2 actions.`

---

## Notes / decisions baked into this plan

- **No verb-token pre-check** (locked decision 7, revised). The earlier idea of routing "verbless" clauses to the single-command path was dropped because the vocab verbs are English-only, so it would misclassify every non-English clause (incl. the French motivating example). False splits are caught by the existing abstain-stop, made non-silent by the `Ran N of M actions.` notice.
- **Per-clause turn timeout reuses `watchdogMs`.** VM turns are synchronous and resolve almost immediately after `sendLine`, so the timer is a defensive backstop, not a tuned latency budget. Reusing `watchdogMs` avoids adding a second knob; if real play shows legitimate turns exceeding it, promote it to its own constant.
- **MORE-paging and `reason:'key'` are defensive.** Per `bridge.ts`/PROTOCOL-NOTES.md, Zork I–III never issue `char` requests, so in practice every clause settles via `reason:'line'` (or the timeout backstop). The MORE/key handling exists for correctness and is covered by the synthetic-marker bridge tests.
- **Double-observe race closed two ways** (locked decision 9): `inSequenceRef` suppresses Terminal's effect for intermediate views, and the hook leaves `lastCommandRef` set to the last clause's command so a single trailing post-sequence observe of the final view dedups via `reduceScene`'s key (`location + outputText + lastCommand`).
