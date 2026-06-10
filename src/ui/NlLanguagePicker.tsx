import type { NlState, NlLanguage } from '../llm/types'
import { pct as toPct } from '../llm/progress'

const OPTIONS: { value: NlLanguage; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
]

/**
 * Status-bar language picker for the NL layer (replaces the old on/off toggle).
 * Picking a language with no cached model defers to the download modal: the
 * hook keeps phase 'off' and opens the modal; accepting activates THAT language.
 */
export function NlLanguagePicker({
  state,
  onSelect,
  onOverride,
}: {
  state: NlState
  onSelect: (lang: NlLanguage) => void
  onOverride: () => void
}) {
  // No grammar for this game → silently render nothing (no picker, no override).
  if (state.phase === 'disabled') return null
  if (state.phase === 'unavailable') {
    return (
      <span
        className="nl-toggle"
        title={`unavailable: ${state.reasons.join(', ')}`}
      >
        Language: unavailable{' '}
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
  const value: NlLanguage = state.phase === 'on' ? state.language : 'off'
  const chip =
    state.phase === 'off'
      ? state.installed
        ? ' · installed'
        : ' · not installed'
      : ''
  return (
    <label className="nl-toggle">
      Language:{' '}
      {/* Wrapper draws the brass chevron (::after) over the de-chromed
          native select — a background-image can't use theme tokens. */}
      <span className="nl-select">
        <select
          className="sw"
          value={value}
          onChange={e => onSelect(e.target.value as NlLanguage)}
        >
          {OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
      {chip}
    </label>
  )
}
