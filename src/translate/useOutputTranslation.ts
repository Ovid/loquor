// Output translation as a display overlay (spec §3). English ViewState in;
// DisplayLines + translated status out. Sync path: exact/template matcher.
// Async path (live misses only): IndexedDB cache → gate-queued LLM fallback
// (output priority — input preempts, spec §6) → English on failure. Lines
// present at corpus activation (language switch / restore rebuild) are
// BACKLOG: matcher + CACHE hits only (spec §3) — no shimmer, no generation;
// an uncached backlog miss stays English and is logged (kind 'backlog').
//
// SIDE EFFECTS (F-18) — this hook is NOT a pure derivation of {lines, status};
// its effects are intentional but not evident from the return type, so they are
// enumerated here. The async-resolution effects (IndexedDB cache reads/writes,
// gate-held GPU generations) are owned and documented by createFallbackResolver
// (./fallbackResolve); the hook itself additionally:
//   • installs a `window.loquorMisses()` dev dump on mount (installMissDump);
//   • on corpus (re)activation, purges a poisoned '>' cache key (cacheDelete);
//   • appends corpus gaps to the localStorage miss-log (logMiss: 'backlog' on
//     first sight of a backlog miss, 'status' for unmatched status fields);
//   • aborts in-flight generations on unmount/HMR (acsRef teardown).
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BufferLine, StatusLine, ViewState } from '../glkote-react/types'
import type { LlmEngine, NlLanguage } from '../llm/types'
import type { LexLang } from '../llm/lexicon/types'
import { EngineGate } from '../shared/engineGate'
import type { TranslationCorpus } from './types'
import { corpusFor } from './corpus/index'
import {
  compileCorpus,
  matchLine,
  splitPromptResidue,
  type CompiledCorpus,
} from './match'
import { normalize, splitIndent, untranslatable } from './normalize'
import { isLoudEchoShape, loudEchoWord, LOUD_ROOM } from './loudEcho'
import { translateStatus } from './statusTranslate'
import { cacheDelete, cacheGet } from './fallbackCache'
import { installMissDump, logMiss } from './missLog'
import { shimmerLabel } from './xlPrompt'
import { createFallbackResolver, type OverlayState } from './fallbackResolve'

export interface DisplayLine extends BufferLine {
  /** True while the LLM fallback is in flight (renders the shimmer). */
  pending?: boolean
}

/** The overlay's render output. NOTE: producing it is effectful — see the
 * "SIDE EFFECTS (F-18)" inventory in this file's header; the hook persists to
 * IndexedDB/localStorage, installs a window global, and may run GPU work. */
export interface OutputTranslation {
  lines: DisplayLine[]
  status: StatusLine | null
}

/** Output generations run longer than command translations; bounded so a
 * wedged engine degrades to English instead of shimmering forever (spec §6). */
const XLATE_WATCHDOG_MS = 15_000

// Loud Room input-echo (F6) decision, FROZEN per BufferLine at emit time. Keyed
// by the line object — the reducer reuses a line's object identity while its text
// is unchanged (reduce.ts), so a scrollback echo keeps its decision across every
// later render: it never restamps with a newer command's word (review I2) and
// keeps its re-voicing after the player leaves the room (the location is read
// once, at first sight — review I3). A WeakMap (not a ref) is read during render
// without violating react-hooks/refs, and is safe under concurrent rendering
// because the decision is idempotent and identity-keyed. Values:
//   • string — the re-voiced word (in the Loud Room at emit time);
//   • false  — in the Loud Room but NOT re-voiced (no source word for this echo,
//              e.g. an English escape) → leave the English echo, but still
//              suppress miss-logging/generation;
//   • null   — a coincidental doubled-word line OUTSIDE the Loud Room → fall
//              through to the normal translation path (don't hijack — review I3).
const echoFreeze = new WeakMap<BufferLine, string | false | null>()

/** The frozen Loud Room echo decision for an echo-SHAPED line (callers gate on
 * isLoudEchoShape first), computed once on first sight. `en` is the echo line
 * text; `location` and `revoice` (the canonical→player word map) are read only at
 * that first sight (the freeze). */
function echoDecision(
  key: BufferLine,
  en: string,
  location: string | undefined,
  revoice: ReadonlyMap<string, string> | null,
): string | false | null {
  const cached = echoFreeze.get(key)
  if (cached !== undefined) return cached
  const decision =
    location === LOUD_ROOM ? (loudEchoWord(en, revoice) ?? false) : null
  echoFreeze.set(key, decision)
  return decision
}

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
  /** Canonical-word → player-word map for re-voicing the Loud Room input-echo
   * faithfully (loudEcho / UAT F6): each entry is built as a clause is sent
   * (canonical the VM echoes ← the player's own last word for that clause), so a
   * compound's clauses each re-voice correctly. Null/empty when nothing is
   * recorded yet — the echo then falls to the English path. */
  echoMap?: ReadonlyMap<string, string> | null
}): OutputTranslation {
  const { view, language, signature, engine, gate, corpusOverride } = args
  const watchdogMs = args.watchdogMs ?? XLATE_WATCHDOG_MS
  const echoMap = args.echoMap ?? null

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
  const [overlay, setOverlay] = useState<OverlayState>(() => ({
    for: null,
    map: new Map(),
  }))
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

    // The async resolution pipeline (cache consult → gate-queued generation →
    // settle/English, with the transient-failure retry budget) lives in
    // createFallbackResolver (F-3). It closes over the same refs/config this
    // effect holds — settle()/failEnglish() mutate the live basis/retry state —
    // so the scan below reads as orchestration: snapshot misses, drive resolve.
    const { resolve, settle, markPending } = createFallbackResolver({
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
    })

    // Skipping the bare '>' prompt here matters beyond noise: Scrollback hides
    // it only while its text is literally '>' — a hallucinated "translation"
    // would unhide it as phantom game output (and poison the cache).
    for (const l of view.lines) {
      if (l.kind !== 'output' && l.kind !== 'room') continue
      const en = normalize(splitIndent(l.text).body)
      if (untranslatable(en)) continue
      if (matchLine(corpus, en) !== null) continue
      // The Loud Room input-echo is rendered deterministically from the player's
      // last word (loudEcho / F6) — never a corpus gap, so don't log it or spend
      // a generation on it. The `lines` memo freezes the decision (echoFreeze)
      // during the render that precedes this commit, so we only READ it here (no
      // lastInput dependency — review S2): a string (re-voiced) or false (in-room
      // compound, left English) both mean "handled" — skip, including historical
      // echoes after the player has left the room; null/undefined means a
      // coincidental doubled-word line elsewhere → fall through to translation.
      if (isLoudEchoShape(en)) {
        const d = echoFreeze.get(l)
        if (d !== undefined && d !== null) continue
      }
      if (backlogRef.current.has(l.id)) {
        // Gate on TEXT, not id: an append merge onto a backlog tail line
        // changes its text — that's a different EN line, so it logs again and
        // gets a fresh cache consult. The basis is written FIRST so settle()'s
        // basis guard drops the old text's still-in-flight resolution.
        if (basisRef.current.get(l.id) !== en) {
          basisRef.current.set(l.id, en)
          // Read under the CLEAN core (review I4): the live path caches keys
          // residue-free, so a backlog line carrying a ' >' residue must read
          // the same way or it would miss its own earlier-session entry.
          const { core, suffix } = splitPromptResidue(en)
          logMiss({
            en: core,
            game: signature,
            language: lang,
            kind: 'backlog',
            ctx,
          })
          // Backlog rule (spec §3): matcher + CACHE hits only. A fallback
          // translation cached in an earlier session still applies after a
          // restore rebuild — no shimmer, no generation either way. Cache
          // unavailable (private mode, tx abort) ⇒ the line stays English,
          // which is the documented degradation.
          void cacheGet(signature, lang, core)
            .then(cached => {
              if (cached !== undefined) settle(l.id, en, cached + suffix)
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
      markPending(l.id, en)
      void resolve(l.id, en)
    }

    // Status-bar room/right misses: English fallback, logged once per value.
    // Both the room-name and right-side miss are reported independently (review
    // S4); logMiss dedups persistently by (game, language, en), and the joined
    // signature skips re-logging the same status on every render.
    if (view.status) {
      const { misses } = translateStatus(view.status, corpus, lang)
      const sig = misses.join(' ')
      if (misses.length > 0 && sig !== lastStatusMissRef.current) {
        lastStatusMissRef.current = sig
        for (const en of misses)
          logMiss({ en, game: signature, language: lang, kind: 'status' })
      }
    }
    // echoMap is intentionally NOT a dep (review S2): this effect no longer reads
    // it — the Loud Room skip keys off echoFreeze (frozen in the memo), and
    // re-scanning every view line on each keystroke would be pure wasted work.
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
      // Loud Room input-echo (F6): substitute the player's own last word so the
      // echo reads in their language ("mira mira ..."). Deterministic, so it
      // takes precedence over any in-flight LLM overlay for this line. The
      // decision is FROZEN per line at emit time (echoDecision / echoFreeze):
      //   • string → re-voice (in the Loud Room, mapped from this clause's word);
      //   • false  → in the Loud Room but no source word (English escape) → leave
      //              the English echo;
      //   • null   → a doubled-word line OUTSIDE the Loud Room → fall through to
      //              the normal translation path below (not hijacked — review I3).
      if (isLoudEchoShape(en)) {
        const d = echoDecision(l, en, view.status?.location, echoMap)
        if (typeof d === 'string')
          return { ...l, text: indent + `${d} ${d} ...` }
        if (d === false) return l
      }
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
  }, [view.lines, view.status?.location, corpus, overlay, lang, echoMap])

  const status: StatusLine | null = useMemo(() => {
    if (!corpus || lang === null || view.status === null) return view.status
    return translateStatus(view.status, corpus, lang).status
  }, [view.status, corpus, lang])

  return { lines, status }
}
