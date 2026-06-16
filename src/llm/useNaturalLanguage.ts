import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CapabilityResult,
  LlmEngine,
  NlLanguage,
  NlState,
  ViewContext,
} from './types'
import { EngineGate } from '../shared/engineGate'
import type { ViewState, TurnResult } from '../glkote-react/types'
import type { Vocab } from './grammar/types'
import type { SceneEvent } from './scene/types'
import { TextSceneTracker } from './scene/tracker'
import { buildGrammar } from './grammar/buildGrammar'
import { viewToContext } from './prompt'
import { coreLexicon, nounLexicon, lexiconWordSet } from './lexicon/index'
import type { LexLang } from './lexicon/types'
import { useModelDownload } from './useModelDownload'
import {
  createGenerateRaw,
  createTranslate,
  type LiveState,
  type QueuedLine,
} from './translatePipeline'

export type { QueuedLine }

export interface UseNaturalLanguageArgs {
  engine: LlmEngine
  capability: CapabilityResult
  vocab: Vocab | null
  getContext: () => ViewContext
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
  /** Record a (canonical command → player's own source words) pair for the output
   * overlay's Loud Room input-echo re-voicing (loudEcho / UAT F6). Optional. */
  recordEcho?: (canonical: string, source: string) => void
  awaitTurn: () => Promise<TurnResult>
  watchdogMs: number
  /** Story signature of the running game — selects the per-game noun lexicon
   * for the active non-English language (spec §5.2). */
  signature: string
  /** Shared engine gate (output-translation spec §6). Optional so existing
   * tests need no change; Terminal passes ONE instance shared with the
   * output-translation hook. Input work runs at 'input' priority. */
  gate?: EngineGate
}

export interface UseNaturalLanguage {
  state: NlState
  pending: boolean
  notice: string | null
  modalOpen: boolean
  /** Pick a language ('off' disables the layer). Sticky via writeNlPref. */
  setLanguage: (lang: NlLanguage) => void
  requestDownload: () => void
  declineDownload: () => void
  cancelDownload: () => void
  translate: (english: string) => Promise<void>
  /** Lines typed while a translation was in flight, waiting FIFO (F-A).
   * Rendered dimmed with a 'queued' chip; drained one at a time. */
  queued: QueuedLine[]
  /** Feed a turn-boundary ViewState to the scene tracker (once per turn). */
  observe: (view: ViewState) => void
  /** True while a compound sequence is mid-flight (Terminal's observe effect defers to the hook). */
  isSequencing: () => boolean
}

/**
 * The natural-language input layer. This hook is the ORCHESTRATOR (F-1): it owns
 * React state/refs, the scene-tracker lifecycle, the derived memos
 * (state/lex/grammar/liveRef), and the public `observe`/`isSequencing` seams.
 * The translation machinery itself lives in two siblings: the model download /
 * install / preference lifecycle in useModelDownload (F-2), and the per-clause
 * pipeline + F-A drain in translatePipeline (F-1, createGenerateRaw/
 * createTranslate).
 *
 * NOTE (F-18): the hook is effectful beyond its return value. The download
 * effects are owned by useModelDownload; createTranslate additionally drives the
 * game via the injected `echoLocal`/`sendLine` callbacks, runs gate-held GPU
 * generations (generateRaw), and mutates the scene tracker per observed turn —
 * none of which is evident from the returned `state`/`queued`/etc.
 */
export function useNaturalLanguage(
  args: UseNaturalLanguageArgs,
): UseNaturalLanguage {
  const {
    engine,
    capability,
    vocab,
    getContext,
    echoLocal,
    sendLine,
    recordEcho,
    awaitTurn,
    watchdogMs,
    signature,
    gate: gateArg,
  } = args
  // One stable fallback gate when the caller doesn't supply a shared one.
  const [fallbackGate] = useState(() => new EngineGate())
  const engineGate = gateArg ?? fallbackGate
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // Guards against a second translate running concurrently; a line that arrives
  // while this is set QUEUES instead (F-A). A ref (vs. `pending` state) closes
  // the same-tick window synchronously.
  const translatingRef = useRef(false)
  // F-A input queue: ref is the source of truth (the drain mutates it inside an
  // async loop); `queued` mirrors it into render state for the Terminal.
  const queueRef = useRef<QueuedLine[]>([])
  const queueIdRef = useRef(0)
  const [queued, setQueued] = useState<QueuedLine[]>([])
  const syncQueue = useCallback(() => setQueued([...queueRef.current]), [])
  // The canonical command we last sent (for take/drop/acted-object attribution).
  // Set when translate emits a command; stays null through an abstain / raw send.
  const lastCommandRef = useRef<string | null>(null)
  // True for the duration of a compound sequence so Terminal's view-driven observe
  // effect defers to the hook's in-order, per-clause observes (locked decision 9).
  const inSequenceRef = useRef(false)

  const available = capability.tier !== 'none'
  const hasVocab = vocab !== null

  // The model download / install / phase lifecycle lives in its own hook (F-2):
  // it owns `internal` (the phase machine), the installed/modal flags, the
  // download refs, the on-disk cache probe, and the four player actions. The
  // shared `notice` channel stays here and is passed in.
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
  // requestUpgrade / demoteToGrammar are wired to the UI in Task 5;
  // suppress unused-variable lint until then.
  void requestUpgrade
  void demoteToGrammar

  // Own a scene tracker; rebuild + reset when the game (vocab) changes.
  const trackerRef = useRef<TextSceneTracker | null>(null)
  // [O] Story-switch epoch: bumped whenever the game (vocab) changes. An
  // in-flight drain compares it between sends — its translations and queued
  // lines were typed at the OLD game and must not fire into the new one.
  const epochRef = useRef(0)
  useEffect(() => {
    trackerRef.current = vocab ? new TextSceneTracker(vocab) : null
    lastCommandRef.current = null
    epochRef.current++
  }, [vocab])

  const state: NlState = useMemo(() => {
    if (!available) return { phase: 'unavailable', reasons: capability.reasons }
    if (!hasVocab) return { phase: 'disabled' } // silent: this game has no vocab
    if (internal.phase === 'downloading')
      return {
        phase: 'downloading',
        loaded: internal.loaded,
        total: internal.total,
        etaSeconds: internal.etaSeconds,
      }
    if (internal.phase === 'on')
      return { phase: 'on', language: internal.language }
    return { phase: 'off', installed }
  }, [available, hasVocab, capability.reasons, internal, installed])

  // The active picker language ('off' while the layer is off/downloading) and,
  // for non-English languages, the deterministic lexicons keyed by (language,
  // story signature). `lex` is null for en/off: stage 6 is skipped and stage 4
  // needs no collision guard (spec §4). nouns may be null for an unknown
  // signature — the core stages (alias, collision guard) still apply.
  const language: NlLanguage =
    internal.phase === 'on' ? internal.language : 'off'
  const lex = useMemo(() => {
    if (language !== 'fr' && language !== 'de' && language !== 'es') return null
    const lang: LexLang = language
    return {
      core: coreLexicon(lang),
      nouns: nounLexicon(lang, signature),
      words: lexiconWordSet(lang, signature),
    }
  }, [language, signature])

  // The GBNF grammar is a pure function of the FULL vocab (NL v2 §7) — build it
  // once per game instead of once per LLM clause (Task 21 review).
  const grammar = useMemo(() => (vocab ? buildGrammar(vocab) : null), [vocab])

  // [N] Live drain guard: the drain loop runs inside ONE translate closure
  // but outlives renders — picker changes (language, off) land in state the
  // closure snapshotted at its creation. The ref always carries the freshest
  // phase/language/lexicons; the drain re-reads it at every line boundary.
  // Synced in an effect (not during render) per react-hooks/refs.
  const liveRef = useRef<LiveState>({ internal, lex })
  useEffect(() => {
    liveRef.current = { internal, lex }
  })

  // One bounded inference: lazy-load the model if needed, then race generate()
  // against a watchdog. Owned by translatePipeline (F-1); rebuilt only when the
  // engine, watchdog, or gate changes.
  const generateRaw = useMemo(
    () => createGenerateRaw({ engine, watchdogMs, engineGate }),
    [engine, watchdogMs, engineGate],
  )

  // The full input pipeline (stages 1–8) + the F-A drain, owned by
  // translatePipeline (F-1). The factory closes over the SAME refs/setters the
  // hook holds, so it mutates live state. Built INSIDE the callback (not a
  // render-time memo) so the refs are read at call time, not during render
  // (react-hooks/refs) — a fresh translator per submit is correct anyway: each
  // translate call already builds its own turnBox/raceTurn closures. `lex` is
  // deliberately NOT a dep: the drain reads it (and the phase/language) per line
  // through liveRef ([N]), so a picker change needn't recreate translate.
  const translate = useCallback(
    (english: string) =>
      createTranslate({
        internal,
        vocab,
        grammar,
        generateRaw,
        watchdogMs,
        getContext,
        echoLocal,
        sendLine,
        recordEcho,
        awaitTurn,
        trackerRef,
        translatingRef,
        queueRef,
        queueIdRef,
        lastCommandRef,
        inSequenceRef,
        epochRef,
        liveRef,
        setPending,
        setNotice,
        syncQueue,
      })(english),
    [
      internal,
      vocab,
      grammar,
      generateRaw,
      watchdogMs,
      getContext,
      echoLocal,
      sendLine,
      recordEcho,
      awaitTurn,
      syncQueue,
    ],
  )

  // Fire once per turn (Terminal gates on the line-input boundary). Builds a
  // SceneEvent from the live view + the latched last command, then clears the
  // latch so a duplicate observe of the same view is a no-op (reduceScene is
  // idempotent too). Derives the event from the passed `view`, not getContext()
  // (which reads a possibly-stale ref).
  const observe = useCallback((view: ViewState) => {
    const tracker = trackerRef.current
    if (!tracker) return
    const vc = viewToContext(view)
    const event: SceneEvent = {
      location: vc.location,
      outputText: vc.recentOutput,
      lastCommand: lastCommandRef.current,
    }
    tracker.observe(event)
    lastCommandRef.current = null
  }, [])

  const isSequencing = useCallback(() => inSequenceRef.current, [])

  return {
    state,
    pending,
    notice,
    modalOpen,
    setLanguage,
    requestDownload,
    declineDownload,
    cancelDownload,
    translate,
    queued,
    observe,
    isSequencing,
  }
}
