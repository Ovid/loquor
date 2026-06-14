import { useCallback, useEffect, useState } from 'react'
import { LS_KEYS } from '../storageKeys'

export type Theme = 'dark' | 'light'
const KEY = LS_KEYS.theme

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Validate the persisted value rather than trusting it: a corrupt/legacy
    // entry (e.g. "Light") would otherwise make the first toggle misbehave.
    // try/catch ([K]): with cookies blocked, window.localStorage ITSELF
    // throws — an unguarded read here crashes the app at mount.
    try {
      return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    if (theme === 'light') document.body.dataset.theme = 'light'
    else delete document.body.dataset.theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Blocked/quota'd storage — the theme still applies, it just won't stick.
    }
  }, [theme])

  const toggle = useCallback(
    () => setTheme(t => (t === 'light' ? 'dark' : 'light')),
    [],
  )
  return { theme, toggle }
}
