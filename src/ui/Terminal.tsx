import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react'
import { ZMachine } from '../zmachine/engine'
import { IdbDialog } from '../storage/dialog'
import { emptyView, type ViewState } from '../glkote-react/types'
import { StatusBar } from './StatusBar'
import { Scrollback } from './Scrollback'
import { CommandInput } from './CommandInput'
import { NlToggle } from './NlToggle'
import { ModelDownloadModal } from './ModelDownloadModal'
import { detectCapability } from '../llm/capability'
import { grammarForSignature } from '../llm/grammar/index'
import { viewToContext } from '../llm/prompt'
import { useNaturalLanguage } from '../llm/useNaturalLanguage'
import { WebLlmEngine } from '../llm/engine.webllm'
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
  // One stable LLM engine instance for this Terminal (created once, lazily).
  const [llmEngine] = useState(() => new WebLlmEngine())

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

  const grammar = useMemo(
    () => (signature ? grammarForSignature(signature) : null),
    [signature],
  )

  const nl = useNaturalLanguage({
    engine: llmEngine,
    capability,
    grammar,
    getContext: () => viewToContext(viewRef.current),
    echoLocal: t => engineRef.current?.echoLocal(t),
    sendLine: t => engineRef.current?.sendLine(t),
    watchdogMs: WATCHDOG_MS,
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
        status={view.status}
        onChangeStory={onChangeStory}
        themeToggle={themeToggle}
        nlToggle={
          <NlToggle
            state={nl.state}
            onToggle={nl.toggle}
            onOverride={() => setOverride(true)}
          />
        }
      />
      <Scrollback
        lines={view.lines}
        onActivate={() => inputRef.current?.focus()}
      >
        {nl.pending && <p className="nl-thinking">…thinking</p>}
        {nl.notice && <p className="nl-notice">{nl.notice}</p>}
        <CommandInput
          inputRef={inputRef}
          onSubmit={text => {
            if (nl.state.phase === 'on') void nl.translate(text)
            else engineRef.current?.sendLine(text)
          }}
          disabled={nl.pending}
          awaitingKey={view.inputRequest === 'char'}
          awaitingLine={view.inputRequest === 'line'}
          onKey={key => engineRef.current?.sendChar(key)}
        />
      </Scrollback>
      <ModelDownloadModal
        open={nl.modalOpen || nl.state.phase === 'downloading'}
        progress={dlProgress}
        onAccept={nl.requestDownload}
        onDecline={nl.declineDownload}
        onCancel={nl.cancelDownload}
      />
    </div>
  )
}
