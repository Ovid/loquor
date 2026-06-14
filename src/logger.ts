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
  if (typeof args[0] === 'string')
    return [`${prefix} ${args[0]}`, ...args.slice(1)]
  return [prefix, ...args]
}

/**
 * F-16 durable sink. Diagnostics used to reach ONLY the console and were lost to
 * scrollback; the rich runtime classifications (watchdog-vs-engine-fault,
 * ExpectedXlateStop reasons, boot failures) now also tee into a capped in-memory
 * ring so a dev can dump the session's warn/error history via `window.loquorLogs()`.
 *
 * Only warn/error are captured (info/debug are routine/firehose). The ring is
 * in-memory — queryable for the life of the session, the proportionate sink for
 * a client-side app. ponytail: cross-session persistence (localStorage like
 * missLog) / telemetry export is the upgrade path, deliberately not built —
 * warn/error volume + quota make in-memory the right default, and the single
 * chokepoint means an export can be added here without touching call sites.
 */
export interface LogRecord {
  level: 'warn' | 'error'
  args: unknown[]
}
const RING_CAP = 200
const ring: LogRecord[] = []
function record(level: 'warn' | 'error', args: unknown[]): void {
  ring.push({ level, args })
  if (ring.length > RING_CAP) ring.shift()
}
/** The session's recent warn/error records, oldest first. */
export const recentLogs = (): readonly LogRecord[] => ring
/** Clear the ring (tests / dev). */
export const clearLogs = (): void => {
  ring.length = 0
}
if (typeof window !== 'undefined')
  (window as unknown as { loquorLogs: () => readonly LogRecord[] }).loquorLogs =
    recentLogs

export function createLogger(tag: string): Logger {
  const prefix = `[${tag}]`
  return {
    debug: (...args) => {
      // Dev-only: keep the diagnostic firehose out of release + test consoles.
      if (import.meta.env.DEV && import.meta.env.MODE !== 'test')
        console.log(...withPrefix(prefix, args))
    },
    info: (...args) => console.info(...withPrefix(prefix, args)),
    warn: (...args) => {
      const a = withPrefix(prefix, args)
      record('warn', a)
      console.warn(...a)
    },
    error: (...args) => {
      const a = withPrefix(prefix, args)
      record('error', a)
      console.error(...a)
    },
  }
}
