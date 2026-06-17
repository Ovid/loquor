# Georgian (Zork I × ქართული) Output Translation — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selecting **Georgian** in the language picker translates all Zork I on-screen text to Georgian via the existing `src/translate/` overlay — corpus-only (no LLM fallback), behind a visible **(beta)** marker — while the player types commands in English.

**Architecture:** Pure data authoring against the language-agnostic overlay, plus three small, gated logic edits: (1) a corpus-only no-fallback output branch keyed by `CORPUS_ONLY_LANGS`, (2) an input-routing decoupling keyed by `OUTPUT_ONLY_LANGS` so Georgian translates *output* while *input* raw-sends English (Option A — forward-compatible with the Phase 2 Georgian-input work), and (3) a one-line Georgian status-bar format. Every edit is gated to `{'ka'}` so French/Spanish/German behavior is byte-for-byte unchanged.

**Tech Stack:** TypeScript, React, Vitest. Display overlay in `src/translate/`; input layer in `src/llm/`; UI in `src/ui/`.

**Source of truth:** `docs/superpowers/specs/2026-06-17-loquor-output-translation-georgian-design.md` (§ references below point at it).

---

## Design decisions locked before tasks (read once)

- **Two distinct `{'ka'}` guard sets, named for their job — do not merge them:**
  - `CORPUS_ONLY_LANGS` (in `src/translate/corpus/index.ts`, spec §3) — *output*: a corpus miss degrades to English and is logged, never sent to the LLM fallback.
  - `OUTPUT_ONLY_LANGS` (in `src/llm/types.ts`) — *input*: the language has a display corpus but **no input support yet**, so the command field raw-sends English instead of routing through `nl.translate`. Phase 2 removes `ka` from this set.
- **Why two sets:** they happen to both equal `{'ka'}` in Phase 1 but mean different things and live in different layers; collapsing them would couple the output and input layers and break the Phase 2 graduation path.
- **Option A wiring (the input blocker):** the language picker is a single control wired to the input NL layer, and output translation follows `nl.state.language` (`Terminal.tsx:142`). Selecting `ka` puts the NL layer in `phase:'on'`/`ka` (so output translates), but `ka` is in `OUTPUT_ONLY_LANGS`, so Terminal routes the command field to a raw `sendLine` (English passthrough). The VM echoes the English command as a `kind:'input'` line, which `useOutputTranslation` skips — so no spurious miss is logged. Selecting `ka` must also **not** auto-open the model-download modal (the model does nothing for Georgian in Phase 1).
- **Corpus authoring is gate-driven, not inlined.** The Georgian corpus is ~76 objects, ~186 template EN-sides, and ~hundreds of strings, mirroring the French key skeleton. The per-string Georgian *values* are authored at execution time and verified by the three gates (Task 7) plus native review (§8) — this plan supplies the file structure, the mirroring procedure, the §4 linguistic contract, and sample entries, and treats the gates as the executable acceptance criteria. Do **not** fabricate placeholder Georgian; author real drafts and let the gates + Tbilisi loop confirm them.

---

## File structure

**Create:**
- `src/translate/corpus/zork1.ka.strings.ts` — `ZORK1_KA_STRINGS: Record<string,string>` (keys byte-identical to `zork1.fr.strings.ts`).
- `src/translate/corpus/zork1.ka.objects.ts` — `ZORK1_KA_OBJECTS: ObjectsTable` + `ZORK1_KA_CANONICAL`.
- `src/translate/corpus/zork1.ka.templates.ts` — `ZORK1_KA_TEMPLATES: readonly Template[]`.
- `src/translate/corpus/zork1.ka.ts` — aggregator `ZORK1_KA: TranslationCorpus`.
- `src/translate/corpus/zork1.ka.uat.test.ts` — Georgian UAT regression pins (runtime-composed lines the gates can't see).

**Modify:**
- `src/llm/types.ts` — add `'ka'` to `NL_LANGUAGES`; add `OUTPUT_ONLY_LANGS`.
- `src/ui/languageOptions.ts` — add the Georgian picker entry.
- `src/translate/corpus/index.ts` — register `ka: ZORK1_KA`; export `CORPUS_ONLY_LANGS`.
- `src/translate/useOutputTranslation.ts` — admit `ka`; corpus-only no-fallback branch.
- `src/translate/statusTranslate.ts` — add `RIGHT_FORMAT['ka']`.
- `src/ui/Terminal.tsx` — Option A input-routing decoupling + suppress model offer for output-only langs.
- `src/ui/NlLanguagePicker.tsx` — hide the model-upgrade affordance for output-only langs.
- `src/ui/landingStrings.ts` — Georgian landing copy (`ka`) + new `englishOnly` badge field for all languages.
- `src/ui/landingExamples.ts` — Georgian (`ka`) landing command examples (English, per Phase 1).
- `src/games/catalog.ts` — per-game `sig` to join the translation-corpus registry (badge).
- `src/ui/Landing.tsx` — conditional "English only" badge on untranslated volumes.

**Test (existing, auto-enroll `ka` — no edits needed):** `coverage.test.ts`, `inventory.test.ts`, `completeness.test.ts` (all `corporaFor`-driven). `roundtrip.test.ts` is **not** touched — `ka` is deliberately absent from its hardcoded `LANGS` list (spec §6).

---

## Task 1: Register `ka` + author the Georgian landing copy (typecheck-coupled)

**These land in ONE commit.** `LANDING_STRINGS` and `LANDING_EXAMPLES` are exhaustive `Record<ActiveLanguage, …>` and `landingStrings.test.ts` gates every active language for completeness — so the instant `'ka'` joins `NL_LANGUAGES`, `make typecheck` **and** that gate fail until Georgian landing copy exists. Adding the copy first is impossible (TS rejects a `ka` key before `ka` is an `ActiveLanguage`), so both edits must be one atomic change.

**Georgian landing copy is NOT a straight translation of the English copy** (Phase 1 player-experience contract):
- **`howToTitle`/`howToBody`:** Georgian Phase 1 is *read-Georgian, type-English*. The copy must tell the player the game is shown in Georgian and **commands are typed in English** — never imply Georgian input (it would raw-send and fail).
- **`LANDING_EXAMPLES.ka`:** the example commands are **English** (input is English) — reuse `LANDING_EXAMPLES.en`.
- **`caveat`:** Georgian is corpus-only with **no AI model** (spec §3) — the `ka` caveat must NOT offer the optional model. Instead it carries the beta note (consistent with the in-game §5 announcement).
- All Georgian values are drafts pending native review (spec §8); the `Loquor` wordmark + tagline stay English (brand).

**Files:**
- Modify: `src/llm/types.ts:5`
- Modify: `src/ui/languageOptions.ts:14-20`
- Modify: `src/ui/landingStrings.ts` (add `ka` to `LANDING_STRINGS`)
- Modify: `src/ui/landingExamples.ts` (add `ka` to `LANDING_EXAMPLES`)
- Test: `src/ui/languageOptions.test.ts` (create if absent); the existing `landingStrings.test.ts` gate and picker a11y suite

- [ ] **Step 1: Write the failing test** — assert the picker exposes a Georgian option with its `(beta)` marker in the accessible name and `lang="ka"`.

Create/extend `src/ui/languageOptions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { LANGUAGE_OPTIONS } from './languageOptions'

describe('languageOptions — Georgian (spec §5, §6)', () => {
  it('includes a ka option whose label carries the (beta) marker', () => {
    const ka = LANGUAGE_OPTIONS.find(o => o.value === 'ka')
    expect(ka).toBeDefined()
    expect(ka!.label).toContain('ქართული')
    expect(ka!.label).toContain('(beta)') // non-colour, screen-reader-announced marker
    expect(ka!.lang).toBe('ka') // pronounced as Georgian
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/languageOptions.test.ts`
Expected: FAIL — no `ka` option.

- [ ] **Step 3: Add `'ka'` to `NL_LANGUAGES`**

In `src/llm/types.ts:5`:

```ts
export const NL_LANGUAGES = ['off', 'en', 'fr', 'de', 'es', 'ka'] as const
```

(`ActiveLanguage`, `NlLanguage`, and `LexLang = Exclude<NlLanguage, 'off' | 'en'>` all derive `ka` automatically.) Run `npx tsc -b` now and observe `LANDING_STRINGS`/`LANDING_EXAMPLES` errors — those drive Steps 5–6.

- [ ] **Step 4: Add the picker option**

In `src/ui/languageOptions.ts`, append to `LANGUAGE_OPTIONS`:

```ts
  { value: 'ka', label: 'ქართული (beta)', lang: 'ka' },
```

- [ ] **Step 5: Add the Georgian landing examples**

In `src/ui/landingExamples.ts`, add a `ka` entry. Input is English in Phase 1, so the examples are the English ones:

```ts
  // Phase 1 is read-Georgian / type-English, so the example commands are English
  // (typing Georgian would raw-send and fail until Phase 2). Reuse the en list.
  ka: [...LANDING_EXAMPLES_EN], // or inline the same strings as `en`
```

(If `landingExamples.ts` defines the `en` array inline rather than as a named const, copy the same English strings into the `ka` entry — keep them identical to `en`.)

- [ ] **Step 6: Add the Georgian landing strings**

In `src/ui/landingStrings.ts`, add a `ka: { … }` entry to `LANDING_STRINGS` with the Phase 1 semantics above. Author real Georgian drafts (native-review pending); structure and intent:

```ts
  ka: {
    // READ-Georgian / TYPE-English — do not imply Georgian input.
    howToTitle: '…', // e.g. EN sense: "How to play."
    howToBody: '…', // EN sense: "The game is shown in Georgian; type your commands in English."
    progressNote: '…', // EN sense: same as en (progress is saved)
    languageLabel: 'ენა:', // "Language:"
    // NO model offer for Georgian (corpus-only, spec §3). Beta note instead.
    caveat: '…', // EN sense: "Georgian is a beta translation — some text may still appear in English. For now you type commands in English."
    descent: '…', // EN sense: "— choose your descent —"
    enter: '…', // EN sense: "Light the lamp →"
    resume: '…',
    returnToGame: '…',
    changeStory: '…',
    commandExamples: '…', // aria-label "Command examples"
    footer: {
      trademark: '…', // localize the trademark sentence
      licenseLinkText: '…',
      githubLinkText: '…',
    },
    subtitles: {
      zork1: '…', // e.g. "The Great Underground Empire" in Georgian
      zork2: '…',
      zork3: '…',
    },
  },
```

(Do **not** add the `englishOnly` badge field here — Task 9 adds it to the `LandingCopy` interface and all five language entries in one commit, so it can't be half-present.)

- [ ] **Step 7: Run the gates to verify pass**

Run: `npx vitest run src/ui/languageOptions.test.ts src/ui/landingStrings.test.ts src/ui/NlLanguagePicker.test.tsx && npx tsc -b`
Expected: PASS + clean typecheck (every active language complete; no missing-key errors).

- [ ] **Step 8: Commit**

```bash
git add src/llm/types.ts src/ui/languageOptions.ts src/ui/landingStrings.ts src/ui/landingExamples.ts src/ui/languageOptions.test.ts
git commit -m "feat(i18n): register Georgian (ka) + Georgian landing copy (read-Georgian/type-English)

Landing copy is gated exhaustive over ActiveLanguage, so ka copy lands with the
type registration. ka how-to/examples reflect English input; ka caveat drops the
model offer (corpus-only) and carries the beta note. Georgian values are drafts
pending native review (spec §8).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Define `OUTPUT_ONLY_LANGS` (input raw-send set)

**Files:**
- Modify: `src/llm/types.ts`
- Test: `src/llm/types.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Create/extend `src/llm/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { OUTPUT_ONLY_LANGS } from './types'

describe('OUTPUT_ONLY_LANGS (Phase 1: output corpus, no input support yet)', () => {
  it('contains ka and not the fully-supported input languages', () => {
    expect(OUTPUT_ONLY_LANGS.has('ka')).toBe(true)
    expect(OUTPUT_ONLY_LANGS.has('fr')).toBe(false)
    expect(OUTPUT_ONLY_LANGS.has('de')).toBe(false)
    expect(OUTPUT_ONLY_LANGS.has('es')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/llm/types.test.ts`
Expected: FAIL — `OUTPUT_ONLY_LANGS` not exported.

- [ ] **Step 3: Add the set**

In `src/llm/types.ts`, after the `NL_LANGUAGES`/`NlLanguage` block:

```ts
/** Languages with a DISPLAY corpus but no INPUT support yet (Phase 1). The
 * command field raw-sends English for these — exactly as 'off' does — so the
 * player reads Georgian while typing English. Phase 2 (Georgian input) removes
 * 'ka' from this set, and it graduates to the normal nl.translate input path.
 * Distinct from translate/corpus/index.ts's CORPUS_ONLY_LANGS (output: no LLM
 * fallback) — same membership today, different jobs in different layers. */
export const OUTPUT_ONLY_LANGS: ReadonlySet<NlLanguage> = new Set(['ka'])
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/llm/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/llm/types.ts src/llm/types.test.ts
git commit -m "feat(i18n): add OUTPUT_ONLY_LANGS — output-corpus langs that raw-send English input

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Corpus-only no-fallback output branch (`CORPUS_ONLY_LANGS`)

**Files:**
- Modify: `src/translate/corpus/index.ts`
- Modify: `src/translate/useOutputTranslation.ts:117-120` (allowlist) and the live-miss loop (~line 293)
- Test: `src/translate/useOutputTranslation.test.tsx`

- [ ] **Step 1: Write the failing test** — an uncovered `ka` line degrades to English **and** logs a miss; an uncovered `fr` line still attempts the LLM fallback (markPending → shimmer).

Add to `src/translate/useOutputTranslation.test.tsx` (mirror the existing harness in that file — render the hook with a `corpusOverride` whose `strings`/`objects`/`templates` do NOT contain the test line, a fake `LlmEngine`, and a `view` containing one uncovered `output` line). Two cases:

```ts
import { CORPUS_ONLY_LANGS } from './corpus/index'

it('ka: an uncovered line stays English and logs a miss, never the LLM', () => {
  // Arrange: language 'ka', corpusOverride without the line, spy on engine.generate.
  const gen = vi.spyOn(engine, 'generate')
  // ...render hook with language="ka", view = one uncovered output line "Snarf."...
  // Assert the rendered line text is still "Snarf." (English) and never pending:
  expect(rendered.lines.at(-1)!.text).toBe('Snarf.')
  expect(rendered.lines.at(-1)!.pending).toBeFalsy()
  expect(gen).not.toHaveBeenCalled()
  // Assert a miss was logged (read window.loquorMisses() or the missLog store):
  expect(readMisses().some(m => m.language === 'ka' && m.en === 'Snarf.')).toBe(true)
})

it('fr: an uncovered line still attempts the LLM fallback (regression guard)', () => {
  const gen = vi.spyOn(engine, 'generate').mockResolvedValue('…')
  // ...render hook with language="fr", same uncovered line, engine.isLoaded()=true...
  // The line goes pending (shimmer) and the fallback resolver runs:
  expect(rendered.lines.at(-1)!.pending).toBe(true)
})

it('ka is corpus-only; fr/de/es are not', () => {
  expect(CORPUS_ONLY_LANGS.has('ka')).toBe(true)
  expect(['fr', 'de', 'es'].some(l => CORPUS_ONLY_LANGS.has(l as never))).toBe(false)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/translate/useOutputTranslation.test.tsx`
Expected: FAIL — `CORPUS_ONLY_LANGS` not exported; `ka` not admitted (renders passthrough); the ka case logs nothing / fr case may pass.

- [ ] **Step 3: Export `CORPUS_ONLY_LANGS`**

In `src/translate/corpus/index.ts`, after the imports / before `CORPORA`:

```ts
/** Languages whose output is corpus-only: a miss degrades to English and is
 *  logged, never sent to the LLM fallback. Georgian — the small WebLLM models
 *  cannot produce correct Georgian, so a fallback would emit garbage (spec §3). */
export const CORPUS_ONLY_LANGS: ReadonlySet<NlLanguage> = new Set(['ka'])
```

- [ ] **Step 4: Admit `ka` to the output allowlist**

In `src/translate/useOutputTranslation.ts:117-120`:

```ts
  const lang: LexLang | null =
    language === 'fr' ||
    language === 'de' ||
    language === 'es' ||
    language === 'ka'
      ? language
      : null
```

- [ ] **Step 5: Add the corpus-only miss branch**

In `src/translate/useOutputTranslation.ts`, add the import:

```ts
import { corpusFor, CORPUS_ONLY_LANGS } from './corpus/index'
```

Then in the live-miss loop, immediately after the line `if (basisRef.current.get(l.id) === en) continue // already handled this text` (currently ~line 293), insert:

```ts
      // Corpus-only languages (spec §3): a live miss degrades to English and is
      // logged once per text — the LLM fallback is NEVER engaged (the small
      // models cannot produce correct Georgian). Mark the basis so the `=== en`
      // guard above skips it on later renders; render falls through to English
      // because no overlay entry is ever created for this id.
      if (CORPUS_ONLY_LANGS.has(lang)) {
        basisRef.current.set(l.id, en)
        const { core } = splitPromptResidue(en)
        logMiss({ en: core, game: signature, language: lang, kind: 'line', ctx })
        continue
      }
```

(`splitPromptResidue` and `logMiss` are already imported in this file.)

- [ ] **Step 6: Run the test + the full translate suite to verify pass + no fr/de/es regression**

Run: `npx vitest run src/translate/`
Expected: PASS — ka degrades + logs; fr still pends; all existing translate tests green.

- [ ] **Step 7: Commit**

```bash
git add src/translate/corpus/index.ts src/translate/useOutputTranslation.ts src/translate/useOutputTranslation.test.tsx
git commit -m "feat(translate): corpus-only no-LLM-fallback output branch for Georgian (CORPUS_ONLY_LANGS)

A ka corpus miss degrades to English and is logged; the WebLLM fallback is never
engaged. fr/de/es fallback behavior is unchanged (regression-pinned).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Georgian status-bar labels (`RIGHT_FORMAT['ka']`)

**Files:**
- Modify: `src/translate/statusTranslate.ts:31-37`
- Test: `src/translate/statusTranslate.test.ts`

- [ ] **Step 1: Write the failing test** — a `ka` status line renders Georgian labels with Arabic numerals intact, and reports no right-side miss.

Add to `src/translate/statusTranslate.test.ts` (mirror the existing fr/de/es cases in that file — build a `CompiledCorpus` whose `strings` maps the room name, call `translateStatus`):

```ts
it('ka: Georgian score/turns labels, Arabic numerals, no right-side miss (spec §7)', () => {
  const c = compileCorpus({
    strings: { 'West of House': 'სახლის დასავლეთით' },
    objects: {},
    templates: [],
  })
  const { status, misses } = translateStatus(
    { location: 'West of House', right: 'Score: 12  Turns: 7' },
    c,
    'ka',
  )
  expect(status.location).toBe('სახლის დასავლეთით')
  expect(status.right).toContain('12') // numerals stay Arabic
  expect(status.right).toContain('7')
  expect(status.right).not.toMatch(/Score|Turns/) // labels are localized
  expect(misses).toEqual([]) // no per-turn status-miss flood
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/translate/statusTranslate.test.ts`
Expected: FAIL — `RIGHT_FORMAT['ka']` undefined, so `right` stays English and `misses` includes it.

- [ ] **Step 3: Add the `ka` format**

In `src/translate/statusTranslate.ts`, add to `RIGHT_FORMAT`:

```ts
  // Draft labels — confirmed/refined by the Tbilisi native-review loop (spec §8).
  // Numerals stay Arabic (Georgian uses Arabic numerals).
  ka: (score, moves) => `ქულა: ${score}  სვლა: ${moves}`,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/translate/statusTranslate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/translate/statusTranslate.ts src/translate/statusTranslate.test.ts
git commit -m "feat(translate): Georgian status-bar labels (RIGHT_FORMAT.ka)

Room name already translates language-agnostically; this one-line entry localizes
the score/turns labels so the bar isn't half-English and doesn't flood the miss
log every turn. Label words pending native review (spec §8).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Option A — decouple Georgian output from English input (Terminal + picker)

**Files:**
- Modify: `src/ui/NlLanguagePicker.tsx`
- Modify: `src/ui/Terminal.tsx:138-153, 246-311`
- Test: `src/ui/NlLanguagePicker.test.tsx`, `src/ui/Terminal.test.tsx`

- [ ] **Step 1: Write the failing picker test** — the upgrade affordance is hidden for an output-only language, still shown for a grammar-only input language.

Add to `src/ui/NlLanguagePicker.test.tsx`:

```ts
it('hides the model-upgrade affordance for an output-only language (spec §5)', () => {
  render(
    <NlLanguagePicker
      state={{ phase: 'on', language: 'ka', model: 'grammar', canUpgrade: true }}
      onSelect={() => {}}
      onUpgrade={() => {}}
      hideUpgrade
    />,
  )
  expect(screen.queryByRole('button', { name: /improve|model anyway/i })).toBeNull()
})

it('still shows the upgrade affordance for a grammar-only input language', () => {
  render(
    <NlLanguagePicker
      state={{ phase: 'on', language: 'fr', model: 'grammar', canUpgrade: true }}
      onSelect={() => {}}
      onUpgrade={() => {}}
    />,
  )
  expect(screen.getByRole('button', { name: /improve/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx`
Expected: FAIL — `hideUpgrade` prop unknown; affordance still rendered for ka.

- [ ] **Step 3: Add the `hideUpgrade` prop to the picker**

In `src/ui/NlLanguagePicker.tsx`, extend the props and gate the grammar-only block:

```ts
export function NlLanguagePicker({
  state,
  onSelect,
  onUpgrade,
  hideUpgrade = false,
}: {
  state: NlState
  onSelect: (lang: NlLanguage) => void
  onUpgrade: () => void
  /** Output-only languages (e.g. Georgian, Phase 1) have no model upgrade to
   * offer — the model does nothing for them — so the basic/improve block is
   * hidden (spec §5). */
  hideUpgrade?: boolean
}) {
```

Change the grammar-only block condition from `state.phase === 'on' && state.model === 'grammar'` to:

```ts
      {state.phase === 'on' && state.model === 'grammar' && !hideUpgrade && (
```

- [ ] **Step 4: Run the picker test to verify it passes**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing Terminal routing test** — selecting `ka`, a typed command raw-sends English (NOT through `nl.translate`) and opens no modal; selecting `fr` still routes through `nl.translate`.

Add to `src/ui/Terminal.test.tsx` (follow the existing Terminal harness: it stubs the game engine via `engineRef`/`useGameEngine` and renders with a chosen NL language). Two cases:

```ts
it('ka (output-only): a typed command raw-sends English, never nl.translate (Option A)', async () => {
  // Render Terminal with NL forced to phase:'on', language:'ka' (model:'grammar').
  // Spy on the engine's sendLine and on nl.translate.
  await userEvent.type(screen.getByRole('textbox'), 'open mailbox{enter}')
  expect(sendLineSpy).toHaveBeenCalledWith('open mailbox')
  expect(translateSpy).not.toHaveBeenCalled()
})

it('ka: selecting it does not auto-open the model-download modal', () => {
  // Render with nl.modalOpen=true but language ka in OUTPUT_ONLY_LANGS:
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('fr (regression): a typed command still routes through nl.translate', async () => {
  await userEvent.type(screen.getByRole('textbox'), 'ouvre la boîte{enter}')
  expect(translateSpy).toHaveBeenCalledWith('ouvre la boîte')
  expect(sendLineSpy).not.toHaveBeenCalled()
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/ui/Terminal.test.tsx`
Expected: FAIL — ka currently routes through `nl.translate` and the modal opens.

- [ ] **Step 7: Wire Option A in Terminal**

In `src/ui/Terminal.tsx`, add the import:

```ts
import { OUTPUT_ONLY_LANGS } from '../llm/types'
```

Replace the output-language line (currently line 140-147 `useOutputTranslation({ ... language: nl.state.phase === 'on' ? nl.state.language : 'off' ... })`) and the `activeLang`/`nlLang` block (149-153) with:

```ts
  // The active output language (drives the display overlay). 'off' → passthrough.
  const outLang: NlLanguage =
    nl.state.phase === 'on' ? nl.state.language : 'off'
  // Output-only languages (Phase 1 Georgian): translate OUTPUT, but the command
  // field raw-sends English exactly as 'off' does — there's no input support yet
  // (Option A; Phase 2 removes ka from OUTPUT_ONLY_LANGS). The model offer is
  // also suppressed (it does nothing for these languages).
  const outputOnly = outLang !== 'off' && OUTPUT_ONLY_LANGS.has(outLang)
  // NL *input* is engaged only for a fully-supported on-language.
  const nlInputOn = nl.state.phase === 'on' && !outputOnly

  // Output translation (display overlay — spec §3): same language the input
  // layer is set to; passthrough for en/off.
  const xl = useOutputTranslation({
    view,
    language: outLang,
    signature,
    engine: llmEngine,
    gate,
    echoMap,
  })

  // `activeLang` localizes chrome copy; `nlLang` carries a lang attribute on
  // non-English text. For an output-only language the *input* copy stays English
  // (the player types English), so input-field localization keys off nlInputOn.
  const activeLang = nl.state.phase === 'on' ? nl.state.language : 'en'
  const nlLang = activeLang !== 'en' ? activeLang : undefined
```

Change the modal `open` (currently line 172-174 `const modalOpen = nl.modalOpen || nl.state.phase === 'downloading' || prefsOpen`) to gate `nl.modalOpen` on `!outputOnly`:

```ts
  const modalOpen =
    (nl.modalOpen && !outputOnly) || nl.state.phase === 'downloading' || prefsOpen
```

Also gate the `<ModelDownloadModal open=...>` prop (currently line 294) the same way:

```ts
        open={(nl.modalOpen && !outputOnly) || nl.state.phase === 'downloading'}
```

Pass `hideUpgrade` to the picker (line 185-189):

```ts
          <NlLanguagePicker
            state={nl.state}
            onSelect={nl.setLanguage}
            onUpgrade={nl.requestUpgrade}
            hideUpgrade={outputOnly}
          />
```

In `CommandInput`, change the three `nl.state.phase === 'on'` gates that select NL *input* copy/routing (label line 252, placeholder line 257, and the `onSubmit` branch line 266) to `nlInputOn`, and make the field `lang` English for output-only:

```ts
            label={nlInputOn ? commandLabel(activeLang) : 'Game command'}
            placeholder={nlInputOn ? commandPlaceholder(activeLang) : 'type a command…'}
            lang={nlInputOn ? nlLang : undefined}
            restore={restore ?? undefined}
            onSubmit={text => {
              if (nlInputOn)
                void nl.translate(text).then(retained => {
                  if (retained != null)
                    setRestore(r => ({ text: retained, key: (r?.key ?? 0) + 1 }))
                })
              else if (engineRef.current) engineRef.current.sendLine(text)
              else log.warn('submit ignored: engine not ready')
            }}
```

- [ ] **Step 8: Run the Terminal + picker suites to verify pass**

Run: `npx vitest run src/ui/Terminal.test.tsx src/ui/NlLanguagePicker.test.tsx`
Expected: PASS — ka raw-sends + no modal + no upgrade affordance; fr unchanged.

- [ ] **Step 9: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/NlLanguagePicker.tsx src/ui/Terminal.test.tsx src/ui/NlLanguagePicker.test.tsx
git commit -m "feat(ui): Option A — Georgian translates output while input raw-sends English

Selecting an OUTPUT_ONLY_LANGS language drives the display overlay but routes the
command field to a raw sendLine (English), suppresses the useless model offer, and
opens no download modal. fr/de/es input routing is unchanged (regression-pinned).
Forward-compatible with the Phase 2 Georgian-input work (remove ka from the set).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: First-activation beta announcement (a11y, spec §5)

**Files:**
- Modify: `src/ui/Terminal.tsx` (reuse the existing `role="status" aria-live="polite"` region at line 234)
- Test: `src/ui/Terminal.test.tsx`

- [ ] **Step 1: Write the failing test** — first selection of Georgian announces a bilingual beta notice in the existing live region; it is not announced for fr.

Add to `src/ui/Terminal.test.tsx`:

```ts
it('announces a bilingual beta notice on first Georgian activation (spec §5)', () => {
  // Render with NL phase:'on', language:'ka'.
  const status = screen.getByRole('status')
  expect(status).toHaveTextContent(/ქართული თარგმანი ჯერ სატესტოა/)
  expect(status).toHaveTextContent(/Georgian is a beta translation/)
})

it('does not show the beta notice for French', () => {
  // Render with NL phase:'on', language:'fr'.
  expect(screen.getByRole('status')).not.toHaveTextContent(/beta translation/)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "beta"`
Expected: FAIL — no beta notice rendered.

- [ ] **Step 3: Render the beta notice in the existing live region**

In `src/ui/Terminal.tsx`, derive the notice (no new state needed — it's a pure function of the active output language) near the `outputOnly` block:

```ts
  // First-class a11y (spec §5): a Georgian player is told, in their own language
  // and English, that the translation is beta and may show English. Rendered in
  // the existing role=status live region (no new live region). Shown whenever the
  // output-only beta language is active — it is short and non-repeating per render.
  const betaNotice =
    outLang === 'ka'
      ? 'ქართული თარგმანი ჯერ სატესტოა — ზოგი ტექსტი შეიძლება ინგლისურად გამოჩნდეს. / Georgian is a beta translation; some text may still appear in English.'
      : null
```

Inside the existing `<div role="status" aria-live="polite" className="nl-status">` (line 234), add as the first child:

```tsx
            {betaNotice && (
              <p className="nl-notice" lang="ka">
                {betaNotice}
              </p>
            )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "beta"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/Terminal.test.tsx
git commit -m "feat(a11y): announce the Georgian beta translation in the live region (spec §5)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Author the Georgian corpus to green (gate-driven)

This is the data-authoring core. The three gates (`coverage`, `inventory`, `completeness`) are **already `corporaFor`-driven** — registering `ka` in `CORPORA` (Step 2) enrolls it in all three with no gate-code change. The gates are the executable acceptance criteria; author Georgian until they are green.

**Files:**
- Create: `src/translate/corpus/zork1.ka.strings.ts`, `zork1.ka.objects.ts`, `zork1.ka.templates.ts`, `zork1.ka.ts`
- Modify: `src/translate/corpus/index.ts:14` (register `ka`), `src/translate/corpus/index.test.ts`

**Linguistic contract (spec §4) — apply to every value:**
- **Never capitalize.** Mkhedruli is unicameral; the matcher's `capitalizeFirstLetter` is a harmless no-op. No casing in the data.
- **Lean on full-line string pins; minimize templated object slots.** Whenever a line needs case agreement, pin the whole line in `zork1.ka.strings.ts` rather than authoring case tables. Keep the per-object key union tiny: `indef`, `bare`, and at most `nom`.
- **`indef` is mandatory on every object** and = the bare nominative citation form (Georgian has no indefinite article). The matcher's built-in "A {obj}"/"An {obj}" listing hardcodes `{obj.indef}`.
- **Form-key names are ASCII; values are Mkhedruli.**
- **Translate from the English source line** (fr/es/de values are same-meaning references only).

- [ ] **Step 1: Scaffold the four files (compile, not yet registered)**

Create `src/translate/corpus/zork1.ka.strings.ts`:

```ts
// Zork I × Georgian full-line table (spec §2, §4). KEYS are normalized English
// lines BYTE-IDENTICAL to zork1.fr.strings.ts; only the VALUES are Georgian
// (Mkhedruli). NO capitalization (unicameral script). Authored from the English
// source line. Per spec §4 this table is intentionally LARGE: case-needing lines
// are pinned here as full strings instead of templated, to keep object case
// forms minimal.
export const ZORK1_KA_STRINGS: Record<string, string> = {
  // Populated in Steps 3–5 (gate-driven). Example shape:
  // 'Taken.': 'აღებულია.',
}
```

Create `src/translate/corpus/zork1.ka.objects.ts`:

```ts
// Zork I × Georgian object forms (spec §2.3, §4). Keys are EN printed names —
// byte-identical to zork1.fr.objects.ts. Georgian ships a MINIMAL key union:
// `indef` (= bare nominative citation form, REQUIRED by the matcher's built-in
// "A {obj}" listing), `bare`, and at most `nom`. Case-needing lines are pinned
// as full strings in zork1.ka.strings.ts, not templated. NO capitalization.
import type { ObjectsTable } from '../types'

export const ZORK1_KA_OBJECTS: ObjectsTable = {
  // Populated in Step 4 (one entry per FR object key). Example shape:
  // altar: { indef: 'სამსხვერპლო', bare: 'სამსხვერპლო' },
}

/** EN printed name → canonical EN name, mirroring ZORK1_FR_CANONICAL. */
export const ZORK1_KA_CANONICAL: Readonly<Record<string, string>> = {
  // Populated in Step 4 (copy the key set from ZORK1_FR_CANONICAL).
}
```

Create `src/translate/corpus/zork1.ka.templates.ts`:

```ts
// Zork I × Georgian composing patterns (spec §2.4, §4). Per spec §4, Georgian
// keeps a MINIMAL template set whose `out` sides reference only the small key
// union ({obj.indef}/{obj.bare}/{obj.nom}); any EN line whose Georgian needs
// case agreement is pinned as a full string in zork1.ka.strings.ts instead of
// templated here. The completeness gate enforces that every key referenced below
// exists on every object. NO capitalization.
import type { Template } from '../types'

export const ZORK1_KA_TEMPLATES: readonly Template[] = [
  // Populated in Step 4. Example shape:
  // { en: "You can't see any {obj} here!", out: 'აქ {obj.nom} არ ჩანს!' },
]
```

Create `src/translate/corpus/zork1.ka.ts`:

```ts
import type { TranslationCorpus } from '../types'
import { ZORK1_KA_STRINGS } from './zork1.ka.strings'
import { ZORK1_KA_OBJECTS } from './zork1.ka.objects'
import { ZORK1_KA_TEMPLATES } from './zork1.ka.templates'

export const ZORK1_KA: TranslationCorpus = {
  strings: ZORK1_KA_STRINGS,
  objects: ZORK1_KA_OBJECTS,
  templates: ZORK1_KA_TEMPLATES,
}
```

Run: `npx vitest run src/translate/corpus/index.test.ts` — Expected: still PASS (files unused yet).

- [ ] **Step 2: Register `ka` in `CORPORA` + extend `index.test.ts` (gates go RED — expected)**

In `src/translate/corpus/index.ts:14`, add the import and the entry:

```ts
import { ZORK1_KA } from './zork1.ka'
// ...
const CORPORA: Readonly<
  Record<string, Partial<Record<string, TranslationCorpus>>>
> = {
  [ZORK1_SIG]: { fr: ZORK1_FR, es: ZORK1_ES, de: ZORK1_DE, ka: ZORK1_KA },
}
```

Add to `src/translate/corpus/index.test.ts`:

```ts
it('returns the Zork I Georgian corpus', () => {
  expect(corpusFor(ZORK1_SIG, 'ka')).not.toBeNull()
})
```

Run: `npx vitest run src/translate/corpus/`
Expected: `index.test.ts` PASS; `coverage`/`inventory`/`completeness` **FAIL for the `ka` row** (empty corpus → misses). This RED state documents the authoring work. **Do not commit yet** — the suite is intentionally red until Step 6.

- [ ] **Step 3: Author strings to pass the coverage gate (walkthrough)**

Mirror every key from `zork1.fr.strings.ts` into `ZORK1_KA_STRINGS`, authoring the Georgian value from the **English** key per the §4 contract. Iterate against the gate, which prints each missed English line:

Run (repeat until green): `npx vitest run src/translate/corpus/coverage.test.ts -t "ka golden"`
Each reported miss is a line the winning walkthrough hits — add its Georgian to `ZORK1_KA_STRINGS` (or, if it is a composed/listing line, handle it via a template in Step 4).
Expected when done: `ka golden path` — ZERO misses.

- [ ] **Step 4: Author objects + a minimal template set to pass the completeness gate**

- Copy the **key set** (EN printed names) of `ZORK1_FR_OBJECTS` into `ZORK1_KA_OBJECTS`; give each object `{ indef, bare }` (+ `nom` only where a template needs it). Copy `ZORK1_FR_CANONICAL`'s keys into `ZORK1_KA_CANONICAL`.
- Author `ZORK1_KA_TEMPLATES` as the minimal set whose `out` sides reference only `{obj.indef}`/`{obj.bare}`/`{obj.nom}`. Any FR template whose Georgian would require another case → drop it and pin its lines as strings (Step 3/5) instead.

Run (repeat until green): `npx vitest run src/translate/corpus/completeness.test.ts -t "ka form-key"`
Each failure names an object missing a key — either add the key or remove the template that references it (preferring string pins).
Expected when done: `ka form-key completeness` — empty failure list; `indef` present.

- [ ] **Step 5: Author off-path lines + ignore list to pass the inventory gate**

Run (repeat until green): `npx vitest run src/translate/corpus/inventory.test.ts -t "ka corpus"`
Each miss is a full-line string in `public/games/zork1.z3` the walkthrough never visits (death messages, off-path responses). Add its Georgian to `ZORK1_KA_STRINGS`. If a reported line is a genuine non-line fragment already vetted in `zork1.extraction-ignore.ts`, it is shared across languages and needs no ka-specific action.
Expected when done: `ka corpus` — every full-line entry matches; ignore list stays honest.

- [ ] **Step 6: Run all three gates + the full translate suite green, then commit**

Run: `npx vitest run src/translate/`
Expected: ALL green (coverage/inventory/completeness for fr/de/es/ka; no-fallback regression; status).

```bash
git add src/translate/corpus/zork1.ka.strings.ts src/translate/corpus/zork1.ka.objects.ts src/translate/corpus/zork1.ka.templates.ts src/translate/corpus/zork1.ka.ts src/translate/corpus/index.ts src/translate/corpus/index.test.ts
git commit -m "feat(i18n): Georgian Zork I display corpus — coverage/inventory/completeness green

Corpus-only (no LLM fallback). Minimal object case forms per spec §4; case-needing
lines pinned as full strings. Georgian values are drafts pending native review (§8).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Georgian UAT regression scaffold (runtime-composed lines)

Some lines are composed at runtime from game state (the Living Room description variants) and are not single static strings in the `.z3`, so neither the coverage nor inventory gate sees them — they must be pinned explicitly, mirroring `zork1.es.uat.test.ts`. This file also receives every confirmed finding from the §8 Tbilisi loop.

**Files:**
- Create: `src/translate/corpus/zork1.ka.uat.test.ts`

- [ ] **Step 1: Write the failing test** — the three runtime-composed Living Room variants translate to Georgian.

Create `src/translate/corpus/zork1.ka.uat.test.ts` (copy the three `preCyclops`/`postCyclops`/`postCyclopsClosedTrap` English constants verbatim from `zork1.es.uat.test.ts`):

```ts
import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from '../match'
import { ZORK1_KA } from './zork1.ka'

// Georgian output-translation regression pins (spec §8 native-review loop).
// Runtime-composed Living Room variants are not static .z3 strings, so the
// coverage/inventory gates can't see them — pin them here or they leak English.
describe('Zork I × Georgian — runtime-composed Living Room variants (UAT)', () => {
  const c = compileCorpus(ZORK1_KA)
  const preCyclops =
    'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a rug lying beside an open trap door.'
  const postCyclops =
    'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a rug lying beside an open trap door.'
  const postCyclopsClosedTrap =
    'You are in the living room. There is a doorway to the east. To the west is a cyclops-shaped opening in an old wooden door, above which is some strange gothic lettering, a trophy case, and a closed trap door at your feet.'

  for (const [name, en] of Object.entries({ preCyclops, postCyclops, postCyclopsClosedTrap })) {
    it(`translates the ${name} variant to Georgian`, () => {
      const out = matchLine(c, en)
      expect(out).not.toBeNull()
      expect(out).not.toBe(en) // actually translated, not echoed English
    })
  }
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/translate/corpus/zork1.ka.uat.test.ts`
Expected: FAIL — these composed lines aren't in the corpus yet.

- [ ] **Step 3: Pin the three variants in `ZORK1_KA_STRINGS`**

Add the three English keys (verbatim) to `zork1.ka.strings.ts` with Georgian values (mirror the structure of the matching es entries; translate from the English).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/translate/corpus/zork1.ka.uat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/translate/corpus/zork1.ka.uat.test.ts src/translate/corpus/zork1.ka.strings.ts
git commit -m "test(i18n): pin Georgian runtime-composed Living Room variants (UAT seed, spec §8)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Conditional "English only" badge on untranslated volumes (Zork II/III)

Only Zork I has an output corpus, so II/III display in English regardless of the chosen language. Mark that **honestly and conditionally**: a small localized badge on a volume tile, shown **only when a translation language is selected AND that game has no corpus for it** — so English (the source) shows no badge, and once a game gains a corpus the badge disappears by itself (the check reads the real registry, not a hardcoded list).

**Files:**
- Modify: `src/games/catalog.ts` (add per-game `sig`)
- Modify: `src/ui/landingStrings.ts` (add `englishOnly` to `LandingCopy` + all five entries)
- Modify: `src/ui/Landing.tsx` (render the badge inside each volume radio)
- Test: `src/ui/Landing.test.tsx`

- [ ] **Step 1: Write the failing test** — with a translation language selected, an untranslated volume shows the badge in its accessible name; the translated volume and the English view do not.

Add to `src/ui/Landing.test.tsx` (follow the existing render harness; select a language via the landing combobox, then read the volume radios by role):

```ts
it('badges untranslated volumes only when a translation language is selected', async () => {
  render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
  // Default language is English → no volume is badged.
  expect(screen.getByRole('radio', { name: /Zork II|Wizard|Frobozz/i }).textContent)
    .not.toMatch(/anglais|English|ინგლისურად|nur Englisch|inglés/i)

  // Switch to French (Zork I has an fr corpus; II/III do not):
  await selectLanguage('Français') // helper that opens the combobox and picks fr
  const z1 = screen.getByRole('radio', { name: /Empire|Souterrain/i })
  const z2 = screen.getByRole('radio', { name: /Frobozz/i })
  expect(z1.textContent).not.toMatch(/anglais/i) // Zork I IS translated → no badge
  expect(z2.textContent).toMatch(/anglais/i) // Zork II is NOT → badge
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/Landing.test.tsx -t "badges untranslated"`
Expected: FAIL — no badge rendered.

- [ ] **Step 3: Add `englishOnly` to `LandingCopy` and the per-game signature**

In `src/ui/landingStrings.ts`, add the field to the interface (after `commandExamples`):

```ts
  englishOnly: string // badge on volumes that have no corpus for the chosen language
```

…and a value to every language entry (Georgian was drafted in Task 1; add it there too if not present):

```ts
  en: { …, englishOnly: 'English only', … }
  fr: { …, englishOnly: 'en anglais', … }
  de: { …, englishOnly: 'nur Englisch', … }
  es: { …, englishOnly: 'solo en inglés', … }
  ka: { …, englishOnly: 'ინგლისურად', … } // native-review pending
```

If `SCALAR_KEYS` in `landingStrings.test.ts` enumerates the fields, add `'englishOnly'` to it so the completeness gate covers the new field.

In `src/games/catalog.ts`, import the signatures and add a `sig` to each game (single source of truth — `grammar/index.ts` owns the signature constants):

```ts
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../llm/grammar/index'

export interface Game {
  slug: 'zork1' | 'zork2' | 'zork3'
  numeral: string
  title: string
  file: string
  sig: string // story signature — joins to the translation-corpus registry
}
// …add `sig: ZORK1_SIG` / `ZORK2_SIG` / `ZORK3_SIG` to the three entries.
```

- [ ] **Step 4: Render the badge in Landing**

In `src/ui/Landing.tsx`, import the registry lookup:

```ts
import { corpusFor } from '../translate/corpus/index'
```

Inside the `GAMES.map(g => …)` volume button (after the `nm` span), add — `exampleLang` is never `'off'`, and `corpusFor` returns `null` for English, so gate on a non-English language first:

```tsx
              {exampleLang !== 'en' && corpusFor(g.sig, exampleLang) === null && (
                // Non-colour, screen-reader-announced (it's text inside the radio,
                // so it becomes part of the radio's accessible name). a11y §4.
                <span className="vol-untranslated">{s.englishOnly}</span>
              )}
```

(Add a minimal `.vol-untranslated` style — small, muted — alongside the existing volume styles; it must meet WCAG AA contrast in both themes and must not be the *only* cue, which it isn't, since it's literal text.)

- [ ] **Step 5: Run the test + landing gate to verify pass**

Run: `npx vitest run src/ui/Landing.test.tsx src/ui/landingStrings.test.ts`
Expected: PASS — fr badges II/III but not I; English badges nothing; landing copy still complete.

- [ ] **Step 6: Commit**

```bash
git add src/games/catalog.ts src/ui/landingStrings.ts src/ui/Landing.tsx src/ui/Landing.test.tsx src/ui/landingStrings.test.ts
git commit -m "feat(ui): mark untranslated volumes (Zork II/III) on the landing, per chosen language

A localized 'English only' badge shows on a volume only when a translation
language is selected and that game has no corpus for it — read from the corpus
registry, so it's honest and self-correcting (English shows nothing; a future
corpus removes the badge). Part of the radio's accessible name (a11y).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full suite**

Run: `make all`
Expected: lint + format + typecheck + test all clean. In particular: all four output-translation gates green for `ka`; the no-fallback regression; the Terminal/picker routing tests; the beta-notice test; the picker a11y test.

- [ ] **Step 2: Confirm Mkhedruli (UTF-8) survives CI**

Mkhedruli is BMP (U+10A0–10FF). Confirm the suite runs green in CI, not just locally (spec §10 risk row). If CI uses a different locale, the gate tests are the canary — they compare exact strings.

- [ ] **Step 3: Manual smoke (the real app)** — use the `run` / `verify` skill to launch the app and confirm the player experience:
  - **Landing:** pick **ქართული (beta)** → the landing chrome renders in Georgian; the how-to/examples make clear you read in Georgian and **type in English**; the caveat does **not** offer the AI model; **Zork II and III show the localized "English only" badge** while Zork I does not; switching back to **English** removes all badges.
  - **In game (Zork I, Georgian):** output renders Georgian; the beta notice is announced; **no download modal appears**; the **✦ improve** affordance is absent.
  - Type an English command (e.g. `open mailbox`) → it sends and the game responds in Georgian.
  - The status bar shows Georgian labels with Arabic numerals.
  - **Zork II in Georgian:** starts and plays, displaying English text (translation is Zork I only) — confirming the badge told the truth.
  - Switch to **Français** → French behaves exactly as before (input routes through translation; model offer present). This is the fr/de/es no-regression check by hand.

- [ ] **Step 4: Finish the branch** — use `superpowers:finishing-a-development-branch` to decide merge/PR. Note in the PR body that Georgian values are drafts pending the Tbilisi native-review loop (spec §8), and that the **(beta)** marker stays until the playtesters confirm naturalness.

---

## Self-review (plan ↔ spec coverage)

- §1 goal / in-scope: corpus (Task 7), runtime change enabling `ka` + no-fallback (Task 3), picker + beta marker (Task 1), status-bar room name (free) + score labels (Task 4), three gates green (Task 7). ✓
- §3 corpus-only no-fallback + behavioral guarantee + regression test: Task 3. ✓
- §4 linguistic contract (no caps, string-pins, mandatory `indef`, ASCII keys): Task 7 contract + steps. ✓
- §5 beta marker (a11y, non-colour, announced, tested): Tasks 1 + 6. ✓
- §6 three gates apply (auto-enroll), round-trip deferred (untouched): Task 7 (gates) + File-structure note (round-trip not edited). ✓
- §7 status bar (room free, score labels one-liner, no flood): Task 4. ✓
- §8 native-review loop seed (UAT suite + `logMiss`): Task 8 + Task 3 (logMiss). ✓
- §9 fr/de/es untouched: gated by `CORPUS_ONLY_LANGS`/`OUTPUT_ONLY_LANGS`; regression tests in Tasks 3 + 5. ✓
- **Input blocker (Option A, beyond the spec's §2):** Tasks 2 + 5 decouple output language from English input and suppress the useless model offer; forward-compatible with Phase 2. ✓
- **Landing localization (forced by exhaustive `Record<ActiveLanguage>` + gate):** Task 1 authors Georgian landing copy in the same commit as the type registration, with Phase 1 read-Georgian/type-English semantics (no model offer; English examples). ✓
- **Untranslated-volume marker (Zork II/III):** Task 9 adds a conditional, localized "English only" badge driven by the real corpus registry (honest, self-correcting, part of the radio's accessible name). ✓
- §10 risks: completeness already registry-driven (Task 7 note); UTF-8 CI (Task 10 Step 2); status flood (Task 4). ✓
