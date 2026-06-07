// src/llm/types.ts
import type { ViewState } from '../glkote-react/types'

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
  load(onProgress: (p: LoadProgress) => void, signal: AbortSignal): Promise<void>
  generate(prompt: ChatMessages, grammar: string): Promise<string>
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

/** Pure prompt context derived from ViewState by viewToContext(). */
export interface PromptContext {
  location: string
  recentOutput: string
}

/** Toggle/state-machine state surfaced by useNaturalLanguage. */
export type NlState =
  | { phase: 'unavailable'; reasons: string[] } // no capable device (offer override)
  | { phase: 'disabled' } // capable, but this game has no grammar (silent — no override)
  | { phase: 'off'; installed: boolean }
  | { phase: 'downloading'; loaded: number; total: number }
  | { phase: 'on' }

/** Re-export for hook consumers that thread the live view in. */
export type { ViewState }
