import { useRef, useState, type ReactNode } from 'react'
import { GAMES, type Game } from '../games/catalog'
import { useFocusTrap } from './useFocusTrap'

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
  const dismissRef = useRef<HTMLButtonElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const volumesRef = useRef<HTMLDivElement>(null)

  // Radiogroup roving: arrows move selection AND focus among the volumes (APG
  // radio pattern), so the mutual exclusivity is operable by keyboard, not just
  // mouse. The selected radio is the only tab stop (roving tabindex).
  const onVolumeKey = (e: React.KeyboardEvent) => {
    const i = GAMES.findIndex(g => g.slug === selected)
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (delta === 0) return
    e.preventDefault()
    const nextIndex = (i + delta + GAMES.length) % GAMES.length
    setSelected(GAMES[nextIndex].slug)
    const radios =
      volumesRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')
    radios?.[nextIndex]?.focus()
  }

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
          <b>How to play.</b> Type what you want to do, the way the game expects
          it.
          <br />
          <span className="cmds">
            look · go north · open mailbox · take lamp · read leaflet ·
            inventory
          </span>
          <br />
          <span style={{ opacity: 0.75 }}>
            Your progress is kept; close the tab and return whenever you like.
          </span>
        </div>
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
        <button className="enter" onClick={() => onEnter(selected)}>
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
      </div>
    </Root>
  )
}
