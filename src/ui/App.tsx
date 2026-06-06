import { useEffect, useState } from 'react'
import { Landing } from './Landing'
import { Terminal } from './Terminal'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from './useTheme'
import { GAMES, gameBySlug, type Game } from '../games/catalog'
import { IdbDialog } from '../storage/dialog'
import { signature } from '../zmachine/signature'

/** Fetch a story file, failing loud on a 404/short body rather than feeding a
 *  non-story buffer into the VM. `fetch` resolves (does not reject) on HTTP
 *  errors, so the `r.ok` check is essential. */
async function loadStory(file: string): Promise<Uint8Array> {
  const r = await fetch(file)
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${file}`)
  const bytes = new Uint8Array(await r.arrayBuffer())
  if (bytes.length < 0x1e) throw new Error(`${file} is too short to be a game`)
  return bytes
}

export default function App() {
  const { toggle } = useTheme()
  const [slug, setSlug] = useState<Game['slug'] | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set())
  const [loadError, setLoadError] = useState<string | null>(null)

  // Discover which games have a saved session (for the resume hint). Re-run
  // whenever we return to the landing screen (slug === null) so the hint
  // reflects a save just made or cleared. A per-game fetch that fails simply
  // yields no hint for that game rather than crashing the mount.
  useEffect(() => {
    if (slug !== null) return
    let cancelled = false
    const dialog = new IdbDialog()
    Promise.all(
      GAMES.map(async g => {
        try {
          const sig = signature(await loadStory(g.file))
          return (await dialog.hasSave(sig)) ? g.slug : null
        } catch {
          return null
        }
      }),
    ).then(found => {
      if (!cancelled)
        setSavedSlugs(new Set(found.filter(Boolean) as string[]))
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  const enter = async (s: Game['slug']) => {
    const game = gameBySlug(s)!
    setLoadError(null)
    try {
      setBytes(await loadStory(game.file))
      setSlug(s)
    } catch (err) {
      console.error('story load failed', err)
      setLoadError(`“${game.title}” could not be loaded. Please try again.`)
    }
  }

  const toggleEl = <ThemeToggle onToggle={toggle} />
  if (slug && bytes) {
    return (
      <Terminal
        storyBytes={bytes}
        themeToggle={toggleEl}
        onChangeVolume={() => {
          setSlug(null)
          setBytes(null)
        }}
      />
    )
  }
  return (
    <Landing
      onEnter={enter}
      savedSlugs={savedSlugs}
      themeToggle={toggleEl}
      loadError={loadError}
    />
  )
}
