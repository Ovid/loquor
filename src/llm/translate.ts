import type { TranslateResult } from './types'

/**
 * The abstain sentinel: the model emits this (and the grammars allow it) when no
 * canonical command expresses the player's English. Single source of truth shared
 * by the engines, grammars, and parser (review S2).
 */
export const ABSTAIN = '__UNKNOWN__'

export function parseCompletion(raw: string): TranslateResult {
  const text = raw.trim()
  if (text === '' || text === ABSTAIN) return { kind: 'abstain' }
  return { kind: 'command', text }
}
