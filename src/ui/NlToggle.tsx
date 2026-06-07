import type { NlState } from '../llm/types'

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
      <span className="nl-toggle" title={`unavailable: ${state.reasons.join(', ')}`}>
        English: unavailable{' '}
        <button className="sw" type="button" onClick={onOverride}>
          force-enable
        </button>
      </span>
    )
  }
  if (state.phase === 'downloading') {
    const pct = state.total > 0 ? Math.round((state.loaded / state.total) * 100) : 0
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
