import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'naitfol-theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    // Validate the persisted value rather than trusting it: a corrupt/legacy
    // entry (e.g. "Light") would otherwise make the first toggle misbehave.
    localStorage.getItem(KEY) === 'light' ? 'light' : 'dark',
  )

  useEffect(() => {
    if (theme === 'light') document.body.dataset.theme = 'light'
    else delete document.body.dataset.theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = useCallback(
    () => setTheme(t => (t === 'light' ? 'dark' : 'light')),
    [],
  )
  return { theme, toggle }
}
