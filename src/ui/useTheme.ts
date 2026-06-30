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
      return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  // Apply the theme to the DOM. Deliberately does NOT write localStorage:
  // persisting on mount would freeze the current default into storage on a
  // visitor's first load, so a later change to the default (e.g. dark→light)
  // could never reach anyone who'd already opened the app. Persistence happens
  // only on an explicit toggle, below.
  useEffect(() => {
    if (theme === 'dark') document.body.dataset.theme = 'dark'
    else delete document.body.dataset.theme
  }, [theme])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Blocked/quota'd storage — the theme still applies, it just won't stick.
    }
    setTheme(next)
  }, [theme])
  return { theme, toggle }
}
