// IndexedDB cache for LLM-fallback translations (spec §6): a miss costs one
// generation per device, ever. Lives in the existing 'kv' store under a key
// prefix — a dedicated object store would force a DB version bump for a flat
// string→string map the kv API already models.
import { idbDel, idbGet, idbSet } from '../storage/idb'

const key = (game: string, language: string, en: string) =>
  `xlate:${game}:${language}:${en}`

export const cacheGet = async (
  game: string,
  language: string,
  en: string,
): Promise<string | undefined> => {
  try {
    // idbGet's T claims more than IDB delivers: a missing key resolves to
    // undefined at runtime, so say so in the type.
    return await idbGet<string | undefined>(key(game, language, en))
  } catch {
    // A transient READ failure (quota, private mode, tx abort/blocked) is a
    // MISS, not an error to propagate (review S6). Folding the swallow here
    // means no caller can let an IDB rejection reach a pristine-output guard or
    // skip the fallback — the read contract is "value or undefined, never
    // throws". Writes (cacheSet/cacheDelete) stay fire-and-forget at call sites.
    return undefined
  }
}

export const cacheSet = (
  game: string,
  language: string,
  en: string,
  translation: string,
) => idbSet(key(game, language, en), translation)

export const cacheDelete = (game: string, language: string, en: string) =>
  idbDel(key(game, language, en))
