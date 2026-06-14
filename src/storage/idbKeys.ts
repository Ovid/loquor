/**
 * Central registry of every IndexedDB ('kv' store) key Loquor writes (F-8).
 *
 * The single flat `kv` store is shared by three subsystems — autosave snapshots,
 * explicit SAVE/RESTORE file slots, and LLM-fallback translations — separated
 * only by a string-prefix convention. Before this, each prefix was a private
 * builder in its own module, so no code owned the namespace: a prefix typo
 * silently created orphans, and a future "clear saves / clear cache" UI had no
 * single place to learn which prefixes belong to which subsystem.
 *
 * This declares the whole namespace in one place; each builder names its owner.
 * The key string FORMATS are preserved EXACTLY — changing one would orphan an
 * existing user's saved games or cached translations (a data-migration cost, not
 * a cosmetic cleanup) — and are pinned by `idbKeys.test.ts` plus the end-to-end
 * literal-key tests in `dialog.test.ts` / `fallbackCache.test.ts`.
 *
 * Sibling to `../storageKeys.ts` (the localStorage registry from F-15).
 *
 * ponytail: plain builder functions, not a class or key-scheme abstraction — the
 * value here is one visible namespace, not machinery.
 */
export const IDB_KEYS = {
  /** Native ZVM autosave snapshot, keyed by story signature. Owner: src/storage/dialog.ts */
  autosave: (sig: string) => `autosave:${sig}`,
  /** Explicit SAVE/RESTORE save slot. Owner: src/storage/dialog.ts */
  file: (usage: string, gameid: string, filename: string) =>
    `file:${usage}:${gameid}:${filename}`,
  /** LLM-fallback translation cache (spec §6). Owner: src/translate/fallbackCache.ts */
  xlate: (game: string, language: string, en: string) =>
    `xlate:${game}:${language}:${en}`,
} as const
