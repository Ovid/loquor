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

export function useNaturalLanguage(
  args: UseNaturalLanguageArgs,
): UseNaturalLanguage {
  const { engine, capability, grammar, getContext, echoLocal, sendLine, watchdogMs } = args
  const [internal, setInternal] = useState<Internal>({ phase: 'off' })
  const [installed, setInstalled] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const available = capability.tier !== 'none'
  const hasGrammar = grammar !== null

  // Probe the ON-DISK cache (survives reloads) for the installed/not-installed
  // distinction — distinct from isLoaded() (in-memory, this session only) — and,
  // in the same async callback, restore the player's prior "enabled" choice once
  // the model is known cached. (Don't auto-enable against an uncached model — that
  // would re-prompt.) Doing this in the async callback (not synchronously in the
  // effect body) avoids react-hooks/set-state-in-effect while preserving behavior.
  useEffect(() => {
    let cancelled = false
    engine
      .isCached()
      .then(c => {
        if (cancelled) return
        const cached = c || engine.isLoaded()
        setInstalled(cached)
        if (cached && readNlPref().enabled && internal.phase === 'off') {
          setInternal({ phase: 'on' })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [engine, internal.phase])

  const state: NlState = useMemo(() => {
    if (!available) return { phase: 'unavailable', reasons: capability.reasons }
    if (!hasGrammar) return { phase: 'disabled' } // silent: this game has no grammar
    if (internal.phase === 'downloading')
      return { phase: 'downloading', loaded: internal.loaded, total: internal.total }
    if (internal.phase === 'on') return { phase: 'on' }
    return { phase: 'off', installed }
  }, [available, hasGrammar, capability.reasons, internal, installed])

  const requestDownload = useCallback(() => {
    setNotice(null)
    setModalOpen(false)
    const ac = new AbortController()
    abortRef.current = ac
    setInternal({ phase: 'downloading', loaded: 0, total: 0 })
    engine
      .load(p => setInternal({ phase: 'downloading', loaded: p.loaded, total: p.total }), ac.signal)
      .then(() => {
        setInternal({ phase: 'on' })
        writeNlPref({ enabled: true })
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') {
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
    writeNlPref({ declined: true })
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
      setPending(true)
      setNotice(null)
      let watchdogId: ReturnType<typeof setTimeout>
      try {
        const messages = buildPrompt(english, getContext())
        const watchdog = new Promise<never>((_, rej) => {
          watchdogId = setTimeout(() => rej(new Error('watchdog')), watchdogMs)
        })
        const raw = await Promise.race([engine.generate(messages, grammar), watchdog])
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
          (err as Error).message === 'watchdog'
            ? 'Translation timed out — sent as typed.'
            : 'Translation failed — sent as typed.',
        )
        sendLine(english)
      } finally {
        setPending(false)
      }
    },
    [internal.phase, grammar, engine, getContext, echoLocal, sendLine, watchdogMs],
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
