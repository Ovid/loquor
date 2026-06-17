import { useCallback, useEffect, useState } from 'react'
import { LS_KEYS } from '../storageKeys'

const KEY = LS_KEYS.debug

/**
 * Debug-view preference: whether NL-translated canonical echoes (`> up`) and the
 * `‹you›` pill are shown. Display-only — see PreferencesModal / Scrollback.
 * Validated on read; try/catch because localStorage itself throws when cookies
 * are blocked (mirrors useTheme).
 */
export function useDebug(): [boolean, () => void] {
  const [debug, setDebug] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      if (debug) localStorage.setItem(KEY, '1')
      else localStorage.removeItem(KEY)
    } catch {
      // Blocked/quota'd storage — the preference still applies, it just won't stick.
    }
  }, [debug])

  const toggle = useCallback(() => setDebug(d => !d), [])
  return [debug, toggle]
}
