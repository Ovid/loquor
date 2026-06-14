import { idbGet, idbSet, idbDel } from './idb'
import { IDB_KEYS } from './idbKeys'
import { createLogger, type Logger } from '../logger'

const autosaveLog = createLogger('autosave')
const savefileLog = createLogger('savefile')

// F-8: key strings are declared in the central kv-store registry (idbKeys.ts).
const key = (sig: string) => IDB_KEYS.autosave(sig)

/** F-9: a `.catch` handler that surfaces a failed IndexedDB op on the write
 *  queue instead of swallowing it — a swallowed reject leaves the sync cache and
 *  IndexedDB divergent for the session, so an explicit SAVE looks like success
 *  while never persisting. Shared by all three persistence sites. */
function onPersistFail(logger: Logger, verb: string, k: string) {
  return (err: unknown) => {
    const e = err as { name?: string; message?: string }
    logger.error(`${verb} FAILED for ${k}: ${e?.name}: ${e?.message}`)
  }
}

// Diagnostic logging for the autosave path. The reducer/engine work in tests
// (fake-indexeddb), so a "starts over on return" report is environment-specific;
// these logs make the save→persist→preload→read boundaries visible in the
// browser console (filter by "[autosave]"). Cheap; safe to keep. Silent under
// vitest so test output only shows unexpected problems.
const alog = (...args: unknown[]) => {
  if (import.meta.env.MODE !== 'test') autosaveLog.info(...args)
}

/** Walk `value` and return the path of the first structured-clone-rejecting node. */
function uncloneablePath(value: unknown): string {
  const seen = new WeakSet<object>()
  const walk = (v: unknown, path: string): string | null => {
    if (typeof v === 'function' || typeof v === 'symbol')
      return `${path} (${typeof v})`
    if (v === null || typeof v !== 'object') return null
    if (seen.has(v)) return null
    seen.add(v)
    try {
      structuredClone(v)
      return null // this subtree is fine
    } catch {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        const hit = walk((v as Record<string, unknown>)[k], `${path}.${k}`)
        if (hit) return hit
      }
      return `${path} (${(v as object).constructor?.name ?? 'object'})`
    }
  }
  return walk(value, '$') ?? '(unknown)'
}

/** A glkapi fileref: returned by file_construct_ref / *_temp_ref, fed back to file_*. */
export interface FileRef {
  filename: string
  usage: string
  gameid: string
}

/** IndexedDB key for an explicit (non-autosave) save slot. */
const fileKey = (ref: FileRef) =>
  IDB_KEYS.file(ref.usage, ref.gameid, ref.filename)

/**
 * IndexedDB-backed implementation of ifvms's native autosave `Dialog`.
 *
 * ifvms calls `autosave_read(signature)` SYNCHRONOUSLY during `start()`, but
 * IndexedDB is async. So the engine must `preload(signature)` the snapshot into
 * the sync cache before booting; the sync `autosave_read` then serves from that
 * cache. Writes are fire-and-forget to IndexedDB while keeping the cache
 * consistent. Saves are keyed by the per-game story signature, so per-game slots
 * are automatic.
 */
export class IdbDialog {
  streaming = false
  /** Sync cache that ifvms reads during start(); populated via preload(). */
  private cache = new Map<string, unknown>()
  /** Sync cache for explicit SAVE/RESTORE slots (glkapi reads file_* synchronously). */
  private fileCache = new Map<string, number[]>()
  /**
   * Serial chain for all IndexedDB writes. Each idb* call opens its OWN
   * connection+transaction, and IndexedDB only guarantees commit ordering for
   * transactions on the SAME connection — so two same-key writes from
   * consecutive turns could otherwise be reordered, persisting a stale snapshot
   * ("resume a turn behind"). Funnelling every write through one promise chain
   * makes them strictly sequential. A failed link is isolated so the chain
   * never wedges.
   */
  private writeChain: Promise<unknown> = Promise.resolve()
  /**
   * Once disposed, no-op all FUTURE writes. A StrictMode throwaway engine shares
   * the same IndexedDB key as the live one; silencing its Dialog stops it from
   * persisting stale snapshots behind the live engine's back. Note: a write
   * already enqueued/in-flight before dispose() still settles — this gate only
   * blocks writes submitted afterward, which is sufficient because the throwaway
   * is disposed before it runs a turn (its only write is the identical initial
   * snapshot).
   */
  private disposed = false

  /** Stop persisting FUTURE writes (used when the owning engine is torn down). */
  dispose(): void {
    this.disposed = true
  }

  /** Enqueue an IndexedDB write so it runs after all prior writes settle. */
  private enqueue(op: () => Promise<unknown>): Promise<unknown> {
    if (this.disposed) return Promise.resolve()
    const run = this.writeChain.then(op, op)
    // Keep the chain alive past rejections (callers handle/log their own errors).
    this.writeChain = run.catch(() => {})
    return run
  }

  /** Await all pending writes (tests / explicit flush). */
  async flushWrites(): Promise<void> {
    await this.writeChain
  }

  /** Load a signature's snapshot into the sync cache before booting. */
  async preload(sig: string): Promise<void> {
    const v = await idbGet<unknown>(key(sig))
    this.cache.set(sig, v ?? null)
    alog(
      'preload',
      key(sig),
      v == null ? 'MISS (no save)' : 'HIT (will resume)',
    )
  }

  // ---- synchronous API called by ifvms ----
  autosave_read(sig: string): unknown {
    // F-5/F-11 ordering guard. ifvms reads this SYNCHRONOUSLY during start(), so
    // the cache is only warm if boot() ran `await preload(sig)` first. preload()
    // always `cache.set(sig, v ?? null)`, so a *missing* entry (vs. an entry
    // whose value is null) means preload was skipped — a boot-ordering bug that
    // otherwise looks identical to "no save → fresh start" and silently never
    // resumes. Surface it loudly; the type system can't enforce the intra-boot()
    // sequence, so this runtime guard at the Dialog boundary does (review F-5).
    if (!this.cache.has(sig)) {
      autosaveLog.warn(
        `autosave_read(${key(sig)}) before preload — autosave will not resume (boot ordering bug)`,
      )
      return null
    }
    const v = this.cache.get(sig)
    alog(
      'autosave_read',
      key(sig),
      v != null ? 'snapshot present' : 'none → fresh start',
    )
    return v ?? null
  }
  autosave_write(sig: string, snapshot: unknown): void {
    this.cache.set(sig, snapshot)
    // Persistence is async; the sync cache keeps reads consistent meanwhile.
    // It used to be fire-and-forget (`void idbSet(...)`), which silently
    // swallowed write failures — so a save that never reached IndexedDB looked
    // exactly like "starts over on return". Surface failures instead, and point
    // at the offending field if the browser's structured clone rejected it.
    const op = this.enqueue(() =>
      snapshot == null ? idbDel(key(sig)) : idbSet(key(sig), snapshot),
    )
    alog('autosave_write', key(sig), snapshot == null ? 'CLEAR' : 'save')
    op.catch((err: unknown) => {
      onPersistFail(autosaveLog, 'PERSIST', key(sig))(err)
      if (
        snapshot != null &&
        (err as { name?: string })?.name === 'DataCloneError'
      )
        autosaveLog.error('non-cloneable field:', uncloneablePath(snapshot))
    })
  }

  // ---- async helpers for tests / UI (resume hint) ----
  async autosave_read_async(sig: string): Promise<unknown> {
    return (await idbGet<unknown>(key(sig))) ?? null
  }
  async autosave_write_async(sig: string, snapshot: unknown): Promise<void> {
    this.cache.set(sig, snapshot)
    await this.enqueue(() =>
      snapshot == null ? idbDel(key(sig)) : idbSet(key(sig), snapshot),
    )
  }
  async hasSave(sig: string): Promise<boolean> {
    return (await idbGet<unknown>(key(sig))) != null
  }

  // ---- explicit SAVE/RESTORE fileref API (called by vendored glkapi.js) ----
  // glkapi drives these SYNCHRONOUSLY when streaming === false: file_ref_exists
  // and file_read mid-`glk_stream_open_file`, file_write at `glk_stream_close`.
  // We keep a sync fileCache (mirrored to IndexedDB) just like the autosave
  // cache. Save buffers are plain Array<number> byte values. See
  // tests/fixtures/PROTOCOL-NOTES.md "Dialog fileref contract".

  /** Build a fileref. `gameid` is the per-game signature for SavedGame usage. */
  file_construct_ref(
    filename: string,
    usage: string,
    gameid?: string,
  ): FileRef {
    // Headless default: if the game prompts with no filename, derive a fixed
    // slot from usage so SAVE/RESTORE still round-trip without a UI dialog.
    return {
      filename: filename || `default-${usage}`,
      usage: usage || 'data',
      gameid: gameid || '',
    }
  }

  /** Temp files: a single reusable per-usage slot is enough to not crash. */
  file_construct_temp_ref(usage: string): FileRef {
    return { filename: `temp-${usage}`, usage: usage || 'data', gameid: '' }
  }

  /** Sanitize a non-user-supplied filename (glk_fileref_create_by_name). */
  file_clean_fixed_name(filename: string, _filetype: number): string {
    return filename.replace(/[^A-Za-z0-9_.-]/g, '_')
  }

  file_ref_exists(ref: FileRef): boolean {
    return this.fileCache.has(fileKey(ref))
  }

  file_remove_ref(ref: FileRef): void {
    const k = fileKey(ref)
    this.fileCache.delete(k)
    // Symmetric with autosave_write (F-9): the sync fileCache is already
    // updated, so a swallowed reject would leave cache and IndexedDB divergent
    // for the session. Surface the failure instead of `void enqueue`.
    this.enqueue(() => idbDel(k)).catch(onPersistFail(savefileLog, 'REMOVE', k))
  }

  /** Return the stored byte array, or null if the slot does not exist. */
  file_read(ref: FileRef): number[] | null {
    const k = fileKey(ref)
    return this.fileCache.has(k) ? (this.fileCache.get(k) as number[]) : null
  }

  /** `data` is an Array<number> of bytes; `israw` true means truncate ('' arg). */
  file_write(ref: FileRef, data: number[] | string, israw?: boolean): void {
    const k = fileKey(ref)
    const bytes = israw || typeof data === 'string' ? [] : Array.from(data)
    this.fileCache.set(k, bytes)
    // F-9: was a bare `void enqueue`, which silently swallowed a failed put —
    // an explicit SAVE then looked exactly like success while never reaching
    // IndexedDB, so a later RESTORE found nothing. Surface it, like autosave.
    this.enqueue(() => idbSet(k, bytes)).catch(
      onPersistFail(savefileLog, 'WRITE', k),
    )
  }

  /** Load a slot into the sync fileCache before a synchronous restore. */
  async preloadFile(ref: FileRef): Promise<void> {
    const v = await idbGet<number[]>(fileKey(ref))
    if (v != null) this.fileCache.set(fileKey(ref), v)
  }
}
