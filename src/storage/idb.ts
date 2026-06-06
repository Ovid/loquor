const DB = 'naitfol'
const STORE = 'kv'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    // A version-change blocked by another open connection never fires
    // success/error; reject so the wrapping promise can't hang forever.
    req.onblocked = () => reject(new Error('indexedDB open blocked'))
  })
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode)
      const req = fn(t.objectStore(STORE))
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => reject(req.error)
      // A quota-exceeded (or otherwise aborted) transaction may abort without
      // the request's onerror firing; reject so the promise settles.
      t.onabort = () => reject(t.error ?? new Error('indexedDB tx aborted'))
    })
  } finally {
    // Close the connection once the operation settles. Each call opens its own
    // connection; leaving them open would block indexedDB.deleteDatabase() (used
    // to reset state between tests) since there is no onblocked handler.
    db.close()
  }
}

export const idbGet = <T>(k: string) => tx<T>('readonly', s => s.get(k))
export const idbSet = (k: string, v: unknown) =>
  tx<void>('readwrite', s => s.put(v, k))
export const idbDel = (k: string) => tx<void>('readwrite', s => s.delete(k))
