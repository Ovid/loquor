# Agentic Code Review: ovid/zork1-input-parity

**Date:** 2026-06-20 14:40:43
**Branch:** ovid/zork1-input-parity -> main
**Commit:** 6a84a00926ff480f3a0df34dbb96e085641a8f94
**Files changed:** 36 | **Lines changed:** +2966 / -106
**Diff size category:** Large (mostly lexicon/corpus data, tests, and docs; logic changes are concentrated in ~7 source files)

## Executive Summary

The branch lands Zork I input-parity work: a localized `help` intercept, a once-per-language activation nudge, a Spanish personal-`a` parser fix, emit-word vocab passthrough, lexicon additions, and new parser-prompt corpus templates (incl. Georgian). The logic is sound and well-tested — no Critical issues. The notable findings are two **off-golden-path raw-English leaks** (the new parser-prompt templates were authored against single UAT transcripts rather than the full set of reachable parser outputs), an **a11y regression** (`lang="ka"` on a command field that holds English), and a **player-experience gap** (the first-time upgrade path silently eats the activation nudge). Security and concurrency are clean.

## Critical Issues

None found.

## Important Issues

### [I1] Put-prompt corpus template covers only "in"; "on"/"under"/"behind" variants leak raw English

- **File:** `src/translate/corpus/zork1.{de,es,fr,ka}.templates.ts` (new `'What do you want to put the {raw} in?'` template)
- **Bug:** `zork1/gsyntax.zil:384-391` defines `PUT OBJECT IN/ON/UNDER/BEHIND OBJECT`, and the orphan routine (`gparser.zil` ~760-773 + `PREP-PRINT`) prints "What do you want to put the X **<prep>**?" with whatever preposition the matched syntax carries. All four corpus files added only the `in?` literal.
- **Impact:** A player who types `put lamp on` / `put X under` (no destination) sees raw English — for ka guaranteed (no LLM fallback), for fr/de/es it falls to the LLM. This is the exact harm the template set out to kill, just for a sibling preposition.
- **Suggested fix:** Add `on?` / `under?` / `behind?` template variants per language, or restructure the `out` side to drop both object and prep with a generic "Where do you want to put it?" rendering. At minimum, document the known-leaking siblings in the corpus comment.
- **Confidence:** High (88)
- **Found by:** Error Handling & Edge Cases; confirmed by Verifier against ZIL source

### [I2] Disambiguation templates match only the 2-candidate (" or ") form; 3+ candidates leak

- **File:** `src/translate/corpus/zork1.ka.templates.ts` (new `'Which {raw} do you mean, the {obj} or the {obj2}?'`) and the sibling `Which book do you mean` templates in fr/de/es
- **Bug:** `WHICH-PRINT` (`gparser.zil` ~1146-1166) emits "...do you mean, the A or the B?" for 2 candidates but a **comma-separated** "...the A, the B, the C?" (no " or ") for 3+. Zork I has 3 "book" objects (black book, tour guidebook, matchbook — `1dungeon.zil` 212/616/1003), so `read book` with all three in scope produces a 3-way prompt the template cannot match.
- **Impact:** Raw-English leak on the 3-book disambiguation (guaranteed for ka; LLM fallback for fr/de/es). Realistic in normal Zork I play.
- **Suggested fix:** Add a 3+-candidate comma-list template variant, or accept as a documented limitation if product agrees the case is rare (but ka has no safety net).
- **Confidence:** High (85)
- **Found by:** Error Handling & Edge Cases; confirmed by Verifier against ZIL source

### [I3] `lang="ka"` applied to the command `<input>` that holds English text (a11y regression)

- **File:** `src/ui/Terminal.tsx:334` (changed from `lang={nlInputOn ? nlLang : undefined}` to `lang={nlLang}`); lands on the `<input>` at `src/ui/CommandInput.tsx:81`
- **Bug:** For output-only Georgian, `nlLang` is `'ka'`, but ka **raw-sends English** — the player types English into the field. The `lang` attribute declares the language of the element's _value_, so a screen reader now voices typed/echoed English with Georgian phonemes. Previously `undefined` for ka.
- **Impact:** Degraded pronunciation on exactly the assistive-tech path CLAUDE.md treats as a hard requirement. (The Georgian label/placeholder are correct as `ka`, but they don't require `lang` on the input value to be right.)
- **Suggested fix:** Tie the input element's `lang` to the _input_ language, not the display language: restore `lang={nlInputOn ? nlLang : undefined}` (or `lang={outputOnly ? undefined : nlLang}`). The localized label/placeholder copy is driven separately by `nlOn`/`activeLang` and is unaffected. Per CLAUDE.md's a11y + "talk to me first" rules, confirm before shipping.
- **Confidence:** High (90)
- **Found by:** Contract & Integration AND Error Handling (independent) — confirmed by Verifier

### [I4] First-time non-cached fr/de/es upgrade path silently clobbers the activation nudge

- **File:** `src/llm/useNaturalLanguage.ts:204-212` (activation effect) + `src/llm/useModelDownload.ts:146` (`setNotice(null)` on download)
- **Bug:** Picking a non-cached language fires the activation nudge via the effect and records the language in the per-language latch (`makeActivationNotice` Set, `notices.ts:274-278`). But the same pick opens the modal and, on accept, `requestDownload` calls `setNotice(null)`, wiping the nudge — and the latch + `prevActiveLangRef` early-return mean it never re-fires for that language.
- **Impact:** A first-time _upgrading_ player never sees the escape-hatch / "type help" nudge — the exact P3 feature this branch adds. (A player who _declines_ the modal keeps the notice, so harm is specific to the download-accept path.)
- **Suggested fix:** Don't consume the latch until the notice actually sticks — e.g. defer the activation effect while `modalOpen`, fire when phase settles to `on`; or have `requestDownload` only `setNotice(null)` when the current notice isn't the activation nudge. Worth a quick conversation per the player-experience rule.
- **Confidence:** Medium-High (80)
- **Found by:** Concurrency & State — confirmed by Verifier

## Suggestions

- **[S1]** `parse.ts:299-304` Spanish personal-`a` strip runs in the shared (language-agnostic) parse path, guarded only by the convention that fr/de never lead an object span with `a`/`al` (French `à` folds to `a`). No live breakage found, but it's a latent hazard — gating on `activeLang === 'es'` would make the intent explicit and future-proof. (Confidence 70)
- **[S2]** `help.ts:45` `ESCAPE_EXAMPLES` and `notices.ts:239` `ESCAPE_EXAMPLE` are two unlinked constants for the same escape-hatch example (the notices comment even says "Mirrors help.ts's"); they can drift. Export one canonical example and compose, or assert `ESCAPE_EXAMPLES.includes(ESCAPE_EXAMPLE)` in a test. (Confidence 90)
- **[S3]** `useNaturalLanguage.ts:147` `useRef(makeActivationNotice())` calls `makeActivationNotice()` on every render (only the first result is kept) — wasted allocation, not a bug. Use lazy init (`useState(() => makeActivationNotice())[0]`). Worth a one-line comment that `prevActiveLangRef` must not be reset in any effect cleanup (StrictMode relies on it persisting). (Confidence 90)

## Plan Alignment

Plan/design docs: `docs/superpowers/plans/2026-06-19-loquor-zork1-input-parity.md`, `docs/superpowers/specs/2026-06-19-loquor-zork1-input-parity-design.md`.

- **Implemented:** Tasks 1-12 and 14-15 are reflected — eco→echo, `quantifiersAll`, songbird `al`/`a la` idioms, `del` as article, noun-surface additions (calavera/tapa/jade), personal-`a` prep-split fix, fr/de verification pins, passthrough pins, localized `help` intercept, activation notice + localized placeholder/label, ka `NATIVE-REVIEW-DRAFT` markers, notes updates. Cross-language handling is careful and well-commented; input-side fixes are correctly es-scoped with fr/de verification pins, and ka is correctly excluded from all input-side changes.
- **Deviations:**
  - The design (P2.2, ~lines 210-212) instructs authoring a second prompt `Which of the {obj}s do you mean?` in **all** of es/fr/de/ka; `grep "Which of the"` returns nothing — fr/de/es got only the put-template, and ka got a _different_ string. **However**, that exact phrase is a phantom — it appears nowhere in Zork I's parser (only WHICH-PRINT's "do you mean, the X or the Y" exists). So the doc-vs-diff gap is real but the genuinely valuable missing coverage is the 3+-candidate comma form (already captured as **[I2]**); the design doc itself should be corrected. (Suggestion, confidence 65)
  - English `help` is now intercepted (`help.ts:31` `HELP_ALIASES.en`), contradicting the plan/design's "English-mode stays native" rule and the plan's own example test. This is a **documented, UAT-driven decision** (commit `109c06b` — Zork I has no native help, and a model otherwise mistranslates `help`→`look`), not an oversight, but it should be folded back into the spec text so plan and code agree. (Not a bug; reconcile docs.)
- **Not yet implemented (neutral):** No automated test enforcing the ka `NATIVE-REVIEW-DRAFT` marker (plan Task 14) — markers are present by convention only.

## Review Metadata

- **Agents dispatched:** Logic & Correctness, Error Handling & Edge Cases, Contract & Integration, Concurrency & State, Security, Plan Alignment, Verifier
- **Scope:** Changed source (`src/llm/help.ts`, `notices.ts`, `useNaturalLanguage.ts`, `translatePipeline.ts`, `inputTranslate.ts`, `lexicon/parse.ts`, `lexicon/index.ts`, `lexicon/es.*`, `ui/Terminal.tsx`, `translate/corpus/zork1.{de,es,fr,ka}.templates.ts`) + adjacent callers (`CommandInput.tsx`, `useModelDownload.ts`, `lexicon/validate.test.ts`) + vendored `zork1/gparser.zil`, `gsyntax.zil` for parser-output verification
- **Raw findings:** 11 (before verification)
- **Verified findings:** 9 reported (4 Important, 3 Suggestion, 2 plan deviations); F8 subsumed by I4
- **Filtered out:** Logic & Correctness found no bugs >=60; Security found none; several concurrency items confirmed correct (StrictMode latch, lastCommandRef clearing, showHelp stable callback)
- **Steering files consulted:** CLAUDE.md (a11y mandate, "fix in one language = fix in all", player-experience "talk to me first" rules) — all relevant to the findings above
- **Plan/design docs consulted:** `2026-06-19-loquor-zork1-input-parity` plan + design; `notes/uat.md`, `notes/next.md`, `notes/georgian-native-review-followup.md`
