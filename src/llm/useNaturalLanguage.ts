import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CapabilityResult,
  LlmEngine,
  NlState,
  PromptContext,
} from './types'
import { buildPrompt } from './prompt'
import { parseCompletion } from './translate'
import { readNlPref, writeNlPref } from './nlpref'

export interface UseNaturalLanguageArgs {
  engine: LlmEngine
  capability: CapabilityResult
  grammar: string | null
  getContext: () => PromptContext
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
    grammar,
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

  const available = capability.tier !== 'none'
  const hasGrammar = grammar !== null

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
    if (!hasGrammar) return { phase: 'disabled' } // silent: this game has no grammar
    if (internal.phase === 'downloading')
      return {
        phase: 'downloading',
        loaded: internal.loaded,
        total: internal.total,
      }
    if (internal.phase === 'on') return { phase: 'on' }
    return { phase: 'off', installed }
  }, [available, hasGrammar, capability.reasons, internal, installed])

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
      .load(
        p => {
          if (stale()) return
          setInternal({
            phase: 'downloading',
            loaded: p.loaded,
            total: p.total,
          })
        },
        ac.signal,
      )
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
    if (!available || !hasGrammar) return
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
  }, [available, hasGrammar, internal.phase, installed])

  const translate = useCallback(
    async (english: string) => {
      // NL off / disabled / unavailable → behave exactly like the first pass.
      if (internal.phase !== 'on' || grammar === null) {
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
        const messages = buildPrompt(english, getContext())
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
        const result = parseCompletion(raw)
        if (result.kind === 'command') {
          echoLocal(english)
          sendLine(result.text)
        } else {
          sendLine(english) // abstain → game's own parser handles it
        }
      } catch (err) {
        clearTimeout(watchdogId!)
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
      grammar,
      engine,
      getContext,
      echoLocal,
      sendLine,
      watchdogMs,
    ],
  )

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
  }
}
