# Loquor Input Translation — Georgian (Zork I × ქართული) Phase 2 Design

**Status:** Approved design (brainstormed 2026-06-24). Phase 2 of the two-phase
Georgian effort. Branch: `ovid/georgian-input`.

**Source-of-truth lineage:** This design is the explicit Phase 2 promised by
`2026-06-17-loquor-output-translation-georgian-design.md` (Phase 1, output). It
extends the deterministic input-lexicon pipeline built for fr/de/es
(`2026-06-09-loquor-nl-multilingual-design.md`) to Georgian. Where this document
and the Phase-1 Georgian spec discuss the same seam (`LexLang`,
`OUTPUT_ONLY_LANGS`, the round-trip gates), **this document is the Phase 2
authority** — it removes the Phase-1 deferrals on purpose.

---

## 0. Why this matters (read this first)

Phase 1 let a Georgian speaker *read* Zork I in ქართული but still type commands
in English. That is a real gap: the player sees their language answer them, but
cannot address the game *in* their language. Phase 2 closes it — type
`აიღე ფანარი`, the lamp is taken, in Georgian end to end. For a language with
almost no localized software and essentially no interactive fiction, native
*input* is the half that makes it feel like the game is genuinely yours.

It is achievable now for the same reason Phase 1 was: the deterministic
input-lexicon pipeline (fr/de/es) is proven and data-driven, the author has
direct access to **native Georgian playtesters in Tbilisi**, and one structural
insight (below) collapses Georgian's morphological richness down to a small,
closed authoring task. As in Phase 1, the division of labor is the spine of the
design: **automated gates enforce structural completeness; native speakers
enforce naturalness.**

---

## 1. Goal & scope

**Goal:** Selecting **Georgian** graduates `ka` from *read-Georgian/type-English*
to *read-Georgian/**type-Georgian***. Typed Georgian commands are parsed
**deterministically (grammar-only, NO LLM)** to canonical English game commands.
A command the lexicon cannot parse **abstains** with an in-language notice and
the existing quoted-English escape hatch — it never guesses.

**The bar — "walkthrough-completable":** a Georgian speaker following an
in-language walkthrough can drive Zork I from *West of House* to a **350/350 win**
by typing Georgian. The forcing function is a Georgian walkthrough-parse gate
(§6): every command in the canonical walkthrough, expressed in Georgian, must
parse to the correct canonical.

**No LLM, ever, for Georgian input.** The Phase-1 spec (§1, §3) established that
the small WebLLM models cannot produce correct Georgian; the same holds for
*understanding* it. A model-routed parse would emit confident garbage. Georgian
input is therefore **forced grammar-only** regardless of whether any model is
downloaded — see §5.

**In scope (Phase 2):**
- A Georgian Zork I **input** lexicon: `ka.core.ts` (verbs, postpositions,
  directions, meta) + `ka.zork1.ts` (nouns, bare-stem form).
- One new **data-driven** parse stage (`expandGeorgian`) and two optional
  `CoreLexicon` fields — a no-op for fr/de/es (§3).
- Runtime graduation: `ka` leaves `OUTPUT_ONLY_LANGS`, joins `LexLang`, routes
  through `nl.translate`, forced grammar-only (§5).
- The Georgian walkthrough-parse gate, round-trip enrolment (both gates),
  validate-gate enrolment, a `ka` input-UAT suite, and the
  `NATIVE-REVIEW-DRAFT` marker (§6).
- Updated `ka` activation/landing copy: "type in Georgian (beta); unknown
  phrasing → quoted English" (§7).

**Explicitly out of scope (deferred, stated not hidden — §8):**
- **"it"-anaphora.** Georgian object pronouns are verb suffixes, not tokens; the
  walkthrough uses explicit nouns. Deferred to the native loop + a later pass.
- **Zork II / III Georgian input.** II/III stay English by design (matches the
  output corpus, Zork I only). `NOUNS.ka` holds only `ZORK1_SIG`.
- **General morphology** beyond the closed suffix set (that was the rejected
  "segmenter" approach).
- **Free-play naturalness breadth.** Coverage beyond the walkthrough path fills
  via the Tbilisi loop + escape hatch, not a bigger v1.
- **Dropping the `(beta)` marker.** Native review is BLOCKING for that (§9).

---

## 2. The structural insight that keeps this small

Two facts about Georgian command syntax collapse the work:

1. **Game commands are imperatives.** A Georgian imperative is built on the
   aorist stem; in the aorist series the **direct object is nominative**. The
   nominative is the **citation form** — so a direct-object noun is just its
   dictionary form (`აიღე ფანარი` = "take lamp"). **No case tables for direct
   objects.** This is the input mirror of the Phase-1 §4 "minimize case forms"
   discipline.

2. **Only indirect-object / prepositional slots carry morphology**, and it is a
   **closed, finite set of postpositions** (`-ში` in, `-ზე` on, `-ით` with,
   `-დან` from, `-თან` at, `-კენ` toward). `ჩადე X ყუთ-ში` = "put X in box".

Everything else Georgian throws at a parser (split-ergativity, seven cases,
polypersonal verb agreement, preverbs) is irrelevant to the **imperative
command** sublanguage Zork actually accepts. We author that sublanguage, not the
language.

---

## 3. Architecture — reuse the pipeline, add one data-driven stage

The fr/de/es deterministic pipeline (`src/llm/lexicon/parse.ts`,
`translatePipeline.ts`) is reused **unchanged in behavior**. Georgian support is
added as **data plus one gated stage**, so fr/de/es are provably untouched.

### 3.1 Two optional `CoreLexicon` fields (`src/llm/lexicon/types.ts`)

```ts
/** Georgian postposition suffix (folded) → canonical English prep. The English
 *  value MUST be in vocab.preps. Present only for languages whose adpositions
 *  are noun-suffixes (Georgian); absent for fr/de/es. */
postpositions?: Readonly<Record<string, string>>   // { 'ში':'in', 'ზე':'on', 'ით':'with', … }

/** Direction word (folded) → canonical English direction. Closed cardinal set;
 *  consulted by the direction fast-path. Present only for languages whose
 *  directions are not already handled as English tokens (Georgian). */
directions?: Readonly<Record<string, string>>      // { 'ჩრდილოეთი':'north', 'ზემოთ':'up', … }
```

Both are **optional**. fr/de/es define neither, so every new code path below is
unreachable for them.

### 3.2 One new parse stage: `expandGeorgian(tokens, core)`

Runs **immediately after `tokenize`, before verb resolution**, and only when
`core.postpositions` is present (i.e. only for `ka`). For each token:

- **Postposition split.** If the token ends in a postposition suffix `S` (try
  longest-first) and the remainder is non-empty, replace the single token with
  **`[S, stem]`** in that order — postposition first, stem second. This places a
  prep token *before* the noun, so the existing **prep-split** stage
  (`verb obj PREP ind`) fires with no change. The postposition suffix `S` is the
  emitted prep token; it resolves via `core.preps` (the `postpositions` map is
  merged into the effective prep table, or prep-split additionally consults
  `postpositions` — plan decides the tidier wiring). `ჩადე X ყუთში` →
  `[ჩადე, X, ში, ყუთ]` → "put X in box".
- **Nominative normalization.** A trailing nominative **`-ი`** is stripped to
  reach the stem. This is safe because consonant-stem nominatives always carry
  `-ი` while vowel-stem nouns (`-ა/-ე/-ო/-უ`) never do, so the rule never
  truncates a genuine vowel-final stem. (Edge proper nouns in the closed Zork set
  are hand-tuned in the lexicon, not by a general rule.)

The **noun lexicon stores bare stems**; both a nominative-typed `ფანარი` and a
postposition-typed `ყუთში` reduce to the stored stem. There is **no stemmer and
no general morphological analyzer** — only this fixed, closed suffix list.

### 3.3 Direction fast-path

`parseDirection` gains a `core.directions` consult for `ka` (closed cardinal
set), so bare Georgian directions map straight to the movement canonicals. Still
data-driven; the lookup is a no-op when `directions` is absent.

**Blast-radius guarantee:** every new branch in §3.2/§3.3 is gated by the
presence of an optional field that only `ka` sets. A regression test asserts an
fr/de/es clause produces byte-identical output before and after this change.

---

## 4. Data to author

### 4.1 `src/llm/lexicon/ka.core.ts` (`KA_CORE: CoreLexicon`)
- **`verbs`** — natural Georgian imperative forms for the walkthrough action set:
  take/get, drop/put-down, open, close, go, look, examine, read, attack/kill,
  put, light/extinguish (Zork "turn on/off lamp"), enter/board, move, etc. Where
  a verb has a common aspect/preverb pair a player might type, list both forms.
- **`postpositions`**, **`directions`** — §3.1 closed sets.
- **`metaAliases`** — localized inventory/look/save/quit/etc. where Georgian
  players would type them (Mkhedruli forms route to the raw English meta).
- **`particleVerbs` = []** (Georgian preverbs are fused into the verb, not
  separable like German); **`verbIdioms`** only if a genuine multiword command
  appears.
- **Pronoun arrays empty.** Georgian object pronouns are verb suffixes, not
  tokens (`pronounsDirect`/`pronounsContainer`/`pronounsSelf` = []) — "it" is
  deferred (§8).

### 4.2 `src/llm/lexicon/ka.zork1.ts` (`KA_ZORK1: NounLexicon`)
- The closed Zork I object set (~50–80 canonicals) → Georgian **bare-stem**
  surface words/phrases (folded). Multi-word and synonym forms exactly as
  fr/de/es author them.

Every entry is **`NATIVE-REVIEW-DRAFT`** until the Tbilisi loop confirms it
(§9). The model authors the best draft; the native loop owns naturalness.

---

## 5. Runtime graduation (the contained logic edits)

1. **`src/llm/types.ts`** — remove `'ka'` from **`OUTPUT_ONLY_LANGS`**. `ka`
   stops raw-sending English and routes the command field through
   `nl.translate`. **`CORPUS_ONLY_LANGS` stays `{'ka'}`** — *output* remains
   corpus-only (no LLM output fallback). The two sets were deliberately kept
   distinct in Phase 1 (§3a) for exactly this graduation: Phase 2 touches only
   the input set.
2. **Forced grammar-only input for `ka`.** Even if a model is downloaded (for
   fr/de/es), `ka` input must never reach the LLM stage — the deterministic
   stages run and a miss **abstains** (the existing non-English grammar-only
   behavior: notice + restore line + escape hatch). A small `ka`-pinned
   grammar-only check in the input pipeline (`translatePipeline.ts` /
   `useNaturalLanguage.ts`) forces this independent of model state. The picker
   keeps `✦ improve` hidden for `ka` (no model is offered for it).
3. **`src/llm/lexicon/types.ts`** — `LexLang` gains `'ka'`. This is the line
   Phase 1 pinned to `'fr' | 'de' | 'es'` precisely so Phase 1 would not need a
   Georgian input lexicon; Phase 2 now supplies it, so the union opens.
4. **`src/llm/lexicon/index.ts`** — `CORES.ka = KA_CORE`;
   `NOUNS.ka = { [ZORK1_SIG]: KA_ZORK1 }` (Zork I only).

fr/de/es input routing is unchanged: the raw-send and forced-grammar-only
branches are reachable only for the languages named in their respective sets.

---

## 6. Gates (executable acceptance criteria)

- **NEW — Georgian walkthrough-parse gate** (`parse.ka-walkthrough.test.ts`).
  A Georgian fixture mapping every `walkthrough-commands.ts` step to its Georgian
  typed form; each must parse via the **grammar-only path** to the same canonical
  the English walkthrough uses. **Zero misses.** This is the operational
  definition of "walkthrough-completable." The fixture is itself
  `NATIVE-REVIEW-DRAFT` (are these the *natural* Georgian commands?).
- **Input-lexicon round-trip** (`src/llm/lexicon/roundtrip.test.ts:22`). Add
  `'ka'` to `LANGS`. Every `ka` noun-lexicon surface word, fed as
  `<take> <word>`, must parse to `take <emit>` through `fold()` + `expandGeorgian`.
- **Display↔input round-trip** (`src/translate/corpus/roundtrip.test.ts:34`). Add
  a `ka` `Row`. The Phase-1 display object forms must `fold()` back to the new
  input lexicon. (Phase-1 §6 deferred this enrolment to Phase 2 *because* it
  needs the input lexicon that only now exists.) `headExtra` for `ka` is `[]`
  (no prefix prepositions — the postposition story replaces it).
- **Validate gate** (`src/llm/lexicon/validate.test.ts`). Every `ka` verb target
  ∈ vocab; `KNOWN_COLLISIONS.ka` reviewed. Expected `KNOWN_COLLISIONS.ka[ZORK1_SIG]
  = []` — Mkhedruli is non-ASCII, so a Georgian source token cannot collide with
  an English vocab word (the stage-4 collision guard has nothing to catch).
- **Input UAT pins** (`src/llm/lexicon/parse.ka-uat.test.ts`). Puzzle-critical
  verbs + every confirmed finding pinned, mirroring `parse.es-uat.test.ts` et al.
- **`NATIVE-REVIEW-DRAFT` marker test.** Mirrors the Phase-1 marker gate so the
  draft status of the `ka` lexicon cannot be silently claimed final.
- `make all` clean.

---

## 7. Accessibility & copy (mandatory)

- **Activation notice / landing copy.** Phase 1's `ka` copy says commands are
  typed in English. Phase 2 updates it: a short bilingual message that Georgian
  input now works (beta) and that an unrecognized command can be sent verbatim
  via `"quoted English"`. Reuse the existing `aria-live` notice plumbing; no new
  live region. `LANDING_STRINGS`/`LANDING_EXAMPLES` `ka` entries switch from the
  type-English how-to to type-Georgian, with Georgian example commands.
- **Input placeholder** localizes for `ka` (the field is now a Georgian-input
  field).
- **`(beta)` marker** stays (textual, non-colour, screen-reader announced) — it
  does not drop until native review signs off (§9).
- **Tests** assert the updated `ka` accessible copy, mirroring existing picker /
  notice a11y tests. An a11y regression fails the suite.

No working behavior is removed — Phase 2 only *adds* Georgian input — so there is
no player-experience regression to escalate under CLAUDE.md's "talk to me first"
rule. (The escape hatch and English passthrough remain available to `ka`.)

---

## 8. Explicitly deferred (with reasons)

| Deferred | Why | Covered meanwhile by |
|----------|-----|----------------------|
| "it"-anaphora | Georgian object pronouns are verb suffixes, not tokens; walkthrough uses explicit nouns | Native loop + a later pass; escape hatch |
| Zork II / III input | II/III stay English by design (output is Zork I only) | English input still works for II/III |
| General morphology | The rejected "segmenter" approach; overkill for the walkthrough bar | Closed suffix set + citation forms |
| Free-play breadth | Coverage beyond the walkthrough path is naturalness-first, large | Tbilisi loop + escape hatch |
| Dropping `(beta)` | Native review is BLOCKING | §9 loop |

---

## 9. Native-speaker correction loop (post-ship, ongoing)

Identical in spirit to Phase 1 §8, now for input:

1. Phase 2 ships behind `(beta)` with all gates green and every lexicon entry
   `NATIVE-REVIEW-DRAFT`.
2. The Tbilisi playtesters drive Zork I by typing Georgian.
3. The forms they actually type — and any the lexicon failed to parse (visible
   because the command abstained) — are collected. Confirmed natural forms are
   added to `ka.core.ts` / `ka.zork1.ts` as ordinary data edits and pinned in
   `parse.ka-uat.test.ts` so a fix never regresses.
4. When the playtesters confirm input is natural (alongside Phase-1 output
   review), the `(beta)` marker drops — a one-line change in `languageOptions.ts`.

---

## 10. What does not change

- `parse.ts` verb/idiom/quantifier/prep-split logic — reused; the only addition
  is the gated `expandGeorgian` pre-stage and the `directions` consult.
- `fold.ts` — Mkhedruli is already pass-through-safe (no diacritics, no case).
- fr/de/es cores, noun lexicons, routing, and output — untouched; every new
  branch is gated by an optional field or set membership only `ka` has.
- The Phase-1 Georgian **output** corpus and `CORPUS_ONLY_LANGS` — untouched.
  Output stays corpus-only; this spec is input-only.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Model-authored Georgian forms aren't what players type | Native Tbilisi loop (§9); ship behind **beta**; abstain + escape hatch means a missed form degrades gracefully, never blocks. |
| `expandGeorgian` mis-splits a stem (over-eager `-ი` strip) | Closed suffix list, longest-first; nominative-`-ი` rule is provably safe for consonant vs vowel stems; round-trip gate catches any stem/lexicon disagreement. |
| Editing the input pipeline regresses fr/de/es | Every new branch gated by an optional field / set membership; regression test pins fr/de/es byte-identical output and `ka`-forced-grammar-only. |
| `ka` accidentally reaches the LLM | Forced grammar-only check (§5.2), independent of model state; a test pins that `ka` abstains rather than calling the LLM even with a model present. |
| Mkhedruli in CI / fixtures | BMP range (U+10A0–10FF); verify the suite runs green in CI before merge (same check as Phase 1). |

---

## 12. Self-review (design coverage)

- **Grammar-only, no LLM for Georgian input** → §1, §5.2. ✓
- **Walkthrough-completable bar + forcing-function gate** → §1, §6. ✓
- **Imperative-nominative insight collapses the morphology** → §2. ✓
- **One data-driven stage + two optional fields; fr/de/es untouched** → §3, §10. ✓
- **Closed postposition set replaces prefix-prepositions; bare-stem lexicon** → §3.2, §4. ✓
- **Runtime graduation: leaves `OUTPUT_ONLY_LANGS`, joins `LexLang`, stays
  forced-grammar-only; `CORPUS_ONLY_LANGS` unchanged** → §5. ✓
- **Both round-trip gates enrolled; validate + input-UAT + marker gates** → §6. ✓
- **a11y/copy updated (type-Georgian), `(beta)` retained** → §7. ✓
- **Deferrals stated with reasons** → §8. ✓
- **Native-review loop is first-class** → §9. ✓
