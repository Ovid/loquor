import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from 'react'
import { ZMachine } from '../zmachine/engine'
import { IdbDialog } from '../storage/dialog'
import { emptyView, type ViewState } from '../glkote-react/types'
import { StatusBar } from './StatusBar'
import { Scrollback } from './Scrollback'
import { CommandInput } from './CommandInput'
import { NlLanguagePicker } from './NlLanguagePicker'
import { ModelDownloadModal } from './ModelDownloadModal'
import { detectCapability } from '../llm/capability'
import { vocabForSignature } from '../llm/grammar/index'
import { viewToContext } from '../llm/prompt'
import { useNaturalLanguage } from '../llm/useNaturalLanguage'
import { useOutputTranslation } from '../translate/useOutputTranslation'
import { WebLlmEngine } from '../llm/engine.webllm'
import { selectedModelId } from '../llm/modelSelection'
import { EngineGate } from '../llm/engineGate'
import type { CapabilityResult, LoadProgress } from '../llm/types'

const WATCHDOG_MS = 8000 // starting value; tune at the gate

export function Terminal({
  storyBytes,
  onChangeStory,
  themeToggle,
}: {
  storyBytes: Uint8Array
  onChangeStory: () => void
  themeToggle: ReactNode
}) {
  const [view, setView] = useState<ViewState>(emptyView)
  const [signature, setSignature] = useState<string>('')
  const [capability, setCapability] = useState<CapabilityResult>({
    tier: 'none',
    reasons: [],
  })
  const [override, setOverride] = useState(false)
  const engineRef = useRef<ZMachine | null>(null)
  const viewRef = useRef<ViewState>(emptyView)
  const inputRef = useRef<HTMLInputElement>(null)
  // One stable LLM engine instance for this Terminal (created once, lazily). The
  // model id honors a ?model=full / VITE_LLM_MODEL override (else the default),
  // so the 8B multilingual model can be A/B tested without a rebuild.
  const [llmEngine] = useState(() => new WebLlmEngine(selectedModelId()))
  // One gate arbitrating the single engine between the NL input layer and the
  // output-translation fallback (input preempts; output-translation spec §6).
  const [gate] = useState(() => new EngineGate())

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

  useEffect(() => {
    let cancelled = false
    const engine = new ZMachine({
      dialog: new IdbDialog(),
      onState: v => {
        if (!cancelled) setView(v)
      },
    })
    engineRef.current = engine
    engine
      .boot(storyBytes)
      .then(sig => {
        if (!cancelled) setSignature(sig)
      })
      .catch(err => {
        if (!cancelled) console.error('boot failed', err)
      })
    return () => {
      cancelled = true
      engine.dispose()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [storyBytes])

  // Detect capability once (re-runs if the player forces an override).
  useEffect(() => {
    let cancelled = false
    detectCapability({ navigator: navigator as never }, override).then(c => {
      if (!cancelled) setCapability(c)
    })
    return () => {
      cancelled = true
    }
  }, [override])

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
    awaitTurn: () =>
      engineRef.current?.awaitTurn() ??
      Promise.resolve({ view: viewRef.current, reason: 'line' as const }),
    watchdogMs: WATCHDOG_MS,
    signature, // Task 21 consumes it (per-game noun lexicons); '' until boot resolves
    gate,
  })

  // Turn-boundary scene observation: when the VM is waiting for a line of input,
  // the previous turn's output block is complete. Feed it to the NL scene tracker
  // exactly once per turn (reduceScene dedups identical re-renders). Only meaningful
  // while NL is on, but observing harmlessly seeds the scene even when off.
  useEffect(() => {
    // During a compound sequence the hook owns observe (in-order, per-clause);
    // defer so an intermediate view isn't observed with a mismatched last command
    // (locked decision 9).
    if (nl.isSequencing()) return
    if (view.inputRequest === 'line') nl.observe(view)
  }, [view, nl])

  // Output translation (display overlay — spec §3): same language the input
  // layer is set to; passthrough for en/off.
  const xl = useOutputTranslation({
    view,
    language: nl.state.phase === 'on' ? nl.state.language : 'off',
    signature,
    engine: llmEngine,
    gate,
  })

  // Live download progress for the modal — derived from NL state during render
  // (no separate state or effect needed).
  const dlProgress: LoadProgress | null =
    nl.state.phase === 'downloading'
      ? { loaded: nl.state.loaded, total: nl.state.total, text: 'downloading' }
      : null

  useEffect(() => {
    if (view.inputRequest === 'char') engineRef.current?.ackMore()
  }, [view.inputRequest])

  return (
    <div className="screen term">
      <StatusBar
        status={xl.status}
        onChangeStory={onChangeStory}
        themeToggle={themeToggle}
        nlToggle={
          <NlLanguagePicker
            state={nl.state}
            onSelect={nl.setLanguage}
            onOverride={() => setOverride(true)}
          />
        }
      />
      <Scrollback lines={xl.lines} onActivate={() => inputRef.current?.focus()}>
        {/* Lines typed ahead while a translation runs (F-A): dimmed, chipped,
            drained FIFO by the hook. Keyed on the hook's monotonic id — the
            queue shifts from the FRONT, so index keys would re-point a node
            at a different line. */}
        {nl.queued.map(q => (
          <p key={q.id} className="nl-source">
            <span className="you">you</span> {q.text}
            <span className="chip">queued</span>
          </p>
        ))}
        {nl.pending && <p className="nl-thinking">…thinking</p>}
        {nl.notice && <p className="nl-notice">{nl.notice}</p>}
        <CommandInput
          inputRef={inputRef}
          onSubmit={text => {
            if (nl.state.phase === 'on') void nl.translate(text)
            else if (engineRef.current) engineRef.current.sendLine(text)
            // Practically unreachable (engine is set synchronously and input is
            // disabled until a line request), but warn rather than silently
            // swallow the turn if it ever happens (review S11).
            else console.warn('submit ignored: engine not ready')
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
      <ModelDownloadModal
        open={nl.modalOpen || nl.state.phase === 'downloading'}
        progress={dlProgress}
        etaSeconds={
          nl.state.phase === 'downloading' ? nl.state.etaSeconds : null
        }
        onAccept={nl.requestDownload}
        onDecline={nl.declineDownload}
        onCancel={nl.cancelDownload}
      />
    </div>
  )
}
