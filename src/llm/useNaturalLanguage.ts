import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActiveLanguage,
  CapabilityResult,
  ChatMessages,
  LlmEngine,
  NlLanguage,
  NlState,
  PromptContext,
  TranslateResult,
  ViewContext,
} from './types'
import { EngineGate } from './engineGate'
import type { ViewState, TurnResult } from '../glkote-react/types'
import type { Vocab } from './grammar/types'
import type { Scene, SceneEvent } from './scene/types'
import { TextSceneTracker } from './scene/tracker'
import { buildGrammar } from './grammar/buildGrammar'
import { buildPrompt, viewToContext } from './prompt'
import {
  parseCommand,
  isMetaCommand,
  metaAlias,
  isConfirmationPrompt,
  isDisambiguationPrompt,
  splitClauses,
  clauseFailed,
  unquote,
  isVocabPassthrough,
} from './translate'
import { coreLexicon, nounLexicon, lexiconWordSet } from './lexicon/index'
import { parseLexicon } from './lexicon/parse'
import type { LexLang } from './lexicon/types'
import { parseDirection } from './directions'
import { pct as toPct, estimateRemainingSeconds } from './progress'
import type { ProgressSample } from './progress'
import { readNlPref, writeNlPref } from './nlpref'

export interface UseNaturalLanguageArgs {
  engine: LlmEngine
  capability: CapabilityResult
  vocab: Vocab | null
  getContext: () => ViewContext
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
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

/** A line waiting in the F-A queue. `id` is monotonic and never reused — the
 * Terminal keys queued rows on it, and the queue drains from the FRONT
 * (shift), so an index key would re-point a DOM node at a different line. */
export interface QueuedLine {
  id: number
  text: string
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

type Internal =
  | { phase: 'off' }
  | {
      phase: 'downloading'
      loaded: number
      total: number
      etaSeconds: number | null
    }
  | { phase: 'on'; language: ActiveLanguage }

/**
 * Watchdog-timeout sentinel — distinguishes a translation timeout from a genuine
 * generate error without sniffing `err.message` (review S5). Both still fall back
 * to raw pass-through; only the player-facing notice text differs.
 */
class WatchdogTimeout extends Error {
  constructor() {
    super('watchdog')
    this.name = 'WatchdogTimeout'
  }
}

/** Safety cap: at most this many clauses run per compound input (locked decision 6). */
const MAX_CLAUSES = 8

/** F-A input queue (NL v2 §11): at most this many lines wait behind an
 * in-flight translation. Overflow drops the NEWEST line with a notice. */
const QUEUE_CAP = 4

/** Watchdog for the LAZY model load inside generateRaw ([M]) — much more
 * generous than the generate watchdog (multi-GB weights off disk on slow
 * devices), but bounded: an unbounded load held translatingRef forever when
 * it stalled (WebGPU init, cache eviction → network), wedging all input for
 * the session. */
const LOAD_WATCHDOG_MS = 60_000

/** Which pipeline stage produced a clause's command (spec §4 stages 3–7). */
type Stage = 'meta' | 'alias' | 'vocab' | 'direction' | 'lexicon' | 'llm'

/** Stages whose output DIFFERS from the player's typed words: these echo the
 * original input once as a UI-only nl-source line. Passthrough stages ('meta',
 * 'alias', 'vocab') send the player's own words (or a fixed canonical), so the
 * transcript needs no echo — today's contract, kept per stage. */
const TRANSLATED_STAGES: ReadonlySet<Stage> = new Set([
  'direction',
  'lexicon',
  'llm',
])

/** TEMP [nl debug] diagnostics, dev browser only — release builds must not spam
 * the console or leak player input (review), and test runs stay quiet so real
 * problems stand out. Remove with the call sites once translation quality is
 * tuned. */
function nlDebug(...debugArgs: unknown[]): void {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test')
    console.log(...debugArgs)
}

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
    awaitTurn,
    watchdogMs,
    signature,
    gate: gateArg,
  } = args
  // One stable fallback gate when the caller doesn't supply a shared one.
  const [fallbackGate] = useState(() => new EngineGate())
  const engineGate = gateArg ?? fallbackGate
  const [internal, setInternal] = useState<Internal>({ phase: 'off' })
  const [installed, setInstalled] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  // Guards against a second translate running concurrently; a line that arrives
  // while this is set QUEUES instead (F-A). A ref (vs. `pending` state) closes
  // the same-tick window synchronously.
  const translatingRef = useRef(false)
  // F-A input queue: ref is the source of truth (translate mutates it inside an
  // async drain); `queued` mirrors it into render state for the Terminal.
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
  // (percent, time) samples for the active download, used to estimate the time
  // remaining. Reset at the start of each requestDownload; sampled in its progress
  // callback (a side-effect context — keeps the timing out of render).
  const dlSamplesRef = useRef<ProgressSample[]>([])
  // The language the player picked when the model wasn't cached yet — the
  // download modal flow activates THIS language once the load resolves.
  const pendingLangRef = useRef<ActiveLanguage>('en')

  const available = capability.tier !== 'none'
  const hasVocab = vocab !== null

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

  // Probe the ON-DISK cache (survives reloads) for the installed/not-installed
  // distinction — distinct from isLoaded() (in-memory, this session only) — and,
  // in the same async callback, restore the player's prior language choice once
  // the model is known cached. (Don't auto-enable against an uncached model — that
  // would re-prompt.) Doing this in the async callback (not synchronously in the
  // effect body) avoids react-hooks/set-state-in-effect while preserving behavior.
  //
  // Depends on [engine] only (review S6): re-running on every phase change just
  // re-probed redundantly. A successful download sets `installed` directly (below),
  // and the functional setInternal flips on only when currently off — so we never
  // need internal.phase as a dep.
  useEffect(() => {
    let cancelled = false
    engine
      .isCached()
      .then(c => {
        if (cancelled) return
        const cached = c || engine.isLoaded()
        setInstalled(cached)
        const pref = readNlPref()
        if (cached && pref.language !== 'off') {
          const lang = pref.language // narrowed to ActiveLanguage; survives the closure
          setInternal(prev =>
            prev.phase === 'off' ? { phase: 'on', language: lang } : prev,
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [engine])

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
  const liveRef = useRef<{ internal: Internal; lex: typeof lex }>({
    internal,
    lex,
  })
  useEffect(() => {
    liveRef.current = { internal, lex }
  })

  const requestDownload = useCallback(() => {
    setNotice(null)
    setModalOpen(false)
    // Abort any previous in-flight download FIRST ([L2]): re-picking a
    // language must not stack a second concurrent engine.load on top of the
    // old one (double VRAM on exactly the devices the capability gate
    // worries about). The engine releases the loser's resources.
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    dlSamplesRef.current = []
    setInternal({ phase: 'downloading', loaded: 0, total: 0, etaSeconds: null })
    // True once this load is no longer the active one — aborted (cancel) or
    // superseded by a newer requestDownload. A load that resolves on/around the
    // abort tick must NOT flip the state back to 'on' or persist a language against
    // the player's cancel (review I2).
    const stale = () => ac.signal.aborted || abortRef.current !== ac
    engine
      .load(p => {
        if (stale()) return
        dlSamplesRef.current = [
          ...dlSamplesRef.current,
          { pct: toPct(p.loaded, p.total), t: Date.now() },
        ].slice(-60)
        setInternal({
          phase: 'downloading',
          loaded: p.loaded,
          total: p.total,
          etaSeconds: estimateRemainingSeconds(dlSamplesRef.current),
        })
      }, ac.signal)
      .then(() => {
        if (stale()) return
        // The model is now loaded (hence cached) — mark installed directly so the
        // probe effect needn't re-run on the phase change to discover it (S6).
        setInstalled(true)
        // Activate the language the player picked when they triggered the modal.
        setInternal({ phase: 'on', language: pendingLangRef.current })
        writeNlPref({ language: pendingLangRef.current })
      })
      .catch(err => {
        if (stale() || (err as Error).name === 'AbortError') {
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
    // [P] Persist 'off' too: a cancel racing download COMPLETION (the load's
    // .then already wrote the picked language) must not leave a pref that
    // self-enables NL next session against an explicit cancel.
    writeNlPref({ language: 'off' })
  }, [])

  const declineDownload = useCallback(() => {
    setModalOpen(false)
    setInternal({ phase: 'off' })
    // Reset `language` alongside `declined`: an explicit "Not now" must not leave
    // a stale active language that the isCached effect later auto-restores to 'on'
    // once the model happens to be cached (review inline comment).
    writeNlPref({ declined: true, language: 'off' })
  }, [])

  const setLanguage = useCallback(
    (lang: NlLanguage) => {
      if (!available || !hasVocab) return
      if (lang === 'off') {
        setInternal({ phase: 'off' }) // off is instant; model stays cached
        writeNlPref({ language: 'off' })
        return
      }
      if (installed || engine.isLoaded()) {
        setInternal({ phase: 'on', language: lang }) // cached → no re-download
        writeNlPref({ language: lang })
      } else {
        // No model yet: remember the choice and ask permission to download.
        // requestDownload activates pendingLangRef.current once the load lands.
        pendingLangRef.current = lang
        setModalOpen(true)
      }
    },
    [available, hasVocab, installed, engine],
  )

  // One bounded inference: load the model if it isn't resident yet, then race
  // generate() against a watchdog. Throws WatchdogTimeout on timeout (aborting the
  // orphaned generate) or the underlying error on failure. Shared by the single-
  // command path and the per-clause compound loop.
  const generateRaw = useCallback(
    (messages: ChatMessages, grammar: string): Promise<string> =>
      // The watchdogs start INSIDE the gate: time spent queued behind an
      // output-translation generation must not burn the input watchdog.
      engineGate.run('input', async () => {
        const ac = new AbortController()
        let watchdogId: ReturnType<typeof setTimeout>
        let gen: Promise<string> | undefined
        try {
          if (!engine.isLoaded()) {
            // [M] Bound the lazy load (reload session, model cached on disk but
            // not in memory) with its own generous watchdog — see
            // LOAD_WATCHDOG_MS. Same reject-then-abort ordering as the
            // generate watchdog below.
            let loadId: ReturnType<typeof setTimeout>
            const loadWatchdog = new Promise<never>((_, rej) => {
              loadId = setTimeout(() => {
                rej(new WatchdogTimeout())
                ac.abort()
              }, LOAD_WATCHDOG_MS)
            })
            try {
              await Promise.race([
                engine.load(() => {}, ac.signal),
                loadWatchdog,
              ])
            } finally {
              clearTimeout(loadId!)
            }
          }
          const watchdog = new Promise<never>((_, rej) => {
            watchdogId = setTimeout(() => {
              // Reject FIRST so the watchdog wins the race (keeping the "timed out"
              // notice accurate), THEN abort the now-orphaned generate.
              rej(new WatchdogTimeout())
              ac.abort()
            }, watchdogMs)
          })
          gen = engine.generate(messages, grammar, ac.signal)
          return await Promise.race([gen, watchdog])
        } finally {
          clearTimeout(watchdogId!)
          // On a watchdog timeout the orphaned generate is still interrupting
          // the single shared engine; ac.abort() only requests the stop. Hold
          // the gate until it settles so the next waiter can't start an
          // overlapping generation on a non-reentrant engine (EngineGate mutual
          // exclusion). gen is undefined if we timed out during the lazy load.
          // Mirrors useOutputTranslation's gate body (review I2).
          await gen?.catch(() => {})
        }
      }),
    [engine, watchdogMs, engineGate],
  )

  const translate = useCallback(
    async (english: string) => {
      const tracker = trackerRef.current
      // NL off / disabled / unavailable → behave exactly like the first pass.
      // Checked BEFORE the queue guard ([M]): 'off' must restore raw play
      // instantly even while a previous drain is still in flight — queueing
      // here would translate the line under a layer the player just turned
      // off (or wedge it behind a stalled one).
      if (internal.phase !== 'on' || vocab === null || tracker === null) {
        lastCommandRef.current = null
        sendLine(english)
        return
      }
      // A translation is already in flight — QUEUE this line instead of dropping
      // it (F-A, NL v2 §11): the input stays enabled while NL is on, so typing
      // ahead is normal play, not an anomaly. FIFO, cap 4; overflow drops the
      // NEWEST line with a visible notice so input is never silently lost.
      // Above every translation stage so a mid-flight submit can't slip
      // through them either (review S4).
      if (translatingRef.current) {
        if (queueRef.current.length >= QUEUE_CAP) {
          setNotice(`Queue full — dropped: "${english}"`)
          return
        }
        queueRef.current.push({ id: queueIdRef.current++, text: english })
        syncQueue()
        return
      }
      // [O] Snapshot the story epoch: the drain abandons everything (in-flight
      // results included) once the game underneath it changes.
      const epoch = epochRef.current

      // Run ONE clause through the deterministic-first stages 3–7 (spec §4)
      // against the given live scene. `raw` is synthetic for the deterministic
      // stages — only the [nl debug] log consumes it. activeLang/lex come from
      // the CALLER's per-line read of liveRef ([N]), never from this closure's
      // render snapshot.
      const runClause = async (
        clause: string,
        scene: Scene,
        activeLang: ActiveLanguage,
        lex: (typeof liveRef.current)['lex'],
      ): Promise<{ result: TranslateResult; raw: string; stage: Stage }> => {
        // Stages 3–4 GATE on a trailing-punctuation-stripped form, so they
        // must SEND that same form ([C]): Zork's dictionary separators are
        // exactly `. , "`, so a surviving `!?:;` glues onto the last word —
        // "take lamp!" passed the all-parser-words gate verbatim and earned
        // "I don't know the word lamp!" from the very stage built to prevent
        // that. splitClauses already consumed `.`/`;`; this catches the rest.
        const stripped = clause.replace(/[!.?,;:]+$/, '').trim()
        // 3. Z-machine meta-verbs (restart, save, quit…) are not in-world
        // actions and have no canonical translation — route them raw so the
        // model can't invent a wrong command for them. A localized command
        // word (fr "inventaire") maps to its English canonical via the ACTIVE
        // core lexicon (UAT F5), again bypassing the model.
        if (isMetaCommand(stripped))
          return {
            result: { kind: 'command', text: stripped },
            raw: '(meta)',
            stage: 'meta',
          }
        const alias = metaAlias(stripped, lex?.core ?? null)
        if (alias)
          return {
            result: { kind: 'command', text: alias },
            raw: '(alias)',
            stage: 'alias',
          }
        // 4. Every token is already a word the game's parser knows → send the
        // clause verbatim, no inference (the F-H killer). COLLISION GUARD: a
        // token that is also an active-lexicon word disqualifies passthrough —
        // the clause must go through the lexicon parse instead (spec §4).
        if (isVocabPassthrough(stripped, vocab, lex?.words ?? null))
          return {
            result: { kind: 'command', text: stripped },
            raw: '(vocab)',
            stage: 'vocab',
          }
        // 5. Direction fast-path: movement is a closed, multilingual set
        // resolved deterministically in code — correct in every supported
        // language and with no model round-trip (UAT F8).
        const dir = parseDirection(clause, vocab.movement)
        if (dir)
          return {
            result: { kind: 'command', text: dir },
            raw: `{"verb":"${dir}"}`,
            stage: 'direction',
          }
        // 6. Deterministic lexicon parse (spec §6) — strict, never guesses; a
        // miss falls through to the model. Only runs when this game has a
        // noun lexicon for the active language.
        if (lex?.nouns) {
          const r = parseLexicon(clause, lex.core, lex.nouns, vocab, scene)
          if (r.kind === 'command')
            return { result: r, raw: '(lexicon)', stage: 'lexicon' }
        }
        // 7. LLM fallback. NL v2 §7: the grammar is the FULL vocab — scope
        // feeds the prompt hint below, never the grammar or the validator.
        const base = getContext()
        const ctx: PromptContext = {
          ...base,
          inScope: scene.inScope.map(o => o.canonical),
          antecedent: scene.antecedent,
        }
        const raw = await generateRaw(
          buildPrompt(clause, ctx, vocab, activeLang),
          // Non-null: translate early-returned when vocab was null, and the
          // memo is built from that same vocab.
          grammar!,
        )
        return { result: parseCommand(raw, vocab), raw, stage: 'llm' }
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

      // Every VM send goes through here: register the turn listener IMMEDIATELY
      // BEFORE sendLine (the VM runs the turn SYNCHRONOUSLY inside it — accept →
      // VM → bridge.update → resolveTurn — so a listener registered after would
      // fire into an empty resolver list and time out). `pending` is the
      // boundary of the most recent send; the compound loop awaits it per clause,
      // and the queue drain awaits it between lines so a queued line's stage-1
      // check and the scene tracker see the SETTLED output, not the stale view
      // ref (which only updates after a React re-render). An unawaited boundary
      // settles harmlessly: the bridge resolves every registered listener at
      // the turn and raceTurn clears its own timer on settle. (Boxed rather
      // than a bare `let` to make the shared mutable turn-boundary state —
      // written by `sendTracked`, awaited by the loops below — explicit.)
      const turnBox: { pending: Promise<TurnResult | 'timeout'> | null } = {
        pending: null,
      }
      const sendTracked = (text: string) => {
        turnBox.pending = raceTurn()
        sendLine(text)
      }

      // Run ONE LINE through the full pipeline (stages 1–8). Returns 'flush'
      // when the game raised an interactive prompt: queued lines were typed
      // BEFORE the player saw that question, so the drain must discard them
      // rather than feed them to it (F-A). Returns 'stale' when the story
      // epoch changed while a clause was translating ([O]) — the caller
      // abandons the drain without sending. Errors propagate to the per-line
      // catch in the drain below. `settled` is the previous drained line's
      // turn-boundary view context (non-null only when the drain awaited that
      // boundary): it is FRESHER than getContext(), whose backing view ref
      // only updates after a React re-render the synchronous drain never
      // yields for.
      const runLine = async (
        line: string,
        fromQueue: boolean,
        settled: ViewContext | null,
      ): Promise<'ok' | 'flush' | 'stale'> => {
        // [N] Resolve the ACTIVE language and lexicons per LINE, not per
        // drain: a picker change mid-drain applies to every line that runs
        // after it. The drain's phase gate guarantees 'on' here; the 'en'
        // arm only keeps the narrowing total for TS.
        const live = liveRef.current
        const activeLang: ActiveLanguage =
          live.internal.phase === 'on' ? live.internal.language : 'en'
        const lex = live.lex
        // STAGE 1 (spec §4): the game is asking. The interpreter's yes/no
        // confirmations (restart/quit/restore) and the parser's disambiguation
        // questions ("Which door…?") are read as ordinary LINE input, so the
        // player's reply answers the INTERPRETER and must not be translated —
        // else "Y" → "look" (restart never confirms) or "wooden door" gets
        // mangled. Checked before the clause split so a reply containing "and"
        // is never split either. A QUEUED line cannot be such a reply — the
        // player hadn't seen the question when they typed it — so it signals a
        // flush instead of answering.
        const recentOutput = (settled ?? getContext()).recentOutput
        if (
          isConfirmationPrompt(recentOutput) ||
          isDisambiguationPrompt(recentOutput)
        ) {
          lastCommandRef.current = null
          if (fromQueue) return 'flush'
          sendTracked(line)
          return 'ok'
        }
        // STAGE 2 (locked decision 8): a fully-quoted line ("…", «…», „…“, “…”)
        // is the escape hatch — send the unquoted text verbatim, bypassing every
        // translation stage. No echo, no latch: the player typed the command.
        const quoted = unquote(line)
        if (quoted) {
          lastCommandRef.current = null
          sendTracked(quoted)
          return 'ok'
        }

        // UNIFIED CLAUSE LOOP: a single command is the degenerate total===1
        // case of the compound machinery (locked decisions 1–9). Only when
        // total>1 does the hook own the turn boundary (awaitTurn + observe);
        // a single command leaves the turn to Terminal's observe effect.
        const clauses = splitClauses(line)
        const total = clauses.length
        if (total > 1) inSequenceRef.current = true
        const limit = Math.min(total, MAX_CLAUSES)
        let done = 0
        // Echo the player's input ONCE, before the first clause an actual
        // TRANSLATION produced (decision 5). Passthrough stages keep today's
        // no-echo contract — the transcript already shows the typed words.
        let echoed = false
        // Track the room across clauses: a turn that CHANGES ROOMS is a successful
        // move, not a no-op, so the absence/failure detector must be suppressed for
        // it. Otherwise ordinary room flavor text ("There is no door here.") trips
        // ABSENCE_PAT (\bno\s+\w+\b) and truncates the sequence right after a move
        // succeeds (systematic-debugging; exposed once movement started working).
        let prevLocation = (settled ?? getContext()).location
        // TEMP compound diagnostics — why a sequence stopped (set at each break,
        // logged once below). Remove together with the per-clause [nl debug]
        // once translation quality is tuned.
        let stopReason: string | null = null
        // The engine error (or watchdog timeout) that stopped a compound mid-
        // flight, kept as the ERROR OBJECT so stage 8 can label the notice
        // without sniffing message strings (review S5 / Task 21 review).
        let stopError: unknown = null
        for (let i = 0; i < limit; i++) {
          const clause = clauses[i]
          const scene = tracker.scene()
          let result: TranslateResult
          let raw: string
          let stage: Stage
          try {
            ;({ result, raw, stage } = await runClause(
              clause,
              scene,
              activeLang,
              lex,
            ))
          } catch (err) {
            // Single command: surface through the outer catch (timeout/failure
            // notice + raw send — unchanged contract). Mid-compound: stop the
            // sequence (locked decision 4).
            if (total === 1) throw err
            stopReason = `generate-error: ${String(err)}`
            stopError = err
            break
          }
          // [O] An await elapsed: if the story changed underneath this drain,
          // the translated result belongs to the OLD game — drop it unsent
          // and abandon everything ('stale' bypasses stage 8 entirely).
          if (epochRef.current !== epoch) return 'stale'
          // TEMP per-clause diagnostics — what the live scene fed the stage vs.
          // what it emitted, and WHICH stage produced it. Remove once quality
          // is tuned.
          nlDebug(
            '[nl debug] clause',
            JSON.stringify({
              i,
              clause,
              stage,
              antecedent: scene.antecedent,
              inScope: scene.inScope.map(o => o.canonical),
              raw,
              result,
            }),
          )
          if (result.kind !== 'command') {
            stopReason = 'abstain'
            break // abstain → stop; stage 8 below decides what the player sees
          }

          if (!echoed && TRANSLATED_STAGES.has(stage)) {
            echoLocal(line)
            echoed = true
          }
          // Meta/alias clauses don't latch: a meta command has no in-world
          // acted object to attribute take/drop/antecedent to.
          const isMeta = stage === 'meta' || stage === 'alias'
          lastCommandRef.current = isMeta ? null : result.text

          if (total === 1) {
            sendTracked(result.text)
            done++
            break // single command: Terminal's observe handles the turn
          }

          // sendTracked registers the turn listener BEFORE sendLine (see its
          // comment above), so the synchronous VM turn cannot be missed; the
          // clause then awaits that same boundary.
          sendTracked(result.text)
          done++

          const turn = await turnBox.pending!
          if (turn === 'timeout' || turn.reason !== 'line') {
            stopReason =
              turn === 'timeout' ? 'turn-timeout' : `turn:${turn.reason}`
            break // decision 8
          }

          const vc = viewToContext(turn.view)
          // A non-empty location that differs from the prior clause's = a successful
          // move; its new room description is success output, not a failure to scan.
          const roomChanged = vc.location !== '' && vc.location !== prevLocation
          prevLocation = vc.location
          // The hook owns observe during a sequence (decision 9).
          tracker.observe({
            location: vc.location,
            outputText: vc.recentOutput,
            lastCommand: lastCommandRef.current,
          })
          if (
            !roomChanged &&
            !isMeta && // meta output (score report, "Ok.") is not in-world failure text
            clauseFailed(
              vc.recentOutput,
              vocab,
              lastCommandRef.current ?? undefined,
            )
          ) {
            stopReason = 'in-game-failure'
            break // no-op / absence (scoped to the acted object — F2/R3)
          }
          if (
            isConfirmationPrompt(vc.recentOutput) ||
            isDisambiguationPrompt(vc.recentOutput)
          ) {
            stopReason = 'interactive-prompt'
            break // mid-sequence interactive prompt (decision 3)
          }
        }
        if (stopReason)
          nlDebug(
            '[nl debug] sequence stop',
            JSON.stringify({ stopReason, done, total }),
          )

        // A genuine engine error mid-compound never propagates to the drain's
        // catch (total>1 swallows it above), so it is logged HERE, before any
        // branching, to keep the "generate failures stay diagnosable"
        // contract on every path ([B]).
        if (stopError !== null && !(stopError instanceof WatchdogTimeout))
          console.error('[nl] translation failed:', stopError)

        if (done === 0) {
          // STAGE 8 — abstain policy (spec §4, UAT F-R). English: the raw line
          // goes to the Z-parser, whose own error message is genuinely useful.
          // Non-English: raw French/German/Spanish would only earn a useless
          // "I don't know the word …" AND burn a game turn — send NOTHING and
          // show a styled notice instead. Engine errors are checked FIRST
          // ([B]): EN still raw-sends, but a translator failure must not
          // masquerade as a deliberate abstain — it gets the failure notice.
          lastCommandRef.current = null
          if (stopError !== null) {
            // The translator broke (timeout/engine error) — don't blame the
            // player's wording (Task 21 review).
            const timedOut = stopError instanceof WatchdogTimeout
            if (activeLang === 'en') {
              sendTracked(line)
              setNotice(
                timedOut
                  ? 'Translation timed out — sent as typed.'
                  : 'Translation failed — sent as typed.',
              )
            } else {
              // Nothing was sent: the non-EN abstain policy still holds.
              setNotice(
                timedOut
                  ? 'Translation timed out — nothing sent.'
                  : 'Translation failed — nothing sent.',
              )
            }
          } else if (activeLang === 'en') {
            sendTracked(line)
          } else {
            setNotice(
              'Couldn’t translate — try simpler wording, or quote a command: "open mailbox"',
            )
          }
        } else if (done < total) {
          // Truncated sequence → make it visible (decision 7); an engine
          // error labels the notice so it can't pass for a quiet stop ([B]).
          setNotice(
            stopError === null
              ? `Ran ${done} of ${total} actions.`
              : stopError instanceof WatchdogTimeout
                ? `Translation timed out — ran ${done} of ${total} actions.`
                : `Translation failed — ran ${done} of ${total} actions.`,
          )
        }
        // A mid-sequence interactive prompt must flush the queue too (F-A):
        // whatever the player typed ahead, the game is now asking a question.
        return stopReason === 'interactive-prompt' ? 'flush' : 'ok'
      }

      translatingRef.current = true
      setPending(true)
      setNotice(null)
      try {
        // DRAIN (F-A): run the typed line, then any lines queued meanwhile,
        // one at a time through the FULL pipeline. Notice policy: cleared once
        // here at drain start — a notice set by an earlier line (abstain,
        // truncation) deliberately survives later lines unless they set their
        // own.
        let line: string | undefined = english
        let fromQueue = false
        // The previous drained line's settled turn view (see runLine's param
        // doc) — null for the first line and after a boundary timeout.
        let settled: ViewContext | null = null
        while (line !== undefined) {
          // [O] Story swapped between lines: everything left here was typed
          // at the OLD game. Quiet clear — the swap made the lines
          // irrelevant, and a notice would land in the new game's transcript.
          if (epochRef.current !== epoch) {
            queueRef.current = []
            syncQueue()
            break
          }
          // [N] 'Off is instant' for the queue too: the phase left 'on'
          // mid-drain, so the line in hand and everything queued behind it
          // is abandoned with a notice instead of being translated by a
          // layer the player just turned off. Unreachable for the first
          // (typed) line — translate gated on phase with no await since.
          if (liveRef.current.internal.phase !== 'on') {
            lastCommandRef.current = null
            queueRef.current = []
            syncQueue()
            setNotice('Queue cleared — natural language is off.')
            break
          }
          let outcome: 'ok' | 'flush' | 'stale' = 'ok'
          try {
            outcome = await runLine(line, fromQueue, settled)
          } catch (err) {
            // PER-LINE error handling — the pre-queue single-line contract,
            // kept per line so an engine error on one line cannot silently
            // abandon the rest of the queue. A genuine generate failure (vs. a
            // benign watchdog timeout) is logged so the root cause stays
            // diagnosable; either way the line falls back to a raw send with a
            // visible notice, and the drain continues.
            lastCommandRef.current = null
            if (!(err instanceof WatchdogTimeout))
              console.error('[nl] translation failed:', err)
            setNotice(
              err instanceof WatchdogTimeout
                ? 'Translation timed out — sent as typed.'
                : 'Translation failed — sent as typed.',
            )
            sendTracked(line)
          }
          // A compound that stopped mid-sequence leaves this set; reset it per
          // line so Terminal's observe effect resumes for later queued lines.
          inSequenceRef.current = false
          // 'stale' ([O]): the story changed while a clause translated — the
          // result was dropped unsent; abandon the rest of the drain too.
          if (outcome === 'stale') {
            queueRef.current = []
            syncQueue()
            break
          }
          // 'flush': the game raised an interactive prompt. A FROM-QUEUE line
          // that flushes was itself dropped input, so the notice ALWAYS shows
          // — even when nothing else was queued behind it (a lone queued line
          // must not vanish silently). A flush from the TYPED line (mid-
          // compound prompt) only notices when it actually discards something.
          if (
            outcome === 'flush' &&
            (fromQueue || queueRef.current.length > 0)
          ) {
            queueRef.current = []
            syncQueue()
            setNotice('Queue cleared — the game needs an answer first.')
            break
          }
          line = queueRef.current.shift()?.text
          fromQueue = true
          syncQueue()
          // TURN-BOUNDARY AWAIT between drained lines (§11): before running a
          // queued line, wait for the boundary of whatever the previous line
          // sent so its stage-1 interactive-prompt check and the scene tracker
          // see the SETTLED output — the view ref getContext() reads only
          // updates after a React re-render the drain never yields for. The
          // drain owns this boundary exactly like a compound owns its clause
          // boundaries (decision 9): inSequenceRef defers Terminal's observe
          // effect, and the observe below preserves the lastCommand latch
          // semantics (latched command attributed, latch left for the
          // idempotent trailing Terminal observe). On timeout — or a turn that
          // settled some other way — proceed with the live (possibly stale)
          // view rather than dropping the player's queued input: raceTurn's
          // watchdog already bounds the wait (decision 8).
          settled = null
          if (line !== undefined && turnBox.pending !== null) {
            inSequenceRef.current = true
            const turn = await turnBox.pending
            turnBox.pending = null
            // An empty turn view (degenerate fixture / no output) carries no
            // information — keep the getContext() fallback instead.
            if (turn !== 'timeout' && turn.reason === 'line') {
              const vc = viewToContext(turn.view)
              if (vc.recentOutput !== '') {
                settled = vc
                tracker.observe({
                  location: vc.location,
                  outputText: vc.recentOutput,
                  lastCommand: lastCommandRef.current,
                })
              }
            }
          }
        }
      } finally {
        translatingRef.current = false
        setPending(false)
        inSequenceRef.current = false
      }
    },
    // `lex` is deliberately NOT a dep: the drain reads it (and the phase/
    // language) per line through liveRef ([N]), so a picker change needn't
    // recreate translate.
    [
      internal,
      vocab,
      grammar,
      getContext,
      echoLocal,
      sendLine,
      generateRaw,
      awaitTurn,
      watchdogMs,
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
