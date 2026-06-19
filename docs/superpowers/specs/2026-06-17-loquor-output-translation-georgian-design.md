# Loquor Output Translation — Georgian (Zork I × ქართული) Design

**Status:** Approved design (brainstormed 2026-06-17). Phase 1 of a two-phase
effort. Branch: `ovid/georgian`.

**Source-of-truth lineage:** This design follows the output-translation overlay
established in `2026-06-10-loquor-output-translation-design.md` and the German
slice authored per `2026-06-15-loquor-output-translation-german-design.md`. Where
this document and the German one conflict for Georgian, **this document wins** —
Georgian is a non-Latin, no-case, heavily-inflected language and several
German-first rules are explicitly inverted below.

---

## 0. Why this matters (read this first)

Georgian (ქართული) is a Kartvelian language with roughly **four million
speakers** and a writing system, **Mkhedruli**, used by almost no localized
software and essentially no interactive fiction. Shipping Zork I in Georgian is
not a checkbox next to French/Spanish/German — it is a small act of **linguistic
representation** for a community that rarely gets to see its own language inside
software of this kind. For the people who get to type a command and watch a 1980
mainframe classic answer them *in Georgian*, this is a genuine delight.

It is also **achievable in a way it never was before**:

1. The display-layer overlay is already language-agnostic and Unicode-clean
   (verified: the matcher capitalizes via `\p{L}`/`toUpperCase()` — a harmless
   no-op on caseless Mkhedruli; `normalize()` is whitespace-only; object form
   **keys** are open ASCII strings while **values** are arbitrary UTF-8). The
   architecture does not need to change to *hold* Georgian.
2. Current-generation foundation models (this work is authored by Opus 4.8)
   produce far better Georgian than their predecessors — good enough for a
   first draft, **not** good enough to ship unreviewed.
3. The author has direct access to **native Georgian speakers in Tbilisi** who
   are eager to playtest. This is the decisive asset: it converts the one risk a
   model cannot self-check — *grammaticality and naturalness* — into a fast,
   human-verified correction loop.

The division of labor is therefore explicit and is the spine of this design:
**automated gates enforce structural completeness; native speakers enforce
naturalness.** Neither substitutes for the other.

This spec covers **Phase 1: Georgian output** (read Zork I in Georgian; type
commands in English). **Phase 2: Georgian input** (type commands in Georgian,
grammar-only, no LLM) gets its own spec and plan later.

---

## 1. Goal & scope

**Goal:** Selecting **Georgian** in the language picker translates all Zork I
on-screen text to Georgian via the existing `src/translate/` overlay, shipped
behind a visible **beta** marker, with a corpus-only translation strategy (no LLM
fallback) whose misses degrade honestly to English and feed a native-speaker
correction loop.

**In scope (Phase 1):**
- A Georgian Zork I display corpus (strings, objects, templates, aggregator).
- A narrow, conscious runtime change enabling `ka` and disabling its LLM
  fallback.
- Picker registration with a beta marker and its accessibility affordances.
- Status-bar **room-name** translation (see §7).
- The three structural gates (coverage, inventory, completeness) green for `ka`.

**Explicitly out of scope:**
- **Georgian input** (Phase 2 — grammar-only command parsing).
- **Zork II / III translation** (matches the fr/es/de output corpus, which is
  Zork I only). They stay English — but that is **signaled, not silent**: a
  localized landing badge marks untranslated volumes (§7).
- **Round-trip gate enrollment** for `ka` (deferred to Phase 2 — see §6).
- **Full *in-game* UI chrome localization is not in scope** (no new Georgian
  copy is authored for in-game chrome in v1). **However, any chrome that is
  already an exhaustive `Record<ActiveLanguage, …>` localizes for `ka` for free,
  exactly as it does for fr/de/es** — specifically the in-game **Preferences
  modal** (`PREFS_COPY`) and the **status-bar ⚙ `aria-label`** render in
  Georgian when `ka` is active. This is the same behavior fr/de/es already get,
  it is better for the player than an English island in a Georgian transcript,
  and it requires no extra work (the exhaustive record forces the `ka` entry to
  exist). What stays English in v1 is only chrome that is *not* already fully
  localized per language. **Exception — the landing page copy IS localized:**
  `LANDING_STRINGS`/`LANDING_EXAMPLES` are exhaustive `Record<ActiveLanguage, …>`
  records gated for completeness, so registering `ka` *forces* Georgian landing
  copy to exist (it is not optional). It ships with **read-Georgian/type-English**
  semantics — the how-to says commands are typed in English, the examples reuse
  the English command list, and the caveat carries the beta note and offers **no**
  AI model (corpus-only, §3). See plan Task 1.
- **Mtavruli title styling** (a delightful future touch; Unicode does not map
  Mkhedruli→Mtavruli via `text-transform`, so it is real work, not v1).
- **LLM output fallback for Georgian** — deliberately removed (§3, §4).

---

## 2. Architecture

Pure data authoring against the existing, language-agnostic overlay, plus two
contained logic edits: the **output-path** no-fallback branch (§3) and the
**input-path** output-only routing (§3a). The data structure mirrors the German
slice so the coverage and inventory gates pass **by construction** (keys
byte-identical to the French corpus).

```
game output ─► matchLine(corpus, en)
                 │  hit  ─► render Georgian (corpus)
                 │  miss ─► [ka] logMiss(en) + render ENGLISH   ← no LLM
                 │          [fr/de/es] LLM fallback (unchanged)
```

**New data files (`src/translate/corpus/`):**
- `zork1.ka.strings.ts` — `ZORK1_KA_STRINGS: Record<string,string>`; normalized
  EN line → Georgian. Keys byte-identical to `zork1.fr.strings.ts`. Holds room
  descriptions, static responses, death/end banners, the game banner, **and
  per-object niche-case full lines** (§4).
- `zork1.ka.objects.ts` — `ZORK1_KA_OBJECTS: ObjectsTable` + `ZORK1_KA_CANONICAL`.
  Keys byte-identical to `zork1.fr.objects.ts` (EN printed names). Georgian case
  forms as **ASCII-named** keys (§4); **`indef` mandatory** on every object.
- `zork1.ka.templates.ts` — `ZORK1_KA_TEMPLATES: readonly Template[]`; EN sides
  byte-exact to `zork1.fr.templates.ts`, Georgian `out` sides.
- `zork1.ka.ts` — aggregator `export const ZORK1_KA: TranslationCorpus = { … }`.

**Modified files:**
- `src/translate/corpus/index.ts` — add `ka: ZORK1_KA` to the `CORPORA` entry
  (line 14) **and** export the new `CORPUS_ONLY_LANGS` set (§3).
- `src/translate/useOutputTranslation.ts` — **consciously modified** (§3):
  extend the language allowlist (lines 117–120) to admit `ka`; add the
  corpus-only no-fallback branch.
- `src/llm/types.ts` — add `'ka'` to `NL_LANGUAGES` (line 5). `ActiveLanguage`
  derives `ka` automatically. **`LexLang` must NOT** — it is
  `Exclude<NlLanguage, 'off' | 'en'>` today, and `CORES`/`NOUNS`/
  `KNOWN_COLLISIONS` (`src/llm/lexicon/index.ts`) are exhaustive
  `Record<LexLang, …>` maps, so deriving `ka` would demand a Georgian *input*
  lexicon that Phase 1 must not have and break `tsc -b`. Pin `LexLang` to an
  explicit `'fr' | 'de' | 'es'` union first (Phase 2 adds `ka` when the input
  lexicon exists). See §9 and the plan's Task 0.
- `src/ui/languageOptions.ts` — add the Georgian picker entry with its beta
  marker (§6).
- `src/translate/statusTranslate.ts` — add a `RIGHT_FORMAT['ka']` entry so the
  status-bar score/turns line carries Georgian labels (§7). The room-name lookup
  is already language-agnostic (`c.strings[normalize(status.location)]`, no
  language branch), so room names translate with zero change here; the only edit
  is the one-line `RIGHT_FORMAT` slot. Without it the score line renders verbatim
  English **and** logs a status miss every turn (the turn counter changes the
  string, defeating dedup), flooding the §8 miss log.

---

## 3. Runtime change: corpus-only, no LLM fallback (the output-path logic edit)

For fr/de/es, a corpus miss falls through to a WebLLM "literal translation"
fallback. **Georgian must not use this path.** The small WebLLM models cannot
produce correct Georgian; a fallback would emit *plausible-looking but wrong*
Georgian that the player cannot distinguish from correct text. That is strictly
worse than showing the original English line, which is at least honest and
recognizable. (This is a deliberate player-experience call under the project's
"player experience first" rule: a known-English line beats confident garbage.)

**Mechanism — minimal and contained:**

1. **`src/translate/corpus/index.ts`** (not frozen): export
   ```ts
   /** Languages whose output is corpus-only: a miss degrades to English and is
    *  logged, never sent to the LLM fallback. Georgian — the small WebLLM models
    *  cannot produce correct Georgian, so a fallback would emit garbage. */
   export const CORPUS_ONLY_LANGS: ReadonlySet<NlLanguage> = new Set(['ka'])
   ```

2. **`src/translate/useOutputTranslation.ts`** (consciously modified):
   - Extend the allowlist at lines 117–120 so `language === 'ka'` yields a
     non-null `lang` (a corpus loads and lines get matched).
   - At the **live-miss** branch, if `lang ∈ CORPUS_ONLY_LANGS`, call
     `logMiss({ en, kind: 'line', … })` and **leave the English line unchanged**
     — do not `markPending`, do not invoke the fallback resolver. The
     `createFallbackResolver` machinery (and thus the WebLLM engine) is never
     engaged for Georgian.

**Behavioral guarantee:** fr/de/es output behavior is **byte-for-byte
unchanged**; the new branch is reachable only for languages in
`CORPUS_ONLY_LANGS`. A regression test asserts that an uncovered Georgian line
renders as its English source and produces a `logMiss` entry, while an uncovered
French line still attempts fallback.

**Why misses stay rare:** the coverage gate (full walkthrough) and inventory gate
(every full-line string in the story file) force near-total coverage before this
ships. The miss path is a safety net and a UAT signal, not the common case.

---

## 3a. Input routing: output-only languages (the input-path logic edit)

Phase 1 Georgian reads in Georgian but **types in English** (§1). The picker,
however, is a single control wired to the NL **input** layer, and selecting a
language normally (a) routes the command field through `nl.translate` and (b)
can auto-open the model-download modal. For `ka` that path is wrong: there is no
Georgian input lexicon, and the WebLLM model does nothing for a corpus-only
output language. So the input path needs its own contained edit, separate from
§3's output edit.

**Mechanism — "Option A", contained and forward-compatible:**

1. **`src/llm/types.ts`** — export a second set:
   ```ts
   /** Languages with a DISPLAY corpus but no INPUT support yet (Phase 1). The
    *  command field raw-sends English for these — exactly as 'off' does. Phase 2
    *  (Georgian input) removes 'ka' from this set. Distinct from
    *  CORPUS_ONLY_LANGS (output: no LLM fallback) — same membership today,
    *  different jobs in different layers. */
   export const OUTPUT_ONLY_LANGS: ReadonlySet<NlLanguage> = new Set(['ka'])
   ```
2. **`src/ui/Terminal.tsx`** — selecting an `OUTPUT_ONLY_LANGS` language drives
   the display overlay (output translates) but routes the command field to a raw
   `sendLine` (English passthrough, exactly as `'off'`), so `nl.translate` is
   never called for `ka`. The VM echoes the English command as a `kind:'input'`
   line, which `useOutputTranslation` skips — so no spurious miss is logged.
   Selecting `ka` must **not** auto-open the model-download modal.
3. **`src/ui/NlLanguagePicker.tsx`** — hide the model-upgrade affordance
   (`✦ improve`) for output-only languages; the model does nothing for them.

**Two distinct `{'ka'}` sets — do not merge them.** `CORPUS_ONLY_LANGS`
(`translate/corpus/index.ts`, §3) governs *output* fallback; `OUTPUT_ONLY_LANGS`
(`llm/types.ts`) governs *input* routing. They happen to both equal `{'ka'}` in
Phase 1 but mean different things and live in different layers; collapsing them
would couple the output and input layers and break the Phase 2 graduation path
(Phase 2 removes `ka` from `OUTPUT_ONLY_LANGS` only).

**Behavioral guarantee:** fr/de/es input routing is unchanged — the raw-send
branch is reachable only for `OUTPUT_ONLY_LANGS`. A regression test pins that
`ka` raw-sends English and opens no modal while `fr` still routes through
`nl.translate`.

---

## 4. Linguistic strategy (Georgian-specific authoring contract)

These rules are the heart of correctness. Several **invert** the German contract;
each says *why*, so a future translator does not blind-copy German habits into
Georgian (per the multilingual discipline rule in CLAUDE.md).

- **DO NOT capitalize anything.** German capitalizes all nouns. **Georgian
  Mkhedruli is unicameral — it has no uppercase/lowercase at all.** Sentence-
  initial capitalization does not exist. The matcher's `capitalizeFirstLetter()`
  (`\p{L}` + `toUpperCase()`) is a harmless no-op on Mkhedruli (Unicode does not
  map Mkhedruli→Mtavruli), so nothing in the data should attempt casing.

- **Lean hard on full-line string pins; minimize templated object slots.**
  Georgian has **seven noun cases** (nominative, ergative, dative, genitive,
  instrumental, adverbial, vocative), split-ergative alignment, postpositions,
  and left-branching modifiers. Rather than author seven-case tables per object,
  keep `{obj}` in the **citation (nominative) form** and, whenever a line needs
  case agreement (ergative subject in aorist, dative object, genitive, etc.),
  **pin the entire line as a string** in `zork1.ka.strings.ts`. This keeps the
  completeness gate's required-key union tiny (expected: `indef`, `bare`, and at
  most `nom`).

- **`indef` is mandatory** on every object — the matcher's built-in
  "A {obj}" / "An {obj}" listing hardcodes `{obj.indef}`. Georgian has no
  indefinite article, so **`indef` = the bare nominative citation form**.

- **Form-key names are ASCII; values are Mkhedruli.** Keys like `nom`, `erg`,
  `dat`, `gen`, `inst`, `bare` (the matcher's `{obj.<key>}` regex is `[A-Za-z]+`).
  Georgian text lives entirely in the values.

- **Translate from the English source line.** The fr/es/de values are
  same-meaning references, never the source of truth.

- **Naturalness is a native-review concern, not a gate.** The gates prove a line
  is *present and structurally wired*; they cannot prove it is grammatical or
  idiomatic. That is the Tbilisi loop's job (§8). Author the best draft possible;
  expect correction.

---

## 5. Beta marker & accessibility (mandatory)

Per the project's hard a11y requirement:

- **Language registration:** add `'ka'` to `NL_LANGUAGES` (`src/llm/types.ts:5`)
  and a `LANGUAGE_OPTIONS` entry (`src/ui/languageOptions.ts`):
  ```ts
  { value: 'ka', label: 'ქართული (beta)', lang: 'ka' },
  ```
- **The marker is textual, not color-only** (WCAG 2.2: never convey state by
  colour alone). The literal string "(beta)" is part of the visible label and the
  accessible name, so it survives high-contrast/monochrome and is announced by
  screen readers. The picker option carries `lang="ka"` so the label is voiced
  with Georgian pronunciation (matching the existing `lang` affordance).
- **First-activation announcement:** on first selection of Georgian, the existing
  `aria-live` notice region announces a short bilingual message —
  *"ქართული თარგმანი ჯერ სატესტოა — ზოგი ტექსტი შეიძლება ინგლისურად გამოჩნდეს. /
  Georgian is a beta translation; some text may still appear in English."* Reuse
  the existing notice plumbing; **no new live region**.
- **Test:** assert the option's accessible name
  (`getByRole(..., { name: /ქართული/ })`) so the marker cannot silently
  regress, mirroring the existing picker a11y tests.

---

## 6. Gates (the executable acceptance criteria)

Three existing gates apply to Phase 1; the fourth is deferred.

- **Coverage** (`coverage.test.ts`) — replays the committed Zork I walkthrough
  against the corpus; **zero misses** required. Registry-driven
  (`corporaFor(ZORK1_SIG)`), so adding the `CORPORA` line enrolls `ka`. ✓
- **Inventory** (`inventory.test.ts`) — every full-line string extracted from
  `public/games/zork1.z3` must be translatable; the ignore list stays honest. ✓
- **Completeness** (`completeness.test.ts`) — every form key any template
  references exists on **every** object. **Already registry-driven**
  (`LANGS = corporaFor(ZORK1_SIG)` + `describe.each`), exactly like coverage and
  inventory — adding the `CORPORA` line auto-enrolls `ka`; **no gate code change
  needed**. Expected required-key union for Georgian: small (`indef`, `bare`,
  maybe `nom`), by §4 discipline. ✓
- **Round-trip** (`roundtrip.test.ts`) — display object forms must `fold()` back
  to the **input lexicon**. **Deferred to Phase 2.** There is no Georgian input
  lexicon in Phase 1, so `ka` is simply **not added** to the round-trip `LANGS`
  list. This decoupling is deliberate: it frees Phase 1 from authoring
  exhaustive case tables solely to satisfy round-trip, which is exactly the §4
  "minimize case forms" discipline. ⏸

**Phase 1 finish line:** the three applicable gates green, plus the new
no-fallback regression test (§3), the picker a11y test (§5), and a
**no-English-passthrough gate** — no `ka` string value left byte-identical to its
English key (which `matchLine` would return as "covered" while showing English).
This is the one machine-detectable *correctness* check; structural coverage is
not correctness, and true naturalness remains the §8 native-review loop's job
(legitimately-identical entries — a bare numeral, an untranslatable proper noun —
are explicitly allowlisted, not exempted by weakening the check). `make all`
clean.

---

## 7. Status bar (room name) & boundaries

A Georgian transcript with an **English status bar** is a visible inconsistency
the player would notice every turn. `statusTranslate.ts` has two independent
halves, and the work splits cleanly between them:

- **Room name — free, no change.** The location lookup is
  `c.strings[normalize(status.location)]` with **no language branch**, so the
  moment `ka` is in the allowlist room names translate via the corpus `strings`
  (room titles are already string keys). There is no fr/de/es parser to disturb.

- **Score/turns labels — the one real edit.** The `right` side is translated only
  when `RIGHT_FORMAT[language]` exists. Add a `ka` entry so the **labels** are
  Georgian while the **numerals stay Arabic** (Georgian uses Arabic numerals):
  ```ts
  // draft labels — confirmed/refined by the Tbilisi loop (§8)
  ka: (score, moves) => `ქულა: ${score}  სვლა: ${moves}`,
  ```
  This is mandatory, not optional: without it the bar renders verbatim
  `Score: 0  Turns: 5` every turn (English label words in an otherwise-Georgian
  transcript — the very inconsistency this section exists to remove), **and** the
  unmatched `right` is `logMiss`'d every turn. Because the turn counter changes
  the string, the persistent dedup never catches it, so the miss-log ring buffer
  fills with per-turn status noise and drowns the real line-misses that §8's
  native-review loop reads. The two label words ("ქულა"/"სვლა") are themselves a
  §8 native-review item — author the draft, expect correction.
- **Test:** assert a `ka` status line renders Georgian labels with the numerals
  intact, and that an uncovered `ka` line still degrades to English per §3.

**Untranslated volumes (Zork II / III) — signaled, not silent.** Only Zork I has
a corpus, so II/III display in English regardless of the chosen language. Rather
than leave a Georgian player to discover that by surprise, the landing tiles
carry a small **localized "English only" badge**, shown only when a translation
language is selected **and** that game has no corpus for it (read from the real
corpus registry, so English shows nothing and a future corpus removes the badge
by itself). The badge text is part of the volume radio's accessible name (a11y
§5). This adds a `LandingCopy.englishOnly` field (all languages) and a per-game
`sig` joining the corpus registry. Player-experience call under CLAUDE.md's
"player experience first" rule: honest signaling beats silent English. See plan
Task 9.

---

## 8. The native-speaker correction loop (post-ship, ongoing)

This is how draft Georgian becomes *good* Georgian, and it is a first-class part
of the design, not an afterthought.

1. Phase 1 ships behind the beta marker with gates green.
2. The Tbilisi playtesters play Zork I in Georgian.
3. Corrections — grammaticality, naturalness, case errors, awkward phrasings —
   are collected and applied as ordinary data-edit commits to the corpus files.
   Each confirmed finding is pinned in a `zork1.ka.uat.test.ts` regression suite
   (mirroring the existing UAT suites) so a fix never silently regresses.
4. The `logMiss` ring buffer (`window.loquorMisses()`) surfaces any English lines
   the player hit, feeding additional corpus entries.
5. When the playtesters are confident the translation is natural, the **(beta)**
   marker is dropped (a one-line change in `languageOptions.ts`).

---

## 9. What does not change

- `match.ts`, `normalize.ts` — untouched; both are already Unicode-safe.
- `fallbackCache.ts`, `xlPrompt.ts`, `missLog.ts` — untouched (Georgian uses
  `logMiss` via its existing signature; it does not use the cache or prompt).
- fr/de/es corpora and behavior — untouched and unaffected (the no-fallback
  branch is gated by `CORPUS_ONLY_LANGS`).
- The input lexicon (`src/llm/lexicon/**`) — untouched in Phase 1 (Phase 2 work).
  This holds **only because** `LexLang` is first pinned to `'fr' | 'de' | 'es'`
  (§2, plan Task 0); otherwise registering `ka` would force a bogus Georgian
  entry into the exhaustive lexicon maps.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Model-authored Georgian has grammatical/case errors | Native Tbilisi review loop (§8); ship behind **beta**; UAT regression suite. |
| A miss shows English mid-Georgian transcript | Honest by design (§3); coverage+inventory gates keep misses rare; `logMiss` feeds fixes. |
| Editing `useOutputTranslation.ts` regresses fr/de/es | New branch gated by `CORPUS_ONLY_LANGS`; regression test pins fr-still-falls-back vs ka-degrades-to-English. |
| Completeness gate is German-specific | **Non-issue** — already registry-driven (`corporaFor`); `ka` auto-enrolls via the `CORPORA` line. §4 keeps the key union small. |
| English status-bar labels every turn + flooded miss log | Add the one-line `RIGHT_FORMAT['ka']` slot (§7); room name already translates free. Test pins Georgian labels + English degradation. |
| Georgian file paths / UTF-8 in CI | Mkhedruli is BMP (U+10A0–10FF); verify the suite runs green in CI before merge. |

---

## 11. Self-review (design coverage)

- **Importance stated prominently** → §0. ✓
- **Corpus-only, no LLM fallback** → §3 (mechanism + guarantee + rationale). ✓
- **Input routing: read-Georgian/type-English via `OUTPUT_ONLY_LANGS`** → §3a
  (output↔input decoupling, modal/upgrade suppression, Phase 2 graduation). ✓
- **Georgian ≠ German (no capitalization; case via string-pins)** → §4. ✓
- **Open ASCII form keys, mandatory `indef`** → §4. ✓
- **Three gates apply; round-trip deferred with reason; plus the
  no-English-passthrough correctness gate** → §6. ✓
- **Beta marker is non-colour, a11y-tested, announced** → §5. ✓
- **Status bar fully Georgian: room name free, score/turns via one-line
  `RIGHT_FORMAT['ka']`** → §7. ✓
- **Untranslated volumes (Zork II/III) signaled by a localized landing badge**
  → §7. ✓
- **Native-review loop is first-class** → §8. ✓
- **fr/de/es untouched; minimal blast radius** → §9. ✓
- **Phase 2 (input) explicitly separate** → §1. ✓
