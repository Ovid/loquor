# Agentic Code Review: ovid/composed-line-gate

**Date:** 2026-06-24 13:26:29
**Branch:** ovid/composed-line-gate -> main
**Commit:** 993c07e0bc16a7c962495e76cda49695708d4193
**Files changed:** 31 | **Lines changed:** +4748 / -177
**Diff size category:** Large (logic surface is small; bulk is committed gate data, corpus translations, and docs)

## Executive Summary

Solid, well-specified work. The runtime-code surface is tiny — one new `{verb}`
match-only regex slot in `match.ts` and a scroll-to-bottom a11y fix in
`Scrollback.tsx` — while the bulk is the committed composed-line gate
(`composed-families.ts` + `composed-lines.test.ts`), corpus translations, and
docs. The gate suite is green (258 tests), plan alignment is clean (no
deviations; `REACHABLE_FLOOR=127` tally is correct, `EXPECTED_DEFERRED=[]`
matches Ovid's author-all override), and security is clean (no XSS — React
escapes text children; the new two-wildcard regex is quadratic-not-exponential
and bounded by the VM's ~254-byte input cap; no network egress).

**No Critical issues. Three Important issues**, all on the deterministic
no-English-leak path the branch exists to protect: **F9 is the only LIVE one** —
the Scrollback fix re-pins the bottom on `[lines]` changes, but the `nl-pending`
"thinking" indicator and `nl-status` notice render *inside* the same scroll
container and toggle independently of `lines`, so the exact "input clipped below
the fold" symptom (WCAG 2.4.11) can recur during translation. F1 and F5 are
latent leak-class defects in the matcher/gate. The remaining six are
test-robustness suggestions. General confidence: high — findings were
cross-checked by a verifier reading the live code.

## Critical Issues

None found.

## Important Issues

### [I1] Scrollback re-pins only on `lines` changes — the thinking indicator / notice can leave the input clipped below the fold
- **File:** `src/ui/Scrollback.tsx:31-38` (effect deps `[lines]`); render tree `src/glkote-react/Terminal.tsx:249-291`
- **Bug:** The `nl-pending` thinking indicator and the `nl-status` notice (and `nl.queued` lines) render as children of `Scrollback`, **inside** the same `.scroll` container, so they grow `scrollHeight`. They come from `useNaturalLanguage` state (`pending`/`notice`/`queued`), entirely separate from `xl.lines` (`useOutputTranslation`). When the player submits English and translation starts, `nl.pending` flips true and the indicator mounts **without `xl.lines` changing** (the game hasn't responded yet), so `useLayoutEffect([lines])` never fires and the bottom is not re-pinned.
- **Impact:** The same focus-obscured symptom this commit fixes (WCAG 2.4.11 "focus not obscured," worse on short/phone viewports) can recur during the translation/thinking phase — a LIVE residual in the exact case being fixed. Accessibility is a hard requirement per CLAUDE.md.
- **Suggested fix:** Either lift `nl.pending`/notice presence into Scrollback props and add them to the effect deps, or observe the scroller with a `ResizeObserver` and re-pin on growth while pinned-to-bottom. If product judges the transient acceptable, document that out-of-band height changes aren't covered by `[lines]`. (Per CLAUDE.md's "talk to me first" rule, the a11y trade-off here is worth a quick decision rather than a silent pass.)
- **Confidence:** Medium (70) — **LIVE**
- **Found by:** Concurrency & State (verified)

### [I2] An unhandled `{token}` on a template `out` side leaks verbatim AND counts as a successful match (suppressing the fallback)
- **File:** `src/translate/match.ts:124` (`OUT_REF`) + `:158-206` (`matchOnce`)
- **Bug:** `OUT_REF` only matches `{obj[234]?.key}`, `{num2?}`, `{raw}`. A `{verb}` (newly a valid *en*-side slot on this branch), a bare `{obj}`, or a typo `{foo}` in an `out` string is invisible to `.replace()`, passes through verbatim into displayed output, and `ok` stays `true` — so `matchOnce` returns it as a **successful** translation. That means no MISS, so the LLM fallback never fires (and `ka` has no fallback at all). The gate does not catch it: a `ka` out containing `{verb}` still satisfies `out !== en` and `GEORGIAN.test(out)`. There is no compile-time guard on `t.out` (only the en-side repeated-slot guard exists).
- **Impact:** One mistyped/misplaced `out` token ships an undetected literal-brace English leak with the fallback suppressed — the precise leak class this whole branch exists to close, and worst for `ka`. No shipped `out` triggers it today (corpus scan clean), so it is latent, but `{verb}` makes it newly easy to reach for on the out side.
- **Suggested fix:** In `compileCorpus`, after substitution-validating each template, scan `t.out` for any `\{[^}]+\}` that `OUT_REF` won't consume and throw an actionable, template-naming error (mirror the repeated-slot guard at `match.ts:86-90`). Alternatively, in `matchOnce` treat a residual `{…}` in the result as `ok = false` (MISS) so the English/fallback path takes over instead of rendering braces.
- **Confidence:** High (85) — **LATENT**
- **Found by:** Logic & Correctness, Error Handling, Contract & Integration (3 specialists; verified)

### [I3] The gate hardcodes `'ka'` instead of `CORPUS_ONLY_LANGS` — a future no-LLM language would silently get neither the union drive nor the no-English check
- **File:** `src/translate/corpus/composed-lines.test.ts:86` (union-drive selector) and `:133` (Georgian-script check); source of truth `src/translate/corpus/index.ts:15`
- **Bug:** `fillsFor` drives the full union object set only when `lang === 'ka'`, and the "output must contain a non-Latin char" assertion only fires when `code === 'ka'`. The declared source of truth for "no LLM net" is `CORPUS_ONLY_LANGS` (`= new Set(['ka'])`), which the gate does not import. A second corpus-only language added to `CORPORA` would be driven over one representative object and skip the no-English check entirely — passing the gate with raw English.
- **Impact:** The gate's whole purpose is to protect no-LLM languages, but it protects exactly one by name — the future-no-LLM-language failure CLAUDE.md explicitly says to prevent. Latent (ka is the only such language today).
- **Suggested fix:** Drive union-coverage and the "no untranslated English" check off `CORPUS_ONLY_LANGS.has(code)`, and generalize the script assertion to "no residual Latin-script English run" (which also strengthens [S4]) so it works for any non-Latin no-LLM language.
- **Confidence:** Medium (75) — **LATENT**
- **Found by:** Error Handling & Edge Cases (verified)

## Suggestions

- **[S1] Positional coupling of the fr/de/es representative object** — `composed-lines.test.ts:84-86` drives fr/de/es `all-objects` families over `UNION_OBJECTS.slice(0,1)`, which resolves by insertion order to `"altar"` (first key of the first corpus, fr). The one-representative choice is by design (decision 2/3), but the *positional* selection is fragile: a corpus/`CORPORA` reorder silently changes the sole fr/de/es probe, and nothing asserts that object is form-complete in all three languages (de's `akkDef` is hand-authored per object). Fix: pick the representative as "an object present in fr ∧ de ∧ es with every form key the all-objects templates reference," or assert that invariant. (conf 75, latent)
- **[S2] Completeness meta-test mixes Set and Array sizes** — `composed-lines.test.ts:115,168` compares `asserted.size` (Set of `fam.en`) against `REACHABLE.length` (un-deduped array). All 127 `en` are unique today, but a duplicate `en` (two ZIL sites composing the same surface line) would spuriously fail with a misleading "silently skipped" message — or mask a real drop. Fix: compare against `new Set(REACHABLE.map(f=>f.en)).size`, and add an explicit `en`-uniqueness assertion. (conf 70, latent)
- **[S3] Completeness meta-test relies on Vitest in-file sequential ordering** — `composed-lines.test.ts:115-169` populates a module-level `asserted` Set inside translate `it` bodies and reads it from a later `it`. Works only because `vitest.config.ts` sets no `sequence.shuffle`/`concurrent` override. Fix: compute completeness without cross-`it` shared state (e.g. assert counts synchronously at registration), or at minimum comment-forbid `.concurrent`/shuffle in this file. (conf 65, latent)
- **[S4] `GEORGIAN` check accepts one Georgian char in an otherwise-English line** — `composed-lines.test.ts:39,133`. Structurally too weak to be `ka`'s only safety net; today only the *documented, accepted* `{raw}`-echo lines (WHICH-PRINT, can't-see-any) exercise the English-mixed case. Fix: after stripping per-family-allowed echo tokens, assert no `[A-Za-z]{2,}` run remains. (conf 65, latent)
- **[S5] `fillsFor` only fills the last object-bound slot if a family had two** — `composed-lines.test.ts:82-96`. The `bindings` type permits two object-bound slots; the loop overwrites `objSlot`. No current family triggers it (multi-object uses `instances`). Fix: reject >1 object-bound `bindings` slot with a clear error, or document the `instances`-only rule. (conf 60, latent)
- **[S6] `literalSpans` doesn't collapse internal whitespace like `displayLines`** — `composed-lines.test.ts:67-72` only `.trim()`s spans while the HAYSTACK is built with `displayLines` (collapses `\s+`). A family `en` with an internal double space would false-FAIL fidelity. None do today. Fix: add `.replace(/\s+/g,' ')` to span normalization to match `displayLines`. (conf 60, latent)

## Plan Alignment

Design/plan: `docs/superpowers/specs/2026-06-23-loquor-composed-line-gate-design.md`, `docs/superpowers/plans/2026-06-23-loquor-composed-line-gate.md`, pushback `paad/pushback-reviews/2026-06-23-composed-line-gate-plan-pushback.md`.

- **Implemented:** `composed-families.ts` inventory (127 reachable families), the systematic gate with all five honesty mechanisms (skeleton fidelity, deferred-list assertion, exemption-`why`, floor, completeness), the `{verb}` match-only slot (in `SLOT` + compile passthrough, absent from `OUT_REF`, prep stays a literal — exactly decision 7), orphan-prompt templates (`in`/`with`/no-noun, all four languages), the retired `composed-lines.uat.test.ts` (all 7 pins absorbed), and the worklists/notes.
- **Not yet implemented:** Nothing material in scope. Deliberate carve-outs remain: `(beta)` marker + `NATIVE-REVIEW-DRAFT` worklist (colleagues' sign-off), Georgian input (Phase 2), Zork II/III (out of scope).
- **Deviations:** None at ≥60 confidence. `EXPECTED_DEFERRED=[]` and exotic-verb families tagged `reachable` with `ka` fills match Ovid's documented override of the plan's defer. `REACHABLE_FLOOR=127` tally sums correctly and equals the live count. Preps that don't orphan (`on`→WEAR, `under`/`behind`→unparsed) were correctly **not** authored. CLAUDE.md's +16 lines (the "north star" section) accurately reflect shipped behavior.
- **Note (informational):** ~46 of the 127 families (combat Shape A/B + parser parentheticals) postdate the 2026-06-23 design doc; they are UAT-6 follow-up additions (`notes/uat-6.md`, `notes/georgian-combat-coverage-worklist.md`) built on the same gate machinery — additive coverage, not a contradiction. The `Scrollback.tsx` a11y fix is an unrelated change riding on this branch.

## Review Metadata

- **Agents dispatched:** Logic & Correctness, Error Handling & Edge Cases, Contract & Integration, Concurrency & State, Security, Plan Alignment — then a single Verifier.
- **Scope:** changed code + adjacent — `match.ts`, `composed-lines.test.ts`, `composed-families.ts`, `corpus/index.ts`, `match.test.ts`, `Scrollback.tsx`/`.test.tsx`, the fr/de/es/ka templates+strings, and one level of callees (`types.ts`, `zstrings.mjs`, `useOutputTranslation.ts`, `Terminal.tsx`, `glkote-react/types.ts`).
- **Raw findings:** 9 (plus several verified-clean non-findings)
- **Verified findings:** 9 (3 Important, 6 Suggestions)
- **Filtered out:** 0 outright rejected (F7/F8 kept at the 60 threshold as suggestions)
- **Steering files consulted:** `CLAUDE.md` (no contradictions found; the +16-line update is accurate)
- **Plan/design docs consulted:** the composed-line-gate design + plan + pushback, plus `notes/next.md`, `notes/uat-6.md`, `notes/georgian-composed-line-review.md`, `notes/georgian-combat-coverage-worklist.md`
