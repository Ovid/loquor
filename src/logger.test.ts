import { describe, it, expect, vi } from 'vitest'
import { createLogger } from './logger'

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
