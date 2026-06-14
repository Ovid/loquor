/**
 * Thin, tag-scoped logging abstraction (F-14 / F-16).
 *
 * Before this, every site called `console.*` directly: some messages were
 * hand-prefixed (`[autosave]`, `[glk]`, `[nl]`, `[xlate]`), others were bare
 * strings or function-name style, and channel choice (info/warn/error) was
 * uneven — so subsystem-filtering the browser console was impossible. A module
 * now does `const log = createLogger('nl')` and calls `log.warn(...)`, giving
 * every message a consistent `[tag]` prefix and an explicit channel.
 *
 * It is deliberately thin — one chokepoint. F-16's durable-signal follow-up
 * (teeing warn/error into a ring buffer or telemetry) can be added here without
 * touching any call site, and `debug` is already gated to dev-only so the
 * diagnostic firehose never ships to a release console.
 */
export interface Logger {
  /** Dev-only diagnostics (gated; silent in production and under test). */
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

/**
 * Fold the `[tag]` prefix INTO the first argument when it is a string, so the
 * message reads as one combined, greppable line (`[nl] translation failed:`)
 * rather than a separate leading token. Non-string leading args (e.g. logging a
 * bare object) keep the tag as its own first argument.
 */
function withPrefix(prefix: string, args: unknown[]): unknown[] {
  if (typeof args[0] === 'string') return [`${prefix} ${args[0]}`, ...args.slice(1)]
  return [prefix, ...args]
}

export function createLogger(tag: string): Logger {
  const prefix = `[${tag}]`
  return {
    debug: (...args) => {
      // Dev-only: keep the diagnostic firehose out of release + test consoles.
      if (import.meta.env.DEV && import.meta.env.MODE !== 'test')
        console.log(...withPrefix(prefix, args))
    },
    info: (...args) => console.info(...withPrefix(prefix, args)),
    warn: (...args) => console.warn(...withPrefix(prefix, args)),
    error: (...args) => console.error(...withPrefix(prefix, args)),
  }
}
