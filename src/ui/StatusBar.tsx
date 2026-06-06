import type { ReactNode } from 'react'
import type { StatusLine } from '../glkote-react/types'

export function StatusBar({ status, onChangeVolume, themeToggle }: {
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
        <span className="sw" onClick={onChangeVolume}>⌄ change volume</span>
        {themeToggle}
      </span>
    </div>
  )
}
