import { idbGet, idbSet, idbDel } from './idb'

const key = (sig: string) => `autosave:${sig}`

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
}
