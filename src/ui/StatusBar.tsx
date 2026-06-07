import type { ReactNode } from 'react'
import type { StatusLine } from '../glkote-react/types'

export function StatusBar({
  status,
  onChangeStory,
  themeToggle,
  nlToggle,
}: {
  status: StatusLine | null
  onChangeStory: () => void
  themeToggle: ReactNode
  nlToggle?: ReactNode
}) {
  return (
    <div className="statusbar">
      <span className="loc">{status?.location ?? ''}</span>
      <span className="meta">
        <span>{status?.right ?? ''}</span>
        <span className="sep">·</span>
        <button className="sw" type="button" onClick={onChangeStory}>
          ⌄ Change story
        </button>
        {nlToggle}
        {themeToggle}
      </span>
    </div>
  )
}
