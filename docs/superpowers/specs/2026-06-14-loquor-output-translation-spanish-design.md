# Loquor Output Translation — Spanish (Zork I × Español)

**Date:** 2026-06-14
**Status:** Approved (brainstormed with Ovid)
**Extends:** `2026-06-10-loquor-output-translation-design.md` (the v1 French
output-translation design). That design explicitly named **German & Spanish
corpora** as data-only follow-ups (§8) and built the **open-form-keys contract**
(§4) so a new language plugs in without touching the matcher. This spec executes
the Spanish half of that follow-up and makes the test gates language-list-driven
so German (the next follow-up) inherits the infrastructure with no rework.

## 1. Goal

When the player selects **Spanish**, all Zork I output displays in Spanish,
instantly — the same guarantee, machinery, and fallback the French slice already
delivers. This is a **corpus-authoring + gate-parameterization** effort, not an
architecture change. The matcher, overlay hook, LLM fallback, cache, miss log,
status-bar translator, and `xlPrompt` Spanish shimmer (`'…traducción'`) already
exist and are language-agnostic.

The NL **input** layer for Spanish is already complete and tested (`es.core.ts`,
`es.zork1/2/3.ts`, prompt few-shots, the `Español` picker entry, collision
gates). This spec does **not** touch input.

## 2. Locked decisions

1. **French corpus is the structural blueprint; Spanish swaps the values.** For
   every entry in the French corpus, Spanish emits a twin with the **identical
   key** (string-table EN key, object EN key, or template EN side) and a Spanish
   value. Because the gates check coverage over the same English fixtures, a
   structurally-complete Spanish corpus passes the walkthrough and inventory
   gates **by construction** — before quality is even assessed.
2. **Translate from the English source, not from French.** French→Spanish
   compounds any French liberty or error. Each Spanish value is authored from the
   English line (the French value is available as a same-meaning reference, not
   the source of truth).
3. **Generate-then-UAT-fix lifecycle**, identical to French (design §2.2):
   Claude authors the corpus as committed, reviewable data files; the UAT
   miss-log (`window.loquorMisses()`) drives hand-fixes. No API keys, no
   build-time model dependency.
4. **Scope: Zork I × Spanish only.** Zork II/III Spanish are later follow-ups
   (French itself ships only Zork I output today). German is a **separate
   branch** (§6).
5. **Spanish-specific grammar stays in data — no grammar code** (design §4).
   Gender uses the same `{indef, def, bare}` form keys as French
   (`un libro`/`el libro`/`libro`, `una botella`/`la botella`/`botella`).
   Contractions `a el → al` and `de el → del` are handled by **additional
   per-object form keys** (`alDef` → `al altar`, `delDef` → `del altar`) supplied
   only on objects whose templates need them — exactly the open-form-keys escape
   hatch German will use for case forms. The matcher never interprets key names.
6. **The extraction-ignore list is shared.** `zork1.extraction-ignore.ts` lists
   English lines for language-*independent* structural classes (unbounded parser
   echoes, the CR-less tie-up sentence, multi-item reveal lists). Spanish leaves
   the same lines to the LLM fallback; the file is reused unchanged.

## 3. Files

### New data files (`src/translate/corpus/`)

Mirror the French set 1:1 in key structure:

1. **`zork1.es.strings.ts`** — `Record<string, string>`: normalized English
   line → Spanish. Same keys as `zork1.fr.strings.ts` (room descriptions, static
   responses, death/end banners, the game banner, irregular compositions pinned
   as full lines). Spanish inverted punctuation (`¿…?`, `¡…!`) lives in the
   values.
2. **`zork1.es.objects.ts`** — `ObjectsTable` keyed by the **same English
   printed names** as `zork1.fr.objects.ts`. Spanish forms: `{indef, def, bare}`
   for every object, plus `alDef`/`delDef` **only** where a template needs the
   contraction. Exports `ZORK1_ES_OBJECTS` and, mirroring French, a
   `ZORK1_ES_CANONICAL` map (EN printed name → input-lexicon canonical) where the
   display name differs from the lexicon's canonical key.
3. **`zork1.es.templates.ts`** — same EN sides as `zork1.fr.templates.ts`
   (so the same compositions are covered), Spanish `out` sides
   (`There is a {obj} here.` → `Hay {obj.indef} aquí.`). Where a Spanish template
   would otherwise produce `de {obj.def}`/`a {obj.def}`, it references
   `{obj.delDef}`/`{obj.alDef}` instead.
4. **`zork1.es.ts`** — aggregator exporting `ZORK1_ES: TranslationCorpus`
   (`{ strings, objects, templates }`), mirroring `zork1.fr.ts`.

### Registry (one line)

`src/translate/corpus/index.ts`: import `ZORK1_ES`, add to the Zork I entry:

```ts
[ZORK1_SIG]: { fr: ZORK1_FR, es: ZORK1_ES },
```

`corpusFor()` already returns `null` for any uncovered (signature, language), so
no signature/language logic changes.

## 4. Test gates — parameterize over a language list

The three corpus gates are currently hardcoded to French. Make them
**list-driven** so adding a corpus auto-enrolls it and German later is one list
entry, never a refactor. French rows must stay green throughout (the
parameterization is a pure refactor for French).

- **Coverage gate** (`coverage.test.ts`, design §7.3) — drive the zero-miss
  golden-path assertion over `[['fr', ZORK1_FR], ['es', ZORK1_ES]]` via
  `describe.each`/`it.each`. The English walkthrough fixture
  (`zork1.walkthrough.en.json`) and the reduce→lines helper are **shared and
  unchanged** — only the compiled corpus varies.
- **Inventory gate** (`inventory.test.ts`, design §7.4) — same English string
  inventory (`extractStrings`/`displayLines` over `public/games/zork1.z3`) and
  the **shared** `ZORK1_EXTRACTION_IGNORE`; loop the corpus. The
  `displayLines ≡ normalize` equivalence test is language-independent and stays
  as one case.
- **Round-trip gate** (`roundtrip.test.ts`, design §7.5) — carries per-language
  wiring (input lexicon + head-strip set), so parameterize via a small per-row
  config: `{ nouns, core, objects, canonical, headExtra }`. Spanish row supplies
  `ES_ZORK1`, `ES_CORE`, `ZORK1_ES_OBJECTS`, `ZORK1_ES_CANONICAL`, and a
  `headExtra` of `['del', 'al', 'de', 'd']` so contraction/partitive heads strip
  to the bare noun before the lexicon-membership check (French uses
  `articles ∪ {de, d}`). Authoring rule, same as French: if a natural Spanish
  display phrase is missing from `ES_ZORK1`, **add it to the input lexicon**
  (keeping the lexicon validation suite green) — never bend the Spanish to fit.
- **Matcher units** (`match.test.ts`) — already cover the open-form-keys contract
  with a synthetic case-form language; **no change**. Spanish's `alDef`/`delDef`
  are just more data keys.

### Spanish UAT loop

After the gates are green, the established loop applies: play Zork I in Spanish,
dump `window.loquorMisses()`, feed the corpus, hand-fix round-trip failures.
Target the same bar French reached (a deathless golden-path run with zero
transcript leaks).

## 5. What does NOT change

`match.ts`, `useOutputTranslation.ts`, `normalize.ts`, `statusTranslate.ts`,
`fallbackCache.ts`, `missLog.ts`, `xlPrompt.ts`, the engine seam, every UI
component, and the language picker (Spanish already listed). No new dependency,
no extraction re-run (Zork I strings already extractable), no matcher feature.

## 6. Follow-ups (out of scope here)

- **German corpus (Zork I).** Inherits **all** infrastructure this branch builds
  (parameterized gates, registry shape, shared ignore list, language-agnostic
  matcher) — adding `'de'` to each gate's language list is one entry. German is a
  **separate branch** because its corpus is not a value-swap: it ships **case
  forms** (`nomIndef`, `akkIndef`, `datDef`, …) with adjective declension baked
  into each pre-composed string, and every template must select the right case
  per slot. That is per-template linguistic authoring plus its own form-key and
  round-trip design — roughly double the corpus work — and tangling it into the
  Spanish UAT loop would make this branch hard to land. Same lifecycle Spanish is
  in today; just its own conversation.
- **Zork II/III Spanish corpora** (rerun extraction; new tables; same matcher).
- **App chrome i18n**, **echo-hiding toggle**, **self-hosting model weights** —
  pre-existing follow-ups, unchanged.
