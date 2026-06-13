// Output translation as a display overlay (spec §3). English ViewState in;
// DisplayLines + translated status out. Sync path: exact/template matcher.
// Async path (live misses only): IndexedDB cache → gate-queued LLM fallback
// (output priority — input preempts, spec §6) → English on failure. Lines
// present at corpus activation (language switch / restore rebuild) are
// BACKLOG: matcher + CACHE hits only (spec §3) — no shimmer, no generation;
// an uncached backlog miss stays English and is logged (kind 'backlog').
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BufferLine, StatusLine, ViewState } from '../glkote-react/types'
import type { LlmEngine, NlLanguage } from '../llm/types'
import type { LexLang } from '../llm/lexicon/types'
import { EngineGate } from '../llm/engineGate'
import type { TranslationCorpus } from './types'
import { corpusFor } from './corpus/index'
import { compileCorpus, matchLine, type CompiledCorpus } from './match'
import { normalize, splitIndent, untranslatable } from './normalize'
import { translateStatus } from './statusTranslate'
import { cacheDelete, cacheGet, cacheSet } from './fallbackCache'
import { installMissDump, logMiss } from './missLog'
import { shimmerLabel, xlPrompt } from './xlPrompt'

export interface DisplayLine extends BufferLine {
  /** True while the LLM fallback is in flight (renders the shimmer). */
  pending?: boolean
}

export interface OutputTranslation {
  lines: DisplayLine[]
  status: StatusLine | null
}

/** Output generations run longer than command translations; bounded so a
 * wedged engine degrades to English instead of shimmering forever (spec §6). */
const XLATE_WATCHDOG_MS = 15_000

type Resolution = string | 'pending' | 'english'

/** An overlay entry carries the EN text (basis) it resolved — the display memo
 * ignores an entry whose basis no longer matches the line's current text, so a
 * resolution computed from pre-merge text can never render against the merged
 * line (it would read as a stale/wrong translation). */
interface OverlayEntry {
  en: string
  res: Resolution
}

/** Marks resolve()'s expected control-flow stops (queue abandonment, watchdog
 * timeout, empty model output, a momentary unload) apart from a genuine engine
 * throw. A SUPERSEDED stop (epoch moved on — language/story switch, unmount)
 * degrades to English silently. Every other stop is a transient FAILURE under
 * the current epoch: it surfaces (console.warn) and earns one retry once the
 * engine is idle again (review S1); a second failure is console.error'd so a
 * genuinely broken engine stays diagnosable. Mirrors useNaturalLanguage's [B]
 * policy and its WatchdogTimeout sentinel style. */
class ExpectedXlateStop extends Error {}

export function useOutputTranslation(args: {
  view: ViewState
  language: NlLanguage
  signature: string
  engine: LlmEngine
  gate: EngineGate
  /** Tests inject a corpus directly; production resolves via corpusFor. */
  corpusOverride?: TranslationCorpus
  /** Test-only watchdog override (mirrors useNaturalLanguage's injectable
   * watchdogMs); production omits it and gets XLATE_WATCHDOG_MS. */
  watchdogMs?: number
}): OutputTranslation {
  const { view, language, signature, engine, gate, corpusOverride } = args
  const watchdogMs = args.watchdogMs ?? XLATE_WATCHDOG_MS

  const lang: LexLang | null =
    language === 'fr' || language === 'de' || language === 'es'
      ? language
      : null
  const corpus: CompiledCorpus | null = useMemo(() => {
    if (lang === null) return null
    const c = corpusOverride ?? corpusFor(signature, lang)
    return c ? compileCorpus(c) : null
  }, [lang, signature, corpusOverride])

  // Fallback resolutions for LIVE misses, keyed by line id. The map is TAGGED
  // with the corpus it was built against: on a corpus switch render simply
  // ignores a stale map (no synchronous setState in the activation effect —
  // react-hooks/set-state-in-effect), and the first async settle under the new
  // corpus starts a fresh map.
  const [overlay, setOverlay] = useState<{
    for: CompiledCorpus | null
    map: ReadonlyMap<number, OverlayEntry>
  }>(() => ({ for: null, map: new Map() }))
  // The EN text each in-flight entry was computed from — an append merge
  // changes the text and must invalidate the entry (spec §3). settle() guards
  // on it; the overlay entries carry it too (see OverlayEntry) so render can
  // apply the same invalidation to already-settled values.
  const basisRef = useRef<Map<number, string>>(new Map())
  // Ids on screen when the corpus ACTIVATED (language picked / restore
  // rebuild): the backlog (spec §3). Misses there stay English.
  const backlogRef = useRef<Set<number>>(new Set())
  // Per-line fallback retry budget (review S1). A transient generation failure
  // (watchdog timeout, empty output, a momentary unload) otherwise pins the
  // line to English forever via the basis guard, even after the engine
  // recovers. Record one failure here and grant exactly ONE re-attempt on a
  // later render once the engine is loaded again; a second failure is terminal.
  // Keyed by id, validated against the text so an append merge (new text)
  // starts a fresh budget. Cleared when the line finally resolves.
  const retryRef = useRef<Map<number, { en: string; tries: number }>>(new Map())
  const lastStatusMissRef = useRef<string | null>(null)
  // Stale-async guard: bumped on corpus identity change (and on unmount, by the
  // teardown effect below).
  const epochRef = useRef(0)
  // AbortControllers of in-flight generations, so unmount/HMR can cancel them.
  const acsRef = useRef<Set<AbortController>>(new Set())

  // EFFECT ORDER INVARIANT — do not reorder the three effects below: the
  // viewRef sync must be declared before the corpus-activation effect (the
  // backlog snapshot reads viewRef on the same commit), and the activation
  // effect must precede the fallback effect (epoch bump + backlog snapshot
  // happen before that commit's misses are scanned).
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    installMissDump()
  }, [])

  // Unmount / HMR teardown: invalidate any in-flight or queued resolve so its
  // late settle() is a no-op (no setOverlay on an unmounted component → no
  // act(...) warning routed through console.error, the pristine-output rule),
  // and abort in-flight generations so a game the player left doesn't keep
  // burning GPU. The epoch bump also makes queued gate tasks bail at their
  // abandon check. Empty deps ⇒ this cleanup runs only on unmount, never on a
  // turn-by-turn re-render (which would wrongly cancel live translations).
  useEffect(
    () => () => {
      epochRef.current++
      for (const ac of acsRef.current) ac.abort()
      acsRef.current.clear()
    },
    [],
  )

  // Corpus (re)activation: snapshot the backlog, reset all per-corpus state.
  // (The overlay needs no reset here — render drops a map tagged with another
  // corpus, and settle() rebuilds it under the new tag.)
  useEffect(() => {
    epochRef.current++
    backlogRef.current = new Set(viewRef.current.lines.map(l => l.id))
    basisRef.current = new Map()
    retryRef.current = new Map()
    lastStatusMissRef.current = null
    // Hygiene for devices that played before the untranslatable() guard: a
    // live '>' could cache a hallucinated "translation". The guard makes the
    // key dead, but delete it too — fire-and-forget, like cacheSet.
    if (corpus && lang !== null)
      void cacheDelete(signature, lang, '>').catch(() => {})
  }, [corpus, lang, signature])

  // Async fallback for live misses (and miss logging for backlog/status).
  useEffect(() => {
    if (!corpus || lang === null) return
    const epoch = epochRef.current
    // Turn context for the miss log (spec §6): the status line at miss time.
    const ctx = view.status
      ? normalize(`${view.status.location} — ${view.status.right}`)
      : undefined

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
      const reason =
        err instanceof ExpectedXlateStop ? err.message : String(err)
      const prior = retryRef.current.get(id)
      const failures = (prior?.en === en ? prior.tries : 0) + 1
      retryRef.current.set(id, { en, tries: failures })
      put(id, en, 'english')
      if (failures === 1) {
        basisRef.current.delete(id)
        console.warn(
          `[xlate] output translation failed (${reason}); will retry once when the engine is idle:`,
          en,
        )
      } else {
        console.error(
          `[xlate] output translation failed again (${reason}); leaving this line in English:`,
          en,
        )
      }
    }

    const resolve = async (id: number, en: string) => {
      // A re-attempt of a line that already failed once (basis was freed by
      // failEnglish): skip the duplicate miss log — the corpus gap was already
      // recorded on the first attempt.
      const isRetry = retryRef.current.get(id)?.en === en
      try {
        // A cache-READ failure (transient IDB error: quota, private mode, tx
        // abort/blocked) is neither a cache miss (undefined) nor an engine
        // fault — treat it as a miss and fall through to the fallback, exactly
        // as the backlog path's .catch(() => {}) does. Letting it reach the
        // outer catch would both console.error a non-engine error (tripping the
        // pristine-output guard) and skip the LLM fallback entirely.
        let cached: string | undefined
        try {
          cached = await cacheGet(signature, lang, en)
        } catch {
          cached = undefined
        }
        if (cached !== undefined) {
          retryRef.current.delete(id)
          settle(id, en, cached)
          return
        }
        if (!isRetry)
          logMiss({ en, game: signature, language: lang, kind: 'line', ctx })
        if (!engine.isLoaded())
          // Spec §6: model absent/still loading → English now, but as a
          // TRANSIENT failure (review S1/F1) so it re-attempts once the engine
          // loads — not a permanent English pin. settle()-ing here left the
          // basis set, so the scan's basis guard skipped the line forever even
          // after the input pipeline lazy-loaded the model. Throw the same
          // ExpectedXlateStop the queued-unload check below uses: the outer
          // catch routes it through failEnglish (frees the basis, records the
          // one-shot retry that the scan defers until engine.isLoaded()).
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
          // engine. Re-checked here (inside the gate, with no await before
          // generate()) so the check cannot go stale.
          if (!engine.isLoaded())
            throw new ExpectedXlateStop('engine unloaded while queued')
          const ac = new AbortController()
          acsRef.current.add(ac)
          let watchdogId: ReturnType<typeof setTimeout>
          const watchdog = new Promise<never>((_, rej) => {
            watchdogId = setTimeout(() => {
              rej(new ExpectedXlateStop('xlate watchdog'))
              ac.abort()
            }, watchdogMs)
          })
          const gen = engine.generate(xlPrompt(en, lang), null, ac.signal)
          try {
            return await Promise.race([gen, watchdog])
          } finally {
            clearTimeout(watchdogId!)
            acsRef.current.delete(ac)
            // When the watchdog wins the race, ac.abort() only REQUESTS the
            // worker to stop — gen is still settling its interrupt on the
            // single shared engine. EngineGate's finally hands the gate off
            // immediately, so releasing now would let the next waiter call
            // generate() before this one is idle, overlapping two generations
            // on a non-reentrant engine. Await its settlement first.
            await gen.catch(() => {})
          }
        })
        const out = normalize(text)
        if (out === '') throw new ExpectedXlateStop('empty translation')
        retryRef.current.delete(id) // resolved — reset the retry budget
        settle(id, en, out)
        // Persist fire-and-forget: the translation is already on screen — a
        // cache-write failure (quota, private mode) must not downgrade the
        // rendered line back to English. Persistence ≠ display.
        void cacheSet(signature, lang, en, out).catch(() => {})
      } catch (err) {
        failEnglish(id, en, err)
      }
    }

    // Skipping the bare '>' prompt here matters beyond noise: Scrollback hides
    // it only while its text is literally '>' — a hallucinated "translation"
    // would unhide it as phantom game output (and poison the cache).
    for (const l of view.lines) {
      if (l.kind !== 'output' && l.kind !== 'room') continue
      const en = normalize(splitIndent(l.text).body)
      if (untranslatable(en)) continue
      if (matchLine(corpus, en) !== null) continue
      if (backlogRef.current.has(l.id)) {
        // Gate on TEXT, not id: an append merge onto a backlog tail line
        // changes its text — that's a different EN line, so it logs again and
        // gets a fresh cache consult. The basis is written FIRST so settle()'s
        // basis guard drops the old text's still-in-flight resolution.
        if (basisRef.current.get(l.id) !== en) {
          basisRef.current.set(l.id, en)
          logMiss({ en, game: signature, language: lang, kind: 'backlog', ctx })
          // Backlog rule (spec §3): matcher + CACHE hits only. A fallback
          // translation cached in an earlier session still applies after a
          // restore rebuild — no shimmer, no generation either way. Cache
          // unavailable (private mode, tx abort) ⇒ the line stays English,
          // which is the documented degradation.
          void cacheGet(signature, lang, en)
            .then(cached => {
              if (cached !== undefined) settle(l.id, en, cached)
            })
            .catch(() => {})
        }
        continue
      }
      if (basisRef.current.get(l.id) === en) continue // already handled this text
      // A pending retry (review S1) re-attempts only once the engine is idle
      // again: if it's still gone, leave the line English and re-check on the
      // next render rather than burning the one retry against a dead engine.
      const retry = retryRef.current.get(l.id)
      if (retry?.en === en && !engine.isLoaded()) continue
      basisRef.current.set(l.id, en)
      put(l.id, en, 'pending')
      void resolve(l.id, en)
    }

    // Status-bar room/right misses: English fallback, logged once per value.
    if (view.status) {
      const { miss } = translateStatus(view.status, corpus, lang)
      if (miss !== null && miss !== lastStatusMissRef.current) {
        lastStatusMissRef.current = miss
        logMiss({ en: miss, game: signature, language: lang, kind: 'status' })
      }
    }
  }, [view, corpus, lang, signature, engine, gate, watchdogMs])

  const lines: DisplayLine[] = useMemo(() => {
    if (!corpus || lang === null) return view.lines
    // A map built against another corpus is stale — ignore it wholesale.
    const resolved = overlay.for === corpus ? overlay.map : null
    return view.lines.map(l => {
      if (l.kind !== 'output' && l.kind !== 'room') return l
      const { indent, body } = splitIndent(l.text)
      const en = normalize(body)
      if (untranslatable(en)) return l
      const hit = matchLine(corpus, en)
      if (hit !== null) return { ...l, text: indent + hit }
      const o = resolved?.get(l.id)
      // Basis check: an entry resolved from different (pre-merge) text is
      // stale for THIS text — ignore it (English) until the new text settles.
      if (o !== undefined && o.en === en) {
        if (o.res === 'pending')
          return { ...l, text: indent + shimmerLabel(lang), pending: true }
        if (o.res !== 'english') return { ...l, text: indent + o.res }
      }
      return l // backlog miss, failure, or superseded entry → English
    })
  }, [view.lines, corpus, overlay, lang])

  const status: StatusLine | null = useMemo(() => {
    if (!corpus || lang === null || view.status === null) return view.status
    return translateStatus(view.status, corpus, lang).status
  }, [view.status, corpus, lang])

  return { lines, status }
}
