// Interim shim — fetches zork1.z3 and passes bytes to Terminal.
// Full routing (game catalog, landing screen, theme) is Task 4.3.
import { useEffect, useState } from 'react'
import { Terminal } from './Terminal'

export default function App() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  useEffect(() => {
    fetch('/games/zork1.z3')
      .then(r => r.arrayBuffer())
      .then(b => setBytes(new Uint8Array(b)))
      .catch(err => console.error('failed to load story', err))
  }, [])
  if (!bytes) return <div className="screen">Loading…</div>
  return <Terminal storyBytes={bytes} onChangeVolume={() => {}} themeToggle={null} />
}
