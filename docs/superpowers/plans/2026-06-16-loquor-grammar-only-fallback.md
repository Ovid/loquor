# Grammar-only NL Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deterministic NL stages a first-class "grammar-only" mode so picking a language activates NL immediately (no forced model download), the model becomes an optional upgrade, and failed downloads / no-capability devices / clause-time load failures all stay in grammar-only instead of dropping to raw English or `unavailable`.

**Architecture:** The `Internal` phase machine's `on` state gains a `model: 'full' | 'grammar'` field (permitted, not "in VRAM"). `runClause` gains a `grammarOnly` flag that skips stage 7 (the LLM) and abstains, so stage 8's existing EN-raw-send / non-EN-notice policy applies with no engine touch. A new `ModelLoadError` distinguishes a clause-time *load* failure (demotes `full`→`grammar`) from a *generate* watchdog (unchanged). `NlState` drops `unavailable`; capability gates only whether the upgrade is offered (`canUpgrade`), with `hasVocab` the sole NL prerequisite.

**Tech Stack:** TypeScript, React (hooks), Vitest + @testing-library/react, the existing `ifvms`/Glk/WebLLM stack. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-16-loquor-grammar-only-fallback-design.md`

---

## File Structure

Touched files, by responsibility:

- `src/llm/translatePipeline.ts` — `runClause` grammar-only skip; `ModelLoadError`; `createGenerateRaw` wraps load failures; stage-8 wiring for demotion + educational notice. (`createTranslate` gains `demote` + `educatedRef` deps.)
- `src/llm/useModelDownload.ts` — `Internal.on` gains `model`; grammar-only-on-pick; failure/stall/cancel stay grammar-only; reload restore to grammar; `demoteToGrammar`, `requestUpgrade`; `declined` repurposed; `available` param removed.
- `src/llm/types.ts` — `NlState`: `on`/`off` gain `canUpgrade`, `on` gains `model`; remove `unavailable`.
- `src/llm/useNaturalLanguage.ts` — derive new `NlState`; thread `grammarOnly` through the drain; wire `demote`/`educatedRef` + the once-per-stint reset; expose `requestUpgrade`.
- `src/llm/notices.ts` — reframe download fail/stall notices to "basic mode"; add `grammarOnlyFirstMiss`.
- `src/ui/NlLanguagePicker.tsx` — drop `unavailable`; render "· basic" marker + `✦ improve` / `try the model anyway`.
- `src/ui/ModelDownloadModal.tsx` — reframe as an upgrade; `warn` prop for the `none`-device honest warning; "Not now" copy.
- `src/ui/Terminal.tsx` — drop the capability-override flip; wire `onUpgrade` + `warn`.

Each task is red→green→refactor with its own commit. Tasks 1–2 are pure/isolated; 3–5 build the state machine + pipeline + notices; 6–8 are UI + integration.

---

### Task 1: `runClause` grammar-only skip

**Files:**
- Modify: `src/llm/translatePipeline.ts` (the `runClause` signature + stage 7; its single call site in `createTranslate`)
- Test: `src/llm/translatePipeline.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/llm/translatePipeline.test.ts` (mirror the existing `runClause` tests' setup — a `FakeLlmEngine`, a real `vocab`, a `Scene`; copy the nearest existing `runClause` test's fixtures verbatim for `vocab`/`scene`/`deps`):

```ts
describe('runClause grammar-only', () => {
  it('skips stage 7 and abstains — engine.generate is never called', async () => {
    const engine = new FakeLlmEngine({ default: '{"verb":"take","noun":"lamp"}' })
    const generateRaw = createGenerateRaw({
      engine,
      watchdogMs: 1000,
      engineGate: new EngineGate(),
    })
    const deps = { vocab, grammar: 'root ::= "x"', generateRaw, getContext: () => ({ location: '', recentOutput: '' }) }
    // A clause that reaches stage 7 (not a meta/vocab/direction/lexicon hit):
    const { result, stage } = await runClause('frobnicate the gadget', scene, 'fr', null, true, deps)
    expect(result).toEqual({ kind: 'abstain' })
    expect(stage).toBe('llm')
    expect(engine.generateCalls).toBe(0)
  })

  it('grammarOnly:false still calls the model at stage 7', async () => {
    const engine = new FakeLlmEngine({ default: 'I_DONT_KNOW' })
    const generateRaw = createGenerateRaw({
      engine,
      watchdogMs: 1000,
      engineGate: new EngineGate(),
    })
    const deps = { vocab, grammar: 'root ::= "x"', generateRaw, getContext: () => ({ location: '', recentOutput: '' }) }
    await runClause('frobnicate the gadget', scene, 'fr', null, false, deps)
    expect(engine.generateCalls).toBe(1)
  })
})
```

If the file's existing `runClause` tests already build shared `vocab`/`scene`/`deps` in an outer scope, reuse those names instead of re-declaring; only the `grammarOnly` argument and the assertions are new. Ensure `createGenerateRaw` and `EngineGate` are imported (they are used elsewhere in the file — reuse the existing imports).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/llm/translatePipeline.test.ts -t "grammar-only"`
Expected: FAIL — `runClause` currently takes 5 args, so TS/`vitest` reports an arity error or the 6th arg is ignored and `generateCalls` is `1`.

- [ ] **Step 3: Add the `grammarOnly` parameter and the stage-7 skip**

In `src/llm/translatePipeline.ts`, change the `runClause` signature to insert `grammarOnly` after `lex`:

```ts
export async function runClause(
  clause: string,
  scene: Scene,
  activeLang: ActiveLanguage,
  lex: Lex | null,
  grammarOnly: boolean,
  deps: ClauseDeps,
): Promise<{ result: TranslateResult; raw: string; stage: Stage }> {
```

Then, immediately before `// 7. LLM fallback.` and its `const base = getContext()`, insert:

```ts
  // 7. LLM fallback — skipped in grammar-only: abstain so stage 8 applies the
  //    existing policy (EN raw-send / non-EN notice). The engine is never touched.
  if (grammarOnly)
    return { result: { kind: 'abstain' }, raw: '(grammar-only)', stage: 'llm' }
```

Update the **single existing call site** inside `createTranslate`'s clause loop to pass `false` for now (behavior unchanged; Task 5 wires the real value):

```ts
          ;({ result, raw, stage } = await runClause(
            clause,
            scene,
            activeLang,
            lex,
            false,
            clauseDeps,
          ))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/llm/translatePipeline.test.ts`
Expected: PASS (the new grammar-only tests and all existing `runClause`/pipeline tests).

- [ ] **Step 5: Commit**

```bash
git add src/llm/translatePipeline.ts src/llm/translatePipeline.test.ts
git commit -m "feat(nl): runClause grammar-only skips stage 7 and abstains

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `ModelLoadError` from `createGenerateRaw`

**Files:**
- Modify: `src/llm/translatePipeline.ts` (new `ModelLoadError` class; wrap the lazy-load block)
- Test: `src/llm/translatePipeline.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/llm/translatePipeline.test.ts`:

```ts
import { ModelLoadError } from './translatePipeline'

describe('createGenerateRaw load vs generate failures', () => {
  it('a lazy-load failure throws ModelLoadError', async () => {
    const engine = new FakeLlmEngine({ failLoad: true }) // not loaded → load() runs and throws
    const g = createGenerateRaw({ engine, watchdogMs: 1000, engineGate: new EngineGate() })
    await expect(g([{ role: 'user', content: 'x' }], 'root ::= "x"')).rejects.toBeInstanceOf(
      ModelLoadError,
    )
  })

  it('a generate failure (model loaded) is NOT a ModelLoadError', async () => {
    const engine = new FakeLlmEngine({ failGenerate: true })
    await engine.load(() => {}, new AbortController().signal) // model resident → skip the load path
    const g = createGenerateRaw({ engine, watchdogMs: 1000, engineGate: new EngineGate() })
    await expect(g([{ role: 'user', content: 'x' }], 'root ::= "x"')).rejects.not.toBeInstanceOf(
      ModelLoadError,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/llm/translatePipeline.test.ts -t "load vs generate"`
Expected: FAIL — `ModelLoadError` is not exported; the load failure currently rejects with a plain `Error('fake load failure')`.

- [ ] **Step 3: Add `ModelLoadError` and wrap the load block**

In `src/llm/translatePipeline.ts`, add next to `WatchdogTimeout`:

```ts
/**
 * Clause-time model **load** failure (lazy load into VRAM threw or its watchdog
 * fired) — distinct from a generate-time WatchdogTimeout. Only this demotes a
 * `full` language to grammar-only: a load failure means the model can't run at
 * all, whereas a generate stall is per-clause and keeps `full`. Carries the
 * underlying cause for the diagnostic log.
 */
export class ModelLoadError extends Error {
  constructor(public readonly reason?: unknown) {
    super('model-load')
    this.name = 'ModelLoadError'
  }
}
```

In `createGenerateRaw`, wrap the lazy-load `Promise.race` so any load failure (watchdog reject *or* `engine.load` rejection) surfaces as `ModelLoadError`. Replace the existing `try { await Promise.race([...]) } finally { clearTimeout(loadId!) }` block with:

```ts
        try {
          await Promise.race([
            engine.load(() => {}, loadAc.signal),
            loadWatchdog,
          ])
        } catch (err) {
          // A load failure (watchdog or engine.load reject) demotes full →
          // grammar (see createTranslate). Wrap so the caller can tell it apart
          // from a generate-time WatchdogTimeout, which does NOT demote.
          throw new ModelLoadError(err)
        } finally {
          clearTimeout(loadId!)
        }
```

(The `// DELIBERATELY NOT awaiting the orphaned load` comment stays inside the `finally`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/llm/translatePipeline.test.ts`
Expected: PASS — including the existing stalled-load / watchdog tests (a stalled load now rejects `ModelLoadError` whose `reason` is the `WatchdogTimeout`; if an existing test asserted the raw `WatchdogTimeout` from the *load* path, update it to expect `ModelLoadError` — the *generate* path still throws `WatchdogTimeout`).

- [ ] **Step 5: Commit**

```bash
git add src/llm/translatePipeline.ts src/llm/translatePipeline.test.ts
git commit -m "feat(nl): ModelLoadError marks clause-time load failures distinctly

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `useModelDownload` — grammar-only state machine

**Files:**
- Modify: `src/llm/useModelDownload.ts`
- Modify: `src/llm/useNaturalLanguage.ts:129-137` (stop passing `available`)
- Test: `src/llm/useModelDownload.test.tsx`

This is the core behavior change: `Internal.on` gains `model`; picking activates grammar-only immediately; failure/stall/cancel stay grammar-only; reload restores grammar-only (or full if cached); `declined` only suppresses the auto-modal; new `demoteToGrammar` + `requestUpgrade`; `available` param removed.

- [ ] **Step 1: Write the failing tests**

Add to `src/llm/useModelDownload.test.tsx`. First update `setup()` to drop `available` (it's no longer a param):

```ts
function setup(
  opts: { engine?: LlmEngine } & Partial<ModelDownloadParams> = {},
) {
  const setNotice = vi.fn()
  const engine = opts.engine ?? new FakeLlmEngine()
  const hook = renderHook(() =>
    useModelDownload({
      engine,
      hasVocab: opts.hasVocab ?? true,
      setNotice,
    }),
  )
  return { hook, setNotice, engine }
}
```

Then add:

```ts
describe('grammar-only fallback', () => {
  it('pick a language with no model → on/grammar immediately, no download', async () => {
    const { hook, engine } = setup()
    await waitFor(() => expect(hook.result.current.internal).toEqual({ phase: 'off' }))
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'fr', model: 'grammar' })
    expect(engine.generateCalls).toBe(0)
    expect(readNlPref().language).toBe('fr')
  })

  it('pick with model cached → on/full, no eager load', async () => {
    const { hook, engine } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'fr', model: 'full' })
    expect(engine.isLoaded()).toBe(false) // load is lazy — only on the first stage-7 miss
  })

  it('first pick opens the upgrade modal once; "Not now" keeps grammar-only', async () => {
    const { hook } = setup()
    await waitFor(() => expect(hook.result.current.internal).toEqual({ phase: 'off' }))
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.modalOpen).toBe(true)
    act(() => hook.result.current.declineDownload())
    expect(hook.result.current.modalOpen).toBe(false)
    expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'fr', model: 'grammar' })
    expect(readNlPref().declined).toBe(true)
  })

  it('after declining once, a later pick does NOT reopen the modal', async () => {
    writeNlPref({ declined: true })
    const { hook } = setup()
    await waitFor(() => expect(hook.result.current.internal).toEqual({ phase: 'off' }))
    act(() => hook.result.current.setLanguage('de'))
    expect(hook.result.current.modalOpen).toBe(false)
    expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'de', model: 'grammar' })
  })

  it('requestUpgrade reopens the modal on demand', async () => {
    writeNlPref({ declined: true })
    const { hook } = setup()
    await waitFor(() => expect(hook.result.current.internal).toEqual({ phase: 'off' }))
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.modalOpen).toBe(false)
    act(() => hook.result.current.requestUpgrade())
    expect(hook.result.current.modalOpen).toBe(true)
  })

  it('download failure stays in grammar-only (not off) with a notice', async () => {
    const { hook, setNotice } = setup({ engine: new FakeLlmEngine({ failLoad: true }) })
    await waitFor(() => expect(hook.result.current.internal).toEqual({ phase: 'off' }))
    act(() => hook.result.current.setLanguage('fr')) // on/grammar + pendingLang fr, modal open
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'fr', model: 'grammar' }),
    )
    expect(setNotice).toHaveBeenCalled()
  })

  it('successful download upgrades to on/full', async () => {
    const { hook } = setup({
      engine: new FakeLlmEngine({ progress: [{ loaded: 1, total: 1, text: 'done' }] }),
    })
    await waitFor(() => expect(hook.result.current.internal).toEqual({ phase: 'off' }))
    act(() => hook.result.current.setLanguage('fr'))
    act(() => hook.result.current.requestDownload())
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'fr', model: 'full' }),
    )
  })

  it('demoteToGrammar flips on/full → on/grammar (idempotent on grammar)', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() => expect(hook.result.current.installed).toBe(true))
    act(() => hook.result.current.setLanguage('fr')) // on/full
    act(() => hook.result.current.demoteToGrammar())
    expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'fr', model: 'grammar' })
    act(() => hook.result.current.demoteToGrammar()) // no-op when already grammar
    expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'fr', model: 'grammar' })
  })

  it('reload with a persisted language restores grammar-only when uncached', async () => {
    writeNlPref({ language: 'es' })
    const { hook } = setup() // not cached
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'es', model: 'grammar' }),
    )
  })

  it('reload with a persisted language restores full when cached', async () => {
    writeNlPref({ language: 'es' })
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.internal).toEqual({ phase: 'on', language: 'es', model: 'full' }),
    )
  })
})
```

Note: the existing `boot probe (isCached)` test `'cached + a stored language auto-restores to on'` asserts `{ phase: 'on', language: 'fr' }` — update its expectation to `{ phase: 'on', language: 'fr', model: 'full' }`. The `'cached but the stored pref is off → stays off'` test is unchanged (pref `off` → stays `off`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/llm/useModelDownload.test.tsx`
Expected: FAIL — `model` field absent, `requestUpgrade`/`demoteToGrammar` undefined, failures revert to `off`, `available` param gone.

- [ ] **Step 3: Implement the new state machine**

In `src/llm/useModelDownload.ts`:

(a) Widen `Internal.on`:

```ts
export type Internal =
  | { phase: 'off' }
  | {
      phase: 'downloading'
      loaded: number
      total: number
      etaSeconds: number | null
    }
  | { phase: 'on'; language: ActiveLanguage; model: 'full' | 'grammar' }
```

(b) Drop `available` from params + add the two new actions to the return interface:

```ts
export interface ModelDownloadParams {
  engine: LlmEngine
  hasVocab: boolean
  setNotice: (notice: string | null) => void
}

export interface ModelDownload {
  internal: Internal
  installed: boolean
  modalOpen: boolean
  setLanguage: (lang: NlLanguage) => void
  requestDownload: () => void
  declineDownload: () => void
  cancelDownload: () => void
  /** Open the upgrade modal on demand (picker "✦ improve" / "try the model anyway"). */
  requestUpgrade: () => void
  /** Flip the active language full → grammar after a clause-time load failure. */
  demoteToGrammar: () => void
}
```

and `const { engine, hasVocab, setNotice } = params`.

(c) Restore-on-mount: extend the `isCached` effect so it restores to grammar-only even when uncached:

```ts
  useEffect(() => {
    let cancelled = false
    engine
      .isCached()
      .then(c => {
        if (cancelled) return
        const cached = c || engine.isLoaded()
        setInstalled(cached)
        const pref = readNlPref()
        if (pref.language !== 'off') {
          const lang = pref.language
          setInternal(prev =>
            prev.phase === 'off'
              ? { phase: 'on', language: lang, model: cached ? 'full' : 'grammar' }
              : prev,
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [engine])
```

(d) `requestDownload` — failure/stall stay grammar-only. Change the stall timer callback, the success `.then`, and the failure `.catch` (the stale/abort branch becomes a no-op so it can't revert a cancel/supersede):

In `armStall`'s timeout body, replace `setInternal({ phase: 'off' })` with:

```ts
        setInternal({ phase: 'on', language: pendingLangRef.current, model: 'grammar' })
```

In the `.then`, replace `setInternal({ phase: 'on', language: pendingLangRef.current })` with:

```ts
        setInternal({ phase: 'on', language: pendingLangRef.current, model: 'full' })
```

In the `.catch`, change both branches:

```ts
      .catch(err => {
        if (stale() || (err as Error).name === 'AbortError') {
          // Aborted/superseded: whoever caused it (cancelDownload / a newer
          // requestDownload) already set the correct state — don't revert it.
          return
        }
        clearStall()
        log.error('model download failed:', err)
        setNotice(modelDownloadFailed(pendingLangRef.current))
        setInternal({ phase: 'on', language: pendingLangRef.current, model: 'grammar' })
      })
```

(e) `cancelDownload` — return to grammar-only (keep the picked language):

```ts
  const cancelDownload = useCallback(() => {
    if (stallTimerRef.current !== null) {
      clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }
    abortRef.current?.abort()
    setInternal({ phase: 'on', language: pendingLangRef.current, model: 'grammar' })
    writeNlPref({ language: pendingLangRef.current })
  }, [])
```

(f) `declineDownload` — keep grammar-only, only set `declined`:

```ts
  const declineDownload = useCallback(() => {
    setModalOpen(false)
    // "Not now" keeps grammar-only active (the pick already set on/grammar). The
    // declined flag only suppresses the unsolicited auto-modal on future picks;
    // re-discovery lives in the picker's "✦ improve" affordance.
    writeNlPref({ declined: true })
  }, [])
```

(g) `setLanguage` — grammar-only on pick; full when cached; auto-modal once:

```ts
  const setLanguage = useCallback(
    (lang: NlLanguage) => {
      if (!hasVocab) return // capability no longer gates NL — hasVocab is the sole prereq
      if (lang === 'off') {
        setInternal({ phase: 'off' }) // off is instant; model stays cached
        writeNlPref({ language: 'off' })
        return
      }
      writeNlPref({ language: lang })
      if (installed || engine.isLoaded()) {
        setInternal({ phase: 'on', language: lang, model: 'full' }) // cached → lazy full
        return
      }
      // No model yet: grammar-only is active immediately; offer the upgrade modal
      // ONCE (suppressed thereafter by the declined flag).
      setInternal({ phase: 'on', language: lang, model: 'grammar' })
      pendingLangRef.current = lang
      if (!readNlPref().declined) setModalOpen(true)
    },
    [hasVocab, installed, engine],
  )
```

(h) Add the two new actions and return them:

```ts
  const requestUpgrade = useCallback(() => {
    setInternal(prev => {
      if (prev.phase === 'on') pendingLangRef.current = prev.language
      return prev
    })
    setModalOpen(true)
  }, [])

  const demoteToGrammar = useCallback(() => {
    setInternal(prev =>
      prev.phase === 'on' && prev.model === 'full'
        ? { ...prev, model: 'grammar' }
        : prev,
    )
  }, [])

  return {
    internal,
    installed,
    modalOpen,
    setLanguage,
    requestDownload,
    declineDownload,
    cancelDownload,
    requestUpgrade,
    demoteToGrammar,
  }
```

(i) In `src/llm/useNaturalLanguage.ts`, update the `useModelDownload` call (line ~129) to drop `available` and pull the new actions through (the full destructure + wiring lands in Task 5; for now just keep it compiling):

```ts
  const {
    internal,
    installed,
    modalOpen,
    setLanguage,
    requestDownload,
    declineDownload,
    cancelDownload,
    requestUpgrade,
    demoteToGrammar,
  } = useModelDownload({ engine, hasVocab, setNotice })
```

(`available` is still computed in this hook for the derived state — leave that line; it's just no longer passed to `useModelDownload`. `requestUpgrade`/`demoteToGrammar` are unused until Task 5 — add a temporary `void requestUpgrade; void demoteToGrammar;` after the destructure if the linter flags unused vars, and remove it in Task 5.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/llm/useModelDownload.test.tsx`
Expected: PASS. Then `npx vitest run src/llm/useNaturalLanguage.test.tsx` to confirm the hook still compiles/runs (its `state`-level grammar assertions land in Task 5; existing tests should still pass since the derivation is unchanged here).

- [ ] **Step 5: Commit**

```bash
git add src/llm/useModelDownload.ts src/llm/useModelDownload.test.tsx src/llm/useNaturalLanguage.ts
git commit -m "feat(nl): grammar-only on pick; failed/stalled/cancelled downloads stay grammar-only

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Notices — "basic mode" reframe + educational first-abstain

**Files:**
- Modify: `src/llm/notices.ts`
- Test: `src/llm/notices.test.ts` (create if absent — check first with `ls src/llm/notices.test.ts`)

- [ ] **Step 1: Write the failing test**

If `src/llm/notices.test.ts` doesn't exist, create it; otherwise append. Use the literal expected strings:

```ts
import { describe, it, expect } from 'vitest'
import {
  modelDownloadFailed,
  modelDownloadStalled,
  grammarOnlyFirstMiss,
} from './notices'

describe('basic-mode download notices', () => {
  it('failure reframes to staying in basic mode, per language', () => {
    expect(modelDownloadFailed('en')).toBe(
      'AI model download failed — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
    )
    expect(modelDownloadFailed('fr')).toContain('mode simplifié')
    expect(modelDownloadFailed('de')).toContain('einfachen Modus')
    expect(modelDownloadFailed('es')).toContain('modo básico')
  })

  it('stall reframes to staying in basic mode, per language', () => {
    expect(modelDownloadStalled('en')).toBe(
      'AI model download stalled — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
    )
    expect(modelDownloadStalled('fr')).toContain('mode simplifié')
    expect(modelDownloadStalled('de')).toContain('einfachen Modus')
    expect(modelDownloadStalled('es')).toContain('modo básico')
  })
})

describe('grammar-only educational first-abstain notice', () => {
  it('explains basic mode + the upgrade, per language', () => {
    expect(grammarOnlyFirstMiss('en')).toBe(
      'Didn’t catch that — basic mode understands common commands; add the AI upgrade for full sentences.',
    )
    for (const l of ['fr', 'de', 'es'] as const) {
      expect(grammarOnlyFirstMiss(l).length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/llm/notices.test.ts`
Expected: FAIL — `grammarOnlyFirstMiss` undefined; the failure/stall strings still say "Model download failed. Pick a language again…".

- [ ] **Step 3: Reframe + add the notice**

In `src/llm/notices.ts`, replace the bodies of `modelDownloadFailed` and `modelDownloadStalled` (keep the signatures + JSDoc, update the JSDoc to say "stays in basic mode"):

```ts
export function modelDownloadFailed(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'AI model download failed — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
      fr: 'Échec du téléchargement du modèle d’IA — passage en mode simplifié. Les commandes courantes fonctionnent toujours ; resélectionnez la mise à niveau pour réessayer.',
      de: 'KI-Modell-Download fehlgeschlagen — Wechsel in den einfachen Modus. Gängige Befehle funktionieren weiterhin; wählen Sie die Aufwertung erneut, um es noch einmal zu versuchen.',
      es: 'Error al descargar el modelo de IA — se mantiene el modo básico. Los comandos comunes siguen funcionando; vuelva a elegir la mejora para reintentar.',
    },
    lang,
  )
}

export function modelDownloadStalled(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'AI model download stalled — staying in basic mode. Common commands still work; pick the upgrade again to retry.',
      fr: 'Téléchargement du modèle d’IA bloqué — passage en mode simplifié. Les commandes courantes fonctionnent toujours ; resélectionnez la mise à niveau pour réessayer.',
      de: 'KI-Modell-Download hängt fest — Wechsel in den einfachen Modus. Gängige Befehle funktionieren weiterhin; wählen Sie die Aufwertung erneut, um es noch einmal zu versuchen.',
      es: 'Descarga del modelo de IA estancada — se mantiene el modo básico. Los comandos comunes siguen funcionando; vuelva a elegir la mejora para reintentar.',
    },
    lang,
  )
}

/** First abstain in grammar-only this stint — connects the miss to the declined
 * upgrade at the moment of confusion. Fires once per grammar-only stint, then the
 * plain couldntTranslate notice takes over. (EN grammar-only raw-sends, so in
 * practice this serves non-English players.) */
export function grammarOnlyFirstMiss(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'Didn’t catch that — basic mode understands common commands; add the AI upgrade for full sentences.',
      fr: 'Je n’ai pas compris — le mode simplifié comprend les commandes courantes ; ajoutez la mise à niveau IA pour les phrases complètes.',
      de: 'Das habe ich nicht verstanden — der einfache Modus versteht gängige Befehle; fügen Sie die KI-Aufwertung für vollständige Sätze hinzu.',
      es: 'No lo entendí — el modo básico entiende comandos comunes; añade la mejora de IA para frases completas.',
    },
    lang,
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/llm/notices.test.ts`
Expected: PASS. Also run any existing test that asserted the OLD download strings and update it: `npx vitest run src/llm/useModelDownload.test.tsx` — if a test matched `/Model download failed/`, change it to `/staying in basic mode/`.

- [ ] **Step 5: Commit**

```bash
git add src/llm/notices.ts src/llm/notices.test.ts
git commit -m "feat(nl): reframe download notices to basic mode; add first-abstain notice (EN/FR/DE/ES)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `NlState` + `useNaturalLanguage` — derive, thread grammar-only, demote, educate

**Files:**
- Modify: `src/llm/types.ts` (`NlState`)
- Modify: `src/llm/useNaturalLanguage.ts` (derivation; `demote`/`educatedRef`; reset effect; expose `requestUpgrade`)
- Modify: `src/llm/translatePipeline.ts` (`TranslateDeps` gains `demote` + `educatedRef`; runLine derives + threads `grammarOnly`; stage-8 wiring)
- Test: `src/llm/useNaturalLanguage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/llm/useNaturalLanguage.test.tsx` (mirror its existing render/`act`/`capability` setup — copy the nearest test's harness and only change `capability.tier` and assertions):

```ts
describe('grammar-only NlState', () => {
  it('pick a language with no model → state on/grammar with canUpgrade', async () => {
    const { result } = renderNl({ capability: { tier: 'full', reasons: [] } }) // helper from this file
    act(() => result.current.setLanguage('fr'))
    expect(result.current.state).toMatchObject({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
      canUpgrade: true,
    })
  })

  it('capability none → no unavailable phase; pick still activates grammar-only, canUpgrade false', async () => {
    const { result } = renderNl({ capability: { tier: 'none', reasons: ['no-webgpu'] } })
    act(() => result.current.setLanguage('de'))
    expect(result.current.state).toMatchObject({
      phase: 'on',
      language: 'de',
      model: 'grammar',
      canUpgrade: false,
    })
    // DECISION (spec ambiguity resolved): the once-ever auto-modal fires even on
    // a `none` device — the "model not loaded → modal appears once ever" row is
    // unconditional, and Terminal renders it with warn=true (canUpgrade false),
    // so the player gets honest discoverability and never lands worse. The picker
    // still hides "✦ improve" in favour of "try the model anyway" (Task 6).
    expect(result.current.modalOpen).toBe(true)
  })

  it('no vocab → disabled regardless of a persisted language', async () => {
    writeNlPref({ language: 'fr' })
    const { result } = renderNl({ vocab: null })
    expect(result.current.state).toEqual({ phase: 'disabled' })
  })
})
```

For the **pipeline-level** behaviors (grammar-only abstain, demotion, educational notice), add to `src/llm/translatePipeline.test.ts` using `createTranslate` directly (mirror its existing `createTranslate` drain tests' deps object — the same refs/mocks):

```ts
describe('createTranslate grammar-only + demotion', () => {
  it('grammar-only: a stage-7-bound non-EN line abstains with the educational notice (once)', async () => {
    const engine = new FakeLlmEngine({ default: 'X' })
    const setNotice = vi.fn()
    const educatedRef = { current: false }
    const demote = vi.fn()
    const t = makeTranslate({ // helper mirroring the file's existing createTranslate harness
      engine,
      internalOn: { phase: 'on', language: 'fr', model: 'grammar' },
      setNotice,
      demote,
      educatedRef,
    })
    await t('frobnique le gadget')
    expect(engine.generateCalls).toBe(0)
    expect(setNotice).toHaveBeenLastCalledWith(grammarOnlyFirstMiss('fr'))
    setNotice.mockClear()
    await t('frobnique encore')
    expect(setNotice).toHaveBeenLastCalledWith(couldntTranslate('fr'))
  })

  it('full: a clause-time ModelLoadError demotes and shows the basic-mode notice', async () => {
    const engine = new FakeLlmEngine({ failLoad: true }) // not loaded → load() throws
    const setNotice = vi.fn()
    const demote = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: { phase: 'on', language: 'fr', model: 'full' },
      setNotice,
      demote,
      educatedRef: { current: false },
    })
    await t('frobnique le gadget')
    expect(demote).toHaveBeenCalledTimes(1)
    expect(setNotice).toHaveBeenLastCalledWith(modelDownloadFailed('fr'))
  })

  it('full: a GENERATE-time watchdog does NOT demote (model loaded, inference stalls)', async () => {
    // Model resident → load path is skipped, so the failure is a generate-time
    // WatchdogTimeout, NOT a ModelLoadError. Per spec only a LOAD failure demotes.
    const engine = new FakeLlmEngine({ failGenerate: true })
    await engine.load(() => {}, new AbortController().signal) // resident
    const setNotice = vi.fn()
    const demote = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: { phase: 'on', language: 'fr', model: 'full' },
      setNotice,
      demote,
      educatedRef: { current: false },
      watchdogMs: 5, // fire fast
    })
    await t('frobnique le gadget')
    expect(demote).not.toHaveBeenCalled()
    expect(setNotice).toHaveBeenLastCalledWith(nothingSent('fr', true)) // non-EN timeout notice
  })

  it('grammar-only EN: a stage-7-bound miss raw-sends, NO educational notice', async () => {
    const engine = new FakeLlmEngine({ default: 'X' })
    const setNotice = vi.fn()
    const sendTracked = vi.fn()
    const t = makeTranslate({
      engine,
      internalOn: { phase: 'on', language: 'en', model: 'grammar' },
      setNotice,
      sendTracked, // if the harness exposes the send seam; else assert via the engine/tracker the file already uses
      demote: vi.fn(),
      educatedRef: { current: false },
    })
    await t('frobnicate the gadget')
    expect(engine.generateCalls).toBe(0)
    expect(sendTracked).toHaveBeenCalledWith('frobnicate the gadget')
    expect(setNotice).not.toHaveBeenCalledWith(grammarOnlyFirstMiss('en'))
  })
})
```

If the test file has no reusable `makeTranslate`/`renderNl` helper, write a minimal one in the test file from the existing `createTranslate`/`useNaturalLanguage` call sites already present in those suites (do not invent new production seams — only test scaffolding). The three negative/EN cases above reference `nothingSent` and `sendTracked` — add `nothingSent` to the notices import, and assert the EN raw-send via whatever send seam the existing harness already exposes (the file's `createTranslate` drain tests already observe sends; reuse that, don't add a production seam). `makeTranslate` should accept an optional `watchdogMs` (default the file's existing value) so the generate-watchdog case can fire fast.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx src/llm/translatePipeline.test.ts -t "grammar-only"`
Expected: FAIL — `state` has no `model`/`canUpgrade`, `unavailable` still emitted for `none`, no demotion/educational wiring.

- [ ] **Step 3a: Update `NlState`**

In `src/llm/types.ts`, replace the `NlState` union — drop `unavailable`, add `canUpgrade` to `off`/`on`, add `model` to `on`:

```ts
export type NlState =
  | { phase: 'disabled' } // this game has no vocab (silent — no picker)
  | { phase: 'off'; installed: boolean; canUpgrade: boolean }
  | {
      phase: 'downloading'
      loaded: number
      total: number
      etaSeconds: number | null
    }
  | {
      phase: 'on'
      language: ActiveLanguage
      model: 'full' | 'grammar'
      /** capability allows attempting the model upgrade (else only the override). */
      canUpgrade: boolean
    }
```

- [ ] **Step 3b: Re-derive state in `useNaturalLanguage`**

In `src/llm/useNaturalLanguage.ts`, replace the `state` memo (lines ~151-164). Rename `available` to `canUpgrade` semantics:

```ts
  const canUpgrade = capability.tier !== 'none'

  const state: NlState = useMemo(() => {
    if (!hasVocab) return { phase: 'disabled' } // silent: this game has no vocab
    if (internal.phase === 'downloading')
      return {
        phase: 'downloading',
        loaded: internal.loaded,
        total: internal.total,
        etaSeconds: internal.etaSeconds,
      }
    if (internal.phase === 'on')
      return {
        phase: 'on',
        language: internal.language,
        model: internal.model,
        canUpgrade,
      }
    return { phase: 'off', installed, canUpgrade }
  }, [hasVocab, canUpgrade, internal, installed])
```

(Remove the now-unused `capability.reasons` from the deps; `capability.reasons` is no longer surfaced — the `unavailable` tooltip is gone. Keep the `const available = capability.tier !== 'none'` line only if other code uses it; otherwise replace it with `canUpgrade` as above. Verify with `grep -n "available" src/llm/useNaturalLanguage.ts` and delete any leftover.)

- [ ] **Step 3c: Add the educational ref + once-per-stint reset**

In `src/llm/useNaturalLanguage.ts`, near the other refs (after `inSequenceRef`):

```ts
  // First-abstain education fires once per grammar-only STINT. Reset on each
  // entry into grammar-only — a fresh non-loaded-language pick, a language switch
  // while grammar, or a full→grammar demotion (spec §UI/notices).
  const educatedRef = useRef(false)
  const prevGrammarKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const key =
      internal.phase === 'on' && internal.model === 'grammar'
        ? internal.language
        : null
    if (key !== null && key !== prevGrammarKeyRef.current) educatedRef.current = false
    prevGrammarKeyRef.current = key
  }, [internal])
```

- [ ] **Step 3d: Thread `demote` + `educatedRef` into `createTranslate`**

In `src/llm/useNaturalLanguage.ts`, add `demote: demoteToGrammar` and `educatedRef` to the `createTranslate({...})` call inside the `translate` `useCallback`, and add `demoteToGrammar` to that callback's dep array. Remove the temporary `void requestUpgrade; void demoteToGrammar;` from Task 3. Add `requestUpgrade` to the hook's return object (next to `requestDownload`).

In `src/llm/translatePipeline.ts`, extend `TranslateDeps`:

```ts
  liveRef: MutableRefObject<LiveState>
  /** Flip the active language full → grammar after a clause-time load failure. */
  demote: () => void
  /** First-abstain education latch (once per grammar-only stint). */
  educatedRef: MutableRefObject<boolean>
  setPending: Dispatch<SetStateAction<boolean>>
```

and destructure `demote, educatedRef` in `createTranslate`. Import the two notices:

```ts
import {
  queueFullDropped,
  nothingSent,
  couldntTranslate,
  ranOfActions,
  queueClearedNeedsAnswer,
  modelDownloadFailed,
  grammarOnlyFirstMiss,
} from './notices'
```

- [ ] **Step 3e: Derive + thread `grammarOnly`; handle `ModelLoadError`; stage-8 wiring**

In `runLine`, after `const lex = live.lex`, add:

```ts
      const grammarOnly =
        live.internal.phase === 'on' && live.internal.model === 'grammar'
```

Change the `runClause` call (the one passing `false` from Task 1) to pass `grammarOnly`:

```ts
          ;({ result, raw, stage } = await runClause(
            clause,
            scene,
            activeLang,
            lex,
            grammarOnly,
            clauseDeps,
          ))
```

In the clause-loop `catch (err)` block, handle `ModelLoadError` first:

```ts
        } catch (err) {
          if (err instanceof ModelLoadError) {
            // Clause-time load failure: demote full → grammar for the rest of
            // the session and stop. Stage 8 surfaces the shared basic-mode
            // notice (EN raw-send / non-EN nothing-sent).
            demote()
            stopReason = 'load-failed'
            stopError = err
            break
          }
          if (total === 1) throw err
          stopReason = `generate-error: ${String(err)}`
          stopError = err
          break
        }
```

In **stage 8** (the `if (done === 0)` block), replace the body with the ModelLoadError + educational branches:

```ts
        lastCommandRef.current = null
        if (stopError !== null) {
          if (stopError instanceof ModelLoadError) {
            // Demotion: shared basic-mode notice; EN still raw-sends so the
            // turn isn't lost, non-EN sends nothing.
            setNotice(modelDownloadFailed(activeLang))
            if (activeLang === 'en') sendTracked(line)
          } else {
            const timedOut = stopError instanceof WatchdogTimeout
            if (activeLang === 'en') {
              sendTracked(line)
              setNotice(sentAsTyped(timedOut))
            } else {
              setNotice(nothingSent(activeLang, timedOut))
            }
          }
        } else if (activeLang === 'en') {
          sendTracked(line)
        } else if (grammarOnly && !educatedRef.current) {
          educatedRef.current = true
          setNotice(grammarOnlyFirstMiss(activeLang))
        } else {
          setNotice(couldntTranslate(activeLang))
        }
```

Finally, guard the **outer drain `catch`** (the `total===1` rethrow path) so a `ModelLoadError` that reaches it also demotes + shows the basic-mode notice:

```ts
        } catch (err) {
          lastCommandRef.current = null
          if (err instanceof ModelLoadError) {
            demote()
            const lang = liveLang()
            setNotice(modelDownloadFailed(lang))
            if (lang === 'en') sendTracked(line)
            inSequenceRef.current = false
            line = queueRef.current.shift()?.text
            fromQueue = true
            syncQueue()
            settled = null
            continue
          }
          if (!(err instanceof WatchdogTimeout))
            log.error('translation failed:', err)
          const lang = liveLang()
          const timedOut = err instanceof WatchdogTimeout
          if (lang === 'en') {
            setNotice(sentAsTyped(timedOut))
            sendTracked(line)
          } else {
            setNotice(nothingSent(lang, timedOut))
          }
        }
```

(Import `ModelLoadError` is already in this file — it's defined here. The `continue` mirrors the loop's normal advance; if the surrounding loop structure differs, advance the queue the same way the existing post-catch code does rather than copying blindly.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx src/llm/translatePipeline.test.ts`
Expected: PASS. Then `npx vitest run src/llm/pipeline.uat.test.tsx` to confirm the UAT regression suite is still green (deterministic stages never call the model; grammar-only changes don't perturb full-mode UAT cases).

- [ ] **Step 5: Commit**

```bash
git add src/llm/types.ts src/llm/useNaturalLanguage.ts src/llm/translatePipeline.ts src/llm/useNaturalLanguage.test.tsx src/llm/translatePipeline.test.ts
git commit -m "feat(nl): derive grammar-only state, demote on load failure, educate on first miss

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `NlLanguagePicker` — basic marker + upgrade/override

**Files:**
- Modify: `src/ui/NlLanguagePicker.tsx`
- Test: `src/ui/NlLanguagePicker.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/ui/NlLanguagePicker.test.tsx`, the existing tests pass `state={{ phase: 'off', installed: true }}` and `onOverride={() => {}}`. Update those props to the new shape (`installed` + `canUpgrade`, `onUpgrade`) and add:

```ts
it('grammar-only shows the basic marker and a ✦ improve affordance', () => {
  const onUpgrade = vi.fn()
  render(
    <NlLanguagePicker
      state={{ phase: 'on', language: 'fr', model: 'grammar', canUpgrade: true }}
      onSelect={() => {}}
      onUpgrade={onUpgrade}
    />,
  )
  expect(screen.getByText(/· basic/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /improve/i }))
  expect(onUpgrade).toHaveBeenCalled()
})

it('grammar-only on a none device shows "try the model anyway", not improve', () => {
  const onUpgrade = vi.fn()
  render(
    <NlLanguagePicker
      state={{ phase: 'on', language: 'de', model: 'grammar', canUpgrade: false }}
      onSelect={() => {}}
      onUpgrade={onUpgrade}
    />,
  )
  expect(screen.queryByRole('button', { name: /improve/i })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /try the model anyway/i }))
  expect(onUpgrade).toHaveBeenCalled()
})

it('full shows neither the basic marker nor an upgrade affordance', () => {
  render(
    <NlLanguagePicker
      state={{ phase: 'on', language: 'fr', model: 'full', canUpgrade: true }}
      onSelect={() => {}}
      onUpgrade={() => {}}
    />,
  )
  expect(screen.queryByText(/· basic/)).toBeNull()
  expect(screen.queryByRole('button', { name: /improve|try the model/i })).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx`
Expected: FAIL — `onUpgrade` prop unknown; no basic marker; `unavailable` branch still references removed phase.

- [ ] **Step 3: Update the picker**

In `src/ui/NlLanguagePicker.tsx`:

(a) Change the prop name `onOverride` → `onUpgrade`:

```tsx
export function NlLanguagePicker({
  state,
  onSelect,
  onUpgrade,
}: {
  state: NlState
  onSelect: (lang: NlLanguage) => void
  onUpgrade: () => void
}) {
```

(b) Delete the entire `if (state.phase === 'unavailable') { ... }` block (lines ~52-64).

(c) Replace the `chip` computation + the trailing `{chip}` render. After the `value`/`current` lines, compute the grammar-only affordance and keep the off chip:

```tsx
  const value: NlLanguage = state.phase === 'on' ? state.language : 'off'
  const current = OPTIONS.find(o => o.value === value) ?? OPTIONS[0]
  const offChip =
    state.phase === 'off'
      ? state.installed
        ? ' · installed'
        : ' · not installed'
      : ''
```

Then replace the final `{chip}` (before `</span>`) with:

```tsx
      {offChip}
      {state.phase === 'on' && state.model === 'grammar' && (
        <>
          <span className="nl-basic"> · basic</span>{' '}
          <button className="sw" type="button" onClick={onUpgrade}>
            {state.canUpgrade ? '✦ improve' : 'try the model anyway'}
          </button>
        </>
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/NlLanguagePicker.tsx src/ui/NlLanguagePicker.test.tsx
git commit -m "feat(nl): picker shows basic marker + improve/try-anyway upgrade affordance

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `ModelDownloadModal` — upgrade reframe + honest `none` warning

**Files:**
- Modify: `src/ui/ModelDownloadModal.tsx`
- Test: `src/ui/ModelDownloadModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/ui/ModelDownloadModal.test.tsx`:

```ts
it('reframes as an upgrade and keeps grammar-only on "Not now"', () => {
  const onDecline = vi.fn()
  render(
    <ModelDownloadModal
      open
      progress={null}
      onAccept={() => {}}
      onDecline={onDecline}
      onCancel={() => {}}
    />,
  )
  expect(screen.getByRole('heading')).toHaveTextContent(/improve|upgrade/i)
  fireEvent.click(screen.getByRole('button', { name: /not now/i }))
  expect(onDecline).toHaveBeenCalled()
})

it('shows the honest warning when warn is set (none device)', () => {
  render(
    <ModelDownloadModal
      open
      warn
      progress={null}
      onAccept={() => {}}
      onDecline={() => {}}
      onCancel={() => {}}
    />,
  )
  expect(screen.getByText(/may not support|may fail/i)).toBeInTheDocument()
})

it('omits the warning by default', () => {
  render(
    <ModelDownloadModal
      open
      progress={null}
      onAccept={() => {}}
      onDecline={() => {}}
      onCancel={() => {}}
    />,
  )
  expect(screen.queryByText(/may not support|may fail/i)).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/ModelDownloadModal.test.tsx`
Expected: FAIL — no `warn` prop; heading is "Natural-language input".

- [ ] **Step 3: Update the modal**

In `src/ui/ModelDownloadModal.tsx`:

(a) Add `warn` to the props:

```tsx
export function ModelDownloadModal({
  open,
  progress,
  etaSeconds = null,
  warn = false,
  onAccept,
  onDecline,
  onCancel,
}: {
  open: boolean
  progress: LoadProgress | null
  etaSeconds?: number | null
  /** Honest warning for a none-capability device's "try the model anyway". */
  warn?: boolean
  onAccept: () => void
  onDecline: () => void
  onCancel: () => void
}) {
```

(b) Reframe the heading + body and add the warning paragraph. Replace the `<h2>` + first `<p>`:

```tsx
        <h2 id="nl-modal-title">Improve natural-language input</h2>
        <p>
          Basic mode already understands common commands. This optional upgrade
          fetches a language model (a sizable, one-time download) from
          third-party hosts — the model weights from Hugging Face and a small
          support library from GitHub — so it can understand more complex
          sentences. After that it runs entirely on your device — offline and
          private — and is cached, so it is not downloaded again.
        </p>
        {warn && !downloading && (
          <p className="modal-warn" role="note">
            Your device may not support this model, and the download is large and
            may fail. If it does, you stay in basic mode — common commands still
            work.
          </p>
        )}
```

(c) Rename the accept button copy from "Download &amp; enable" to "Download &amp; upgrade" (optional polish; keep "Not now" as-is — its `onDecline` now keeps grammar-only).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/ModelDownloadModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ModelDownloadModal.tsx src/ui/ModelDownloadModal.test.tsx
git commit -m "feat(nl): reframe model modal as an upgrade; honest warning for none devices

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Terminal wiring + full regression

**Files:**
- Modify: `src/ui/Terminal.tsx`
- Verify: full suite

- [ ] **Step 1: Wire the new props**

In `src/ui/Terminal.tsx`:

(a) Remove the capability-override flip — it no longer gates NL. Delete `const [override, setOverride] = useState(false)` and change `const capability = useCapability(override)` to:

```tsx
  const capability = useCapability(false)
```

(b) Update the `<NlLanguagePicker>` usage (lines ~157-160): replace `onOverride={() => setOverride(true)}` with the upgrade opener, which `requestUpgrade` exposes:

```tsx
          <NlLanguagePicker
            state={nl.state}
            onSelect={nl.setLanguage}
            onUpgrade={nl.requestUpgrade}
          />
```

(c) Pass `warn` to `<ModelDownloadModal>` (lines ~213-221), derived from `canUpgrade` on the current state:

```tsx
      <ModelDownloadModal
        open={nl.modalOpen || nl.state.phase === 'downloading'}
        warn={
          (nl.state.phase === 'on' || nl.state.phase === 'off') &&
          !nl.state.canUpgrade
        }
        progress={
          nl.state.phase === 'downloading'
            ? { loaded: nl.state.loaded, total: nl.state.total, text: 'downloading' }
            : null
        }
        etaSeconds={
          nl.state.phase === 'downloading' ? nl.state.etaSeconds : null
        }
        onAccept={nl.requestDownload}
        onDecline={nl.declineDownload}
        onCancel={nl.cancelDownload}
      />
```

(Confirm `requestUpgrade` is in `useNaturalLanguage`'s return — added in Task 5. If `useState` is now unused in Terminal after removing `override`, drop it from the React import.)

- [ ] **Step 2: Typecheck + lint**

Run: `make typecheck`
Expected: no errors (the `unavailable` removal and prop renames are fully propagated).
Run: `make lint`
Expected: clean (autofix any import ordering).

- [ ] **Step 3: Full test suite**

Run: `make test`
Expected: PASS — all suites, including `pipeline.uat.test.tsx`, the output-translation walkthrough/inventory gates, `useModelDownload.test.tsx`, `useNaturalLanguage.test.tsx`, `translatePipeline.test.ts`, and the two UI suites.

If the flaky output-translation fake-timers gate test fails, re-run it once in isolation (`npx vitest run src/translate/...`) — per the known-flaky note it is timing, not a regression. Only treat a second consecutive failure as real.

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run: `make dev`, open the app, pick **Français** on Zork I without downloading the model. Confirm: NL is active immediately (a basic French command like "prends la lampe" works), the picker shows "· basic" + "✦ improve", and the upgrade modal appeared once. Reload and confirm French is still active in basic mode.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Terminal.tsx
git commit -m "feat(nl): wire grammar-only picker upgrade + drop capability override gate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**

- Pick → immediate grammar-only, no forced download → Task 3 (`setLanguage`), Task 5 (state).
- Model is an optional upgrade; "Not now" keeps grammar-only → Task 3 (`declineDownload`), Task 7 (modal copy).
- Failed/stalled download stays grammar-only → Task 3 (`requestDownload` `.catch`/stall).
- No-capability device stays grammar-only with a gated override → Task 3 (no `available` gate), Task 5 (`canUpgrade`), Task 6 (try-anyway), Task 7 (`warn`).
- Language persists across reloads (language only, not model state) → Task 3 (isCached restore + `writeNlPref`), covered by the reload tests.
- `unavailable` removed; `hasVocab` sole prereq → Task 5 (`NlState`, derivation).
- `model: 'full' | 'grammar'` = permitted, lazy-load on first stage-7 miss → Task 3 (cached → `full`, no eager load test).
- **Clause-time load-failure demotion (Issue 1)** → Task 2 (`ModelLoadError`), Task 5 (clause-loop catch + stage 8 + outer catch + `demote`). The **negative** case — a *generate*-time watchdog does NOT demote — is pinned by Task 5's "GENERATE-time watchdog does NOT demote" test (spec Testing line 217).
- **`none`-device auto-modal (spec ambiguity)** → resolved as "auto-modal fires once even on `none`, rendered with `warn`"; pinned by Task 5's `none` test asserting `modalOpen === true`. The unconditional "model not loaded → modal once ever" table row governs; capability only swaps the picker affordance (Task 6) and adds the modal warning (Task 7), it does not suppress the auto-modal.
- **English grammar-only raw-send** (spec lines 197–199) → pinned by Task 5's "grammar-only EN raw-sends, no educational notice" test.
- **Modal once-ever via `declined` (Issue 2)** → Task 3 (`setLanguage` `!declined` gate, `declineDownload`, `requestUpgrade`).
- **Educational first-abstain once per stint (Issue 3)** → Task 4 (`grammarOnlyFirstMiss`), Task 5 (`educatedRef` + reset effect + stage-8 branch).
- `runClause` grammar-only skip → Task 1.
- Notices reframed across EN/FR/DE/ES → Task 4.

**Placeholder scan:** none — every code step shows concrete code; tests use literal expected strings.

**Type consistency:** `model: 'full' | 'grammar'` is identical in `Internal.on` (Task 3) and `NlState.on` (Task 5). `demoteToGrammar` (hook) is passed as `demote` (pipeline dep) — names intentionally differ at the boundary and are wired in Task 5 Step 3d. `requestUpgrade` consistent across hook/Terminal. `onOverride` → `onUpgrade` renamed consistently in Task 6 (picker) and Task 8 (Terminal). `ModelLoadError` exported in Task 2, consumed in Task 5.

**Note for the executor:** Tasks 1→8 are ordered so each leaves the suite green. Between Task 1 and Task 5 the drain passes `false`/`grammarOnly` is not yet derived from real state — that's intentional staging, not a bug. Always run the *named* test command at each Step 2/Step 4; if a helper (`renderNl`/`makeTranslate`) named here doesn't exist, build it from the existing harness in that test file rather than adding a production seam.
