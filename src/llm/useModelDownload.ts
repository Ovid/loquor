// The model download / install / phase lifecycle for the NL layer, extracted
// from useNaturalLanguage (F-2): download orchestration (progress sampling, ETA,
// abort/stale guards, preference persistence, modal state) shares almost no
// state with the per-clause translation pipeline — only the `notice` UI channel,
// which stays parent-owned and is passed in. This hook owns the phase machine
// (`internal`), the installed/modal flags, the download refs, the on-disk cache
// probe, and the player-facing actions; the parent derives `state` /
// `language` / `lex` from the returned `internal`.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveLanguage, LlmEngine, NlLanguage } from './types'
import { OUTPUT_ONLY_LANGS } from './types'
import { readNlPref, writeNlPref } from './nlpref'
import { pct as toPct, estimateRemainingSeconds } from './progress'
import type { ProgressSample } from './progress'
import { DOWNLOAD_STALL_MS, DOWNLOAD_RETRY_MS } from './config'
import { modelDownloadFailed, modelDownloadStalled } from './notices'
import { createLogger } from '../logger'

const log = createLogger('nl')

/** The NL layer's internal phase machine. Owned here (F-2); the parent reads it
 * to derive the public `state` and the active picker language. */
export type Internal =
  | { phase: 'off' }
  | {
      phase: 'downloading'
      language: ActiveLanguage
      loaded: number
      total: number
      etaSeconds: number | null
    }
  | { phase: 'on'; language: ActiveLanguage; model: 'full' | 'grammar' }

export interface ModelDownloadParams {
  engine: LlmEngine
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
  /** Open the upgrade modal on demand (picker "✦ improve" / "try the model anyway"). */
  requestUpgrade: () => void
  /** Flip the active language full → grammar after a clause-time load failure. */
  demoteToGrammar: () => void
}

export function useModelDownload(params: ModelDownloadParams): ModelDownload {
  const { engine, hasVocab, setNotice } = params

  const [internal, setInternal] = useState<Internal>({ phase: 'off' })
  const [installed, setInstalled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  // No-progress watchdog for the active download (F6). Reset on each progress
  // tick; fires only on genuine silence. Held in a ref so cancelDownload can
  // clear it too.
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // (percent, time) samples for the active download, used to estimate the time
  // remaining. Reset at the start of each requestDownload; sampled in its progress
  // callback (a side-effect context — keeps the timing out of render).
  const dlSamplesRef = useRef<ProgressSample[]>([])
  // The language the player picked when the model wasn't cached yet — the
  // download modal flow activates THIS language once the load resolves.
  const pendingLangRef = useRef<ActiveLanguage>('en')

  // Tear down any in-flight download — kill the no-progress watchdog and abort
  // the fetch. The aborted load settles into its stale() guard and becomes a
  // no-op, so a superseding action (a new language pick, or 'off') can't have the
  // old load flip the phase back to on/full or persist a language behind it ([C1]).
  const abortInFlight = useCallback(() => {
    if (stallTimerRef.current !== null) {
      clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }
    abortRef.current?.abort()
  }, [])

  // Probe the ON-DISK cache (survives reloads) for the installed/not-installed
  // distinction — distinct from isLoaded() (in-memory, this session only) — and,
  // in the same async callback, restore the player's prior language choice.
  // If cached, restore to full; if uncached but a language was stored, restore
  // to grammar-only (deterministic stages still work without the model).
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
        if (pref.language !== 'off') {
          const lang = pref.language // narrowed to ActiveLanguage; survives the closure
          setInternal(prev => {
            if (prev.phase === 'off')
              return {
                phase: 'on',
                language: lang,
                model: cached ? 'full' : 'grammar',
              }
            // Race ([I1]): the player picked a language before this probe
            // resolved, landing in on/grammar (installed was still false) with a
            // spurious upgrade modal. If the model is in fact cached on disk,
            // promote that pick to full — and dismiss the modal — rather than
            // leaving a cached player stuck in basic mode behind a download offer.
            if (cached && prev.phase === 'on' && prev.model === 'grammar')
              return { ...prev, model: 'full' }
            return prev
          })
          if (cached) setModalOpen(false)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [engine])

  // Unmount cleanup ([I2]): a download in flight when the host unmounts (story
  // swap / navigate away) must not leave its stall timer to fire setState on a
  // dead tree, nor leak the multi-GB engine.load fetch. Empty deps → unmount only.
  useEffect(
    () => () => {
      if (stallTimerRef.current !== null) clearTimeout(stallTimerRef.current)
      abortRef.current?.abort()
    },
    [],
  )

  const requestDownload = useCallback(() => {
    setNotice(null)
    setModalOpen(false)
    // Abort any previous in-flight download FIRST ([L2]): re-picking a
    // language must not stack a second concurrent engine.load on top of the
    // old one (double VRAM on exactly the devices the capability gate
    // worries about). The engine releases the loser's resources. Route through
    // abortInFlight so a pending F-8 retry timer (which shares stallTimerRef) is
    // cleared too, not left to fire and null out the new download's watchdog (S2).
    abortInFlight()
    const ac = new AbortController()
    abortRef.current = ac
    setInternal({
      phase: 'downloading',
      language: pendingLangRef.current,
      loaded: 0,
      total: 0,
      etaSeconds: null,
    })
    // True once this load is no longer the active one — aborted (cancel) or
    // superseded by a newer requestDownload. A load that resolves on/around the
    // abort tick must NOT flip the state back to 'on' or persist a language against
    // the player's cancel (review I2).
    const stale = () => ac.signal.aborted || abortRef.current !== ac
    // No-progress watchdog (F6): a stalled fetch would otherwise sit in
    // 'downloading' forever. Reset on every progress tick; on genuine silence,
    // abort the load and surface a notice. abort() routes into the .catch's
    // stale/AbortError branch (which leaves the notice intact), so we set the
    // notice HERE before aborting.
    const clearStall = () => {
      if (stallTimerRef.current !== null) clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }
    const armStall = () => {
      clearStall()
      stallTimerRef.current = setTimeout(() => {
        if (stale()) return
        log.error('model download stalled — no progress, aborting')
        setNotice(modelDownloadStalled(pendingLangRef.current))
        setInternal({
          phase: 'on',
          language: pendingLangRef.current,
          model: 'grammar',
        })
        ac.abort()
      }, DOWNLOAD_STALL_MS)
    }
    // F-8: a transient (non-abort) load failure gets ONE automatic retry after a
    // backoff before degrading to grammar-only. `retriesLeft` is per-download
    // (this closure), so each fresh requestDownload starts with its own budget; a
    // supersede/cancel makes the next attempt stale() and is never retried.
    let retriesLeft = 1
    const attempt = () => {
      dlSamplesRef.current = [] // fresh ETA samples per attempt
      armStall()
      engine
        .load(p => {
          if (stale()) return
          armStall() // progress arrived — reset the no-progress timer
          dlSamplesRef.current = [
            ...dlSamplesRef.current,
            { pct: toPct(p.loaded, p.total), t: Date.now() },
          ].slice(-60)
          setInternal({
            phase: 'downloading',
            language: pendingLangRef.current,
            loaded: p.loaded,
            total: p.total,
            etaSeconds: estimateRemainingSeconds(dlSamplesRef.current),
          })
        }, ac.signal)
        .then(() => {
          // clearStall AFTER the stale() guard ([I1]): the stall timer lives in a
          // ref shared across the hook's lifetime, so a superseded load settling a
          // microtask after the re-pick must NOT clear the live download's watchdog.
          if (stale()) return
          clearStall()
          // The model is now loaded (hence cached) — mark installed directly so the
          // probe effect needn't re-run on the phase change to discover it (S6).
          setInstalled(true)
          // Activate the language the player picked when they triggered the modal.
          setInternal({
            phase: 'on',
            language: pendingLangRef.current,
            model: 'full',
          })
          writeNlPref({ language: pendingLangRef.current })
        })
        .catch(err => {
          if (stale() || (err as Error).name === 'AbortError') {
            // Aborted/superseded: whoever caused it (cancelDownload / a newer
            // requestDownload) already set the correct state — don't revert it.
            return
          }
          clearStall()
          if (retriesLeft > 0) {
            // Transient failure (F-8): retry once after a backoff rather than
            // degrade immediately. The pending retry reuses stallTimerRef — the
            // hook's single pending-timer slot — so abortInFlight / unmount
            // cancel it exactly as they cancel the stall watchdog.
            retriesLeft--
            log.warn(
              'model download failed — retrying once after backoff:',
              err,
            )
            stallTimerRef.current = setTimeout(() => {
              stallTimerRef.current = null
              if (!stale()) attempt()
            }, DOWNLOAD_RETRY_MS)
            return
          }
          // F7: this is the app's single network-egress risk — a genuine
          // (non-abort) load failure must reach the ring buffer / console, not
          // just the player notice, or the cause is undiagnosable.
          log.error('model download failed:', err)
          setNotice(modelDownloadFailed(pendingLangRef.current))
          setInternal({
            phase: 'on',
            language: pendingLangRef.current,
            model: 'grammar',
          })
        })
    }
    attempt()
  }, [engine, setNotice, abortInFlight])

  const cancelDownload = useCallback(() => {
    abortInFlight()
    setInternal({
      phase: 'on',
      language: pendingLangRef.current,
      model: 'grammar',
    })
    writeNlPref({ language: pendingLangRef.current })
  }, [abortInFlight])

  const declineDownload = useCallback(() => {
    setModalOpen(false)
    // "Not now" keeps grammar-only active (the pick already set on/grammar). The
    // declined flag only suppresses the unsolicited auto-modal on future picks;
    // re-discovery lives in the picker's "✦ improve" affordance.
    writeNlPref({ declined: true })
  }, [])

  const setLanguage = useCallback(
    (lang: NlLanguage) => {
      if (!hasVocab) return // hasVocab is the sole NL prerequisite
      // A new pick supersedes any download in progress ([C1]). Without this, an
      // in-flight load resolving after the pick would re-enable NL (and persist
      // a language) against the player's explicit choice — most visibly 'off'.
      abortInFlight()
      if (lang === 'off') {
        setInternal({ phase: 'off' }) // off is instant; model stays cached
        writeNlPref({ language: 'off' })
        return
      }
      writeNlPref({ language: lang })
      if (installed || engine.isLoaded()) {
        setInternal({ phase: 'on', language: lang, model: 'full' }) // cached → lazy full
        return
      }
      // No model yet: grammar-only is active immediately; offer the upgrade modal
      // ONCE (suppressed thereafter by the declined flag). Output-only languages
      // (Georgian, Phase 1) get NO modal — they have no input LLM to upgrade to,
      // and opening it here latched `modalOpen` true, masked only at render; a
      // later switch away unmasked it as an unsolicited focus-trapping download
      // ([I1]). The model-download egress must stay unreachable for ka.
      setInternal({ phase: 'on', language: lang, model: 'grammar' })
      pendingLangRef.current = lang
      if (!readNlPref().declined && !OUTPUT_ONLY_LANGS.has(lang))
        setModalOpen(true)
    },
    [hasVocab, installed, engine, abortInFlight],
  )

  const requestUpgrade = useCallback(() => {
    // Read the active language to download from `internal` directly, not inside a
    // setInternal updater (review S3): a state-updater must be pure, and mutating
    // a ref from it is a React-contract hazard (double-invoke in StrictMode).
    if (internal.phase === 'on') pendingLangRef.current = internal.language
    setModalOpen(true)
  }, [internal])

  const demoteToGrammar = useCallback(() => {
    setInternal(prev =>
      prev.phase === 'on' && prev.model === 'full'
        ? { ...prev, model: 'grammar' }
        : prev,
    )
  }, [])

  return {
    internal,
    installed,
    modalOpen,
    setLanguage,
    requestDownload,
    declineDownload,
    cancelDownload,
    requestUpgrade,
    demoteToGrammar,
  }
}
