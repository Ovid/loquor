import { idbGet, idbSet, idbDel } from './idb'

const key = (sig: string) => `autosave:${sig}`

/** A glkapi fileref: returned by file_construct_ref / *_temp_ref, fed back to file_*. */
export interface FileRef {
  filename: string
  usage: string
  gameid: string
}

/** IndexedDB key for an explicit (non-autosave) save slot. */
const fileKey = (ref: FileRef) => `file:${ref.usage}:${ref.gameid}:${ref.filename}`

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

  /** Load a signature's snapshot into the sync cache before booting. */
  async preload(sig: string): Promise<void> {
    const v = await idbGet<unknown>(key(sig))
    this.cache.set(sig, v ?? null)
  }

  // ---- synchronous API called by ifvms ----
  autosave_read(sig: string): unknown {
    return this.cache.has(sig) ? this.cache.get(sig) : null
  }
  autosave_write(sig: string, snapshot: unknown): void {
    this.cache.set(sig, snapshot)
    // Fire-and-forget persistence; the cache keeps reads consistent meanwhile.
    if (snapshot == null) void idbDel(key(sig))
    else void idbSet(key(sig), snapshot)
  }

  // ---- async helpers for tests / UI (resume hint) ----
  async autosave_read_async(sig: string): Promise<unknown> {
    return (await idbGet<unknown>(key(sig))) ?? null
  }
  async autosave_write_async(sig: string, snapshot: unknown): Promise<void> {
    if (snapshot == null) await idbDel(key(sig))
    else await idbSet(key(sig), snapshot)
    this.cache.set(sig, snapshot)
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
  file_construct_ref(filename: string, usage: string, gameid?: string): FileRef {
    // Headless default: if the game prompts with no filename, derive a fixed
    // slot from usage so SAVE/RESTORE still round-trip without a UI dialog.
    return { filename: filename || `default-${usage}`, usage: usage || 'data', gameid: gameid || '' }
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
    this.fileCache.delete(fileKey(ref))
    void idbDel(fileKey(ref))
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
    void idbSet(k, bytes)
  }

  /** Load a slot into the sync fileCache before a synchronous restore. */
  async preloadFile(ref: FileRef): Promise<void> {
    const v = await idbGet<number[]>(fileKey(ref))
    if (v != null) this.fileCache.set(fileKey(ref), v)
  }
}
