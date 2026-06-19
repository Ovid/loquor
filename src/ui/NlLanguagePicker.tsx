import type { NlState, NlLanguage } from '../llm/types'
import { pct as toPct } from '../llm/progress'
import { basicChip, downloadingChip } from '../llm/notices'
import { LANGUAGE_OPTIONS as OPTIONS } from './languageOptions'
import { LanguageCombobox } from './LanguageCombobox'

/**
 * Status-bar language picker for the NL layer (replaces the old on/off toggle).
 * Picking a language with no cached model defers to the download modal: the
 * hook keeps phase 'off' and opens the modal; accepting activates THAT language.
 *
 * The dropdown itself is the shared LanguageCombobox (same control as the title
 * screen); this component adds the in-game framing: the combobox's
 * `aria-label="Language"`, the installed/basic chips, and the model-upgrade
 * affordance. (No visible "Language:" text — Task 10 removed it.)
 */
export function NlLanguagePicker({
  state,
  onSelect,
  onUpgrade,
  hideUpgrade = false,
}: {
  state: NlState
  onSelect: (lang: NlLanguage) => void
  /** Called when the player requests a model upgrade (grammar → full). */
  onUpgrade: () => void
  /** Output-only languages (OUTPUT_ONLY_LANGS, e.g. Georgian) translate the
   * DISPLAY but raw-send English input — there is no NL input to upgrade, so
   * the model offer is meaningless. Suppress it. */
  hideUpgrade?: boolean
}) {
  // No vocab for this game → silently render nothing (no picker).
  if (state.phase === 'disabled') return null
  if (state.phase === 'downloading') {
    const pct = toPct(state.loaded, state.total)
    return (
      <span className="nl-toggle" lang={state.language}>
        {downloadingChip(state.language)}… {pct}%
      </span>
    )
  }
  const value: NlLanguage = state.phase === 'on' ? state.language : 'off'
  const grammarOnly =
    state.phase === 'on' && state.model === 'grammar' && !hideUpgrade

  return (
    <span className="nl-toggle">
      <LanguageCombobox
        options={OPTIONS}
        value={value}
        onChange={onSelect}
        idBase="nl-lang"
        label="Language"
        // Tie the "basic mode" state to the combobox so a screen reader
        // announces it as the control's description (m3).
        describedById={grammarOnly ? 'nl-basic-state' : undefined}
      />
      {state.phase === 'off' && (
        <span className="nl-chip">
          {' '}
          <span className="sep" aria-hidden="true">
            ·
          </span>{' '}
          {state.installed ? 'installed' : 'not installed'}
        </span>
      )}
      {state.phase === 'on' && state.model === 'grammar' && !hideUpgrade && (
        <>
          {' '}
          <span className="sep" aria-hidden="true">
            ·
          </span>{' '}
          <span className="nl-basic" id="nl-basic-state" lang={state.language}>
            {basicChip(state.language)}
          </span>{' '}
          <button
            className="sw"
            type="button"
            // Bare "improve" has no object; name the action and its cost (M1).
            // The non-upgrade variant's visible text is already self-describing.
            aria-label={
              state.canUpgrade
                ? 'Improve natural-language input (download AI model)'
                : undefined
            }
            onClick={onUpgrade}
          >
            {state.canUpgrade ? (
              <>
                <span aria-hidden="true">✦</span> improve
              </>
            ) : (
              'try the model anyway'
            )}
          </button>
        </>
      )}
    </span>
  )
}
