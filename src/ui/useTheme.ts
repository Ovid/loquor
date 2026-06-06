import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'naitfol-theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(KEY) as Theme) ?? 'dark')

  useEffect(() => {
    if (theme === 'light') document.body.dataset.theme = 'light'
    else delete document.body.dataset.theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = useCallback(() => setTheme(t => (t === 'light' ? 'dark' : 'light')), [])
  return { theme, toggle }
}
