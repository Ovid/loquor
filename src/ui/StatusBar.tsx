import type { ReactNode } from 'react'
import type { StatusLine } from '../glkote-react/types'

export function StatusBar({
  status,
  onChangeStory,
  themeToggle,
  nlToggle,
  inert = false,
}: {
  status: StatusLine | null
  onChangeStory: () => void
  themeToggle: ReactNode
  nlToggle?: ReactNode
  /** Make the bar inert while a modal/overlay is open (M9). */
  inert?: boolean
}) {
  return (
    <header className="statusbar" inert={inert}>
      {/* Location and score/moves are the v3 status line — they change every turn
          and never reach the transcript, so a screen-reader player has no other
          way to track them. aria-live wraps only the dynamic text, not the
          buttons, so a control press isn't announced as a status change (S2). */}
      <span className="loc" aria-live="polite">
        {status?.location ?? ''}
      </span>
      <span className="meta">
        <span aria-live="polite">{status?.right ?? ''}</span>
        <span className="sep" aria-hidden="true">
          ·
        </span>
        <button className="sw" type="button" onClick={onChangeStory}>
          <span aria-hidden="true">⌄</span> Change story
        </button>
        {nlToggle}
        {themeToggle}
      </span>
    </header>
  )
}
