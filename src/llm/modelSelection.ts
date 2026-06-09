// src/llm/modelSelection.ts
// Resolves which model WebLlmEngine should load for this run. Precedence:
//   1. `?model=` URL query param (UAT convenience — no rebuild to A/B models)
//   2. `VITE_LLM_MODEL` build-time env var
//   3. DEFAULT_MODEL
// All values pass through resolveModelId's allowlist, so an unknown id is ignored
// (never fetched). Accepts the `small`/`full` aliases, e.g. `?model=full`.
import { resolveModelId } from './models'

/** Extract a `model` value from a URL query string, or null if absent or
 * malformed (decodeURIComponent throws URIError on bad percent-encoding like
 * `?model=%` — a hand-typed query string must not crash the render). */
export function parseModelParam(search: string): string | null {
  const m = /[?&]model=([^&]+)/.exec(search)
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
}

/** The model id to load this run, honoring the URL override then the env var. */
export function selectedModelId(): string {
  const fromUrl =
    typeof window !== 'undefined'
      ? parseModelParam(window.location.search)
      : null
  const fromEnv = import.meta.env?.VITE_LLM_MODEL as string | undefined
  return resolveModelId(fromUrl ?? fromEnv ?? null)
}
