// src/llm/models.ts
// Model ids per Locked decision 7. SMALL is the default path proven at the
// walking-skeleton gate; FULL is the documented heavy fallback (escalation if
// SMALL misses the corpus or the latency target). Both ids are confirmed present
// in the WebLLM prebuilt config (see vendored web-llm/).
export const SMALL_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'

// FULL is Llama-3.1-8B (not 3.0): 3.1 adds OFFICIAL multilingual support
// (English, German, French, Italian, Portuguese, Hindi, Spanish, Thai), which is
// the whole point of escalating for non-English NL input. q4f16_1 + 1k context is
// the smallest 8B footprint that fits an in-browser WebGPU budget; the heavier
// download (~4.5GB vs SMALL's ~1GB) is the tradeoff for the multilingual gain.
export const FULL_MODEL = 'Llama-3.1-8B-Instruct-q4f16_1-MLC-1k'

/** The id WebLlmEngine loads by default. Override per-run via ?model= (see modelSelection.ts). */
export const DEFAULT_MODEL = SMALL_MODEL

/** The ids the app is allowed to load — an allowlist so a stray ?model= or env
 * value can never point the one-time weight download at an arbitrary URL. */
export const KNOWN_MODELS: readonly string[] = [SMALL_MODEL, FULL_MODEL]

/**
 * Resolve a requested model id (from ?model= or VITE_LLM_MODEL) to one we will
 * actually load. Accepts the short aliases `small`/`full` (case-insensitive) and
 * any exact KNOWN_MODELS id; anything empty or unrecognized falls back to
 * DEFAULT_MODEL rather than attempting to fetch an unknown model.
 */
export function resolveModelId(override?: string | null): string {
  const req = override?.trim()
  if (!req) return DEFAULT_MODEL
  const alias = req.toLowerCase()
  if (alias === 'small') return SMALL_MODEL
  if (alias === 'full') return FULL_MODEL
  return KNOWN_MODELS.includes(req) ? req : DEFAULT_MODEL
}
