// src/llm/types.ts
import type { ViewState } from '../glkote-react/types'
import { INPUT_LEX_LANGS, LEX_LANGS } from './lexicon/types'

/** Picker languages. 'off' disables the NL layer (locked decision 3). */
export const NL_LANGUAGES = ['off', 'en', 'fr', 'de', 'es', 'ka'] as const
export type NlLanguage = (typeof NL_LANGUAGES)[number]
export type ActiveLanguage = Exclude<NlLanguage, 'off'>

export function isNlLanguage(v: unknown): v is NlLanguage {
  return (NL_LANGUAGES as readonly unknown[]).includes(v)
}

/** Languages with an input lexicon but no LLM INPUT support (review-fix C2).
 * DERIVED (F-a) from the lexicon membership arrays — = INPUT_LEX_LANGS \
 * LEX_LANGS = {ka} today — so it can never drift from the `LexLang` /
 * `InputLexLang` types. Phase 2 (Georgian input) keeps 'ka' here: it has a
 * lexicon now, but is still no-LLM. Georgian input activation on Zork I is
 * tracked by `kaInputActive` / the `lex` memo in useNaturalLanguage, NOT by
 * membership here. Consumers (WebLLM-modal suppression, screen-reader routing,
 * title-only display, picker copy, the coherence test) all remain correct.
 * Distinct JOB from translate/corpus/index.ts's CORPUS_ONLY_LANGS (output: no
 * LLM fallback) — same membership today, different layers; both derive from the
 * same arrays so they cannot silently disagree on which languages lack an LLM. */
export const OUTPUT_ONLY_LANGS: ReadonlySet<NlLanguage> = new Set(
  INPUT_LEX_LANGS.filter(l => !(LEX_LANGS as readonly string[]).includes(l)),
)

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
  /**
   * Remove the model from the on-disk cache (frees disk; the next use
   * re-downloads) and unload it from memory, so isCached()/isLoaded() both report
   * false afterwards. Lets the player reclaim space via Preferences. OPTIONAL — a
   * capability, not every engine has a deletable local cache; callers offer the
   * affordance only when it is present AND a model is actually cached.
   */
  deleteCache?(): Promise<void>
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
