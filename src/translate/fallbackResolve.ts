// The async LLM-fallback resolution pipeline for output translation, extracted
// from useOutputTranslation (F-3): the hook owns React state, refs, the
// effect-order invariant, the miss scan and the output memos; this module owns
// the dense per-line resolution machinery (cache consult → gate-queued
// generation → settle/English) that the scan drives. Pure logic — no hooks — so
// it is unit-testable in isolation and the hook reads as an orchestrator.
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { LlmEngine } from '../llm/types'
import type { LexLang } from '../llm/lexicon/types'
import { EngineGate } from '../shared/engineGate'
import { runGenerationGuarded } from '../shared/guardedGenerate'
import { splitPromptResidue, type CompiledCorpus } from './match'
import { normalize, untranslatable } from './normalize'
import { cacheGet, cacheSet } from './fallbackCache'
import { logMiss } from './missLog'
import { xlPrompt } from './xlPrompt'
import { createLogger } from '../logger'

const log = createLogger('xlate')

export type Resolution = string | 'pending' | 'english'

/** An overlay entry carries the EN text (basis) it resolved — the display memo
 * ignores an entry whose basis no longer matches the line's current text, so a
 * resolution computed from pre-merge text can never render against the merged
 * line (it would read as a stale/wrong translation). */
export interface OverlayEntry {
  en: string
  res: Resolution
}

/** Fallback resolutions for LIVE misses, keyed by line id, TAGGED with the
 * corpus they were built against so a corpus switch makes render ignore a stale
 * map (see useOutputTranslation's overlay state). */
export interface OverlayState {
  for: CompiledCorpus | null
  map: ReadonlyMap<number, OverlayEntry>
}

/** Marks resolve()'s expected control-flow stops (queue abandonment, watchdog
 * timeout, empty model output, a momentary unload) apart from a genuine engine
 * throw. A SUPERSEDED stop (epoch moved on — language/story switch, unmount)
 * degrades to English silently. Every other stop is a transient FAILURE under
 * the current epoch: it surfaces (log.warn) and earns one retry once the
 * engine is idle again (review S1); a second failure is log.error'd so a
 * genuinely broken engine stays diagnosable. Mirrors useNaturalLanguage's [B]
 * policy and its WatchdogTimeout sentinel style. */
export class ExpectedXlateStop extends Error {}

/** Everything the resolution pipeline reads for one effect run: the immutable
 * per-run config (corpus/lang/engine/gate/watchdog/ctx and the captured epoch),
 * the shared mutable refs it updates, and the overlay setter. The refs are the
 * SAME objects the hook holds, so settle()/failEnglish() mutate the live state. */
export interface FallbackResolverDeps {
  corpus: CompiledCorpus
  lang: LexLang
  signature: string
  engine: LlmEngine
  gate: EngineGate
  watchdogMs: number
  /** Turn context for the miss log (spec §6): the status line at miss time. */
  ctx: string | undefined
  /** The epoch snapshot captured when this effect run started. */
  epoch: number
  epochRef: MutableRefObject<number>
  basisRef: MutableRefObject<Map<number, string>>
  retryRef: MutableRefObject<Map<number, { en: string; tries: number }>>
  acsRef: MutableRefObject<Set<AbortController>>
  setOverlay: Dispatch<SetStateAction<OverlayState>>
}

export interface FallbackResolver {
  /** Resolve one live miss: cache consult → gate-queued generation → settle. */
  resolve: (id: number, en: string) => Promise<void>
  /** Settle a resolution computed elsewhere (the backlog cache-hit path),
   * guarded by the same epoch/basis invariants as resolve. */
  settle: (id: number, en: string, value: Resolution) => void
  /** Mark a live miss as in-flight (the shimmer) before resolve() runs —
   * unconditional, tagged with the current corpus. */
  markPending: (id: number, en: string) => void
}

export function createFallbackResolver(
  deps: FallbackResolverDeps,
): FallbackResolver {
  const {
    corpus,
    lang,
    signature,
    engine,
    gate,
    watchdogMs,
    ctx,
    epoch,
    epochRef,
    basisRef,
    retryRef,
    acsRef,
    setOverlay,
  } = deps

  const put = (id: number, en: string, res: Resolution) =>
    setOverlay(prev => ({
      for: corpus,
      map:
        prev.for === corpus
          ? new Map(prev.map).set(id, { en, res })
          : new Map([[id, { en, res }]]),
    }))

  const settle = (id: number, en: string, value: Resolution) => {
    if (epochRef.current !== epoch) return // language/story switched mid-flight
    if (basisRef.current.get(id) !== en) return // append merge superseded us
    put(id, en, value)
  }

  // A transient translation FAILURE (review S1). The first failure renders
  // English now (stops the shimmer) but frees the basis so the next render
  // re-attempts once the engine is idle (the scan gates that retry on
  // engine.isLoaded()). A second failure is terminal: the line stays English
  // (basis kept, so the scan skips it) and is surfaced as an error. A
  // SUPERSEDED resolve (epoch moved — switch/unmount) returns silently: not a
  // failure to act on, and the line is gone anyway.
  const failEnglish = (id: number, en: string, err: unknown) => {
    if (epochRef.current !== epoch) return
    if (basisRef.current.get(id) !== en) return
    const reason = err instanceof ExpectedXlateStop ? err.message : String(err)
    const prior = retryRef.current.get(id)
    const failures = (prior?.en === en ? prior.tries : 0) + 1
    retryRef.current.set(id, { en, tries: failures })
    put(id, en, 'english')
    if (failures === 1) {
      basisRef.current.delete(id)
      log.warn(
        `output translation failed (${reason}); will retry once when the engine is idle:`,
        en,
      )
    } else {
      log.error(
        `output translation failed again (${reason}); leaving this line in English:`,
        en,
      )
    }
  }

  const resolve = async (id: number, en: string) => {
    // A re-attempt of a line that already failed once (basis was freed by
    // failEnglish): skip the duplicate miss log — the corpus gap was already
    // recorded on the first attempt.
    const isRetry = retryRef.current.get(id)?.en === en
    // Strip the glued ' >' input-prompt residue the same way matchLine does
    // (review I4): cache/translate the CLEAN core (so the key never carries
    // the residue and matches the same line if it later arrives clean), then
    // re-append the chrome to what renders.
    const { core, suffix } = splitPromptResidue(en)
    try {
      // cacheGet folds a transient READ failure (quota, private mode, tx
      // abort/blocked) into a miss (undefined) itself (review S6) — its
      // contract is "value or undefined, never throws" — so a read fault can't
      // reach the outer catch (which would log.error a non-engine error,
      // trip the pristine-output guard, and skip the fallback entirely).
      const cached = await cacheGet(signature, lang, core)
      if (cached !== undefined) {
        retryRef.current.delete(id)
        settle(id, en, cached + suffix)
        return
      }
      if (!isRetry)
        logMiss({
          en: core,
          game: signature,
          language: lang,
          kind: 'line',
          ctx,
        })
      if (!engine.isLoaded())
        // Spec §6: model absent/still loading → English now, but as a
        // TRANSIENT failure (review S1/F1) so it re-attempts once the engine
        // loads — not a permanent English pin. settle()-ing here left the
        // basis set, so the scan's basis guard skipped the line forever even
        // after the input pipeline lazy-loaded the model. Throw the same
        // ExpectedXlateStop the queued-unload check below uses: the outer
        // catch routes it through failEnglish (frees the basis, records the
        // one-shot retry that the scan defers until engine.isLoaded()).
        //
        // DELIBERATE in-spec degradation (review I2): the output hook never
        // initiates a model load itself — only the INPUT path (a typed NL
        // command) lazy-loads the model (useNaturalLanguage's generateRaw).
        // So a player who enables a non-English language purely to READ
        // (never typing a command) gets matcher + cache hits only, with the
        // LLM fallback dormant; uncovered live lines stay English. This is
        // the spec §6 degradation ("model absent → English"), accepted as a
        // product decision rather than auto-loading the model on language
        // enable. If read-only NL ever becomes a supported flow, kick a
        // background load when phase==='on' && !isLoaded() (NL hook) or have
        // this hook load at 'output' gate priority.
        throw new ExpectedXlateStop('engine not loaded')
      const text = await gate.run('output', async () => {
        // Queued generations ABANDON on a language/story switch (spec §3/§6):
        // the epoch moved on while we waited for the gate — don't burn GPU
        // on a result nobody will render. (The throw lands in the outer
        // catch; settle() there is an epoch-guarded no-op.)
        if (epochRef.current !== epoch)
          throw new ExpectedXlateStop('xlate abandoned')
        // The engine can be unloaded while this task waits in the gate queue;
        // generating then throws 'engine not loaded' — a non-engine condition
        // that must degrade to English silently, not surface as a broken
        // engine. Re-checked here inside the gate; runGenerationGuarded calls
        // generate() synchronously (no await before it) so this check cannot
        // go stale before the generation starts.
        if (!engine.isLoaded())
          throw new ExpectedXlateStop('engine unloaded while queued')
        // Shared generate-under-watchdog core (review I2): the gate-holding /
        // abort-settle invariant lives in one place now (runGenerationGuarded).
        // acsRef registers the controller so unmount/HMR can cancel in-flight
        // work; onOrphanError surfaces a genuine engine fault that a watchdog
        // win would otherwise mask as a transient timeout.
        return runGenerationGuarded({
          engine,
          messages: xlPrompt(core, lang),
          grammar: null,
          watchdogMs,
          timeoutError: () => new ExpectedXlateStop('xlate watchdog'),
          acs: acsRef.current,
          onOrphanError: err =>
            log.error(
              `generation failed after the watchdog (engine fault, not a timeout):`,
              err,
            ),
        })
      })
      const out = normalize(text)
      // Run the model's OUTPUT through the same untranslatable() guard the
      // input side applies (review I1): a hallucinated bare '>' (or other
      // prompt chrome) normalizes non-empty, so without this it would settle
      // as phantom game text AND poison the cache under the real EN key (which
      // the activation-time '>' purge cannot evict). Treat it as a transient
      // miss so the throw below skips both settle() and cacheSet().
      if (untranslatable(out))
        throw new ExpectedXlateStop('untranslatable output (empty or chrome)')
      // A model that "refuses" (short lines, proper nouns, prompt echo)
      // returns the English CORE unchanged. out is non-empty and non-'>', so
      // the untranslatable() guard alone would settle+cache it as a real
      // translation — a PERMANENT cached non-translation the '>' purge can
      // never evict (spec §6: one generation per device, ever). Treat an
      // English-unchanged completion as a transient miss too (review I1): the
      // line stays English regardless, but the budget retries it and the
      // clean EN key is never poisoned, so a better model later still gets a
      // shot. (A line whose French form is genuinely identical was already
      // English on screen — re-attempting it costs only a generation.)
      if (out === normalize(core))
        throw new ExpectedXlateStop('untranslatable output (English unchanged)')
      retryRef.current.delete(id) // resolved — reset the retry budget
      settle(id, en, out + suffix)
      // Persist fire-and-forget: the translation is already on screen — a
      // cache-write failure (quota, private mode) must not downgrade the
      // rendered line back to English. Persistence ≠ display. Keyed on the
      // CLEAN core (review I4) so a later clean arrival of the same line hits.
      void cacheSet(signature, lang, core, out).catch(() => {})
    } catch (err) {
      failEnglish(id, en, err)
    }
  }

  return { resolve, settle, markPending: (id, en) => put(id, en, 'pending') }
}
