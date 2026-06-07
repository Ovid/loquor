import type { ReactNode } from 'react'
import type { StatusLine } from '../glkote-react/types'

export function StatusBar({
  status,
  onChangeVolume,
  themeToggle,
}: {
  status: StatusLine | null
  onChangeVolume: () => void
  themeToggle: ReactNode
}) {
  return (
    <div className="statusbar">
      <span className="loc">{status?.location ?? ''}</span>
      <span className="meta">
        <span>{status?.right ?? ''}</span>
        <span className="sep">·</span>
        <button className="sw" type="button" onClick={onChangeVolume}>
          ⌄ change volume
        </button>
        {themeToggle}
      </span>
    </div>
  )
}
