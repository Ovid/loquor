import {
  GEORGIAN_ACTIVATION_TIP,
  GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH,
} from '../llm/notices'
import { nlModeSummary, readoutLang } from './nlModeSummary'
import type { NlState } from '../llm/types'

/**
 * The bottom status bar. Began as the Georgian-only footer (spec 2026-06-21),
 * then generalized to always-present in every language with a localized NL-mode
 * readout (spec 2026-06-22). A single labeled `<footer>` (one landmark, NOT a live
 * region — finding [7]) pinned to the column bottom by `.screen.term`'s flex
 * layout (no position:fixed). ALWAYS present, in every language. It hosts:
 *
 *  - The READOUT (always): the LOCALIZED NL-mode chip + story title. Player-facing
 *    copy in the active language (the bar is read by every player) — see
 *    nlModeSummary. With `debug` on it also appends the story signature (the
 *    save-slot key, an 8-hex developer detail) — kept off the default readout
 *    where it reads as noise.
 *  - The Georgian NOTICE segment (`showBeta`/`showNoCorpus`): persistent ka
 *    player content shown in addition to the readout. These two are mutually
 *    exclusive (the caller derives them from one corpus check) and asymmetric
 *    (Decision 1):
 *      - Beta: the screen IS Georgian → Georgian-only notice + the activation tip.
 *        The TIP is gated on `kaInput`, NOT on corpus presence (showBeta): with
 *        Georgian input active (Zork I) it is the Phase-2 "type Georgian" tip;
 *        without (a corpus-but-no-input game) it is the Phase-1 "type English" tip,
 *        so we never tell a player Georgian input works where it raw-sends English
 *        (drift spec Decision 6 — S3). The two coincide today only because Zork I
 *        is the sole game with both a ka corpus and a ka input lexicon.
 *      - No-corpus: the screen fell back to English → bilingual notice, NO tip.
 */
export function BottomBar({
  debug,
  nlState,
  storyTitle,
  signature,
  showBeta,
  showNoCorpus,
  kaInput,
  llmEnabled = true,
}: {
  debug: boolean
  nlState: NlState
  storyTitle: string
  /** Story signature (save-slot key); '' until boot resolves it. Shown only
   *  under debug, truncated to the first 8 hex. */
  signature: string
  showBeta: boolean
  showNoCorpus: boolean
  /** Whether Georgian INPUT is active on this game (kaInputActive). Selects the
   *  Phase-2 vs Phase-1 activation tip independently of corpus presence (S3). */
  kaInput: boolean
  /** LLM-feature preference — drops the tier token from the readout when off. */
  llmEnabled?: boolean
}) {
  const summary = nlModeSummary(nlState, llmEnabled)
  return (
    <footer className="bottombar" aria-label="Status information">
      <span className="bottombar-icon" aria-hidden="true">
        ⓘ
      </span>
      {/* The readout = a localized NL-mode chip + the English story title.
          The two carry different `lang`s (WCAG 3.1.2): the chip is in the active
          language (fr "complet · saisie", en "full · input"); the title and the
          debug signature are English, so they ride `lang="en"`. The chip is
          absent for ka (output-only) and any title-only state — then the title
          stands alone. */}
      <span className="bottombar-readout">
        {summary && <span lang={readoutLang(nlState)}>{summary} — </span>}
        <span lang="en">
          {storyTitle}
          {debug && signature ? ` · ${signature.slice(0, 8)}` : ''}
        </span>
      </span>
      {showBeta && (
        <>
          {/* Beta notice — Georgian ONLY (Decision 1): the screen is Georgian,
              so a Georgian screen reader voices it correctly and the English
              half is just clutter. This is now the PRIMARY in-game alpha/beta
              disclosure: the landing teaser (landingStrings.ts `ka.caveat`) was
              reframed to pure adventure flavor, so the honesty note lives here
              and on the picker label (`languageOptions.ts`), not the teaser.
              NATIVE-REVIEW-DRAFT (§8). */}
          <span lang="ka">
            ქართული თარგმანი ჯერ სატესტოა — ზოგი ტექსტი შეიძლება ინგლისურად
            გამოჩნდეს.
          </span>
          {/* Relocated activation tip — now PERMANENT visible content (Decision
              3). Its one-shot announcement still rides the latch into Terminal's
              dedicated announce region; this is the always-visible copy. Gated on
              kaInput (input active vs raw-send English), not corpus presence (S3). */}
          <span lang="ka">
            {kaInput
              ? GEORGIAN_ACTIVATION_TIP
              : GEORGIAN_ACTIVATION_TIP_TYPE_ENGLISH}
          </span>
        </>
      )}
      {showNoCorpus && (
        // No-corpus notice — STAYS bilingual (Decision 1): the screen fell back
        // to English, so each half carries its own lang and a screen reader
        // voices the English with English phonemes, not Georgian (WCAG 3.1.2).
        // NATIVE-REVIEW-DRAFT (§8). No type-English tip — the display is English.
        <span>
          <span lang="ka">
            ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის — თამაში ინგლისურად
            გამოჩნდება.
          </span>{' '}
          <span lang="en">
            Georgian isn’t available for this story yet; it is shown in English.
          </span>
        </span>
      )}
    </footer>
  )
}
