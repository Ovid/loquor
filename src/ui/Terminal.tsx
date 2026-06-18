import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { ViewState } from '../glkote-react/types'
import { StatusBar } from './StatusBar'
import { Scrollback } from './Scrollback'
import { CommandInput } from './CommandInput'
import { NlLanguagePicker } from './NlLanguagePicker'
import { ModelDownloadModal } from './ModelDownloadModal'
import { PreferencesModal, prefsOpenLabel } from './PreferencesModal'
import { useDebug } from './useDebug'
import {
  useGameEngine,
  useCapability,
  useSceneObservation,
} from './useGameEngine'
import { vocabForSignature } from '../llm/grammar/index'
import { viewToContext } from '../llm/prompt'
import {
  thinking,
  queuedChip,
  commandLabel,
  commandPlaceholder,
} from '../llm/notices'
import { useNaturalLanguage } from '../llm/useNaturalLanguage'
import { useOutputTranslation } from '../translate/useOutputTranslation'
import { corpusFor } from '../translate/corpus/index'
import { loudEchoToken } from '../translate/loudEcho'
import { WebLlmEngine } from '../llm/engine.webllm'
import { selectedModelId } from '../llm/modelSelection'
import { EngineGate } from '../shared/engineGate'
import { GENERATE_WATCHDOG_MS } from '../llm/config'
import type { LoadProgress } from '../llm/types'
import { OUTPUT_ONLY_LANGS } from '../llm/types'
import { createLogger } from '../logger'

const log = createLogger('ui')

export function Terminal({
  storyBytes,
  storyTitle,
  onChangeStory,
  themeToggle,
  backgroundInert = false,
}: {
  storyBytes: Uint8Array
  /** The current game's title — the game screen's heading for screen readers. */
  storyTitle: string
  onChangeStory: () => void
  themeToggle: ReactNode
  /** True while the change-story overlay covers the game — makes the whole
   *  terminal inert so a screen-reader virtual cursor can't read it (M9). */
  backgroundInert?: boolean
}) {
  // Game-loop coordination lives in extracted hooks (F-17): the ZMachine
  // boot/dispose lifecycle and device-capability detection.
  const { view, signature, engineRef } = useGameEngine(storyBytes)
  const capability = useCapability()
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
  // A line a failed translation discarded, handed to CommandInput to restore so
  // the player can edit it instead of retyping (M8). `key` bumps per failure.
  const [restore, setRestore] = useState<{ text: string; key: number } | null>(
    null,
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
    sendCanonical: t => engineRef.current?.sendLineCanonical(t),
    recordEcho,
    awaitTurn: () =>
      engineRef.current?.awaitTurn() ??
      Promise.resolve({ view: viewRef.current, reason: 'line' as const }),
    watchdogMs: GENERATE_WATCHDOG_MS,
    signature, // Task 21 consumes it (per-game noun lexicons); '' until boot resolves
    gate,
  })

  const [debug, toggleDebug] = useDebug()
  const [prefsOpen, setPrefsOpen] = useState(false)

  // Turn-boundary scene observation (extracted, F-17): feed each completed turn
  // to the NL scene tracker, deferring to the hook during a compound sequence.
  useSceneObservation(nl, view)

  // The active OUTPUT language drives the display overlay (incl. output-only
  // languages like Georgian). `outputOnly` languages (OUTPUT_ONLY_LANGS) have a
  // display corpus but no INPUT support yet (Phase 1): they translate output but
  // raw-send English from the command field — exactly as 'off' does — so NL
  // *input* is engaged only for a fully-supported on-language (`nlInputOn`).
  const outLang = nl.state.phase === 'on' ? nl.state.language : 'off'
  const outputOnly = outLang !== 'off' && OUTPUT_ONLY_LANGS.has(outLang)
  const nlInputOn = nl.state.phase === 'on' && !outputOnly

  // Output translation (display overlay — spec §3): the language the player
  // picked drives the overlay (including output-only languages); passthrough
  // for en/off.
  const xl = useOutputTranslation({
    view,
    language: outLang,
    signature,
    engine: llmEngine,
    gate,
    echoMap,
  })

  // The active NL language: `activeLang` (incl. 'en') localizes copy; `nlLang`
  // is undefined for English so only non-English text carries a lang attribute,
  // letting a screen reader pronounce it right (3.1.2).
  const activeLang = nl.state.phase === 'on' ? nl.state.language : 'en'
  const nlLang = activeLang !== 'en' ? activeLang : undefined

  // First-class a11y (spec §5): a Georgian player is told, in their own language
  // and English, that the translation is beta and may show English. Rendered in
  // the existing role=status live region (no new live region). Gated on the
  // CURRENT game actually having a Georgian corpus — otherwise (e.g. Zork II/III,
  // which have no ka corpus and display fully in English) the "beta translation"
  // claim would be misleading; the Landing "English only" badge is the honest
  // cue there instead. The corpus appears once the story signature resolves at
  // boot, so the notice surfaces alongside the first translated output.
  const showBetaNotice =
    outLang === 'ka' && corpusFor(signature, 'ka') !== null

  // Live download progress for the modal — derived from NL state during render
  // (no separate state or effect needed).
  const dlProgress: LoadProgress | null =
    nl.state.phase === 'downloading'
      ? // text is unused by the localized modal (review I3); only loaded/total are.
        { loaded: nl.state.loaded, total: nl.state.total, text: '' }
      : null

  useEffect(() => {
    if (view.inputRequest === 'char') engineRef.current?.ackMore()
    // engineRef is a stable RefObject (from useGameEngine); listed to satisfy
    // exhaustive-deps now that it's a hook return rather than a local useRef.
  }, [view.inputRequest, engineRef])

  // The upgrade/download modal is suppressed for output-only languages (it does
  // nothing for them). Single source so the modal's visibility and the
  // background-inert/focus-trap state can never drift apart.
  const upgradeModalOpen = nl.modalOpen && !outputOnly

  // The download/upgrade modal is open — everything behind it must be inert so
  // a screen-reader virtual cursor stays inside the dialog (aria-modal alone is
  // unevenly honored). The modal is a sibling below, so it stays operable (M9).
  const modalOpen =
    upgradeModalOpen || nl.state.phase === 'downloading' || prefsOpen
  const bgInert = backgroundInert || modalOpen

  return (
    <div className="screen term" inert={backgroundInert}>
      <h1 className="sr-only">{storyTitle}</h1>
      <StatusBar
        status={xl.status}
        onChangeStory={onChangeStory}
        themeToggle={themeToggle}
        inert={bgInert}
        nlToggle={
          <NlLanguagePicker
            state={nl.state}
            onSelect={nl.setLanguage}
            onUpgrade={nl.requestUpgrade}
            hideUpgrade={outputOnly}
          />
        }
        prefsToggle={
          <button
            className="sw"
            type="button"
            aria-label={prefsOpenLabel(activeLang)}
            onClick={() => setPrefsOpen(true)}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        }
      />
      <main className="term-main" inert={bgInert}>
        <Scrollback
          lines={xl.lines}
          debug={debug}
          onActivate={() => inputRef.current?.focus()}
        >
          {/* Lines typed ahead while a translation runs (F-A): dimmed, chipped,
            drained FIFO by the hook. Keyed on the hook's monotonic id — the
            queue shifts from the FRONT, so index keys would re-point a node
            at a different line. */}
          {nl.queued.map(q => (
            <p key={q.id} className="nl-source" lang={nlLang}>
              {/* Match the marker Scrollback commits to, gated on debug, so a
                  line doesn't relabel (you-pill ↔ '>') as it drains (S1). */}
              {debug ? (
                <span className="you-pill" lang="en">
                  you
                </span>
              ) : (
                <span className="car">&gt;</span>
              )}{' '}
              {q.text}
              <span className="chip" lang={nlLang}>
                {queuedChip(activeLang)}
              </span>
            </p>
          ))}
          {/* Transient NL status — the thinking indicator and abstain/timeout
              notices — in a dedicated role=status region (S1), not the role=log
              transcript: a screen reader announces them as status updates so a
              silent abstain (common in FR/DE/ES) is heard. Always mounted so the
              live region is registered before a notice appears. */}
          <div role="status" aria-live="polite" className="nl-status">
            {showBetaNotice && (
              // Bilingual notice: each half carries its own lang so a screen
              // reader voices the English half with English phonemes, not
              // Georgian (3.1.2 — review I1).
              <p className="nl-notice">
                <span lang="ka">
                  ქართული თარგმანი ჯერ სატესტოა — ზოგი ტექსტი შეიძლება ინგლისურად
                  გამოჩნდეს.
                </span>{' '}
                <span lang="en">
                  Georgian is a beta translation; some text may still appear in
                  English.
                </span>
              </p>
            )}
            {nl.pending && (
              <p className="nl-thinking" lang={nlLang}>
                {thinking(activeLang)}
              </p>
            )}
            {nl.notice && (
              <p className="nl-notice" lang={nlLang}>
                {nl.notice}
              </p>
            )}
          </div>
          <CommandInput
            inputRef={inputRef}
            // When an NL language is on, the field accepts plain language — say
            // so in the label/placeholder, or the headline feature stays hidden
            // behind classic-parser copy (S3). Localized; English when off.
            label={nlInputOn ? commandLabel(activeLang) : 'Game command'}
            placeholder={
              nlInputOn ? commandPlaceholder(activeLang) : 'type a command…'
            }
            lang={nlInputOn ? nlLang : undefined}
            restore={restore ?? undefined}
            onSubmit={text => {
              // The Loud Room echo is re-voiced per clause via recordEcho as the
              // pipeline sends each canonical command (loudEcho / F6).
              // Output-only languages (Georgian, Phase 1) are NOT nlInputOn: the
              // field raw-sends English even while the display is translated.
              if (nlInputOn)
                void nl.translate(text).then(retained => {
                  // Non-EN abstain/timeout/failure sent nothing — restore the
                  // discarded line so it isn't lost (M8).
                  if (retained != null)
                    setRestore(r => ({
                      text: retained,
                      key: (r?.key ?? 0) + 1,
                    }))
                })
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
        open={upgradeModalOpen || nl.state.phase === 'downloading'}
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
      <PreferencesModal
        open={prefsOpen}
        debug={debug}
        lang={activeLang}
        onToggleDebug={toggleDebug}
        onClose={() => setPrefsOpen(false)}
      />
    </div>
  )
}
