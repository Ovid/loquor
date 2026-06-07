import type { TranslateResult } from './types'

export function parseCompletion(raw: string): TranslateResult {
  const text = raw.trim()
  if (text === '' || text === '__UNKNOWN__') return { kind: 'abstain' }
  return { kind: 'command', text }
}
