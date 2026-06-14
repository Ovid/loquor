import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLogger, recentLogs, clearLogs } from './logger'

// F-14: pins the logger's calling convention — the tag is folded into the first
// string arg (so existing `[nl] …` / `[xlate] …` assertions keep matching), and
// each channel routes to the matching console method.
describe('createLogger', () => {
  it('folds the tag into a leading string message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      createLogger('nl').error('translation failed:', { x: 1 })
      expect(spy).toHaveBeenCalledWith('[nl] translation failed:', { x: 1 })
    } finally {
      spy.mockRestore()
    }
  })

  it('keeps the tag as a separate leading arg when the first value is not a string', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const obj = { code: 7 }
      createLogger('glk').warn(obj)
      expect(spy).toHaveBeenCalledWith('[glk]', obj)
    } finally {
      spy.mockRestore()
    }
  })

  it('routes channels to the matching console method', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const log = createLogger('ui')
      log.info('hi')
      log.warn('careful')
      log.error('boom')
      expect(info).toHaveBeenCalledWith('[ui] hi')
      expect(warn).toHaveBeenCalledWith('[ui] careful')
      expect(error).toHaveBeenCalledWith('[ui] boom')
    } finally {
      info.mockRestore()
      warn.mockRestore()
      error.mockRestore()
    }
  })

  it('suppresses debug under test (dev-only diagnostic gate)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      createLogger('nl').debug('noisy diagnostic')
      expect(logSpy).not.toHaveBeenCalled() // MODE === 'test'
    } finally {
      logSpy.mockRestore()
    }
  })
})

// F-16: the rich runtime classifications (watchdog-vs-engine-fault,
// ExpectedXlateStop reasons, boot failures) used to hit ONLY the console and
// were lost to scrollback. The logger now tees warn/error into a capped
// in-memory ring buffer so a dev can dump the session's diagnostics via
// `window.loquorLogs()` after the fact, independent of the console.
describe('createLogger durable ring (F-16)', () => {
  beforeEach(() => clearLogs())

  it('captures warn and error into the ring with level + formatted message', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const log = createLogger('nl')
      log.warn('watchdog timeout')
      log.error('engine fault:', { code: 7 })
      expect(recentLogs()).toEqual([
        { level: 'warn', args: ['[nl] watchdog timeout'] },
        { level: 'error', args: ['[nl] engine fault:', { code: 7 }] },
      ])
    } finally {
      warn.mockRestore()
      error.mockRestore()
    }
  })

  it('does NOT capture info or debug (only the warn/error classifications)', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      const log = createLogger('ui')
      log.info('routine')
      log.debug('diagnostic')
      expect(recentLogs()).toEqual([])
    } finally {
      info.mockRestore()
    }
  })

  it('caps the ring at 200, dropping the oldest', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const log = createLogger('x')
      for (let i = 0; i < 205; i++) log.warn(`m${i}`)
      const ring = recentLogs()
      expect(ring).toHaveLength(200)
      expect(ring[0].args[0]).toBe('[x] m5') // 0..4 dropped
      expect(ring[199].args[0]).toBe('[x] m204')
    } finally {
      warn.mockRestore()
    }
  })

  it('exposes a window.loquorLogs() dump returning the ring', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      createLogger('nl').warn('boom')
      const dump = (window as unknown as { loquorLogs(): unknown }).loquorLogs()
      expect(dump).toEqual(recentLogs())
    } finally {
      warn.mockRestore()
    }
  })
})
