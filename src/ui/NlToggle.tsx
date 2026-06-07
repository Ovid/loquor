import type { NlState } from '../llm/types'
import { pct as toPct } from '../llm/progress'

export function NlToggle({
  state,
  onToggle,
  onOverride,
}: {
  state: NlState
  onToggle: () => void
  onOverride: () => void
}) {
  // No grammar for this game → silently render nothing (no toggle, no override).
  if (state.phase === 'disabled') return null
  if (state.phase === 'unavailable') {
    return (
      <span
        className="nl-toggle"
        title={`unavailable: ${state.reasons.join(', ')}`}
      >
        English: unavailable{' '}
        <button className="sw" type="button" onClick={onOverride}>
          force-enable
        </button>
      </span>
    )
  }
  if (state.phase === 'downloading') {
    const pct = toPct(state.loaded, state.total)
    return <span className="nl-toggle">downloading… {pct}%</span>
  }
  const label =
    state.phase === 'on'
      ? 'English: on'
      : state.installed
        ? 'English: off · installed'
        : 'English: off · not installed'
  return (
    <button className="sw nl-toggle" type="button" onClick={onToggle}>
      {label}
    </button>
  )
}
