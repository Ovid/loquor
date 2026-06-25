import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActiveLanguage,
  CapabilityResult,
  LlmEngine,
  NlLanguage,
  NlState,
  ViewContext,
} from './types'
import { OUTPUT_ONLY_LANGS } from './types'
import { helpResponse, helpResponseTypeEnglish } from './help'
import { EngineGate } from '../shared/engineGate'
import type { ViewState, TurnResult } from '../glkote-react/types'
import type { Vocab } from './grammar/types'
import type { SceneEvent } from './scene/types'
import { TextSceneTracker } from './scene/tracker'
import { buildGrammar } from './grammar/buildGrammar'
import { viewToContext } from './prompt'
import {
  coreLexicon,
  nounLexicon,
  lexiconWordSet,
  kaInputActive,
} from './lexicon/index'
import type { InputLexLang } from './lexicon/types'
import { useModelDownload } from './useModelDownload'
import type { Internal } from './useModelDownload'
import {
  createGenerateRaw,
  createTranslate,
  type LiveState,
  type QueuedLine,
} from './translatePipeline'
import { makeActivationNotice } from './notices'

export type { QueuedLine }

export interface UseNaturalLanguageArgs {
  engine: LlmEngine
  capability: CapabilityResult
  vocab: Vocab | null
  getContext: () => ViewContext
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
  sendCanonical: (text: string) => void
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
  /** LLM-feature preference (default true so existing callers/tests are
   * unchanged). When false the effective model is forced to 'grammar' at every
   * read, so the input pipeline never reaches the LLM stage and the engine never
   * lazy-loads — even if a cached model promoted `internal.model` to 'full'. */
  llmEnabled?: boolean
}

export interface UseNaturalLanguage {
  state: NlState
  pending: boolean
  notice: string | null
  /** A dedicated one-shot, polite live-region message for OUTPUT-ONLY languages
   * (ka): the must-read "type in English" activation tip, announced once on
   * entry via the makeActivationNotice latch. Kept SEPARATE from `notice` so a
   * help/abstain reply in the inline region can't clobber it (spec finding [6]).
   * LIFECYCLE: set once per language per session by the latch; NOT cleared on
   * switch-away and NOT re-announced on re-entry (the 3ac3508 once-per-session
   * contract). Terminal gates the live region on `outLang === 'ka'`, so a stale
   * value can never render under another language. */
  announce: string | null
  modalOpen: boolean
  /** Pick a language ('off' disables the layer). Sticky via writeNlPref. */
  setLanguage: (lang: NlLanguage) => void
  requestDownload: () => void
  /** Open the upgrade modal on demand (picker "✦ improve" / "try the model anyway"). */
  requestUpgrade: () => void
  declineDownload: () => void
  cancelDownload: () => void
  /** Resolves to the typed line when it was a non-English submission that sent
   * NOTHING (abstain/timeout/failure), so the caller can restore it to the
   * field instead of discarding it (M8); null when the line was consumed. */
  translate: (english: string) => Promise<string | null>
  /** Lines typed while a translation was in flight, waiting FIFO (F-A).
   * Rendered dimmed with a 'queued' chip; drained one at a time. */
  queued: QueuedLine[]
  /** Feed a turn-boundary ViewState to the scene tracker (once per turn). */
  observe: (view: ViewState) => void
  /** True while a compound sequence is mid-flight (Terminal's observe effect defers to the hook). */
  isSequencing: () => boolean
  /** Surface the localized help block via the shared `notice` aria-live seam.
   * Drives the Loquor-level help intercept for the OUTPUT-ONLY raw-send path
   * (ka on a no-lexicon Zork II/III game), which raw-sends English and so never
   * reaches the in-pipeline help intercept (translatePipeline). For ka this is
   * the type-English help block (it raw-sends English there, so its help must say
   * "type in English"), NOT the Phase-2 "type Georgian" `helpResponse('ka')`.
   * en/fr/de/es get help from inside translate instead and never reach here. */
  showHelp: (lang: ActiveLanguage) => void
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
    sendCanonical,
    recordEcho,
    awaitTurn,
    watchdogMs,
    signature,
    gate: gateArg,
    llmEnabled = true,
  } = args
  // One stable fallback gate when the caller doesn't supply a shared one.
  const [fallbackGate] = useState(() => new EngineGate())
  const engineGate = gateArg ?? fallbackGate
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [announce, setAnnounce] = useState<string | null>(null)
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

  // First-abstain education fires once per grammar-only STINT. Reset on each
  // entry into grammar-only — a fresh non-loaded-language pick, a language switch
  // while grammar, or a full→grammar demotion (spec §UI/notices).
  const educatedRef = useRef(false)
  const prevGrammarKeyRef = useRef<string | null>(null)

  // One-time escape-hatch nudge per language (P3): fires the moment a language is
  // first activated, pointing fr/de/es at the quoted-English fallback (ka at
  // "type in English"). The latch is per-language and survives re-renders/re-picks
  // of the same language; English is silent (it raw-sends).
  const activationNoticeRef = useRef(makeActivationNotice())
  const prevActiveLangRef = useRef<NlLanguage | null>(null)

  const hasVocab = vocab !== null
  // Capability no longer disables NL (hasVocab is the sole prerequisite); it only
  // gates whether the model UPGRADE may be ATTEMPTED. A `none` device still gets
  // grammar-only play and the override path.
  const canUpgrade = capability.tier !== 'none'

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

  // Reset the first-abstain education latch on each ENTRY into grammar-only: a
  // fresh non-loaded-language pick, a language switch while grammar, or a
  // full→grammar demotion. The key is the active grammar-only language (null
  // when not grammar-only), so re-entering grammar-only — even on the same
  // language after a full stint — re-arms the once-per-stint education.
  useEffect(() => {
    const key =
      internal.phase === 'on' && internal.model === 'grammar'
        ? internal.language
        : null
    if (key !== null && key !== prevGrammarKeyRef.current)
      educatedRef.current = false
    prevGrammarKeyRef.current = key
  }, [internal])

  // Surface the one-time escape-hatch nudge on entry into an active language. Fire
  // only on a genuine language CHANGE (not every render of the same active
  // language), and let the per-language latch decide whether this language was
  // already nudged. Downloading/off phases carry no active language, so picking a
  // language, switching, or coming back up from a download all funnel through here.
  useEffect(() => {
    const active: NlLanguage =
      internal.phase === 'on' ? internal.language : 'off'
    if (active === prevActiveLangRef.current) return
    // Defer while the upgrade modal is open (I4): picking a non-cached language
    // activates grammar-only ('on') AND opens the modal in the same tick, but
    // accepting the upgrade calls requestDownload → setNotice(null), which would
    // wipe the nudge before the player reads it (and the per-language latch would
    // never re-fire). Leave prevActiveLangRef unset so this re-runs once the modal
    // resolves — decline keeps grammar 'on', accept settles to full 'on' — and
    // the nudge fires then. (No modal at all → fires immediately, as before.)
    if (modalOpen) return
    // [I2] ka's tip is selected by kaInputActive(active, signature) — Phase-2
    // (Georgian-input) on Zork I vs Phase-1 (type-English) on a no-lexicon game —
    // but `signature` starts '' and resolves ASYNC, independently of the cache
    // probe that boot-restores a stored ka preference. Latching while signature===''
    // would pin the WRONG Phase-1 "type in English" tip for a returning ka player
    // on Zork I, and the once-per-language latch is then spent when the signature
    // resolves. Defer (leave prevActiveLangRef UNSET so a signature change re-runs
    // this effect — signature is already a dep) until it's known. ka-only: fr/de/es
    // tips don't depend on the signature, so they still fire immediately.
    if (active === 'ka' && signature === '') return
    prevActiveLangRef.current = active
    if (active === 'off') return
    // `kaInput` is read per-fire (not baked into the latch): the ka activation
    // tip is Phase-2 (Georgian-input) on Zork I and Phase-1 (type-English) on a
    // no-lexicon game. `signature` is a dep so a late-resolving signature is seen,
    // but the `active === prevActiveLangRef` guard above means a signature change
    // alone (same language) won't re-fire the once-per-language nudge.
    const msg = activationNoticeRef.current(
      active,
      kaInputActive(active, signature),
    )
    // OUTPUT-ONLY languages (ka) route their must-read tip to the dedicated
    // one-shot `announce` live region; input languages keep the inline notice.
    if (msg) {
      if (OUTPUT_ONLY_LANGS.has(active)) setAnnounce(msg)
      else setNotice(msg)
    }
  }, [internal, modalOpen, signature])

  const state: NlState = useMemo(() => {
    if (!hasVocab) return { phase: 'disabled' } // silent: this game has no vocab
    if (internal.phase === 'downloading')
      return {
        phase: 'downloading',
        language: internal.language,
        loaded: internal.loaded,
        total: internal.total,
        etaSeconds: internal.etaSeconds,
      }
    if (internal.phase === 'on')
      return {
        phase: 'on',
        language: internal.language,
        model: llmEnabled ? internal.model : 'grammar',
        canUpgrade,
      }
    return { phase: 'off', installed, canUpgrade }
  }, [hasVocab, canUpgrade, internal, installed, llmEnabled])

  // The active picker language ('off' while the layer is off/downloading) and,
  // for non-English languages, the deterministic lexicons keyed by (language,
  // story signature). `lex` is null for en/off: stage 6 is skipped and stage 4
  // needs no collision guard (spec §4). nouns may be null for an unknown
  // signature — the core stages (alias, collision guard) still apply.
  const language: NlLanguage =
    internal.phase === 'on' ? internal.language : 'off'
  const lex = useMemo(() => {
    // fr/de/es always have an input lexicon; ka only on a game that has one
    // (Zork I — kaInputActive, spec §5.6). en/off get no lexicon.
    if (
      !kaInputActive(language, signature) &&
      language !== 'fr' &&
      language !== 'de' &&
      language !== 'es'
    )
      return null
    const lang: InputLexLang = language as InputLexLang
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
  const liveRef = useRef<LiveState>({ internal, lex, llmEnabled })
  useEffect(() => {
    // effectiveModel: when the feature is hidden, the live input pipeline must
    // see grammar-only regardless of internal.model (a cached model may say
    // 'full'). Forcing it here makes runLine's grammarOnly true → stage 7 skips
    // the engine → no lazy-load. `llmEnabled` is also carried so stage 8 can
    // suppress the upgrade-pitch notice.
    const liveInternal: Internal =
      !llmEnabled && internal.phase === 'on'
        ? { ...internal, model: 'grammar' }
        : internal
    liveRef.current = { internal: liveInternal, lex, llmEnabled }
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
        sendCanonical,
        recordEcho,
        awaitTurn,
        refs: {
          trackerRef,
          translatingRef,
          queueRef,
          queueIdRef,
          lastCommandRef,
          inSequenceRef,
          epochRef,
          liveRef,
          educatedRef,
        },
        demote: demoteToGrammar,
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
      sendCanonical,
      recordEcho,
      awaitTurn,
      demoteToGrammar,
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

  // The localized help block reuses the same `notice` channel the abstain /
  // activation notices use (one aria-live region). Centralizing it here lets the
  // OUTPUT-ONLY raw-send path (ka, which never calls translate) show help too.
  const showHelp = useCallback(
    // Reached ONLY via Terminal's kaRawSend (no-lexicon Zork II/III) path: ka there
    // raw-sends English, so its help is the type-English block — helpResponse('ka')
    // is the Phase-2 "type Georgian" help, wrong on a raw-send game. (en/fr/de/es get
    // help from inside translate and never reach here; the branch is defensive.)
    (lang: ActiveLanguage) =>
      setNotice(lang === 'ka' ? helpResponseTypeEnglish() : helpResponse(lang)),
    [],
  )

  return {
    state,
    pending,
    notice,
    announce,
    modalOpen,
    setLanguage,
    requestDownload,
    requestUpgrade,
    declineDownload,
    cancelDownload,
    translate,
    queued,
    observe,
    isSequencing,
    showHelp,
  }
}
