import { describe, it, expect } from 'vitest'
import { LANGUAGE_OPTIONS } from './languageOptions'

describe('languageOptions — Georgian (spec §5, §6)', () => {
  it('includes a ka option whose label carries the (beta) marker', () => {
    const ka = LANGUAGE_OPTIONS.find(o => o.value === 'ka')
    expect(ka).toBeDefined()
    expect(ka!.label).toContain('ქართული')
    expect(ka!.label).toContain('(beta)')
    expect(ka!.lang).toBe('ka')
  })
})
