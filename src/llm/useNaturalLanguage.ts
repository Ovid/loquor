import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CapabilityResult,
  ChatMessages,
  LlmEngine,
  NlState,
  PromptContext,
  TranslateResult,
  ViewContext,
} from './types'
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
} from './translate'
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
}

export interface UseNaturalLanguage {
  state: NlState
  pending: boolean
  notice: string | null
  modalOpen: boolean
  toggle: () => void
  requestDownload: () => void
  declineDownload: () => void
  cancelDownload: () => void
  translate: (english: string) => Promise<void>
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
  | { phase: 'on' }

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
  } = args
  const [internal, setInternal] = useState<Internal>({ phase: 'off' })
  const [installed, setInstalled] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  // Guards against a second translate running concurrently. `pending` (state)
  // also disables the input, but a ref closes the same-tick window synchronously.
  const translatingRef = useRef(false)
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

  const available = capability.tier !== 'none'
  const hasVocab = vocab !== null

  // Own a scene tracker; rebuild + reset when the game (vocab) changes.
  const trackerRef = useRef<TextSceneTracker | null>(null)
  useEffect(() => {
    trackerRef.current = vocab ? new TextSceneTracker(vocab) : null
    lastCommandRef.current = null
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
        if (cached && readNlPref().language !== 'off') {
          setInternal(prev => (prev.phase === 'off' ? { phase: 'on' } : prev))
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
    if (internal.phase === 'on') return { phase: 'on' }
    return { phase: 'off', installed }
  }, [available, hasVocab, capability.reasons, internal, installed])

  const requestDownload = useCallback(() => {
    setNotice(null)
    setModalOpen(false)
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
        setInternal({ phase: 'on' })
        // 'en' is a placeholder until the language-picker task supplies the
        // player's chosen language.
        writeNlPref({ language: 'en' })
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
  }, [])

  const declineDownload = useCallback(() => {
    setModalOpen(false)
    setInternal({ phase: 'off' })
    // Reset `language` alongside `declined`: an explicit "Not now" must not leave
    // a stale active language that the isCached effect later auto-restores to 'on'
    // once the model happens to be cached (review inline comment).
    writeNlPref({ declined: true, language: 'off' })
  }, [])

  const toggle = useCallback(() => {
    if (!available || !hasVocab) return
    if (internal.phase === 'on') {
      setInternal({ phase: 'off' }) // off is instant; model stays cached
      writeNlPref({ language: 'off' })
      return
    }
    if (installed) {
      setInternal({ phase: 'on' }) // cached → enable without re-download
      // 'en' is a placeholder until the language-picker task supplies the
      // player's chosen language.
      writeNlPref({ language: 'en' })
    } else {
      setModalOpen(true)
    }
  }, [available, hasVocab, internal.phase, installed])

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

  const translate = useCallback(
    async (english: string) => {
      // A translation is already in flight — drop this one rather than orphan a
      // second inference (review I4 concurrency guard). At the TOP so a
      // mid-flight submit can't slip through the early raw-send paths either
      // (review S4 — unreachable today via the disabled input; defense in depth).
      if (translatingRef.current) return
      const tracker = trackerRef.current
      // NL off / disabled / unavailable → behave exactly like the first pass.
      if (internal.phase !== 'on' || vocab === null || tracker === null) {
        lastCommandRef.current = null
        sendLine(english)
        return
      }
      // Z-machine meta-verbs (restart, save, quit…) are not in-world actions and
      // have no canonical translation — send them straight to the interpreter
      // rather than let the model invent a wrong command for them. Mirrors the
      // abstain path: no echo, no command latch.
      if (isMetaCommand(english)) {
        lastCommandRef.current = null
        sendLine(english)
        return
      }
      // A localized command word (e.g. French "inventaire") is sent to the
      // interpreter as its English canonical ("inventory"), bypassing the model so
      // a known non-English command can't be mistranslated (UAT F5). Dormant
      // until the active core lexicon is wired through.
      // TODO(Task 21): pass the active core lexicon
      const alias = metaAlias(english, null)
      if (alias) {
        lastCommandRef.current = null
        sendLine(alias)
        return
      }
      // The game's own prompts are read as line input too: a yes/no confirmation
      // (restart/quit/restore) or a parser disambiguation ("Which door…?"). The
      // player's reply answers the interpreter and must not be translated — else
      // "Y" → "look" (restart never confirms) or "wooden door" gets mangled. Pass
      // it raw so Zork's own parser handles the reply.
      const recentOutput = getContext().recentOutput
      if (
        isConfirmationPrompt(recentOutput) ||
        isDisambiguationPrompt(recentOutput)
      ) {
        lastCommandRef.current = null
        sendLine(english)
        return
      }
      translatingRef.current = true
      setPending(true)
      setNotice(null)

      // Translate one clause against the given live scene, returning the parsed
      // result. Shared by the single-command path and the per-clause compound loop.
      const generateClause = async (
        clause: string,
        scene: Scene,
      ): Promise<{ result: TranslateResult; raw: string }> => {
        // Direction fast-path: movement is a closed, multilingual set resolved
        // deterministically in code — correct in every supported language and with
        // no model round-trip (UAT F8). Applies to single commands and to each
        // clause of a compound. `raw` is synthetic, only for the [nl debug] log.
        const dir = parseDirection(clause, vocab.movement)
        if (dir)
          return {
            result: { kind: 'command', text: dir },
            raw: `{"verb":"${dir}"}`,
          }
        const grammar = buildGrammar(vocab, scene)
        const base = getContext()
        const ctx: PromptContext = {
          ...base,
          inScope: scene.inScope.map(o => o.canonical),
          antecedent: scene.antecedent,
        }
        const raw = await generateRaw(buildPrompt(clause, ctx, vocab), grammar)
        return { result: parseCommand(raw, scene, vocab), raw }
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
          const { result, raw } = await generateClause(english, scene)
          // TEMP gate diagnostics — what the scene fed the model vs. what it emitted.
          // Remove once translation quality is tuned.
          nlDebug(
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
          return
        }

        // COMPOUND PATH (locked decisions 1–9).
        inSequenceRef.current = true
        const total = clauses.length
        const limit = Math.min(total, MAX_CLAUSES)
        let done = 0
        // Track the room across clauses: a turn that CHANGES ROOMS is a successful
        // move, not a no-op, so the absence/failure detector must be suppressed for
        // it. Otherwise ordinary room flavor text ("There is no door here.") trips
        // ABSENCE_PAT (\bno\s+\w+\b) and truncates the sequence right after a move
        // succeeds (systematic-debugging; exposed once movement started working).
        let prevLocation = getContext().location
        // TEMP compound diagnostics — why a sequence stopped (set at each break,
        // logged once below). Mirrors the single-path [nl debug]; remove together
        // once translation quality is tuned.
        let stopReason: string | null = null
        for (let i = 0; i < limit; i++) {
          const clause = clauses[i]
          const scene = tracker.scene()
          let result: TranslateResult
          let raw: string
          // Meta verbs / localized aliases keep their "always routed raw"
          // contract inside a compound too (review C4): meta verbs are
          // subtracted from the grammar, so feeding "go north and save"'s
          // second clause to the model could only abstain and kill the
          // sequence as "Ran 1 of 2 actions."
          // TODO(Task 21): pass the active core lexicon
          const metaText = isMetaCommand(clause)
            ? clause
            : metaAlias(clause, null)
          if (metaText) {
            result = { kind: 'command', text: metaText }
            raw = '(meta: routed raw)'
          } else {
            try {
              ;({ result, raw } = await generateClause(clause, scene))
            } catch (err) {
              stopReason = `generate-error: ${String(err)}`
              break // untranslatable (timeout/error) → stop (locked decision 4)
            }
          }
          // TEMP per-clause diagnostics — what the live scene fed the model for this
          // clause vs. what it emitted. Mirrors the single-command [nl debug] so a
          // compound sequence is not a black box. Remove once quality is tuned.
          nlDebug(
            '[nl debug] clause',
            JSON.stringify({
              i,
              clause,
              antecedent: scene.antecedent,
              inScope: scene.inScope.map(o => o.canonical),
              raw,
              result,
            }),
          )
          if (result.kind !== 'command') {
            stopReason = 'abstain'
            break // abstain → stop
          }

          if (done === 0) echoLocal(english) // echo the full English once (decision 5)
          // Meta clauses don't latch: like the single path, a meta command has
          // no in-world acted object to attribute take/drop/antecedent to.
          lastCommandRef.current = metaText ? null : result.text
          // Register the turn listener BEFORE sendLine: the VM runs the turn
          // SYNCHRONOUSLY inside sendLine (accept → VM → bridge.update →
          // resolveTurn), so awaitTurn must already be pending or the boundary
          // fires into an empty resolver list and the wait times out. (Design doc:
          // "registered before sendLine"; raceTurn() registers awaitTurn
          // synchronously before its first await.)
          const turnPromise = raceTurn()
          sendLine(result.text)
          done++

          const turn = await turnPromise
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
            !metaText && // meta output (score report, "Ok.") is not in-world failure text
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
        // A genuine generate failure (vs. a benign watchdog timeout) is otherwise
        // swallowed by the notice below, leaving the root cause invisible — e.g. an
        // invalid grammar the model's grammar compiler rejects. Log it so it is
        // diagnosable from the console; timeouts stay quiet to avoid noise.
        if (!(err instanceof WatchdogTimeout))
          console.error('[nl] translation failed:', err)
        // Watchdog or generate error: never wedge the turn. Surface a visible
        // notice so a timeout is distinguishable from a normal abstain.
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
    },
    [
      internal.phase,
      vocab,
      getContext,
      echoLocal,
      sendLine,
      generateRaw,
      awaitTurn,
      watchdogMs,
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
    toggle,
    requestDownload,
    declineDownload,
    cancelDownload,
    translate,
    observe,
    isSequencing,
  }
}
