// src/llm/models.ts
// Model ids per Locked decision 7. SMALL is the default path proven at the
// walking-skeleton gate; FULL is the documented heavy fallback (escalation if
// SMALL misses the corpus or the latency target). Confirm both ids exist in the
// WebLLM prebuilt config at the gate.
export const SMALL_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'
export const FULL_MODEL = 'Llama-3-8B-Instruct-q4f32_1-MLC-1k'

/** The id WebLlmEngine loads by default. Swap to FULL_MODEL at the gate if needed. */
export const DEFAULT_MODEL = SMALL_MODEL
