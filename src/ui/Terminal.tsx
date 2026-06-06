import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ZMachine } from '../zmachine/engine'
import { IdbDialog } from '../storage/dialog'
import { emptyView, type ViewState } from '../glkote-react/types'
import { StatusBar } from './StatusBar'
import { Scrollback } from './Scrollback'
import { CommandInput } from './CommandInput'

export function Terminal({
  storyBytes,
  onChangeVolume,
  themeToggle,
}: {
  storyBytes: Uint8Array
  onChangeVolume: () => void
  themeToggle: ReactNode
}) {
  const [view, setView] = useState<ViewState>(emptyView)
  const engineRef = useRef<ZMachine | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    const engine = new ZMachine({
      dialog: new IdbDialog(),
      onState: v => {
        if (!cancelled) setView(v)
      },
    })
    engineRef.current = engine
    engine.boot(storyBytes).catch(err => {
      if (!cancelled) console.error('boot failed', err)
    })
    return () => {
      cancelled = true
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [storyBytes])

  // Auto-ack display-owned [MORE] paging (no-ops for a genuine single-key prompt,
  // which is answered by a keystroke via CommandInput onKey → sendChar).
  useEffect(() => {
    if (view.inputRequest === 'char') engineRef.current?.ackMore()
  }, [view.inputRequest])

  return (
    <div className="screen term">
      <StatusBar
        status={view.status}
        onChangeVolume={onChangeVolume}
        themeToggle={themeToggle}
      />
      <Scrollback
        lines={view.lines}
        onActivate={() => inputRef.current?.focus()}
      >
        <CommandInput
          inputRef={inputRef}
          onSubmit={text => engineRef.current?.sendLine(text)}
          // Derived from view state (not engineRef) so we don't read a ref
          // during render. A pending char request is a genuine single-key
          // prompt here: glkapi emits no [MORE] paging, so inputRequest==='char'
          // ⇔ awaitingKey. 'line' drives refocus at each turn boundary.
          awaitingKey={view.inputRequest === 'char'}
          awaitingLine={view.inputRequest === 'line'}
          onKey={key => engineRef.current?.sendChar(key)}
        />
      </Scrollback>
    </div>
  )
}
