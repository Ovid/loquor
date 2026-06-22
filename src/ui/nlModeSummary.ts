import { OUTPUT_ONLY_LANGS } from '../llm/types'
import type { NlState } from '../llm/types'

/**
 * One-line summary of what the NL layer is currently doing, for the debug strip
 * in BottomBar. English tokens regardless of UI language — it is diagnostic
 * (mirrors the `?model=` URL param), not player-facing copy.
 */
export function nlModeSummary(state: NlState): string {
  switch (state.phase) {
    case 'disabled':
      return 'no NL' // this game has no vocab — the picker never appears
    case 'off':
      return 'off'
    case 'downloading':
      return 'downloading…'
    case 'on':
      // ka (and any future output-only language) has no input path — say so
      // rather than implying it translates typed commands.
      return OUTPUT_ONLY_LANGS.has(state.language)
        ? `${state.language} · output-only`
        : `${state.language} · ${state.model} · input`
  }
}
