# Loquor Input Translation — Georgian multi-word genitive objects in case roles

**Status:** Approved design (brainstormed 2026-06-25). Branch:
`ovid/georgian-input` (same Phase-2 effort). Small, focused follow-up to the
Phase-2 Georgian input design.

**Source-of-truth lineage:** Extends
`2026-06-24-loquor-georgian-input-design.md` (Phase 2 Georgian INPUT). That spec
§8 deferred a general morphological segmenter as "overkill for the bar" and chose
the closed citation-form set; this design respects that — it adds **one narrow,
closed-class parser rule**, not an analyzer. Seeded by the problem write-up
`notes/georgian-genitive-case-morphology.md`. Zork I only, `ka`, **no input LLM**
(unchanged).

---

## 0. Why this matters (read this first)

Phase 2 lets a Georgian speaker drive Zork I in ქართული. But the **wrench** — a
tool on the 350-point winning path — is currently stored as `სასხლეტი`, which
means **"trigger,"** not "wrench." It is the *wrong word*. It exists only because
the correct Georgian for wrench, **`ქანჩის გასაღები`** ("nut-key"), is a two-word
**genitive compound**, and the current parser cannot attach a case suffix
(instrumental `-ით` "with", inessive `-ში` "in") to a multi-word object: the
suffix splits off the **head** noun only and wedges the preposition into the
middle of the phrase, stranding the genitive modifier. `ka` has **no LLM net**,
so this is a hard miss, not a soft degrade.

A Georgian player reads the room, sees a wrench, and is shown/typing "trigger."
This design ships the **correct word** and, with the same one mechanism, makes the
whole class of multi-word objects (genitive *or* adjective modifier) work in case
roles — which is also the reusable, game-agnostic part that a future Zork II/III
Georgian lexicon would inherit for free.

**Accepted tradeoff (flagged for native review):** the correct word has no bare
single-token shortcut — `გასაღებ` alone is the **skeleton key** — so the player
must type the **full two-word compound** `ქანჩის გასაღებით` every time, where
"trigger" gave a clean single token. We choose **correctness over keystrokes**
now because native review is a week–month out. **Open item for the Tbilisi loop
(§7):** if a native speaker confirms a shorter colloquial wrench word, that
becomes a trivial data swap; the mechanism stays useful regardless.

---

## 1. Goal & scope

**Goal:** A multi-word Georgian object whose natural form is `<modifier> <head>`
(genitive `ქანჩის გასაღები`, or adjective `ყავისფერ ტომარა` "brown sack") resolves
correctly when it takes a **case suffix** in a prepositional/instrumental slot —
not just in a caseless slot (direct object, listing).

**The bar:** the wrench reads as `ქანჩის გასაღები` everywhere (input + display),
and `მოატრიალე ხრახნი ქანჩის გასაღებით` ("turn the bolt with the wrench") parses to
`turn bolt with wrench`. The general mechanism is **proven by tests** across both
modifier kinds (genitive: wrench instrumental; adjective: brown sack inessive;
genitive: trophy case inessive).

**In scope:**
- One new parser rule in the prep-split loop (`parse.ts`): **move-one-token
  stranded-modifier rejoin** (§2).
- Wrench data swap `სასხლეტი → ქანჩის გასაღები` (input lexicon, display corpus,
  output string, walkthrough + UAT fixtures) (§3).
- Tests pinning the multi-word case-role class (§5).

**Out of scope / non-goals:**
- A general morphological segmenter (spec §8 deferral stands).
- **Two-or-more modifier tokens** in a case role — e.g. the broken egg's full
  ablative `გატეხილ თვლებიან კვერცხიდან` (two modifiers + an `-ი`-residue quirk).
  Its **bare form `კვერცხიდან` already works and is the taught path**; the
  full adjective-phrase ablative is a **documented ceiling** (§2, ponytail
  comment), not supported. No winning-path command produces it.
- Any change to `expandGeorgian` (it stays a dumb token-by-token pre-stage), to
  fr/de/es, or to the LLM machinery (`ka` has none).

---

## 2. The mechanism — move-one-token stranded-modifier rejoin

**Where:** inside the existing prep-split loop in `parse.ts` (the loop that, for
each preposition token, treats the span before it as the object and the span
after as the indirect object/instrument).

**Why a rejoin is needed:** a Georgian modifier precedes its head. When the
instrument is `<modifier> <head>` and the head takes a postposition,
`expandGeorgian` splits the postposition off the **head only**, so the emitted
token stream is `[…, modifier, PREP, head]` — the preposition is wedged between
the two words of one phrase. The object span before the prep then ends in a
**stranded modifier** and fails to resolve.

**The rule (fires only when today's parse already fails):**

```js
// inside the prep-split loop, after computing obj + ind from the split at i:
let obj = resolveNoun(objSpan, …)
let ind = resolveNoun(tokens.slice(i + 1), …)

// Stranded-modifier rejoin (ka only). A Georgian modifier (genitive `ქანჩის`,
// adjective `ყავისფერ`) precedes its head; a case suffix splits off the HEAD
// only, wedging the prep mid-phrase. If the object span fails as-is but dropping
// its LAST token resolves, AND that token glued onto the instrument resolves as
// one noun, shift it across the prep.
// ponytail: moves exactly ONE token — covers every real object (single-modifier:
//   wrench, trophy case, brown sack). 2+ modifiers (broken-egg full ablative) is
//   unsupported; bare form works. Upgrade path: search the split point if a real
//   2-modifier case-role object ever appears.
if (core.postpositions && !obj && objSpan.length > 1) {
  const head     = resolveNoun(objSpan.slice(0, -1), …)
  const rejoined = resolveNoun([objSpan.at(-1), ...tokens.slice(i + 1)], …)
  if (head && rejoined) { obj = head; ind = rejoined }
}

if (obj && ind && verbArityOk(verb, vocab, 2))
  return { kind: 'command', text: `${verb} ${obj.emit} ${prep} ${ind.emit}` }
```

**Worked traces:**

```
"მოატრიალე ხრახნი ქანჩის გასაღებით"  (turn bolt with wrench — instrumental, genitive)
  expandGeorgian → [ხრახნ, ქანჩის, ით, გასაღებ]
  prep "ით"=with at i=2 → objSpan=[ხრახნ, ქანჩის]  ind=[გასაღებ]
    obj = resolveNoun("ხრახნ ქანჩის") → null         ← today fails here
    REJOIN head="ხრახნ"→bolt ✓   rejoined="ქანჩის გასაღებ"→wrench ✓
  → "turn bolt with wrench"

"ჩადე ნახატი ჯილდოების ვიტრინაში"   (put painting in trophy case — inessive, genitive)
  → [ნახატ, ჯილდოების, ში, ვიტრინა]
  REJOIN head="ნახატ"→painting ✓  rejoined="ჯილდოების ვიტრინა"→trophy case ✓
  → "put painting in trophy case"   (no data change — full phrase already a stored synonym)
```

**Why it is safe / cannot regress:**
- **Gated to `core.postpositions`** → `ka` only; fr/de/es never enter it.
- **Fires only on `!obj`** → never touches a command that already parses; the
  green winning path is untouched.
- **Double-resolve guard** → commits only when *both* the trimmed object and the
  rejoined instrument newly resolve as nouns. A valid `<adj noun> <prep> <noun>`
  whose object already resolves never enters the branch.
- **`გასაღებ` collision avoided by construction:** the wrench is stored only as
  the full two-word `ქანჩის გასაღებ`, never bare `გასაღებ` (which is the skeleton
  key). The rejoined instrument is always the full phrase, so it resolves
  uniquely to the wrench.

---

## 3. Data changes (the wrench word swap)

`ka` is no-LLM, so its only safety is the deterministic data; the swap touches
every place the word appears so the player never sees "trigger":

| File | Change |
|---|---|
| `src/llm/lexicon/ka.zork1.ts` (wrench) | `['სასხლეტ გასაღებ', 'სასხლეტ']` → `['ქანჩის გასაღებ']`. Drop the `სასხლეტ` forms. **Do not** add bare `გასაღებ` (skeleton-key collision). |
| `src/translate/corpus/zork1.ka.objects.ts` (wrench) | `indef: 'სასხლეტი გასაღები'` → `'ქანჩის გასაღები'` |
| `src/translate/corpus/zork1.ka.strings.ts` | `'(with the wrench)'`: `'(სასხლეტი გასაღებით)'` → `'(ქანჩის გასაღებით)'` (auto-disambiguation parenthetical) |

**Round-trip is preserved** (verified by hand): the stored input form
`ქანჩის გასაღებ` → roundtrip `toInputForm` re-attaches `-ი` to the consonant-final
last token → `ქანჩის გასაღები` → parser's `expandGeorgian` reduces it back to
`ქანჩის გასაღებ` → wrench. The display `ქანჩის გასაღები` → corpus `reduce`
(strip-only) → `ქანჩის გასაღებ` = the stored input form. No `-ით` lives in any
stored form, so nothing is mangled.

---

## 4. Fixture changes (the three wrench commands)

The wrench appears in **three** walkthrough commands — two bare, one
instrumental. The bare two resolve via the existing whole-phrase path; the
instrumental exercises the new mechanism:

| `src/llm/lexicon/parse.ka-walkthrough.test.ts` | from → to |
|---|---|
| take wrench | `აიღე სასხლეტი` → `აიღე ქანჩის გასაღები` |
| turn bolt with wrench | `მოატრიალე ხრახნი სასხლეტით` → `მოატრიალე ხრახნი ქანჩის გასაღებით` |
| drop wrench | `დადე სასხლეტი` → `დადე ქანჩის გასაღები` |

`src/llm/lexicon/parse.ka-uat.test.ts` — update the wrench instrumental pin and
its `სასხლეტი`-referencing comments to the new word.

---

## 5. Testing (TDD; the "robust" proof)

Per the `roundtrip.test.ts` convention — *a parser change gets a reduced case in
`parse.test.ts` FIRST* — the order is:

1. **`parse.test.ts`** (red → green): a reduced case for the move-one-token
   rejoin, using a `ka`-shaped core (with `postpositions`) since the rule is
   gated on it — object span fails, drop-last + rejoin both resolve. Drives the
   mechanism in isolation.
2. **`parse.ka.test.ts` / `parse.ka-uat.test.ts`**: the mechanism across both
   modifier kinds —
   - genitive instrumental: wrench (`… ქანჩის გასაღებით`),
   - genitive inessive: trophy case full form (`… ჯილდოების ვიტრინაში`),
   - adjective inessive: brown sack full form (`… ყავისფერ ტომარაში`).
   These prove the *class*, not just the wrench. (Trophy case / brown sack need
   **no data change** — their full phrase is already a stored synonym.)
3. **Existing gates stay green:** `roundtrip.test.ts`, `parse.ka-walkthrough`,
   `parse.ka-uat`, the corpus round-trip. The §3 hand-trace must hold under CI.

A passing run must stay **output-pristine** (no stray `console.*`, no `act()`
warnings) per CLAUDE.md.

---

## 6. Multilingual check (CLAUDE.md rule)

This is a **Georgian-specific morphology** quirk (modifier-precedes-head + a
split case suffix). fr/de/es do not split postpositions off nouns, and the rule
is gated to `core.postpositions` (present only for `ka`). So the
"fix-it-in-all-languages" rule is satisfied by **explicit non-application**:
there is no equivalent gap in fr/de/es. The rule is **deterministic** (lexicon +
parser), so it correctly applies to `ka`-on-Zork-I — the language that, with no
LLM net, most needs it.

---

## 7. Deferred / native-review item

Record for the Tbilisi loop: **is `ქანჩის გასაღებით` what a Georgian player would
actually type for "with the wrench," or is there a shorter colloquial term?** If
yes, swap the data (§3) for the colloquial form; the §2 mechanism is unaffected.
This is the one player-experience question the code cannot answer.

---

## 8. File inventory (complete)

- **Mechanism:** `src/llm/lexicon/parse.ts` (one rejoin block in the prep-split loop)
- **Data:** `src/llm/lexicon/ka.zork1.ts`, `src/translate/corpus/zork1.ka.objects.ts`,
  `src/translate/corpus/zork1.ka.strings.ts`
- **Tests/fixtures:** `src/llm/lexicon/parse.test.ts` (new reduced case),
  `src/llm/lexicon/parse.ka.test.ts` / `parse.ka-uat.test.ts` (class pins),
  `src/llm/lexicon/parse.ka-walkthrough.test.ts` (three wrench commands)
- **Untouched:** `expandGeorgian.ts`, fr/de/es lexicons, all LLM machinery
