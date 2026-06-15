# Loquor Output Translation — German (Zork I × Deutsch)

**Date:** 2026-06-15
**Status:** Approved (brainstormed with Ovid)
**Extends:** `2026-06-14-loquor-output-translation-spanish-design.md` (the Spanish
output-translation design), which in turn extends the v1 French design
(`2026-06-10-loquor-output-translation-design.md`). The Spanish branch built the
language-list-driven test gates and named **German** as the next data-only
follow-up (§6), explicitly noting German is **not** a value-swap: it ships **case
forms** with adjective declension baked into each pre-composed string, and every
template must select the right case per slot. This spec executes that follow-up.

## 1. Goal

When the player selects **German**, all Zork I output displays in German,
instantly — the same guarantee, machinery, and fallback the French and Spanish
slices already deliver. This is a **corpus-authoring** effort plus **one new
linguistic design** (the German case-form scheme, §2). The matcher, overlay hook,
LLM fallback, cache, miss log, status-bar translator, and `xlPrompt` German
shimmer already exist and are language-agnostic.

The NL **input** layer for German is already complete and tested (`de.core.ts`,
`de.zork1/2/3.ts` — articles, the full case set, separable-prefix particle verbs,
verb idioms, meta-aliases, collision gates). The **planned** work here is corpus
authoring — it does **not** set out to redesign input parsing or expand lexicon
vocabulary.

**Scope note (input-layer fixes are in scope, by exception).** Identical to the
Spanish branch (Spanish §1): the generate-then-UAT-fix lifecycle genuinely
surfaces input-layer *defects* when a German player plays Zork I. A
**UAT-surfaced, tested, reviewed** fix to the input pipeline **is permitted** —
it is bug-fixing the same feature, not new input-layer feature work. The most
common such edit is the round-trip authoring rule's lexicon reconciliation (§4):
appending a German display phrase to `DE_ZORK1[canonical]` and, where its folded
head collides with an English vocab word, a reviewed entry in
`KNOWN_COLLISIONS.de[ZORK1_SIG]` (`src/llm/lexicon/index.ts`). The line this spec
holds is on *intent*: don't open *new* input-layer features or planned
lexicon-vocabulary expansion here.

## 2. Locked decisions

1. **French/Spanish corpus is the structural blueprint; German authors fresh
   values.** For every entry in the French corpus, German emits a twin with the
   **identical key** (string-table EN key, object EN key, or template **EN side**)
   and a German value. Because the gates check coverage over the same English
   fixtures, a structurally-complete German corpus passes the walkthrough and
   inventory gates **by construction** — *provided every template's slot ×
   bindable-object-set resolves*, including every case-form key a template
   references (§2.3). A template that binds an object missing a referenced form
   key is a **miss, not a pass** (`match.ts`).

2. **Translate from the English source, not from French or Spanish.** Each German
   value is authored from the English line; the French/Spanish values are
   available as same-meaning references, not the source of truth.

3. **The case-form scheme (the German-specific design).** German object slots
   require the correct grammatical **case**, and adjective endings change per case
   (`der blaue Knopf` nom → `den blauen Knopf` akk → `dem blauen Knopf` dat). Each
   object carries pre-composed phrases keyed by case × definiteness, supplied
   **only where a template references them**:
   - `bare` — head noun alone (`'knopf'`), for lists/labels.
   - `nomDef` / `nomIndef` — subject position (`'der blaue Knopf'` /
     `'ein blauer Knopf'`).
   - `akkDef` / `akkIndef` — direct object, **the default object case**
     (`'den blauen Knopf'` / `'einen blauen Knopf'`).
   - `datDef` / `datIndef` — only where a **bounded** template set needs dative.
   - **Preposition+article contractions** (`im`, `am`, `zum`, `zur`, `ins`,
     `vom`, …) baked into a per-object key (e.g. `imDat: 'im Briefkasten'`)
     **exactly** the way Spanish baked `al`/`del` into `alDef`/`delDef` — supplied
     only where a bounded template needs the natural contracted reading. The
     matcher never interprets key names; templates select the case explicitly:
     `{ en: 'You open the {obj}.', out: 'Du öffnest {obj.akkDef}.' }`.

4. **Discipline: minimize cases, hand-author the survivors — no declension code.**
   The default discipline mirrors how French and Spanish dodged `de`/`à` before a
   slot: prefer template phrasings that keep `{obj}` in nominative or accusative;
   introduce `dat*` / contraction keys only for a *bounded* object set; pin rare
   **genitive** lines as full strings. All forms are **hand-authored data** —
   there is **no** `withDeclension()` helper (German weak/strong/mixed adjective
   declension as code would be the "grammar code" the design forbids, and would
   need per-object gender/adjective metadata anyway). German's heavy **compounding**
   (`Messinglaterne`, `Goldsarg`, `Briefkasten`) helps: compound nouns are
   invariant — only the article inflects — so only genuine adjective phrases
   (`blauer Knopf`, `rote Boje`, `weißes Haus`, `schwarzes Buch`) carry the
   declension audit (§4). This case-form authoring is the German analog of
   Spanish's `alDef`/`delDef` object-set audit, scaled up — budget it as design
   work, not a value-swap.

5. **German-specific grammar stays in data — no grammar code** (design §4). All
   case selection lives in the template `out` sides and the per-object form keys;
   the matcher stays language-agnostic. German capitalizes **all nouns**, so
   corpus values capitalize nouns mid-sentence (`'Du öffnest den blauen Knopf.'`).

6. **The extraction-ignore list is shared.** `zork1.extraction-ignore.ts` lists
   English lines for language-*independent* structural classes (unbounded parser
   echoes, multi-item reveal lists, …). German leaves the same lines to the LLM
   fallback; the file is reused unchanged. German must not template or pin any
   line the ignore list contains, or the inventory "ignore list stays honest" test
   fails.

## 3. Files

### New data files (`src/translate/corpus/`)

Mirror the French/Spanish set 1:1 in key structure:

1. **`zork1.de.strings.ts`** — `Record<string, string>`: normalized English line
   → German. Same keys as `zork1.fr.strings.ts` (room descriptions, static
   responses, death/end banners, the game banner, irregular compositions pinned as
   full lines). German nouns capitalized in the values.
2. **`zork1.de.objects.ts`** — `ObjectsTable` keyed by the **same English printed
   names** as `zork1.fr.objects.ts`. German case forms per §2.3, supplied only
   where templates reference them. Exports `ZORK1_DE_OBJECTS` and a
   `ZORK1_DE_CANONICAL` map (EN printed name → input-lexicon canonical) where the
   display name differs from the lexicon's canonical key. **No** derivation helper.
3. **`zork1.de.templates.ts`** — same EN sides as `zork1.fr.templates.ts` (so the
   same compositions are covered), German `out` sides selecting the right case key
   per slot.
4. **`zork1.de.ts`** — aggregator exporting `ZORK1_DE: TranslationCorpus`
   (`{ strings, objects, templates }`), mirroring `zork1.fr.ts`.

### Registry (one line)

`src/translate/corpus/index.ts`: import `ZORK1_DE`, add to the Zork I entry:

```ts
[ZORK1_SIG]: { fr: ZORK1_FR, es: ZORK1_ES, de: ZORK1_DE },
```

`corpusFor()` already returns `null` for any uncovered (signature, language); the
`coverage` and `inventory` gates auto-enroll German via `corporaFor(ZORK1_SIG)`.

## 4. Test gates — German enrolls in the existing list-driven gates

The three corpus gates are already language-list-driven (built in the Spanish
branch). German adds itself with **no gate refactor**:

- **Coverage gate** (`coverage.test.ts`) and **Inventory gate**
  (`inventory.test.ts`) iterate `corporaFor(ZORK1_SIG)` directly — the registry
  line in §3 enrolls German automatically. The English walkthrough fixture, the
  string inventory, and the shared `ZORK1_EXTRACTION_IGNORE` are unchanged; only
  the compiled corpus varies.
- **Round-trip gate** (`roundtrip.test.ts`) carries per-language wiring (input
  lexicon + head-strip set), so German adds one row:
  `{ code: 'de', nouns: DE_ZORK1, core: DE_CORE, objects: ZORK1_DE_OBJECTS,
  canonical: ZORK1_DE_CANONICAL, headExtra: ['zum','zur','im','am','ins','vom','beim','ans','aufs'] }`.
  Case articles (`der/die/das/den/dem/des`) already strip via `core.articles`;
  `headExtra` adds the fused **contraction** tokens so a baked `imDat`-style
  form folds/strips to the bare noun before the lexicon-membership check. The
  Spanish spec §4 already verified a flat head-token **set** suffices for German —
  so German stays a list entry, not a config-shape change.
- **Matcher units** (`match.test.ts`) already cover the open-form-keys contract
  with a synthetic case-form language; **no change**. German's `akkDef`/`datDef`/
  contraction keys are just more data keys.

### The German declension audit (the dominant authoring cost)

`headExtra` strips only **leading** tokens (`stripHead` halts at the first
non-head token). A declined **adjective** is **medial** and survives:
`'der blaue Knopf'` folds/strips to `'blaue knopf'`, which is **not** a member of
`DE_ZORK1['blue button']` as-is (only `'blauer knopf'`, `'knopf'`) — so the
round-trip gate FAILS. For **every** adjective-bearing object you must either:

- (a) make the `bare` form a single lexicon-listed noun token (`bare: 'knopf'`), and/or
- (b) append the folded declined phrase(s) (`'blaue knopf'`, `'blauen knopf'`) to
  `DE_ZORK1[canonical]`, keeping `validate.test.ts` green.

When an appended phrase's folded head collides with an English game-vocab word,
`validate.test.ts` requires a reviewed entry in `KNOWN_COLLISIONS.de[ZORK1_SIG]`
(`src/llm/lexicon/index.ts`) with a justifying comment — the same pattern French
and Spanish used. **Never bend the German to dodge the gate.** Compound-noun
objects (the majority in `de.zork1.ts`) are exempt — the noun is invariant, only
the leading article strips. Budget this per-object audit as the real authoring
work. The gate proves the **noun resolves**, not that the **case** composed
correctly — case correctness is a UAT-only net (§5).

## 5. Lifecycle & UAT (deferred, mirrors French/Spanish)

Same generate-then-UAT-fix lifecycle: Claude authors the corpus as committed,
reviewable data files; the gates are the executable acceptance test for each
authoring task. **Gates-green is this plan's finish line**, matching the Spanish
branch (whose UAT loop was likewise deferred to a follow-up session).

The German UAT session — out of this plan's green-gate scope — plays Zork I in
German, dumps `window.loquorMisses()`, and hand-fixes corpus gaps and case errors
(the round-trip gate proves the noun resolves, not that `den`/`dem`/`im` composed
correctly). That session gives birth to a `zork1.de.uat.test.ts` regression file
mirroring `zork1.es.uat.test.ts`, targeting the same bar French/Spanish reached: a
deathless golden-path run with zero transcript leaks.

## 6. What does NOT change

`match.ts`, `useOutputTranslation.ts`, `normalize.ts`, `statusTranslate.ts`,
`fallbackCache.ts`, `missLog.ts`, `xlPrompt.ts`, the engine seam, every UI
component, the three test gates' structure, the shared `zork1.extraction-ignore.ts`,
and the language picker (German already listed). No new dependency, no extraction
re-run (Zork I strings already extractable), no matcher feature, no declension
helper.

## 7. Follow-ups (out of scope here)

- **German UAT loop + `zork1.de.uat.test.ts`** — the deferred session (§5).
- **Zork II/III German corpora** (rerun extraction; new tables; same matcher).
- **App chrome i18n**, **echo-hiding toggle**, **self-hosting model weights** —
  pre-existing follow-ups, unchanged.
