import { describe, it, expect } from 'vitest'
import * as config from './config'

// F-13: pins the centralized pipeline tunables at the values they held while
// scattered across the UI/pipeline/prompt layers, so the relocation is provably
// behavior-preserving and a later edit can't silently drift one.
describe('NL pipeline config (F-13 central tunables)', () => {
  it('exposes the relocated values unchanged', () => {
    expect(config.GENERATE_WATCHDOG_MS).toBe(8000)
    expect(config.LOAD_WATCHDOG_MS).toBe(60_000)
    expect(config.MAX_CLAUSES).toBe(8)
    expect(config.QUEUE_CAP).toBe(4)
    expect(config.PROMPT_CONTEXT_CAP).toBe(1500)
  })
})
