// Cancel/race contract of the real engine boundary ([L2]). CreateMLCEngine
// has no abort plumbing, so a cancelled or superseded load can land LATE —
// after a newer load already won. The loser must release ITS OWN engine and
// never clobber the active one. The web-llm module is mocked so each create
// resolves under test control.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasModelInCache } from '@mlc-ai/web-llm'
import { WebLlmEngine } from './engine.webllm'

interface FakeMlcEngine {
  unload: ReturnType<typeof vi.fn>
  interruptGenerate: ReturnType<typeof vi.fn>
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>
    }
  }
}
let engines: FakeMlcEngine[] = []
let resolveCreate: Array<() => void> = []

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: vi.fn(
    () =>
      new Promise(res => {
        const eng: FakeMlcEngine = {
          unload: vi.fn(async () => {}),
          interruptGenerate: vi.fn(),
          chat: {
            completions: {
              create: vi.fn(async (_req: unknown) => ({
                choices: [{ message: { content: 'ok' } }],
              })),
            },
          },
        }
        engines.push(eng)
        resolveCreate.push(() => res(eng))
      }),
  ),
  hasModelInCache: vi.fn(async () => false),
}))

const tick = () => new Promise<void>(r => setTimeout(r, 0))

beforeEach(() => {
  engines = []
  resolveCreate = []
})

describe('WebLlmEngine.load cancel/race contract ([L2])', () => {
  it('a load resolving after its abort releases its own engine and stays unloaded', async () => {
    const e = new WebLlmEngine('m')
    const ac = new AbortController()
    const p = e.load(() => {}, ac.signal).catch((err: Error) => err)
    await tick() // dynamic import done; create pending
    ac.abort()
    resolveCreate[0]()
    const err = (await p) as Error
    expect(err.name).toBe('AbortError')
    expect(engines[0].unload).toHaveBeenCalled()
    expect(e.isLoaded()).toBe(false)
  })

  it('a cancelled load landing late neither clobbers nor unloads the winner', async () => {
    const e = new WebLlmEngine('m')
    const ac1 = new AbortController()
    const p1 = e.load(() => {}, ac1.signal).catch((err: Error) => err)
    await tick()
    ac1.abort() // player cancelled…
    const p2 = e.load(() => {}, new AbortController().signal) // …then re-picked
    await tick()
    resolveCreate[1]() // fresh load wins first
    await p2
    expect(e.isLoaded()).toBe(true)
    resolveCreate[0]() // stale cancelled load lands LATE
    const err = (await p1) as Error
    expect(err.name).toBe('AbortError')
    expect(e.isLoaded()).toBe(true) // winner still resident
    expect(engines[1].unload).not.toHaveBeenCalled()
    expect(engines[0].unload).toHaveBeenCalled() // loser released, not leaked
  })

  it('concurrent un-aborted loads: the newer call wins, the older releases its engine', async () => {
    const e = new WebLlmEngine('m')
    const p1 = e
      .load(() => {}, new AbortController().signal)
      .catch((err: Error) => err)
    await tick()
    const p2 = e.load(() => {}, new AbortController().signal)
    await tick()
    resolveCreate[1]()
    await p2
    resolveCreate[0]() // superseded load lands late
    const err = (await p1) as Error
    expect(err.name).toBe('AbortError')
    expect(e.isLoaded()).toBe(true)
    expect(engines[0].unload).toHaveBeenCalled()
    expect(engines[1].unload).not.toHaveBeenCalled()
  })
})

describe('WebLlmEngine.generate grammar plumbing', () => {
  it('omits response_format entirely when grammar is null (output-translation fallback)', async () => {
    const e = new WebLlmEngine('m')
    const p = e.load(() => {}, new AbortController().signal)
    await tick()
    resolveCreate[0]()
    await p
    await e.generate([{ role: 'user', content: 'hi' }], null)
    const req = engines[0].chat.completions.create.mock.calls[0][0] as Record<
      string,
      unknown
    >
    expect('response_format' in req).toBe(false)
  })

  it('still sends the grammar response_format when given a grammar', async () => {
    const e = new WebLlmEngine('m')
    const p = e.load(() => {}, new AbortController().signal)
    await tick()
    resolveCreate[0]()
    await p
    await e.generate([{ role: 'user', content: 'hi' }], 'root ::= "x"')
    const req = engines[0].chat.completions.create.mock.calls[0][0] as Record<
      string,
      unknown
    >
    expect(req.response_format).toEqual({
      type: 'grammar',
      grammar: 'root ::= "x"',
    })
  })

  it('grammar-free path surfaces nullish content as "" — never the ABSTAIN sentinel', async () => {
    const e = new WebLlmEngine('m')
    const p = e.load(() => {}, new AbortController().signal)
    await tick()
    resolveCreate[0]()
    await p
    engines[0].chat.completions.create.mockResolvedValueOnce({ choices: [] })
    expect(await e.generate([{ role: 'user', content: 'hi' }], null)).toBe('')
  })
})

// Safety net for F-19: pin isCached()'s probe-passthrough behavior before
// changing how it handles a probe FAULT (the fix adds diagnostics to the catch).
describe('WebLlmEngine.isCached (on-disk cache probe)', () => {
  it('returns false when the model is not in WebLLM’s on-disk cache', async () => {
    const e = new WebLlmEngine('m')
    expect(await e.isCached()).toBe(false)
  })

  it('returns true when the model is already in the on-disk cache', async () => {
    vi.mocked(hasModelInCache).mockResolvedValueOnce(true)
    const e = new WebLlmEngine('m')
    expect(await e.isCached()).toBe(true)
  })
})
