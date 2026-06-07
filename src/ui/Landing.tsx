import { useState, type ReactNode } from 'react'
import { GAMES, type Game } from '../games/catalog'

export function Landing({
  onEnter,
  savedSlugs,
  themeToggle,
  loadError,
}: {
  onEnter: (slug: Game['slug']) => void
  savedSlugs: Set<string>
  themeToggle: ReactNode
  /** A story-load failure to surface (e.g. a missing/404'd game file). */
  loadError?: string | null
}) {
  const [selected, setSelected] = useState<Game['slug']>('zork1')
  return (
    <div className="screen">
      <div className="plate">
        {themeToggle}
        <h1 className="title">Naitfol</h1>
        <p className="tagline">a spell of understanding, cast in the dark</p>
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
        <span className="label">— choose your descent —</span>
        <div className="volumes">
          {GAMES.map(g => (
            <button
              key={g.slug}
              type="button"
              className={`vol${selected === g.slug ? ' sel' : ''}`}
              aria-pressed={selected === g.slug}
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
    </div>
  )
}
