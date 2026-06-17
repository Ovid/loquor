import { useRef, useState, type ReactNode } from 'react'
import { GAMES, type Game } from '../games/catalog'
import { useFocusTrap } from './useFocusTrap'
import { readNlPref, writeNlPref, nlDisabledByChoice } from '../llm/nlpref'
import { LANGUAGE_OPTIONS } from './languageOptions'
import { LanguageCombobox } from './LanguageCombobox'
import { LANDING_EXAMPLES } from './landingExamples'
import { LANDING_STRINGS } from './landingStrings'
import type { NlLanguage } from '../llm/types'

// The title screen offers only the play languages, not "Off" (disabling the NL
// layer is an in-game advanced toggle, not a first-run choice): a new player is
// told to "type in plain language", so starting with the NL layer off would
// contradict the copy. A saved "off" preference therefore maps to English here.
const LANDING_LANGUAGES = LANGUAGE_OPTIONS.filter(o => o.value !== 'off')

/** APG radio-pattern roving: arrows move selection AND focus among the radios
 *  of the volumes group. `values` is the ordered option list; `groupRef` wraps
 *  the radios. */
function rovingRadioKeydown<T>(
  e: React.KeyboardEvent,
  values: readonly T[],
  current: T,
  setValue: (v: T) => void,
  groupRef: React.RefObject<HTMLElement | null>,
) {
  const delta =
    e.key === 'ArrowRight' || e.key === 'ArrowDown'
      ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        ? -1
        : 0
  if (delta === 0) return
  e.preventDefault()
  const i = values.indexOf(current)
  const next = (i + delta + values.length) % values.length
  setValue(values[next])
  groupRef.current
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
    ?.[next]?.focus()
}

export function Landing({
  onEnter,
  savedSlugs,
  themeToggle,
  loadError,
  onDismiss,
}: {
  onEnter: (slug: Game['slug']) => void
  savedSlugs: Set<string>
  themeToggle: ReactNode
  /** A story-load failure to surface (e.g. a missing/404'd game file). */
  loadError?: string | null
  /** When set, the landing renders as a dismissible overlay (the in-game
   *  "Change story" picker): it dims the running game behind it, traps Escape,
   *  and shows a control to return to where the player was. Omitted on the
   *  initial landing, which has no game to return to. */
  onDismiss?: () => void
}) {
  const [selected, setSelected] = useState<Game['slug']>('zork1')
  const [language, setLanguage] = useState<NlLanguage>(() => {
    const saved = readNlPref().language
    return saved === 'off' ? 'en' : saved
  })
  // Whether the player touched the picker this session, and whether they had an
  // explicit stored Off. Entering persists the language UNLESS a stored Off is
  // left untouched — that preserves an in-game "Off" across the landing while
  // still onboarding new players (and honouring any pick) into the shown
  // language (I1). Computed once (lazy initialiser).
  const [touched, setTouched] = useState(false)
  const [hadStoredOff] = useState(nlDisabledByChoice)
  // language is never 'off' on the landing, but the guard keeps the type narrow.
  const exampleLang = language === 'off' || language === 'en' ? 'en' : language
  const examples = LANDING_EXAMPLES[exampleLang]
  const s = LANDING_STRINGS[exampleLang]
  const dismissRef = useRef<HTMLButtonElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const volumesRef = useRef<HTMLDivElement>(null)

  // Radiogroup roving: arrows move selection AND focus among the volumes (APG
  // radio pattern), so the mutual exclusivity is operable by keyboard, not just
  // mouse. The selected radio is the only tab stop (roving tabindex).
  const onVolumeKey = (e: React.KeyboardEvent) =>
    rovingRadioKeydown(
      e,
      GAMES.map(g => g.slug),
      selected,
      setSelected,
      volumesRef,
    )

  // Overlay-only behaviour (the in-game "Change story" picker): Escape returns to
  // the game, focus lands on the dismiss control so a keyboard user can leave
  // immediately, and Tab is trapped inside the plate so focus can't wander into
  // the dimmed game behind it (aria-modal alone doesn't contain DOM focus).
  // Inactive on the initial landing (no onDismiss), keeping it plain/non-modal.
  // Shared with the download modal via useFocusTrap so the two can't drift (I2).
  useFocusTrap(plateRef, {
    active: !!onDismiss,
    onEscape: () => onDismiss?.(),
    initialFocusRef: dismissRef,
  })

  // The initial landing is the page's primary content → a <main> landmark (m1);
  // the in-game picker is an overlay dialog instead (handled on the plate).
  const Root = onDismiss ? 'div' : 'main'
  return (
    <Root className={`screen${onDismiss ? ' overlay' : ''}`}>
      <div
        className="plate"
        ref={plateRef}
        lang={exampleLang}
        // The plate carries localized copy with lang="de|fr|es" on an
        // <html lang="en"> page — exactly the cue Chrome's built-in translator
        // uses to auto-rewrite it to English (Safari doesn't auto-translate, so
        // it looked fine there). translate="no" tells the browser to leave the
        // player's chosen language alone. The "Loquor" wordmark/tagline are
        // lang="en" so they're untouched regardless.
        translate="no"
        role={onDismiss ? 'dialog' : undefined}
        aria-modal={onDismiss ? true : undefined}
        aria-label={onDismiss ? s.changeStory : undefined}
      >
        {onDismiss && (
          <button
            ref={dismissRef}
            className="dismiss"
            type="button"
            aria-label={s.returnToGame}
            onClick={onDismiss}
          >
            ✕
          </button>
        )}
        {themeToggle}
        <h1 className="title" lang="en">
          Loquor
        </h1>
        <p className="tagline" lang="en">
          to speak, and be understood, in the dark
        </p>
        <div className="howto">
          <b>{s.howToTitle}</b> {s.howToBody}
          <br />
          <span
            className="cmds"
            role="region"
            aria-label={s.commandExamples}
            aria-live="polite"
          >
            {examples.join(' · ')}
          </span>
          <br />
          <span style={{ opacity: 0.75 }}>{s.progressNote}</span>
        </div>
        <div className="langpick">
          <span className="langpick-label">{s.languageLabel}</span>{' '}
          <LanguageCombobox
            options={LANDING_LANGUAGES}
            value={language}
            onChange={l => {
              setLanguage(l)
              setTouched(true)
            }}
            idBase="landing-lang"
            // aria-label derived from the localized visible label (trailing colon/space
            // stripped) so the picker is announced in the player's own language.
            label={s.languageLabel.replace(/[:\s]+$/, '')}
          />
        </div>
        <p className="lang-caveat">{s.caveat}</p>
        <span className="label" id="descent-label">
          {s.descent}
        </span>
        {/* Mutually-exclusive story choice → a radiogroup, not independent
            aria-pressed toggles, so a screen reader conveys "1 of 3" and arrow
            keys work (M2). The group is named by the visible label. */}
        <div
          className="volumes"
          ref={volumesRef}
          role="radiogroup"
          aria-labelledby="descent-label"
          onKeyDown={onVolumeKey}
        >
          {GAMES.map(g => (
            <button
              key={g.slug}
              type="button"
              role="radio"
              className={`vol${selected === g.slug ? ' sel' : ''}`}
              aria-checked={selected === g.slug}
              tabIndex={selected === g.slug ? 0 : -1}
              onClick={() => setSelected(g.slug)}
            >
              <span className="num">{g.numeral}</span>
              <span className="nm">{s.subtitles[g.slug]}</span>
            </button>
          ))}
        </div>
        <button
          className="enter"
          onClick={() => {
            if (touched || !hadStoredOff) writeNlPref({ language })
            onEnter(selected)
          }}
        >
          {s.enter}
        </button>
        {savedSlugs.has(selected) && (
          <div className="resume">
            {/* Decorative return glyph — aria-hidden so a screen reader doesn't
                announce it as "leftwards arrow with hook" before the hint. */}
            <span aria-hidden="true">↩ </span>
            {s.resume}
          </div>
        )}
        {loadError && (
          <div className="loaderr" role="alert">
            {loadError}
          </div>
        )}
        <footer className="folio-footnote">
          {s.footer.trademark}{' '}
          <a
            href="https://opensource.microsoft.com/blog/2025/11/20/preserving-code-that-shaped-generations-zork-i-ii-and-iii-go-open-source/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {s.footer.licenseLinkText}
          </a>{' '}
          <a
            href="https://github.com/Ovid/loquor"
            target="_blank"
            rel="noopener noreferrer"
          >
            {s.footer.githubLinkText}
          </a>
          .
        </footer>
      </div>
    </Root>
  )
}
