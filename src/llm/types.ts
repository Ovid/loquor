// src/llm/types.ts
import type { ViewState } from '../glkote-react/types'

/** Picker languages. 'off' disables the NL layer (locked decision 3). */
export const NL_LANGUAGES = ['off', 'en', 'fr', 'de', 'es', 'ka'] as const
export type NlLanguage = (typeof NL_LANGUAGES)[number]
export type ActiveLanguage = Exclude<NlLanguage, 'off'>

export function isNlLanguage(v: unknown): v is NlLanguage {
  return (NL_LANGUAGES as readonly unknown[]).includes(v)
}

/** Languages with a DISPLAY corpus but no INPUT support yet (Phase 1). The
 * command field raw-sends English for these — exactly as 'off' does — so the
 * player reads Georgian while typing English. Phase 2 (Georgian input) removes
 * 'ka' from this set, and it graduates to the normal nl.translate input path.
 * Distinct from translate/corpus/index.ts's CORPUS_ONLY_LANGS (output: no LLM
 * fallback) — same membership today, different jobs in different layers. */
export const OUTPUT_ONLY_LANGS: ReadonlySet<NlLanguage> = new Set(['ka'])

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

/**
 * The abstain sentinel: the model emits `{"verb":"__UNKNOWN__"}` (and the grammar
 * allows it) when no canonical command expresses the player's English, or when a
 * pronoun's antecedent is ambiguous. Single source of truth shared by the engines,
 * buildGrammar, and parseCommand — it lives here in the shared contract so the
 * engine boundary need not import the dense inputTranslate parser just to read it.
 */
export const ABSTAIN = '__UNKNOWN__'

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
  | { phase: 'disabled' } // this game has no vocab (silent — no picker)
  | { phase: 'off'; installed: boolean; canUpgrade: boolean }
  | {
      phase: 'downloading'
      /** The language being upgraded — carried so UI (the modal) stays in the
       * player's chosen language across the on→downloading transition. */
      language: ActiveLanguage
      loaded: number
      total: number
      /** Estimated seconds remaining, or null until a rate is known. */
      etaSeconds: number | null
    }
  | {
      phase: 'on'
      language: ActiveLanguage
      model: 'full' | 'grammar'
      /** capability allows attempting the model upgrade (else only the override). */
      canUpgrade: boolean
    }

/** Re-export for hook consumers that thread the live view in. */
export type { ViewState }
