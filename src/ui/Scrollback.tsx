import { useEffect, useRef } from 'react'
import type { BufferLine } from '../glkote-react/types'

export function Scrollback({ lines }: { lines: BufferLine[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo?.(0, ref.current.scrollHeight) }, [lines])
  return (
    <div className="scroll" ref={ref}>
      {lines.map(l => (
        <p key={l.id} className={l.kind === 'room' ? 'room' : l.kind === 'input' ? 'echo' : ''}>
          {l.kind === 'input' ? <><span className="car">&gt;</span> {l.text}</> : l.text}
        </p>
      ))}
    </div>
  )
}
