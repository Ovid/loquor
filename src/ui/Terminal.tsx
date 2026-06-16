import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { ViewState } from '../glkote-react/types'
import { StatusBar } from './StatusBar'
import { Scrollback } from './Scrollback'
import { CommandInput } from './CommandInput'
import { NlLanguagePicker } from './NlLanguagePicker'
import { ModelDownloadModal } from './ModelDownloadModal'
import {
  useGameEngine,
  useCapability,
  useSceneObservation,
} from './useGameEngine'
import { vocabForSignature } from '../llm/grammar/index'
import { viewToContext } from '../llm/prompt'
import { useNaturalLanguage } from '../llm/useNaturalLanguage'
import { useOutputTranslation } from '../translate/useOutputTranslation'
import { loudEchoToken } from '../translate/loudEcho'
import { WebLlmEngine } from '../llm/engine.webllm'
import { selectedModelId } from '../llm/modelSelection'
import { EngineGate } from '../shared/engineGate'
import { GENERATE_WATCHDOG_MS } from '../llm/config'
import type { LoadProgress } from '../llm/types'
import { createLogger } from '../logger'

const log = createLogger('ui')

export function Terminal({
  storyBytes,
  storyTitle,
  onChangeStory,
  themeToggle,
}: {
  storyBytes: Uint8Array
  /** The current game's title — the game screen's heading for screen readers. */
  storyTitle: string
  onChangeStory: () => void
  themeToggle: ReactNode
}) {
  // Game-loop coordination lives in extracted hooks (F-17): the ZMachine
  // boot/dispose lifecycle and device-capability detection.
  const { view, signature, engineRef } = useGameEngine(storyBytes)
  const capability = useCapability(false)
  const viewRef = useRef<ViewState>(view)
  const inputRef = useRef<HTMLInputElement>(null)
  // One stable LLM engine instance for this Terminal (created once, lazily). The
  // model id honors a ?model=full / VITE_LLM_MODEL override (else the default),
  // so the 8B multilingual model can be A/B tested without a rebuild.
  const [llmEngine] = useState(() => new WebLlmEngine(selectedModelId()))
  // One gate arbitrating the single engine between the NL input layer and the
  // output-translation fallback (input preempts; output-translation spec §6).
  const [gate] = useState(() => new EngineGate())
  // Canonical-word → player-word map, fed to the output overlay so the Loud Room
  // input-echo renders in the player's language (loudEcho / UAT F6). Each entry
  // is recorded as a clause is sent (recordEcho), so a compound's clauses each
  // re-voice from their own word.
  // Two clauses that share a canonical last word (e.g. "coge la barra" and
  // "agarra barra" both → "take bar") collide on the key "bar"; last writer wins
  // (review F2). That's harmless: the echo line carries ONLY the canonical word,
  // so no finer key exists, and the overlay FREEZES each echo line's decision
  // synchronously at emit (echoFreeze) — the map already holds the producing
  // clause's word when its echo first renders, before any later clause overwrites.
  const [echoMap, setEchoMap] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  )
  const recordEcho = useCallback((canonical: string, source: string) => {
    const k = loudEchoToken(canonical)
    const v = loudEchoToken(source)
    if (k === '' || v === '') return
    setEchoMap(prev => (prev.get(k) === v ? prev : new Map(prev).set(k, v)))
  }, [])

  // Keep a ref to the latest view so the NL hook's getContext() can read it at
  // translate-time. Written in an effect (not during render) per react-hooks/refs.
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // Release the model's GPU/worker resources when the Terminal unmounts (leaving
  // the game, or a hot-reload). The instance is stable, so this fires on unmount
  // only — story changes reuse it (review S1).
  useEffect(() => {
    return () => {
      void llmEngine.unload()
    }
  }, [llmEngine])

  const vocab = useMemo(
    () => (signature ? vocabForSignature(signature) : null),
    [signature],
  )

  // Memoized so it doesn't defeat translate()'s useCallback identity each render
  // (review S9). viewRef is stable, so an empty dep list is correct.
  const getContext = useCallback(() => viewToContext(viewRef.current), [])

  const nl = useNaturalLanguage({
    engine: llmEngine,
    capability,
    vocab,
    getContext,
    echoLocal: t => engineRef.current?.echoLocal(t),
    sendLine: t => engineRef.current?.sendLine(t),
    recordEcho,
    awaitTurn: () =>
      engineRef.current?.awaitTurn() ??
      Promise.resolve({ view: viewRef.current, reason: 'line' as const }),
    watchdogMs: GENERATE_WATCHDOG_MS,
    signature, // Task 21 consumes it (per-game noun lexicons); '' until boot resolves
    gate,
  })

  // Turn-boundary scene observation (extracted, F-17): feed each completed turn
  // to the NL scene tracker, deferring to the hook during a compound sequence.
  useSceneObservation(nl, view)

  // Output translation (display overlay — spec §3): same language the input
  // layer is set to; passthrough for en/off.
  const xl = useOutputTranslation({
    view,
    language: nl.state.phase === 'on' ? nl.state.language : 'off',
    signature,
    engine: llmEngine,
    gate,
    echoMap,
  })

  // The active non-English NL language, for tagging the player's queued input
  // and the localized notice so a screen reader pronounces them right (3.1.2).
  const nlLang =
    nl.state.phase === 'on' && nl.state.language !== 'en'
      ? nl.state.language
      : undefined

  // Live download progress for the modal — derived from NL state during render
  // (no separate state or effect needed).
  const dlProgress: LoadProgress | null =
    nl.state.phase === 'downloading'
      ? { loaded: nl.state.loaded, total: nl.state.total, text: 'downloading' }
      : null

  useEffect(() => {
    if (view.inputRequest === 'char') engineRef.current?.ackMore()
    // engineRef is a stable RefObject (from useGameEngine); listed to satisfy
    // exhaustive-deps now that it's a hook return rather than a local useRef.
  }, [view.inputRequest, engineRef])

  return (
    <div className="screen term">
      <h1 className="sr-only">{storyTitle}</h1>
      <StatusBar
        status={xl.status}
        onChangeStory={onChangeStory}
        themeToggle={themeToggle}
        nlToggle={
          <NlLanguagePicker
            state={nl.state}
            onSelect={nl.setLanguage}
            onUpgrade={nl.requestUpgrade}
          />
        }
      />
      <main className="term-main">
        <Scrollback
          lines={xl.lines}
          onActivate={() => inputRef.current?.focus()}
        >
          {/* Lines typed ahead while a translation runs (F-A): dimmed, chipped,
            drained FIFO by the hook. Keyed on the hook's monotonic id — the
            queue shifts from the FRONT, so index keys would re-point a node
            at a different line. */}
          {nl.queued.map(q => (
            <p key={q.id} className="nl-source" lang={nlLang}>
              <span className="you" lang="en">
                you
              </span>{' '}
              {q.text}
              <span className="chip" lang="en">
                queued
              </span>
            </p>
          ))}
          {nl.pending && <p className="nl-thinking">…thinking</p>}
          {nl.notice && (
            <p className="nl-notice" lang={nlLang}>
              {nl.notice}
            </p>
          )}
          <CommandInput
            inputRef={inputRef}
            onSubmit={text => {
              // The Loud Room echo is re-voiced per clause via recordEcho as the
              // pipeline sends each canonical command (loudEcho / F6).
              if (nl.state.phase === 'on') void nl.translate(text)
              else if (engineRef.current) engineRef.current.sendLine(text)
              // Practically unreachable (engine is set synchronously and input is
              // disabled until a line request), but warn rather than silently
              // swallow the turn if it ever happens (review S11).
              else log.warn('submit ignored: engine not ready')
            }}
            // Never pending-disabled ([M]): while NL is on, typed-ahead lines
            // queue (F-A); when NL is off/left mid-drain, typing raw-sends —
            // pending could only become true under phase 'on', so disabling on
            // `pending && phase !== 'on'` locked the player out exactly when a
            // wedged or slow drain coincided with switching NL off.
            awaitingKey={view.inputRequest === 'char'}
            awaitingLine={view.inputRequest === 'line'}
            onKey={key => engineRef.current?.sendChar(key)}
          />
        </Scrollback>
      </main>
      <ModelDownloadModal
        open={nl.modalOpen || nl.state.phase === 'downloading'}
        warn={
          (nl.state.phase === 'on' || nl.state.phase === 'off') &&
          !nl.state.canUpgrade
        }
        progress={dlProgress}
        etaSeconds={
          nl.state.phase === 'downloading' ? nl.state.etaSeconds : null
        }
        lang={
          nl.state.phase === 'on' || nl.state.phase === 'downloading'
            ? nl.state.language
            : 'en'
        }
        onAccept={nl.requestDownload}
        onDecline={nl.declineDownload}
        onCancel={nl.cancelDownload}
      />
    </div>
  )
}
