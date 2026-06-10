import { describe, it, expect } from 'vitest'
import { EngineGate } from './engineGate'

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(r => (resolve = r))
  return { promise, resolve }
}

describe('EngineGate (output-translation spec §6 arbitration)', () => {
  it('runs immediately when free', async () => {
    const g = new EngineGate()
    expect(await g.run('output', async () => 42)).toBe(42)
  })

  it('serializes: a second task waits for the first', async () => {
    const g = new EngineGate()
    const d = deferred<void>()
    const order: string[] = []
    const p1 = g.run('input', async () => {
      await d.promise
      order.push('a')
    })
    const p2 = g.run('input', async () => {
      order.push('b')
    })
    d.resolve()
    await Promise.all([p1, p2])
    expect(order).toEqual(['a', 'b'])
  })

  it('queued INPUT starts before earlier-queued OUTPUT (preemption)', async () => {
    const g = new EngineGate()
    const d = deferred<void>()
    const order: string[] = []
    const p0 = g.run('output', async () => {
      await d.promise // holds the gate
    })
    const pOut = g.run('output', async () => {
      order.push('output')
    })
    const pIn = g.run('input', async () => {
      order.push('input')
    })
    d.resolve()
    await Promise.all([p0, pOut, pIn])
    expect(order).toEqual(['input', 'output'])
  })

  it('a rejecting task releases the gate and propagates its error', async () => {
    const g = new EngineGate()
    await expect(
      g.run('output', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await g.run('input', async () => 'next')).toBe('next')
  })

  it('FIFO within a priority class', async () => {
    const g = new EngineGate()
    const d = deferred<void>()
    const order: number[] = []
    const p0 = g.run('output', async () => {
      await d.promise
    })
    const ps = [1, 2, 3].map(n =>
      g.run('output', async () => {
        order.push(n)
      }),
    )
    d.resolve()
    await Promise.all([p0, ...ps])
    expect(order).toEqual([1, 2, 3])
  })
})
