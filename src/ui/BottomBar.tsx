import { GEORGIAN_ACTIVATION_TIP } from '../llm/notices'
import { nlModeSummary } from './nlModeSummary'
import type { NlState } from '../llm/types'

/**
 * The bottom status bar (spec 2026-06-21, generalized from the Georgian-only
 * footer 2026-06-22). A single labeled `<footer>` (one landmark, NOT a live
 * region — finding [7]) pinned to the column bottom by `.screen.term`'s flex
 * layout (no position:fixed). ALWAYS present, in every language. It hosts:
 *
 *  - The READOUT (always): the NL-mode summary + story title. Static text. With
 *    `debug` on it also appends the story signature (the save-slot key, an 8-hex
 *    developer detail) — kept off the default readout where it reads as noise.
 *  - The Georgian NOTICE segment (`showBeta`/`showNoCorpus`): persistent ka
 *    player content shown in addition to the readout. These two are mutually
 *    exclusive (the caller derives them from one corpus check) and asymmetric
 *    (Decision 1):
 *      - Beta: the screen IS Georgian → Georgian-only notice + the type-English tip.
 *      - No-corpus: the screen fell back to English → bilingual notice, NO tip.
 */
export function BottomBar({
  debug,
  nlState,
  storyTitle,
  signature,
  showBeta,
  showNoCorpus,
}: {
  debug: boolean
  nlState: NlState
  storyTitle: string
  /** Story signature (save-slot key); '' until boot resolves it. Shown only
   *  under debug, truncated to the first 8 hex. */
  signature: string
  showBeta: boolean
  showNoCorpus: boolean
}) {
  return (
    <footer className="bottombar" aria-label="Status information">
      <span className="bottombar-icon" aria-hidden="true">
        ⓘ
      </span>
      <span className="bottombar-readout">
        {nlModeSummary(nlState)} — {storyTitle}
        {debug && signature ? ` · ${signature.slice(0, 8)}` : ''}
      </span>
      {showBeta && (
        <>
          {/* Beta notice — Georgian ONLY (Decision 1): the screen is Georgian,
              so a Georgian screen reader voices it correctly and the English
              half is just clutter. SIBLING COPY: landingStrings.ts `ka.caveat`
              is the landing-plate variant of this same beta note — apply any
              wording fix to BOTH so they don't drift (review S4). Both are
              NATIVE-REVIEW-DRAFT (§8). */}
          <span lang="ka">
            ქართული თარგმანი ჯერ სატესტოა — ზოგი ტექსტი შეიძლება ინგლისურად
            გამოჩნდეს.
          </span>
          {/* Relocated activation tip — now PERMANENT visible content (Decision
              3). Its one-shot announcement still rides the latch into Terminal's
              dedicated announce region; this is the always-visible copy. */}
          <span lang="ka">{GEORGIAN_ACTIVATION_TIP}</span>
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
