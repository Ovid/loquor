import { useEffect, useState } from 'react'
import { Landing } from './Landing'
import { Terminal } from './Terminal'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from './useTheme'
import { GAMES, gameBySlug, type Game } from '../games/catalog'
import { IdbDialog } from '../storage/dialog'
import { signature } from '../zmachine/signature'

export default function App() {
  const { toggle } = useTheme()
  const [slug, setSlug] = useState<Game['slug'] | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set())

  // Discover which games have a saved session (for the resume hint).
  useEffect(() => {
    const dialog = new IdbDialog()
    Promise.all(GAMES.map(async g => {
      const r = await fetch(g.file)
      const sig = signature(new Uint8Array(await r.arrayBuffer()))
      return (await dialog.hasSave(sig)) ? g.slug : null
    })).then(found => setSavedSlugs(new Set(found.filter(Boolean) as string[])))
  }, [])

  const enter = async (s: Game['slug']) => {
    const game = gameBySlug(s)!
    const r = await fetch(game.file)
    setBytes(new Uint8Array(await r.arrayBuffer()))
    setSlug(s)
  }

  const toggleEl = <ThemeToggle onToggle={toggle} />
  if (slug && bytes) {
    return <Terminal storyBytes={bytes} themeToggle={toggleEl}
      onChangeVolume={() => { setSlug(null); setBytes(null) }} />
  }
  return <Landing onEnter={enter} savedSlugs={savedSlugs} themeToggle={toggleEl} />
}
