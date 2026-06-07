import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { idbGet, idbSet, idbDel } from './idb'

describe('idb kv', () => {
  beforeEach(async () => {
    await idbDel('k')
  })
  it('round-trips a value', async () => {
    await idbSet('k', { a: 1 })
    expect(await idbGet('k')).toEqual({ a: 1 })
  })
  it('returns undefined for missing keys', async () => {
    expect(await idbGet('missing')).toBeUndefined()
  })
  it('deletes', async () => {
    await idbSet('k', 1)
    await idbDel('k')
    expect(await idbGet('k')).toBeUndefined()
  })
})
