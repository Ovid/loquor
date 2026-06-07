import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CapabilityResult,
  LlmEngine,
  NlState,
  PromptContext,
  ViewContext,
} from './types'
import type { ViewState } from '../glkote-react/types'
import type { Vocab } from './grammar/types'
import type { SceneEvent } from './scene/types'
import { TextSceneTracker } from './scene/tracker'
import { buildGrammar } from './grammar/buildGrammar'
import { buildPrompt, viewToContext } from './prompt'
import { parseCommand } from './translate'
import { readNlPref, writeNlPref } from './nlpref'

export interface UseNaturalLanguageArgs {
  engine: LlmEngine
  capability: CapabilityResult
  vocab: Vocab | null
  getContext: () => ViewContext
  echoLocal: (text: string) => void
  sendLine: (text: string) => void
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
}

type Internal =
  | { phase: 'off' }
  | { phase: 'downloading'; loaded: number; total: number }
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
  // in the same async callback, restore the player's prior "enabled" choice once
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
        if (cached && readNlPref().enabled) {
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
      }
    if (internal.phase === 'on') return { phase: 'on' }
    return { phase: 'off', installed }
  }, [available, hasVocab, capability.reasons, internal, installed])

  const requestDownload = useCallback(() => {
    setNotice(null)
    setModalOpen(false)
    const ac = new AbortController()
    abortRef.current = ac
    setInternal({ phase: 'downloading', loaded: 0, total: 0 })
    // True once this load is no longer the active one — aborted (cancel) or
    // superseded by a newer requestDownload. A load that resolves on/around the
    // abort tick must NOT flip the state back to 'on' or persist enabled against
    // the player's cancel (review I2).
    const stale = () => ac.signal.aborted || abortRef.current !== ac
    engine
      .load(p => {
        if (stale()) return
        setInternal({
          phase: 'downloading',
          loaded: p.loaded,
          total: p.total,
        })
      }, ac.signal)
      .then(() => {
        if (stale()) return
        // The model is now loaded (hence cached) — mark installed directly so the
        // probe effect needn't re-run on the phase change to discover it (S6).
        setInstalled(true)
        setInternal({ phase: 'on' })
        writeNlPref({ enabled: true })
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
    // Clear `enabled` alongside `declined`: an explicit "Not now" must not leave
    // a stale enabled:true that the isCached effect later auto-restores to 'on'
    // once the model happens to be cached (review inline comment).
    writeNlPref({ declined: true, enabled: false })
  }, [])

  const toggle = useCallback(() => {
    if (!available || !hasVocab) return
    if (internal.phase === 'on') {
      setInternal({ phase: 'off' }) // off is instant; model stays cached
      writeNlPref({ enabled: false })
      return
    }
    if (installed) {
      setInternal({ phase: 'on' }) // cached → enable without re-download
      writeNlPref({ enabled: true })
    } else {
      setModalOpen(true)
    }
  }, [available, hasVocab, internal.phase, installed])

  const translate = useCallback(
    async (english: string) => {
      const tracker = trackerRef.current
      // NL off / disabled / unavailable → behave exactly like the first pass.
      if (internal.phase !== 'on' || vocab === null || tracker === null) {
        lastCommandRef.current = null
        sendLine(english)
        return
      }
      // A translation is already in flight — drop this one rather than orphan a
      // second inference (review I4 concurrency guard).
      if (translatingRef.current) return
      translatingRef.current = true
      setPending(true)
      setNotice(null)
      let watchdogId: ReturnType<typeof setTimeout>
      // Aborts the in-flight generate() when the watchdog fires so the orphaned
      // inference stops consuming the GPU instead of running to completion.
      const ac = new AbortController()
      try {
        const scene = tracker.scene()
        const grammar = buildGrammar(vocab, scene)
        const base = getContext()
        const ctx: PromptContext = {
          ...base,
          inScope: scene.inScope.map(o => o.canonical),
          antecedent: scene.antecedent,
        }
        const messages = buildPrompt(english, ctx)
        // The model is enabled but may not be resident in GPU memory yet: a cached
        // model auto-restored to 'on' across a page reload never went through the
        // download/load path this session, so generate() would throw "engine not
        // loaded". Bring it in first (no-op if already loaded). Kept outside the
        // watchdog race below — a cold cache-load can legitimately take longer than
        // a single generation's budget, and it reports its own progress.
        if (!engine.isLoaded()) await engine.load(() => {}, ac.signal)
        const watchdog = new Promise<never>((_, rej) => {
          watchdogId = setTimeout(() => {
            // Reject FIRST so the watchdog wins Promise.race, THEN abort — abort
            // rejects generate() with AbortError, but the race is already settled
            // on the timeout, keeping the "timed out" notice accurate.
            rej(new WatchdogTimeout())
            ac.abort()
          }, watchdogMs)
        })
        const raw = await Promise.race([
          engine.generate(messages, grammar, ac.signal),
          watchdog,
        ])
        clearTimeout(watchdogId!)
        const result = parseCommand(raw, scene, vocab)
        if (result.kind === 'command') {
          lastCommandRef.current = result.text // latch for the next observe()
          echoLocal(english)
          sendLine(result.text)
        } else {
          lastCommandRef.current = null // abstain → raw send, no acted-object
          sendLine(english) // abstain → game's own parser handles it
        }
      } catch (err) {
        clearTimeout(watchdogId!)
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
      }
    },
    [
      internal.phase,
      vocab,
      engine,
      getContext,
      echoLocal,
      sendLine,
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
  }
}
