# Agentic Code Review: ovid/fix-the-it-bug

**Date:** 2026-06-23 10:16:50
**Branch:** ovid/fix-the-it-bug -> main
**Commit:** e4de8cc1bd6524cfbeae7907e2e5ef8edf9d9c41
**Files changed:** 29 | **Lines changed:** +2018 / -63
**Diff size category:** Large

## Executive Summary

This is UAT-driven bugfix work hardening the multilingual (EN/FR/DE/ES + Georgian
output-only) Zork NL input layer — pronoun "it" resolution, "take all"
quantifiers, English passthrough-gate widening, and room PSEUDO scenery
extraction (documented BUG A–I). The work is solid and well-tested: the ZIL
extraction round-trips byte-identically, no circular imports, no Georgian
raw-leak, and all documented bugs are actually fixed. No Critical issues. Three
**Important** findings remain — all are deterministic-path correctness gaps that
silently route valid input to the LLM or emit malformed commands (F7, F2, F4) —
plus five low-risk Suggestions.

## Critical Issues

None found.

## Important Issues

### [I1] Container-anaphora branch ignores the new `antecedentObject` helper
- **File:** `src/llm/lexicon/parse.ts:444`
- **Bug:** The container/pronoun branch resolves the antecedent with
  `byCanonical(vocab, scene.antecedent)`, which only matches `n.canonical`. An
  **ambiguous synonym** antecedent (e.g. `window`, owned by two objects and
  stored by the tracker as itself, so it is not a canonical) returns `undefined`
  → MISS. The new `antecedentObject` helper (parse.ts:126-134) was created
  precisely to handle this case (it returns the synonym verbatim), and the
  sibling direct-pronoun branch (parse.ts:427) already uses it.
- **Impact:** "put X in it" / "mets X dedans" with an ambiguous-synonym
  antecedent misses to the LLM for fr/de/es — the exact class of bug
  `antecedentObject` was built to close, left unfixed in one of the two branches.
- **Suggested fix:** Use `const container = antecedentObject(vocab, scene.antecedent)`
  (returns a string) and interpolate it directly instead of `container.emit`.
- **Confidence:** High (83)
- **Found by:** Multilingual Parity, Verifier

### [I2] Single-letter meta verb synonyms accepted as the lead verb in English pronoun clauses
- **File:** `src/llm/lexicon/parse.ts` (`findVerbPhrase` ~516, `verbArityOk` ~157, `isEnglishPronounClause` / `resolveEnglishPronoun`)
- **Bug:** `findVerbPhrase` includes `vocab.verbSynonyms`, which contains
  intransitive single-letter metas (`i`=inventory, `l`=look, `q`=quit, `z`=wait,
  `d`=down). `verbArityOk` returns `true` for any verbSynonym at every arity, so
  `"i it"` resolves to `"i <antecedent>"` and `"q it"` passes
  `isEnglishPronounClause` and raw-sends — a malformed command (and `q` could
  trip a quit-confirm path).
- **Impact:** Contrived input (meta-alias + pronoun) produces a nonsense
  raw-send/resolution; low real-world frequency but a genuine gap — the arity
  check provides no filtering for verbSynonyms.
- **Suggested fix:** In the English pronoun/quantifier verb checks, require the
  lead verb to be a real action verb (`verbs2|verbs1|verbsOnly|movement`), not a
  meta-only verbSynonym.
- **Confidence:** High (82)
- **Found by:** Logic & Correctness, Verifier

### [I3] Double-space input defeats the leading-article strip (partial Bug B regression)
- **File:** `src/llm/scene/tracker.ts:132-134`
- **Bug:** `command` is only `.trim()`-ed (not internal-whitespace-collapsed) and
  the verb match slices a fixed `v.length + 1`. For `"take  the lamp"` (double
  space), `rest` becomes `" the lamp"`, so `head = rest.split(' ', 1)[0]` is `""`,
  the `the/a/an` test fails, the article is not stripped, no surface form matches
  → `null` → the acted object is lost and "it" resolves to a stale older object.
- **Impact:** Re-opens the exact UAT Bug B failure mode for double-spaced input,
  which reaches this function unchanged because `command` is never collapsed.
- **Suggested fix:** Collapse internal whitespace once at entry:
  `rest = command.trim().toLowerCase().replace(/\s+/g, ' ')`.
- **Confidence:** High (80)
- **Found by:** Error Handling & Edge Cases, Verifier

## Suggestions

- **[S1]** `scripts/lib/zil.mjs:88-91` — `extractScenery` has no single-token guard on
  PSEUDO strings; a multi-word PSEUDO would become one atomic grammar/emit token
  while `vocabWordSet` splits it. No live bug (all real Zork I/II/III PSEUDO words
  are single-token, verified) — latent. Add `if (w.includes(' ')) continue`. (75)
- **[S2]** `src/llm/lexicon/de.core.ts:381` — German `quantifiersExcept` has only
  `['ausser']` vs fr/es's 3 each; add `'ausgenommen'` for parity so "alles
  ausgenommen die lampe" resolves deterministically like fr/es. (72)
- **[S3]** `src/llm/inputTranslate.ts:385-387` — `vocabKnows` lacks the `t.length > 6`
  guard its sibling `hasVerbForm` (parse.ts:146) has; behavior-neutral (≤6 is
  identity, Zork truncates to 6 anyway) but an undocumented asymmetry. (70)
- **[S4]** `src/llm/translatePipeline.ts:363-385` — three EN resolvers receive
  `clause` while `isEnglishPronounClause` receives `stripped`; works today (all
  re-tokenize) but a latent foot-gun. Pass one variable consistently. (70)
- **[S5]** `src/llm/lexicon/parse.ts:282-296` — `resolveEnglishQuantifierPhrase`
  doesn't restrict the remainder to prep/EXCEPT, so "take all keys" raw-sends as
  a quantifier-phrase. Benign (Zork parses it) but exceeds the documented scope;
  add a prep/except guard or update the comment. (68)

## Plan Alignment

No formal plan; intent recorded in `notes/parser-bugs.md` and `notes/uat.md` (BUG A–I).

- **Implemented:** The "it" bug (resolveEnglishPronoun + antecedentObject +
  de-poisoned few-shots); BUG A (English take-all quantifier); BUG B (article
  strip in tracker); BUG C (inflate de-truncation); BUG D (prep synonyms); BUG E
  (BUZZ noise words); BUG F (modified quantifiers, EN raw-send + fr/de/es
  translate parity); BUG G (PSEUDO scenery); BUG H (richer pronoun raw-send forms);
  BUG I ("X is empty" removed from ABSENCE_PAT). Prior-review findings I1/I2/S1/S2
  all resolved in later commits.
- **Not yet implemented (neutral, partial is expected):** `(pronoun-raw)` fallback
  only unit-tested (never triggered live); Zork II/III scenery extracted but not
  live-played; Ovid-deferred items (`sube la cesta`, `entra en el bote`, `put X in?`
  disambiguation routing, Zork III noun-extraction gap, localized failure help).
- **Deviations:** None at >=60 confidence. Spot-checked claims (BUG B, BUG F
  fr/de/es parity, BUG I, I2 language gate, BUG H all-known-token guard) all match
  the notes and their cited regression tests pass.

## Review Metadata

- **Agents dispatched:** Logic & Correctness; Error Handling & Edge Cases;
  Contract & Integration; Multilingual Parity & Deterministic Coverage; ZIL
  Extraction Correctness; Plan Alignment; Verifier.
- **Scope:** Changed NL-layer source + adjacent (parse.ts, translatePipeline.ts,
  inputTranslate.ts, scene/tracker.ts, grammar/{types,buildGrammar,patterns,vocab},
  lexicon/{fr,de,es}.core + types, prompt.ts, scripts/lib/zil.mjs,
  scripts/extract-vocab.mjs) + callers one level deep + vendored ZIL verification.
- **Raw findings:** 9 (before verification)
- **Verified findings:** 8 (after verification)
- **Filtered out:** 1 (a sub-60 informational note on BUG E doc text)
- **Steering files consulted:** CLAUDE.md (no contradictions found; Georgian
  output-only rule respected)
- **Plan/design docs consulted:** notes/parser-bugs.md, notes/uat.md, notes/TODO.md,
  the prior agentic-review artifact, zork1-input-parity-design, nl-multilingual-design
