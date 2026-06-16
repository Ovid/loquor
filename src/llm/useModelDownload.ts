// The model download / install / phase lifecycle for the NL layer, extracted
// from useNaturalLanguage (F-2): download orchestration (progress sampling, ETA,
// abort/stale guards, preference persistence, modal state) shares almost no
// state with the per-clause translation pipeline — only the `notice` UI channel,
// which stays parent-owned and is passed in. This hook owns the phase machine
// (`internal`), the installed/modal flags, the download refs, the on-disk cache
// probe, and the four player-facing actions; the parent derives `state` /
// `language` / `lex` from the returned `internal`.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveLanguage, LlmEngine, NlLanguage } from './types'
import { readNlPref, writeNlPref } from './nlpref'
import { pct as toPct, estimateRemainingSeconds } from './progress'
import type { ProgressSample } from './progress'
import { createLogger } from '../logger'

const log = createLogger('nl')

/** The NL layer's internal phase machine. Owned here (F-2); the parent reads it
 * to derive the public `state` and the active picker language. */
export type Internal =
  | { phase: 'off' }
  | {
      phase: 'downloading'
      loaded: number
      total: number
      etaSeconds: number | null
    }
  | { phase: 'on'; language: ActiveLanguage }

export interface ModelDownloadParams {
  engine: LlmEngine
  available: boolean
  hasVocab: boolean
  /** Parent-owned notice channel (shared with the translation pipeline's
   * queue messages) — the download flow writes failure/clear notices through it. */
  setNotice: (notice: string | null) => void
}

export interface ModelDownload {
  internal: Internal
  installed: boolean
  modalOpen: boolean
  /** Pick a language ('off' disables the layer). Sticky via writeNlPref. */
  setLanguage: (lang: NlLanguage) => void
  requestDownload: () => void
  declineDownload: () => void
  cancelDownload: () => void
}

export function useModelDownload(params: ModelDownloadParams): ModelDownload {
  const { engine, available, hasVocab, setNotice } = params

  const [internal, setInternal] = useState<Internal>({ phase: 'off' })
  const [installed, setInstalled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  // (percent, time) samples for the active download, used to estimate the time
  // remaining. Reset at the start of each requestDownload; sampled in its progress
  // callback (a side-effect context — keeps the timing out of render).
  const dlSamplesRef = useRef<ProgressSample[]>([])
  // The language the player picked when the model wasn't cached yet — the
  // download modal flow activates THIS language once the load resolves.
  const pendingLangRef = useRef<ActiveLanguage>('en')

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
          // F7: this is the app's single network-egress risk — a genuine
          // (non-abort) load failure must reach the ring buffer / console, not
          // just the player notice, or the cause is undiagnosable.
          log.error('model download failed:', err)
          setNotice('Model download failed — staying grammar-only.')
          setInternal({ phase: 'off' })
        }
      })
  }, [engine, setNotice])

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

  return {
    internal,
    installed,
    modalOpen,
    setLanguage,
    requestDownload,
    declineDownload,
    cancelDownload,
  }
}
