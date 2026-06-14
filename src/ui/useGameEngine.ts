/**
 * Game-loop coordination hooks, extracted from the `Terminal` view (F-17).
 *
 * `Terminal.tsx` had grown past a view: it constructed the engine, ran the
 * boot/dispose lifecycle, drove device-capability detection, and implemented the
 * subtle turn-boundary scene-observation gate — core game-loop logic living
 * inside component effects. These hooks move that coordination out of the view
 * into one testable module so the component is left wiring presentation to state.
 *
 * They are intentionally small and single-purpose; co-located because each is a
 * slice of the same "drive the game loop" concern Terminal used to own inline.
 */
import { useEffect, useRef, useState } from 'react'
import { ZMachine } from '../zmachine/engine'
import { IdbDialog } from '../storage/dialog'
import { emptyView, type ViewState } from '../glkote-react/types'
import { detectCapability } from '../llm/capability'
import type { CapabilityResult } from '../llm/types'
import type { UseNaturalLanguage } from '../llm/useNaturalLanguage'
import { createLogger } from '../logger'

const log = createLogger('ui')

/**
 * Own the ZMachine lifecycle for one story: construct it (with its IndexedDB
 * Dialog), boot it, stream view updates, and dispose it on unmount or story
 * change. `engineRef` is exposed for the input seams (echo/sendLine/awaitTurn)
 * and char-ack. The StrictMode-safe `dispose()` in cleanup stops a throwaway
 * engine persisting stale autosaves behind the live one's back.
 */
export function useGameEngine(storyBytes: Uint8Array): {
  view: ViewState
  signature: string
  engineRef: React.RefObject<ZMachine | null>
} {
  const [view, setView] = useState<ViewState>(emptyView)
  const [signature, setSignature] = useState<string>('')
  const engineRef = useRef<ZMachine | null>(null)

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
        if (!cancelled) log.error('boot failed', err)
      })
    return () => {
      cancelled = true
      engine.dispose()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [storyBytes])

  return { view, signature, engineRef }
}

/**
 * Detect the device's LLM capability tier once, re-running when the player forces
 * an override (the NL picker's "try anyway").
 */
export function useCapability(override: boolean): CapabilityResult {
  const [capability, setCapability] = useState<CapabilityResult>({
    tier: 'none',
    reasons: [],
  })
  useEffect(() => {
    let cancelled = false
    detectCapability({ navigator: navigator as never }, override).then(c => {
      if (!cancelled) setCapability(c)
    })
    return () => {
      cancelled = true
    }
  }, [override])
  return capability
}

/**
 * Turn-boundary scene observation: when the VM is waiting for a line of input,
 * the previous turn's output block is complete — feed it to the NL scene tracker
 * exactly once per turn (`reduceScene` dedups identical re-renders). During a
 * compound sequence the hook owns `observe` (in-order, per-clause), so defer to
 * it (locked decision 9) to avoid observing an intermediate view with a
 * mismatched last command.
 */
export function useSceneObservation(
  nl: Pick<UseNaturalLanguage, 'isSequencing' | 'observe'>,
  view: ViewState,
): void {
  useEffect(() => {
    if (nl.isSequencing()) return
    if (view.inputRequest === 'line') nl.observe(view)
  }, [view, nl])
}
