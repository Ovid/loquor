import { describe, it, expect } from 'vitest'
import { detectCapability } from './capability'

const adapter = (over = {}) => ({
  limits: { maxBufferSize: 1 << 30, maxStorageBufferBindingSize: 1 << 30 },
  isFallbackAdapter: false,
  ...over,
})
const nav = (over: any = {}) => ({
  gpu: { requestAdapter: async () => adapter(over.adapter) },
  userAgentData: over.userAgentData,
  userAgent: over.userAgent ?? 'desktop',
  deviceMemory: over.deviceMemory ?? 16,
})

describe('detectCapability', () => {
  it('no navigator.gpu → none', async () => {
    const r = await detectCapability({ navigator: {} as any })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('no-webgpu')
  })

  it('null adapter → none', async () => {
    const r = await detectCapability({
      navigator: { gpu: { requestAdapter: async () => null } } as any,
    })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('no-adapter')
  })

  it('software/fallback adapter → none', async () => {
    const r = await detectCapability({
      navigator: nav({ adapter: { isFallbackAdapter: true } }) as any,
    })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('software-adapter')
  })

  it('limits below the small threshold → none', async () => {
    const r = await detectCapability({
      navigator: nav({
        adapter: {
          limits: { maxBufferSize: 1024, maxStorageBufferBindingSize: 1024 },
        },
      }) as any,
    })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('insufficient-limits')
  })

  it('roomy desktop → full', async () => {
    const r = await detectCapability({ navigator: nav() as any })
    expect(r.tier).toBe('full')
  })

  it('capable mobile → small (soft signal, not none)', async () => {
    const r = await detectCapability({
      navigator: nav({ userAgentData: { mobile: true } }) as any,
    })
    expect(r.tier).toBe('small')
    expect(r.reasons).toContain('mobile')
  })

  it('low deviceMemory → small', async () => {
    const r = await detectCapability({
      navigator: nav({ deviceMemory: 2 }) as any,
    })
    expect(r.tier).toBe('small')
    expect(r.reasons).toContain('low-memory')
  })

  it('a probe that throws → none, never crashes', async () => {
    const r = await detectCapability({
      navigator: {
        gpu: {
          requestAdapter: async () => {
            throw new Error('boom')
          },
        },
      } as any,
    })
    expect(r.tier).toBe('none')
    expect(r.reasons).toContain('probe-error')
  })

  it('override bumps a detected none up to small', async () => {
    const r = await detectCapability({ navigator: {} as any }, true)
    expect(r.tier).toBe('small')
    expect(r.reasons).toContain('override')
  })
})
