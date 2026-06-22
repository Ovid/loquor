import { GEORGIAN_ACTIVATION_TIP } from '../llm/notices'

/**
 * The Georgian (`ka`) bottom status bar (spec 2026-06-21). A static, labeled
 * `<footer>` (NOT a live region — finding [7]) holding the persistent ka mode
 * info, pinned to the column bottom by `.screen.term`'s flex layout (no
 * position:fixed). Rendered ONLY under ka (the caller gates on outLang === 'ka'
 * and the presence of one of the two notices), so en/fr/de/es pay no layout cost.
 *
 * `showBeta` and `showNoCorpus` are mutually exclusive (the caller derives them
 * from the same corpus check). They are NOT symmetric (spec Decision 1):
 *  - Beta: the screen IS Georgian → Georgian-only notice + the type-English tip.
 *  - No-corpus: the screen fell back to English → bilingual notice, NO tip.
 */
export function GeorgianStatusBar({
  showBeta,
  showNoCorpus,
}: {
  showBeta: boolean
  showNoCorpus: boolean
}) {
  return (
    <footer className="bottombar" aria-label="Georgian mode information">
      <span className="bottombar-icon" aria-hidden="true">
        ⓘ
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
