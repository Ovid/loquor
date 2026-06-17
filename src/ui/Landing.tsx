import { useRef, useState, type ReactNode } from 'react'
import { GAMES, type Game } from '../games/catalog'
import { useFocusTrap } from './useFocusTrap'
import { readNlPref, writeNlPref } from '../llm/nlpref'
import { LANGUAGE_OPTIONS } from './languageOptions'
import { LANDING_EXAMPLES } from './landingExamples'
import type { NlLanguage } from '../llm/types'

/** APG radio-pattern roving: arrows move selection AND focus among the radios
 *  of a group. Shared by the volumes group and the language group so they can't
 *  drift. `values` is the ordered option list; `groupRef` wraps the radios. */
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
  const [language, setLanguage] = useState<NlLanguage>(
    () => readNlPref().language,
  )
  // Off and English both show the English example set (Off = English raw-send).
  const exampleLang = language === 'off' || language === 'en' ? 'en' : language
  const examples = LANDING_EXAMPLES[exampleLang]
  const dismissRef = useRef<HTMLButtonElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const volumesRef = useRef<HTMLDivElement>(null)
  const langGroupRef = useRef<HTMLDivElement>(null)

  // Radiogroup roving: arrows move selection AND focus among the volumes (APG
  // radio pattern), so the mutual exclusivity is operable by keyboard, not just
  // mouse. The selected radio is the only tab stop (roving tabindex). Shared with
  // the language group via rovingRadioKeydown so the two can't drift.
  const onVolumeKey = (e: React.KeyboardEvent) =>
    rovingRadioKeydown(
      e,
      GAMES.map(g => g.slug),
      selected,
      setSelected,
      volumesRef,
    )
  const onLangKey = (e: React.KeyboardEvent) =>
    rovingRadioKeydown(
      e,
      LANGUAGE_OPTIONS.map(o => o.value),
      language,
      setLanguage,
      langGroupRef,
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
        role={onDismiss ? 'dialog' : undefined}
        aria-modal={onDismiss ? true : undefined}
        aria-label={onDismiss ? 'Change story' : undefined}
      >
        {onDismiss && (
          <button
            ref={dismissRef}
            className="dismiss"
            type="button"
            aria-label="Return to game"
            onClick={onDismiss}
          >
            ✕
          </button>
        )}
        {themeToggle}
        <h1 className="title">Loquor</h1>
        <p className="tagline">to speak, and be understood, in the dark</p>
        <div className="howto">
          <b>How to play.</b> Type what you want to do in plain language.
          <br />
          <span
            className="cmds"
            role="region"
            aria-label="Command examples"
            aria-live="polite"
          >
            {examples.join(' · ')}
          </span>
          <br />
          <span style={{ opacity: 0.75 }}>
            Your progress is kept; close the tab and return whenever you like.
          </span>
        </div>
        <div className="langpick">
          <span className="label" id="language-label">
            Language
          </span>
          <div
            className="lang-options"
            ref={langGroupRef}
            role="radiogroup"
            aria-labelledby="language-label"
            onKeyDown={onLangKey}
          >
            {LANGUAGE_OPTIONS.map(o => (
              <button
                key={o.value}
                type="button"
                role="radio"
                lang={o.lang}
                className={`lang-opt${language === o.value ? ' sel' : ''}`}
                aria-checked={language === o.value}
                tabIndex={language === o.value ? 0 : -1}
                onClick={() => setLanguage(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <p className="lang-caveat">
          Basic commands work now. To understand more of what you type, you can
          add an optional, experimental model — a one-time download that may not
          support every language.
        </p>
        <span className="label" id="descent-label">
          — choose your descent —
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
              <span className="nm">{g.subtitle}</span>
            </button>
          ))}
        </div>
        <button
          className="enter"
          onClick={() => {
            writeNlPref({ language })
            onEnter(selected)
          }}
        >
          Light the lamp →
        </button>
        {savedSlugs.has(selected) && (
          <div className="resume">
            ↩ a saved descent awaits — you will resume where you left off
          </div>
        )}
        {loadError && (
          <div className="loaderr" role="alert">
            {loadError}
          </div>
        )}
        <footer className="folio-footnote">
          Zork is a trademark of Activision Publishing, Inc. (a Microsoft
          company); the name and brand are not licensed here. The Zork I–III
          game code was released by Microsoft under the MIT License in 2025 —
          this project plays those open-source games.{' '}
          <a
            className="repo-link"
            href="https://github.com/Ovid/loquor"
            target="_blank"
            rel="noopener noreferrer"
          >
            View this project’s source on GitHub
          </a>
          .
        </footer>
      </div>
    </Root>
  )
}
