// IndexedDB cache for LLM-fallback translations (spec §6): a miss costs one
// generation per device, ever. Lives in the existing 'kv' store under a key
// prefix — a dedicated object store would force a DB version bump for a flat
// string→string map the kv API already models.
import { idbGet, idbSet } from '../storage/idb'

const key = (game: string, language: string, en: string) =>
  `xlate:${game}:${language}:${en}`

export const cacheGet = (game: string, language: string, en: string) =>
  // idbGet's T claims more than IDB delivers: a missing key resolves to
  // undefined at runtime, so say so in the type.
  idbGet<string | undefined>(key(game, language, en))

export const cacheSet = (
  game: string,
  language: string,
  en: string,
  translation: string,
) => idbSet(key(game, language, en), translation)
