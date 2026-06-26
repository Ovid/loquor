import { useCallback, useEffect, useState } from 'react'
import { LS_KEYS } from '../storageKeys'

const KEY = LS_KEYS.llm

/**
 * LLM-fallback preference: whether the experimental WebLLM natural-language layer
 * (richer input understanding + the LLM output-translation fallback) is exposed.
 * Default OFF (hidden) — the deterministic grammar-only / corpus-only floor is
 * the baseline; turning this on restores the model, its download modal, and its
 * affordances. A clone of useDebug (same persistence contract): localStorage '1'
 * when on, key removed when off; try/catch because storage throws when cookies
 * are blocked.
 */
export function useLlmFeature(): [boolean, () => void] {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      if (enabled) localStorage.setItem(KEY, '1')
      else localStorage.removeItem(KEY)
    } catch {
      // Blocked/quota'd storage — the preference still applies, it just won't stick.
    }
  }, [enabled])

  const toggle = useCallback(() => setEnabled(e => !e), [])
  return [enabled, toggle]
}
