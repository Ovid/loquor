import { useEffect, useRef, useState } from 'react'
import { ZMachine } from '../zmachine/engine'
import type { ViewState } from '../glkote-react/types'
import { emptyView } from '../glkote-react/types'

export function SkeletonTerminal() {
  const [view, setView] = useState<ViewState>(emptyView)
  const engineRef = useRef<ZMachine | null>(null)
  const [cmd, setCmd] = useState('')

  useEffect(() => {
    const engine = new ZMachine({
      dialog: { streaming: false, autosave_read: () => null, autosave_write: () => {} } as any,
      onState: setView,
    })
    engineRef.current = engine
    fetch('/games/zork1.z3')
      .then(r => r.arrayBuffer())
      .then(b => engine.boot(new Uint8Array(b)))
    return () => { engineRef.current = null }
  }, [])

  // Auto-acknowledge MORE prompts.
  useEffect(() => { if (view.inputRequest === 'char') engineRef.current?.ackMore() },
    [view.inputRequest])

  return (
    <div style={{ fontFamily: 'monospace', padding: 16 }}>
      <div style={{ fontWeight: 'bold' }}>
        {view.status ? `${view.status.location}  —  ${view.status.right}` : ''}
      </div>
      <pre>{view.lines.map(l => l.text).join('\n')}</pre>
      <form onSubmit={e => { e.preventDefault(); engineRef.current?.sendLine(cmd); setCmd('') }}>
        &gt; <input value={cmd} onChange={e => setCmd(e.target.value)} autoFocus />
      </form>
    </div>
  )
}
