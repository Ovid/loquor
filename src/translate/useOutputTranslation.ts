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
import { normalize, splitIndent } from './normalize'
import { translateStatus } from './statusTranslate'
import { cacheGet, cacheSet } from './fallbackCache'
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

export function useOutputTranslation(args: {
  view: ViewState
  language: NlLanguage
  signature: string
  engine: LlmEngine
  gate: EngineGate
  /** Tests inject a corpus directly; production resolves via corpusFor. */
  corpusOverride?: TranslationCorpus
}): OutputTranslation {
  const { view, language, signature, engine, gate, corpusOverride } = args

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
    map: ReadonlyMap<number, Resolution>
  }>(() => ({ for: null, map: new Map() }))
  // The EN text each overlay/in-flight entry was computed from — an append
  // merge changes the text and must invalidate the entry (spec §3).
  const basisRef = useRef<Map<number, string>>(new Map())
  // Ids on screen when the corpus ACTIVATED (language picked / restore
  // rebuild): the backlog (spec §3). Misses there stay English.
  const backlogRef = useRef<Set<number>>(new Set())
  const loggedBacklogRef = useRef<Set<number>>(new Set())
  const lastStatusMissRef = useRef<string | null>(null)
  // Stale-async guard: bumped on corpus identity change.
  const epochRef = useRef(0)

  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    installMissDump()
  }, [])

  // Corpus (re)activation: snapshot the backlog, reset all per-corpus state.
  // (The overlay needs no reset here — render drops a map tagged with another
  // corpus, and settle() rebuilds it under the new tag.)
  useEffect(() => {
    epochRef.current++
    backlogRef.current = new Set(viewRef.current.lines.map(l => l.id))
    loggedBacklogRef.current = new Set()
    basisRef.current = new Map()
    lastStatusMissRef.current = null
  }, [corpus])

  // Async fallback for live misses (and miss logging for backlog/status).
  useEffect(() => {
    if (!corpus || lang === null) return
    const epoch = epochRef.current
    // Turn context for the miss log (spec §6): the status line at miss time.
    const ctx = view.status
      ? normalize(`${view.status.location} — ${view.status.right}`)
      : undefined

    const put = (id: number, value: Resolution) =>
      setOverlay(prev => ({
        for: corpus,
        map:
          prev.for === corpus
            ? new Map(prev.map).set(id, value)
            : new Map([[id, value]]),
      }))

    const settle = (id: number, en: string, value: Resolution) => {
      if (epochRef.current !== epoch) return // language/story switched mid-flight
      if (basisRef.current.get(id) !== en) return // append merge superseded us
      put(id, value)
    }

    const resolve = async (id: number, en: string) => {
      try {
        const cached = await cacheGet(signature, lang, en)
        if (cached !== undefined) {
          settle(id, en, cached)
          return
        }
        logMiss({ en, game: signature, language: lang, kind: 'line', ctx })
        if (!engine.isLoaded()) {
          // Spec §6 failure path: model absent/still loading → English now.
          settle(id, en, 'english')
          return
        }
        const text = await gate.run('output', async () => {
          // Queued generations ABANDON on a language/story switch (spec §3/§6):
          // the epoch moved on while we waited for the gate — don't burn GPU
          // on a result nobody will render. (The throw lands in the outer
          // catch; settle() there is an epoch-guarded no-op.)
          if (epochRef.current !== epoch) throw new Error('xlate abandoned')
          const ac = new AbortController()
          let watchdogId: ReturnType<typeof setTimeout>
          const watchdog = new Promise<never>((_, rej) => {
            watchdogId = setTimeout(() => {
              rej(new Error('xlate watchdog'))
              ac.abort()
            }, XLATE_WATCHDOG_MS)
          })
          try {
            return await Promise.race([
              engine.generate(xlPrompt(en, lang), null, ac.signal),
              watchdog,
            ])
          } finally {
            clearTimeout(watchdogId!)
          }
        })
        const out = normalize(text)
        if (out === '') throw new Error('empty translation')
        settle(id, en, out)
        await cacheSet(signature, lang, en, out)
      } catch {
        settle(id, en, 'english')
      }
    }

    for (const l of view.lines) {
      if (l.kind !== 'output' && l.kind !== 'room') continue
      const en = normalize(splitIndent(l.text).body)
      if (en === '') continue
      if (matchLine(corpus, en) !== null) continue
      if (backlogRef.current.has(l.id)) {
        if (!loggedBacklogRef.current.has(l.id)) {
          loggedBacklogRef.current.add(l.id)
          logMiss({ en, game: signature, language: lang, kind: 'backlog', ctx })
          // Backlog rule (spec §3): matcher + CACHE hits only. A fallback
          // translation cached in an earlier session still applies after a
          // restore rebuild — no shimmer, no generation either way.
          basisRef.current.set(l.id, en)
          void cacheGet(signature, lang, en).then(cached => {
            if (cached !== undefined) settle(l.id, en, cached)
          })
        }
        continue
      }
      if (basisRef.current.get(l.id) === en) continue // already handled this text
      basisRef.current.set(l.id, en)
      put(l.id, 'pending')
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
  }, [view, corpus, lang, signature, engine, gate])

  const lines: DisplayLine[] = useMemo(() => {
    if (!corpus || lang === null) return view.lines
    // A map built against another corpus is stale — ignore it wholesale.
    const resolved = overlay.for === corpus ? overlay.map : null
    return view.lines.map(l => {
      if (l.kind !== 'output' && l.kind !== 'room') return l
      const { indent, body } = splitIndent(l.text)
      const en = normalize(body)
      if (en === '') return l
      const hit = matchLine(corpus, en)
      if (hit !== null) return { ...l, text: indent + hit }
      const o = resolved?.get(l.id)
      if (o === 'pending')
        return { ...l, text: indent + shimmerLabel(lang), pending: true }
      if (o !== undefined && o !== 'english') return { ...l, text: indent + o }
      return l // backlog miss or failure → English
    })
  }, [view.lines, corpus, overlay, lang])

  const status: StatusLine | null = useMemo(() => {
    if (!corpus || lang === null || view.status === null) return view.status
    return translateStatus(view.status, corpus, lang).status
  }, [view.status, corpus, lang])

  return { lines, status }
}
