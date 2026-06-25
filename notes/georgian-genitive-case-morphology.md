# Design input: Georgian multi-word genitive objects in case roles

**Status:** pre-spec problem writeup (seed for a future design). Created 2026-06-25
on `ovid/georgian-input` after the `wrench` word (#2) could not be cleanly improved.
Not a plan — input for a brainstorm/spec.

## The one-paragraph problem

Phase-2 Georgian input carries **exactly one** stored form per object — the
nominative citation form (spec §2/§4). That works when the object is a **single
token** or sits in a **caseless slot** (a direct object, a listing). It **breaks**
when a **multi-word genitive compound** object must take a **postposition/case**
suffix (instrumental `-ით`, inessive `-ში`, etc.), because the suffix attaches only
to the **head** noun while the **genitive modifier** is left stranded.

## Concrete motivating case: `wrench`

- Correct Georgian for wrench/spanner is **`ქანჩის გასაღები`** ("nut-key"; confirmed
  via the Nova hardware retailer's product category). It is a genitive compound:
  `ქანჩის` (nut-GEN) + `გასაღები` (key).
- The wrench is on the **350 winning path**, including the instrumental command
  `მოატრიალე ხრახნი ქანჩის გასაღებით` ("turn the bolt with the wrench").
- `expandGeorgian` (`src/llm/lexicon/expandGeorgian.ts`) runs **token-by-token**, on
  the object-span remainder, with a fixed closed postposition set
  (`ში ზე ით დან თან`). For the instrumental phrase it produces:

  ```
  "ქანჩის გასაღებით"
    → "ქანჩის"            (ends in -ს: no postposition, no -ი strip → unchanged)
    → "გასაღებით"  →  ["ით", "გასაღებ"]   (-ით split, prep emitted BEFORE the stem)
    = ["ქანჩის", "ით", "გასაღებ"]
  ```

  The `ით` ("with") prep lands **between** `ქანჩის` and `გასაღებ`. The downstream
  prep-split then reads the instrument as bare **`გასაღებ`** ("key" — which
  **collides with the skeleton key**, `ღია გასაღებ`), and **`ქანჩის` is stranded**
  before the prep.

- `ქანჩი` alone = "nut" = the **bolt** (`ხრახნი`) the wrench turns, so it can't be a
  wrench synonym either. There is **no clean single-token Georgian word** for wrench.

So `ქანჩის გასაღები` is the _right_ word but currently unusable in its instrumental
form. `სასხლეტი` ("trigger") reads wrong but works **only because it is a single
token** (`სასხლეტით → ["ით", "სასხლეტ"]`, clean).

> **RESOLVED 2026-06-25** (branch `ovid/georgian-genitive-case-objects`). The
> stranded-modifier rejoin (`parse.ts`) now re-joins a genitive modifier across the case
> suffix, so `ქანჩის გასაღებით` parses end-to-end and `ქანჩის გასაღები` is the shipped
> wrench word — `სასხლეტი` is gone. The analysis below stands as the design rationale.

## Why this is general, not wrench-specific

The lexicon today **avoids** the problem by hand-picking **single-token** instrument
words and pre-simplifying display forms (see the M2 reconciliation notes in
`ka.zork1.ts`: `ტუმბოით`, the `-იანი`/genitive display rewrites). The class of
affected cases is broader than the instrumental:

- **Instrumental** `-ით` ("with X"): wrench, and any future multi-word tool.
- **Inessive** `-ში` ("put X in Y"): multi-word **containers** — e.g. the
  **trophy case** (`ჯილდოების ვიტრინა`), the **brown sack** — when used as the
  destination of `put`.
- **Ablative** `-დან`, **superessive** `-ზე`, **adessive** `-თან`: same shape.

Any object whose natural Georgian is a **genitive compound** (`X-ის Y`) or a
**multi-word adjective phrase** hits this the moment it needs a case suffix. The
closed Zork I noun set means it's enumerable, but it is **not** a one-off.

## Constraints the spec must respect

- Spec §8 **deferred** a general morphological segmenter ("overkill for the bar") in
  favor of the closed citation-form set. Any solution should justify itself against
  that decision — i.e. be **narrow and closed-set**, not an open analyzer.
- ka has **no LLM net**: the deterministic path is the only safety, so a gap is a
  guaranteed leak/miss, not a soft degrade.
- The **gates must stay green**: `src/llm/lexicon/roundtrip.test.ts`,
  `parse.ka-walkthrough.test.ts`, `parse.ka-uat.test.ts`, and the corpus
  round-trip. The walkthrough fixture encodes the real winning commands.
- No regression to the many **single-token** objects that work today.

## Candidate approaches (for the spec to weigh — not decided)

1. **Phrase-aware prep reordering in the noun matcher.** Let `resolveNoun`
   recognize a `[genitive…, prep, head]` token sequence and re-join it to
   `[prep, genitive… head]` when `genitive… + head` matches a known object phrase.
   Keeps `expandGeorgian` dumb; moves the smarts to where object-span boundaries are
   known. _Tradeoff:_ parser complexity; must not mis-bind a real preceding object.

2. **Per-object stored case forms (closed-set table).** Like the existing dative
   recipients (`thief` lists `ქურდ` + `ქურდს`), store the instrumental/inessive
   surface the split produces for each multi-word object. _Tradeoff:_ hand-tuning,
   but the set is closed and small; most-explicit-wins.

3. **Multi-token postposition handling in `expandGeorgian`.** When the last token of
   a span splits a postposition, emit the prep before the **whole span** rather than
   the single token. _Tradeoff:_ `expandGeorgian` runs token-by-token with no span
   boundary; would need a span signal or a lookbehind heuristic.

4. **Curated single-token / parse-safe forms.** Prefer a clean single-token object
   word where a case role is expected, or a native-approved colloquial instrument
   form. _Tradeoff:_ not always available (wrench has none); punts to the native loop.

A hybrid is plausible: (2) for the handful of winning-path case-role objects now,
(1) as the general fix later.

## Open questions

- **Native-input reality:** would a Georgian player actually type the full
  `ქანჩის გასაღებით`, or a shorter colloquial instrument? (Native loop input.)
- **Scope:** solve generally (approach 1/3) or per-object closed-set (approach 2)?
- **Beyond instrumental:** confirm the `put X in <multi-word container>` inessive
  cases on/off the winning path, so the spec sizes the real surface.

## Pointers

- `src/llm/lexicon/expandGeorgian.ts` — the token-by-token pre-stage (the split).
- `src/llm/lexicon/ka.zork1.ts` — noun lexicon + the M2 reconciliation notes
  (existing hand-tuned split-safe forms).
- `src/llm/lexicon/ka.core.ts` `KA_POSTPOSITIONS` — the closed suffix set.
- `src/translate/corpus/zork1.ka.objects.ts` — display forms (e.g. `wrench`).
- `parse.ka-walkthrough.test.ts` — the winning-path command fixtures.
