import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, recentLogs, clearLogs } from './logger'
import { LS_KEYS } from './storageKeys'

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
    localStorage.setItem(LS_KEYS.debug, '1') // info is gated on Debug mode
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
      localStorage.removeItem(LS_KEYS.debug)
    }
  })

  // info + debug are the firehose (autosave writes, per-clause NL traces) and
  // are gated behind the user's Debug-mode preference (`loquor.debug`). Off by
  // default → a clean console; on → the full trace.
  describe('Debug-mode gate (loquor.debug)', () => {
    afterEach(() => localStorage.removeItem(LS_KEYS.debug))

    it('suppresses info and debug when Debug mode is off (default)', () => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => {})
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      try {
        const log = createLogger('nl')
        log.info('routine autosave')
        log.debug('noisy clause trace')
        expect(info).not.toHaveBeenCalled()
        expect(logSpy).not.toHaveBeenCalled()
      } finally {
        info.mockRestore()
        logSpy.mockRestore()
      }
    })

    it('emits info and debug when Debug mode is on', () => {
      localStorage.setItem(LS_KEYS.debug, '1')
      const info = vi.spyOn(console, 'info').mockImplementation(() => {})
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      try {
        const log = createLogger('nl')
        log.info('routine autosave')
        log.debug('noisy clause trace')
        expect(info).toHaveBeenCalledWith('[nl] routine autosave')
        expect(logSpy).toHaveBeenCalledWith('[nl] noisy clause trace')
      } finally {
        info.mockRestore()
        logSpy.mockRestore()
      }
    })
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
