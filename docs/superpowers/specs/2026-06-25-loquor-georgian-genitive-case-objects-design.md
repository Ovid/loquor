# Loquor Input Translation — Georgian multi-word genitive objects in case roles

**Status:** Approved design (brainstormed 2026-06-25; revised after adversarial
`/pushback` review, same day — the review caught a winning-path multi-modifier
object the first draft missed, which moved the mechanism from move-one-token to a
split-point search). Branch: `ovid/georgian-input` (same Phase-2 effort).

**Source-of-truth lineage:** Extends
`2026-06-24-loquor-georgian-input-design.md` (Phase 2 Georgian INPUT). That spec
§8 deferred a general morphological segmenter as "overkill for the bar" and chose
the closed citation-form set; this design respects that — it adds **one narrow,
closed-class parser rule** over the existing stored full-phrase synonyms, not an
analyzer. Seeded by the problem write-up
`notes/georgian-genitive-case-morphology.md`. Zork I only, `ka`, **no input LLM**
(unchanged).

---

## 0. Why this matters (read this first)

Phase 2 lets a Georgian speaker drive Zork I in ქართული. But the **wrench** — a
tool on the 350-point winning path — is currently stored as `სასხლეტი`, which
means **"trigger,"** not "wrench." It is the *wrong word*. It exists only because
the correct Georgian for wrench, **`ქანჩის გასაღები`** ("nut-key"), is a two-word
**genitive compound**, and the current parser cannot attach a case suffix
(instrumental `-ით` "with", inessive `-ში` "in", ablative `-დან` "from") to a
multi-word object: the suffix splits off the **head** noun only and wedges the
preposition into the middle of the phrase, stranding the modifier(s) before it.
`ka` has **no LLM net**, so this is a hard miss, not a soft degrade.

A Georgian player reads the room, sees a wrench, and is shown/typing "trigger."
This design ships the **correct word** and, with one general mechanism, makes the
**whole class** of multi-word objects (genitive *or* adjective modifiers, one
*or* more) work in case roles — including the **hand-held air pump**
`ხელის ჰაერის ტუმბო` (also winning-path), which has two modifiers. The mechanism
is game-agnostic, so a future Zork II/III Georgian lexicon inherits it for free.

**Accepted tradeoff (flagged for native review).** The correct wrench word has no
bare single-token shortcut — `გასაღებ` alone is the **skeleton key** — so the
player must type the **full two-word compound** `ქანჩის გასაღებით` every time,
where "trigger" gave a clean single token. We choose **correctness over
keystrokes** now because native review is a week–month out. (This is wrench-only;
the pump/egg keep working bare forms *and* now accept their full forms too.)
**Open item for the Tbilisi loop (§7):** if a native speaker confirms a shorter
colloquial wrench word, that becomes a trivial data swap; the §2 mechanism is
unaffected.

---

## 1. Goal & scope

**Goal:** A multi-word Georgian object whose natural form is
`<modifier…> <head>` (genitive `ქანჩის გასაღები`; adjective `ყავისფერ ტომარა`
"brown sack"; multi-modifier `ხელის ჰაერის ტუმბო` "hand-held air pump") resolves
correctly when its head takes a **case suffix** in a prepositional/instrumental
slot — not just in a caseless slot (direct object, listing).

**The bar:** the wrench reads as `ქანჩის გასაღები` everywhere (input + display),
and the winning-path multi-word case-role commands parse — proven by tests at
**both modifier counts** (the rule is modifier-agnostic — it calls `resolveNoun`,
which doesn't care whether the stranded token is genitive or adjective):
- genitive, 1 modifier: wrench instrumental `… ქანჩის გასაღებით`
- genitive, 1 modifier: trophy case inessive `… ჯილდოების ვიტრინაში`
- genitive, **2 modifiers**: air pump instrumental `… ხელის ჰაერის ტუმბოით`

**In scope:**
- One new parser rule in the prep-split loop (`parse.ts`): a **stranded-modifier
  rejoin by split-point search** (§2).
- Wrench data swap `სასხლეტი → ქანჩის გასაღები` (input lexicon, display corpus,
  output string, walkthrough + UAT fixtures) (§3/§4).
- Tests pinning the multi-word case-role class + regressions (§5).

**Out of scope / non-goals:**
- A general morphological **segmenter/analyzer** (the §8 deferral stands). The
  rejoin is a closed search over **already-stored full-phrase synonyms**; it
  invents no morphology. It can only ever resolve a phrase a player could already
  type as a caseless object.
- Objects whose case-split residue is **not** a stored synonym. The search relies
  on the full phrase being stored (the corpus round-trip already guarantees this
  for every Zork I display object). The one such case in Zork I — the **ablative
  `-ი`-residue on the egg** (`-დან` splits but leaves the stem's `-ი`, so
  `გატეხილ თვლებიან კვერცხი` ≠ the stored `… კვერცხ`) — is a **documented residual
  ceiling**: the full ablative form cleanly **misses** (abstains), and the **bare
  form `… კვერცხიდან` works and is the taught/walkthrough path** (`take canary
  from egg`). The full ablative is implausible input (6+ tokens) and would need
  residue synonyms on two egg entries; we don't author them. The mechanism handles
  the egg automatically the instant such data exists — only the data is withheld.
- Any change to `expandGeorgian` (it stays a dumb token-by-token pre-stage), to
  fr/de/es, or to the LLM machinery (`ka` has none).

---

## 2. The mechanism — stranded-modifier rejoin by split-point search

**Where:** inside the existing prep-split loop in `parse.ts` (the loop that, for
each preposition token at index `i`, treats the span before it as the object and
the span after as the indirect object/instrument). The loop currently binds
`const obj`/`const ind` from `objTokens` (the object span, after the Spanish
personal-`a` strip) and `tokens.slice(i + 1)`.

**Why a rejoin is needed:** a Georgian modifier precedes its head. When the
instrument is `<modifier…> <head>` and the head takes a postposition,
`expandGeorgian` splits the postposition off the **head only**, so the emitted
token stream is `[…object…, modifier…, PREP, head]` — the preposition is wedged
between the modifiers and the head of one phrase. The object span before the prep
then ends in the instrument's **stranded modifiers** and fails to resolve.

**The rule (illustrative — written against the real loop's `objTokens`; the
implementer changes the loop's `const obj/ind` to `let` and inserts this before
the arity-gated return, leaving the `for` free to try later prep positions):**

```js
// for each prep position i:
let obj = resolveNoun(objTokens, …)
let ind = resolveNoun(tokens.slice(i + 1), …)

// Stranded-modifier rejoin (ka only). Georgian modifiers precede the head; a case
// suffix splits off the HEAD only, wedging the prep mid-phrase and stranding the
// modifier(s) at the END of the object span. If the object span fails as-is, scan
// split points k = 1 … len-1 and take the FIRST k where objTokens[0..k) resolves
// as the object AND objTokens[k..] glued onto the instrument resolves as one noun.
// ponytail: O(span length) scan, span ≤ ~4 tokens — trivial. Ascending k (smallest
//   object, largest instrument-modifier run) is correct because modifiers belong to
//   the instrument; partial objects almost never resolve, so the first hit is right.
//   The double-resolve guard means it only commits a fully-resolving reparse, so it
//   can NOT fire on a command that already parses. Move-one-token is just k=1.
if (core.postpositions && !obj && objTokens.length > 1) {
  for (let k = 1; k < objTokens.length; k++) {
    const o = resolveNoun(objTokens.slice(0, k), …)
    const r = resolveNoun([...objTokens.slice(k), ...tokens.slice(i + 1)], …)
    if (o && r) { obj = o; ind = r; break }
  }
}

if (obj && ind && verbArityOk(verb, vocab, 2))
  return { kind: 'command', text: `${verb} ${obj.emit} ${prep} ${ind.emit}` }
```

**Worked traces (against real `KA_ZORK1`):**

```
"მოატრიალე ხრახნი ქანჩის გასაღებით"   (turn bolt with wrench — instrumental, 1 genitive mod)
  → [ხრახნ, ქანჩის, ით, გასაღებ]   prep "ით"=with at i=2
  search k=1: o="ხრახნ"→bolt ✓   r="ქანჩის გასაღებ"→wrench ✓   → "turn bolt with wrench"

"გაბერე პლასტმასი ხელის ჰაერის ტუმბოით"  (inflate plastic with pump — instrumental, 2 genitive mods)
  → [პლასტმას, ხელის, ჰაერის, ით, ტუმბო]   prep "ით" at i=3
  search k=1: o="პლასტმას"→plastic ✓   r="ხელის ჰაერის ტუმბო"→pump ✓   → "inflate plastic with pump"
  (no data change — pump full form already a stored synonym)

"ჩადე ნახატი ჯილდოების ვიტრინაში"   (put painting in trophy case — inessive, 1 genitive mod)
  → [ნახატ, ჯილდოების, ში, ვიტრინა]   search k=1: painting ✓  "ჯილდოების ვიტრინა"→trophy case ✓
  → "put painting in case"   (no data change — full phrase already stored)

"აიღე კანარა გატეხილ თვლებიან კვერცხიდან"  (residual ceiling — ablative -ი-residue, see §1)
  → [კანარა, გატეხილ, თვლებიან, დან, კვერცხი]   prep "დან"=from at i=3
  search: k=1 r="გატეხილ თვლებიან კვერცხი" NOT stored (stem keeps -ი); k=2 o fails
  → no split resolves → MISS (clean abstain). Bare "… კვერცხიდან" works (taught path).
```

**Why it is safe / cannot regress:**
- **Gated to `core.postpositions`** → `ka` only; fr/de/es never enter it.
- **Fires only on `!obj`** → never touches a command that already parses; the
  green winning path is untouched, and a legitimate multi-word object that
  resolves whole never enters the search.
- **Double-resolve guard** → commits only when *both* a trimmed object and the
  rejoined instrument newly resolve as nouns.
- **No invented forms** → the search only ever matches stored synonyms, so it
  cannot manufacture a parse the lexicon doesn't already back.
- **`გასაღებ` collision avoided by construction:** the wrench is stored only as
  the full two-word `ქანჩის გასაღებ`, never bare `გასაღებ` (the skeleton key).

---

## 3. Data changes

`ka` is no-LLM, so its only safety is the deterministic data; the wrench swap
touches every place the word appears so the player never sees "trigger":

| File | Change |
|---|---|
| `src/llm/lexicon/ka.zork1.ts` (wrench) | `['სასხლეტ გასაღებ', 'სასხლეტ']` → `['ქანჩის გასაღებ']`. Drop the `სასხლეტ` forms. **Do not** add bare `გასაღებ` (skeleton-key collision). |
| `src/translate/corpus/zork1.ka.objects.ts` (wrench) | `indef: 'სასხლეტი გასაღები'` → `'ქანჩის გასაღები'` |
| `src/translate/corpus/zork1.ka.strings.ts` | `'(with the wrench)'`: `'(სასხლეტი გასაღებით)'` → `'(ქანჩის გასაღებით)'` (auto-disambiguation parenthetical) |

(No egg data change — the egg full-ablative is the §1 residual ceiling.)

**Round-trip preserved** (verified by hand): stored `ქანჩის გასაღებ` → roundtrip
`toInputForm` re-attaches `-ი` to the consonant-final last token → `ქანჩის გასაღები`
→ parser `expandGeorgian` reduces it back to `ქანჩის გასაღებ` → wrench. Display
`ქანჩის გასაღები` → corpus strip-only `reduce` → `ქანჩის გასაღებ` = the stored input
form. No `-ით` in any stored form.

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

`src/translate/corpus/zork1.ka.uat.test.ts` — the wrench-display pin
(`['wrench', 'გასაღებ']` + `matchLine(c, '(with the wrench)')`) still passes after
the swap (new form still contains `გასაღებ` and Georgian script); confirm green,
no edit expected.

---

## 5. Testing (TDD; the "robust" proof)

The `roundtrip.test.ts` convention says *a parser change gets a reduced case
first*. This rule is **`ka`-gated** (needs `core.postpositions` + the
`expandGeorgian` pre-stage), so its natural reduced home is **`parse.ka.test.ts`**
(the established file for focused `ka` parser cases against real `KA_CORE`/
`KA_ZORK1`) — not `parse.test.ts`, whose synthetic fr/de/es fixtures have no
postpositions. The order:

1. **`parse.ka.test.ts`** (red → green): the mechanism, driven by two cases that
   need **only the parser change, no data edit** — so they isolate the mechanism:
   - **k=1:** trophy case full inessive `ჩადე ნახატი ჯილდოების ვიტრინაში`
     → `put painting in case` (its full phrase is already a stored synonym).
   - **k=2:** air pump full instrumental `გაბერე პლასტმასი ხელის ჰაერის ტუმბოით`
     → `inflate valve with pump` (ditto). This exercises the *search loop*, not
     just move-one.
2. **Regression / safety pins (the pushback's C1/C2):**
   - **Mis-bind guard:** a command whose multi-word object resolves whole before a
     prep (`ჩადე დიდ ზურმუხტი ვიტრინაში` → `put emerald in case`) MUST emit the
     normal parse and never enter the search (proves the `!obj` gate).
   - **Residual-ceiling clean-miss:** the egg full ablative
     `აიღე კანარა გატეხილ თვლებიან კვერცხიდან` → `{ kind: 'miss' }` (proves it
     abstains, never mis-resolves — §1 ceiling).
   - **Bare-fallback:** already pinned by `parse.ka-walkthrough.test.ts` — the
     pump's bare `… ტუმბოით` (`inflate valve with pump`) and the egg's bare
     `… კვერცხიდან` (`take canary from egg`). No new test needed; the walkthrough
     gate guards them.
3. **Wrench swap** (with the §3/§4 data change): the three walkthrough commands +
   the `parse.ka-uat.test.ts` instrumental pin updated to `ქანჩის გასაღები`.
4. **Existing gates stay green:** `roundtrip.test.ts`, `parse.ka-walkthrough`,
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
This is the one player-experience question the code cannot answer. (The pump full
form is verbose but optional — its bare form remains the taught path; the egg full
ablative is the §1 residual ceiling, bare-only.)

---

## 8. File inventory (complete)

- **Mechanism:** `src/llm/lexicon/parse.ts` (one split-point rejoin block in the
  prep-split loop; change `const obj/ind` → `let`)
- **Data:** `src/llm/lexicon/ka.zork1.ts` (wrench swap only),
  `src/translate/corpus/zork1.ka.objects.ts` (wrench display),
  `src/translate/corpus/zork1.ka.strings.ts` (`(with the wrench)`)
- **Tests/fixtures:** `src/llm/lexicon/parse.ka.test.ts` (mechanism k=1 + k=2,
  mis-bind guard, egg clean-miss), `src/llm/lexicon/parse.ka-uat.test.ts` (wrench
  instrumental pin), `src/llm/lexicon/parse.ka-walkthrough.test.ts` (three wrench
  commands), `src/translate/corpus/zork1.ka.uat.test.ts` (confirm green, no edit
  expected)
- **Untouched:** `expandGeorgian.ts`, `parse.test.ts`, fr/de/es lexicons, all LLM
  machinery
