// src/llm/types.ts
import type { ViewState } from '../glkote-react/types'

/** Picker languages. 'off' disables the NL layer (locked decision 3). */
export const NL_LANGUAGES = ['off', 'en', 'fr', 'de', 'es'] as const
export type NlLanguage = (typeof NL_LANGUAGES)[number]
export type ActiveLanguage = Exclude<NlLanguage, 'off'>

export function isNlLanguage(v: unknown): v is NlLanguage {
  return (NL_LANGUAGES as readonly unknown[]).includes(v)
}

/** Device capability tier. `none` = NL not offered. */
export type Tier = 'none' | 'small' | 'full'

export interface CapabilityResult {
  tier: Tier
  /** Machine-readable reasons (drive the toggle's "why unavailable" tooltip). */
  reasons: string[]
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
export type ChatMessages = ChatMessage[]

export interface LoadProgress {
  loaded: number
  total: number
  text: string
}

/** The swappable LLM boundary. Real impl: engine.webllm.ts. Test: engine.fake.ts. */
export interface LlmEngine {
  load(
    onProgress: (p: LoadProgress) => void,
    signal: AbortSignal,
  ): Promise<void>
  generate(
    prompt: ChatMessages,
    /** GBNF grammar for constrained decoding, or null for plain text
     * (output-translation fallback, spec §6). */
    grammar: string | null,
    signal?: AbortSignal,
  ): Promise<string>
  unload(): Promise<void>
  /** Loaded into memory THIS session. */
  isLoaded(): boolean
  /**
   * Present in the on-disk weight cache (survives reloads). Drives the toggle's
   * off·installed vs off·not-installed distinction — a returning player whose
   * model is cached must NOT be re-prompted. Distinct from isLoaded().
   */
  isCached(): Promise<boolean>
}

/** Result of mapping English → game action. */
export type TranslateResult =
  | { kind: 'command'; text: string }
  | { kind: 'abstain' }

/** Pure view-derived context (location + recent output) from viewToContext(). */
export interface ViewContext {
  location: string
  recentOutput: string
}

/** Full prompt context: view context + the per-turn scene the hook supplies. */
export interface PromptContext extends ViewContext {
  inScope: string[]
  antecedent: string | null
}

/** Picker/state-machine state surfaced by useNaturalLanguage. */
export type NlState =
  | { phase: 'unavailable'; reasons: string[] } // no capable device (offer override)
  | { phase: 'disabled' } // capable, but this game has no grammar (silent — no override)
  | { phase: 'off'; installed: boolean }
  | {
      phase: 'downloading'
      loaded: number
      total: number
      /** Estimated seconds remaining, or null until a rate is known. */
      etaSeconds: number | null
    }
  | { phase: 'on'; language: ActiveLanguage }

/** Re-export for hook consumers that thread the live view in. */
export type { ViewState }
