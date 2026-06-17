# Landing language picker + honest how-to copy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a language picker on the Loquor title screen, rewrite the how-to copy to reflect plain-language play (with live, localized, gate-verified examples), add a one-line model caveat, and add a Zork trademark / open-source footnote.

**Architecture:** Language preference already persists in `localStorage` via `src/llm/nlpref.ts` and is restored on game boot by `useModelDownload`. So the landing only *writes* the preference (set-preference-only); the in-game flow still owns the model-download offer. The picker reuses the WAI-ARIA radiogroup pattern already in `Landing.tsx`. Example strings are data, gated by a test that runs each through the **deterministic basic-mode parse path** so a shown example can never fail a player who types it.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react. Existing modules: `src/llm/nlpref.ts`, `src/llm/types.ts`, `src/llm/inputTranslate.ts` (`splitClauses`), `src/llm/directions.ts` (`parseDirection`), `src/llm/lexicon/parse.ts` (`parseLexicon`) + `src/llm/lexicon/index.ts` (`coreLexicon`/`nounLexicon`), `src/llm/grammar/index.ts` (`ZORK{1,2,3}_SIG`), `src/llm/grammar/zork{1,2,3}.vocab.ts`.

---

## File Structure

- **Create** `src/ui/languageOptions.ts` — the shared `LANGUAGE_OPTIONS` list (value/label/`lang`), single source of truth for both pickers.
- **Create** `src/ui/landingExamples.ts` — `LANDING_EXAMPLES: Record<'en'|'fr'|'de'|'es', string[]>` example data.
- **Create** `src/ui/landingExamples.test.ts` — the player-first correctness gate (every example parses in basic mode for Zork I–III).
- **Modify** `src/ui/NlLanguagePicker.tsx` — import options from `languageOptions.ts` instead of its local `OPTIONS`.
- **Modify** `src/ui/Landing.tsx` — language state, picker radiogroup, revised how-to copy, live examples, caveat line, footnote, persist-on-enter.
- **Modify** `src/ui/Landing.test.tsx` — new behavior + a11y tests.
- **Modify** `src/ui/landing.css` — styles for the language picker, caveat, footnote.

---

## Task 1: Extract shared language options module

**Files:**
- Create: `src/ui/languageOptions.ts`
- Modify: `src/ui/NlLanguagePicker.tsx:8-14` (replace local `OPTIONS`)
- Test: existing `src/ui/NlLanguagePicker.test.tsx` (no change; must stay green)

- [ ] **Step 1: Create the shared options module**

```ts
// src/ui/languageOptions.ts
// Single source of truth for the language picker options, shared by the
// in-game status-bar picker (NlLanguagePicker) and the title-screen picker
// (Landing). `lang` marks each label's natural language so a screen reader
// voices "Français"/"Deutsch"/"Español" with the right pronunciation.
import type { NlLanguage } from '../llm/types'

export interface LanguageOption {
  value: NlLanguage
  label: string
  lang: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'off', label: 'Off', lang: 'en' },
  { value: 'en', label: 'English', lang: 'en' },
  { value: 'fr', label: 'Français', lang: 'fr' },
  { value: 'de', label: 'Deutsch', lang: 'de' },
  { value: 'es', label: 'Español', lang: 'es' },
]
```

- [ ] **Step 2: Point NlLanguagePicker at the shared module**

In `src/ui/NlLanguagePicker.tsx`, delete the local `OPTIONS` array (lines 8-14, including the comment above it) and its now-unused `NlLanguage` import if it becomes unused. Add the import and alias so the rest of the file (`OPTIONS`) is untouched:

```ts
import { LANGUAGE_OPTIONS as OPTIONS } from './languageOptions'
```

Keep `import type { NlState, NlLanguage } from '../llm/types'` — `NlLanguage` is still used in the component signature.

- [ ] **Step 3: Run the existing picker suite to verify no regression**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx`
Expected: PASS (same tests, options now sourced from the shared module).

- [ ] **Step 4: Typecheck**

Run: `make typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/languageOptions.ts src/ui/NlLanguagePicker.tsx
git commit -m "refactor(ui): extract shared LANGUAGE_OPTIONS for both pickers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Landing example data + player-first correctness gate

This task nails down the example strings AND the test that proves each one
parses to a real command in **basic (grammar-only) mode** for Zork I, II, and
III — so a shown example can never fail a player who types it verbatim.

**Files:**
- Create: `src/ui/landingExamples.ts`
- Test: `src/ui/landingExamples.test.ts`

- [ ] **Step 1: Create the example data**

Candidates below are chosen from universally-valid building blocks (`take`/`look`
verbs, the `lamp`/`lantern` synonym present in all three games and all cores, and
multilingual direction words). Each set has: an article + object command, a
compound, and a single verb.

```ts
// src/ui/landingExamples.ts
// Localized example commands for the title screen, one set per language.
// Game-INDEPENDENT: every example must parse in BASIC (grammar-only) mode for
// Zork I, II, AND III — enforced by landingExamples.test.ts so a shown example
// can never fail a player who types it. Each set leads with a NATURAL COMPOUND
// (object + movement) to dispel the impression that only two-word commands work.
// No multi-word noun phrase is used: under the game-independent constraint none
// resolves across all three games (see the design doc's "example richness"
// note). The remaining two examples are a simple direction and a single verb.
export const LANDING_EXAMPLES: Record<'en' | 'fr' | 'de' | 'es', string[]> = {
  en: ['take the lamp and go north', 'go south', 'look'],
  fr: ['prends la lampe et va au nord', 'va au sud', 'regarde'],
  de: ['nimm die lampe und geh nach norden', 'geh nach süden', 'schau'],
  es: ['coge la lámpara y ve al norte', 've al sur', 'mira'],
}
```

- [ ] **Step 2: Write the failing correctness gate test**

```ts
// src/ui/landingExamples.test.ts
// Player-first gate: every landing example must parse to a COMMAND (not a miss)
// in BASIC mode for all three games. EN clauses are raw-sent, so the faithful
// check is "made of real game words"; FR/DE/ES run the real deterministic path.
import { describe, it, expect } from 'vitest'
import { LANDING_EXAMPLES } from './landingExamples'
import { splitClauses } from '../llm/inputTranslate'
import { parseDirection } from '../llm/directions'
import { parseLexicon } from '../llm/lexicon/parse'
import { coreLexicon, nounLexicon } from '../llm/lexicon/index'
import { ZORK1_SIG, ZORK2_SIG, ZORK3_SIG } from '../llm/grammar/index'
import { ZORK1_VOCAB } from '../llm/grammar/zork1.vocab'
import { ZORK2_VOCAB } from '../llm/grammar/zork2.vocab'
import { ZORK3_VOCAB } from '../llm/grammar/zork3.vocab'
import type { Vocab } from '../llm/grammar/types'
import type { LexLang } from '../llm/lexicon/types'
import type { Scene } from '../llm/scene/types'

const GAMES: [string, Vocab][] = [
  [ZORK1_SIG, ZORK1_VOCAB],
  [ZORK2_SIG, ZORK2_VOCAB],
  [ZORK3_SIG, ZORK3_VOCAB],
]
const EMPTY_SCENE: Scene = { inScope: [], antecedent: null }

// Every word an English basic-mode clause may legitimately be made of: verbs,
// directions, prepositions, noun surface forms, plus articles/conjunctions.
function englishWords(vocab: Vocab): Set<string> {
  const out = new Set<string>()
  const add = (s: string) => s.split(/\s+/).forEach(w => w && out.add(w))
  for (const v of [
    ...vocab.verbsOnly,
    ...vocab.verbs1,
    ...vocab.verbs2,
    ...vocab.verbSynonyms,
    ...vocab.movement,
    ...vocab.preps,
  ])
    add(v)
  for (const n of vocab.nouns) {
    add(n.emit)
    add(n.canonical)
    n.synonyms?.forEach(add)
    n.adjectives?.forEach(add)
  }
  for (const w of ['the', 'a', 'an', 'and', 'then']) out.add(w)
  return out
}

function clauseParsesEn(clause: string, vocab: Vocab): boolean {
  if (parseDirection(clause, vocab.movement)) return true
  const words = englishWords(vocab)
  const tokens = clause.toLowerCase().replace(/[.,;!?]/g, '').split(/\s+/)
  return tokens.every(t => t === '' || words.has(t))
}

function clauseParsesForeign(clause: string, lang: LexLang, sig: string, vocab: Vocab): boolean {
  if (parseDirection(clause, vocab.movement)) return true
  const nouns = nounLexicon(lang, sig)
  if (!nouns) return false
  return parseLexicon(clause, coreLexicon(lang), nouns, vocab, EMPTY_SCENE).kind === 'command'
}

describe('landing examples parse in basic mode for every game', () => {
  for (const [sig, vocab] of GAMES) {
    it(`English examples are real game commands (${sig.slice(0, 6)})`, () => {
      for (const example of LANDING_EXAMPLES.en) {
        for (const clause of splitClauses(example)) {
          expect(clauseParsesEn(clause, vocab), `"${clause}" in "${example}"`).toBe(true)
        }
      }
    })
    for (const lang of ['fr', 'de', 'es'] as LexLang[]) {
      it(`${lang} examples parse deterministically (${sig.slice(0, 6)})`, () => {
        for (const example of LANDING_EXAMPLES[lang]) {
          for (const clause of splitClauses(example)) {
            expect(clauseParsesForeign(clause, lang, sig, vocab), `"${clause}" in "${example}"`).toBe(true)
          }
        }
      })
    }
  }
})
```

- [ ] **Step 3: Run the gate**

Run: `npx vitest run src/ui/landingExamples.test.ts`
Expected: PASS. If any example fails, the assertion message names the offending
clause and game. **Replace only that example with another from the same category
that passes** (e.g. swap a direction pair, or use `'open the lamp'`→`'take the
lamp'`); do not weaken the test. Re-run until green. The data, not the test, is
what bends.

- [ ] **Step 4: Commit**

```bash
git add src/ui/landingExamples.ts src/ui/landingExamples.test.ts
git commit -m "feat(ui): gate-verified localized landing examples

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Language picker on the landing + persist on enter

**Files:**
- Modify: `src/ui/Landing.tsx`
- Test: `src/ui/Landing.test.tsx`

- [ ] **Step 1: Write the failing behavior + a11y tests**

Add the import and a shared cleanup at the top of the `describe('Landing', …)`
block so no test leaks `nlPref` into the next (the picker defaults from it, so a
leak makes the default-selection test order-dependent):

```tsx
import { LS_KEYS } from '../storageKeys'

afterEach(() => localStorage.clear())
```

(`afterEach` is already exported by Vitest's global API used here; if the file
doesn't import it, add `afterEach` to the existing `vitest` import.)

Then add these tests inside the same `describe`:

```tsx
it('exposes a language radiogroup defaulting to the saved pref', () => {
  localStorage.setItem(LS_KEYS.nlPref, JSON.stringify({ language: 'fr', declined: false }))
  render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
  const group = screen.getByRole('radiogroup', { name: /language/i })
  expect(group).toBeInTheDocument()
  const fr = screen.getByRole('radio', { name: 'Français' })
  expect(fr).toHaveAttribute('aria-checked', 'true')
})

it('persists the chosen language when entering the game', () => {
  const onEnter = vi.fn()
  render(<Landing onEnter={onEnter} savedSlugs={new Set()} themeToggle={null} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Deutsch' }))
  fireEvent.click(screen.getByText(/Light the lamp/))
  expect(onEnter).toHaveBeenCalledWith('zork1')
  expect(JSON.parse(localStorage.getItem(LS_KEYS.nlPref)!).language).toBe('de')
})

it('moves language selection AND focus with arrow keys (roving radiogroup)', () => {
  // Default selection is Off (index 0). ArrowRight → English (index 1).
  render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
  const group = screen.getByRole('radiogroup', { name: /language/i })
  fireEvent.keyDown(group, { key: 'ArrowRight' })
  const english = screen.getByRole('radio', { name: 'English' })
  expect(english).toHaveAttribute('aria-checked', 'true')
  expect(english).toHaveAttribute('tabindex', '0')
  expect(english).toHaveFocus()
})

it('keeps the language picker operable in the Change story overlay variant', () => {
  // The overlay variant (onDismiss set) traps focus; the new radios must still
  // be reachable/operable inside it. Real <button>s satisfy this, but the spec
  // calls it out, so assert it.
  render(
    <Landing
      onEnter={() => {}}
      savedSlugs={new Set()}
      themeToggle={null}
      onDismiss={() => {}}
    />,
  )
  const es = screen.getByRole('radio', { name: 'Español' })
  fireEvent.click(es)
  expect(es).toHaveAttribute('aria-checked', 'true')
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/Landing.test.tsx -t "language"`
Expected: FAIL — no radiogroup named "language" yet.

- [ ] **Step 3: Add language state + picker + persist-on-enter**

In `src/ui/Landing.tsx`:

Add imports at the top:

```tsx
import { readNlPref, writeNlPref } from '../llm/nlpref'
import { LANGUAGE_OPTIONS } from './languageOptions'
import type { NlLanguage } from '../llm/types'
```

Add state next to the existing `selected` state (after line 23):

```tsx
const [language, setLanguage] = useState<NlLanguage>(() => readNlPref().language)
const langGroupRef = useRef<HTMLDivElement>(null)
```

Add a roving-keyboard handler mirroring the volumes' `onVolumeKey` (place it just below `onVolumeKey`):

```tsx
const onLangKey = (e: React.KeyboardEvent) => {
  const i = LANGUAGE_OPTIONS.findIndex(o => o.value === language)
  const delta =
    e.key === 'ArrowRight' || e.key === 'ArrowDown'
      ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        ? -1
        : 0
  if (delta === 0) return
  e.preventDefault()
  const next = (i + delta + LANGUAGE_OPTIONS.length) % LANGUAGE_OPTIONS.length
  setLanguage(LANGUAGE_OPTIONS[next].value)
  langGroupRef.current
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
    ?.[next]?.focus()
}
```

Render the picker — insert it between the `.howto` block (after its closing
`</div>` on line 98) and the `#descent-label` span (line 99):

```tsx
<div className="langpick">
  <span className="label" id="language-label">
    Language
  </span>
  <div
    className="lang-options"
    ref={langGroupRef}
    role="radiogroup"
    aria-labelledby="language-label"
    onKeyDown={onLangKey}
  >
    {LANGUAGE_OPTIONS.map(o => (
      <button
        key={o.value}
        type="button"
        role="radio"
        lang={o.lang}
        className={`lang-opt${language === o.value ? ' sel' : ''}`}
        aria-checked={language === o.value}
        tabIndex={language === o.value ? 0 : -1}
        onClick={() => setLanguage(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
</div>
```

Persist on enter — change the "Light the lamp" button (line 127) to write the
pref first:

```tsx
<button
  className="enter"
  onClick={() => {
    writeNlPref({ language })
    onEnter(selected)
  }}
>
  Light the lamp →
</button>
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/Landing.test.tsx -t "language"`
Expected: PASS.

- [ ] **Step 5: Run the full Landing suite (no regression)**

Run: `npx vitest run src/ui/Landing.test.tsx`
Expected: PASS.

- [ ] **Step 6: Refactor — extract the shared roving-radiogroup handler**

`onLangKey` is now a near-verbatim copy of the existing `onVolumeKey` (same
arrow/roving logic over a different array + setter + ref). Extract one helper so
the two groups can't drift. Add a module-level function in `src/ui/Landing.tsx`
(above the component):

```tsx
/** APG radio-pattern roving: arrows move selection AND focus among the radios
 *  of a group. Shared by the volumes group and the language group so they can't
 *  drift. `values` is the ordered option list; `groupRef` wraps the radios. */
function rovingRadioKeydown<T>(
  e: React.KeyboardEvent,
  values: readonly T[],
  current: T,
  setValue: (v: T) => void,
  groupRef: React.RefObject<HTMLElement | null>,
) {
  const delta =
    e.key === 'ArrowRight' || e.key === 'ArrowDown'
      ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        ? -1
        : 0
  if (delta === 0) return
  e.preventDefault()
  const i = values.indexOf(current)
  const next = (i + delta + values.length) % values.length
  setValue(values[next])
  groupRef.current
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
    ?.[next]?.focus()
}
```

Replace the body of `onVolumeKey` with:

```tsx
const onVolumeKey = (e: React.KeyboardEvent) =>
  rovingRadioKeydown(
    e,
    GAMES.map(g => g.slug),
    selected,
    setSelected,
    volumesRef,
  )
```

Replace the body of `onLangKey` with:

```tsx
const onLangKey = (e: React.KeyboardEvent) =>
  rovingRadioKeydown(
    e,
    LANGUAGE_OPTIONS.map(o => o.value),
    language,
    setLanguage,
    langGroupRef,
  )
```

Run: `npx vitest run src/ui/Landing.test.tsx`
Expected: PASS (both the existing volumes arrow-key test and the new language
arrow-key test stay green — proving the extraction preserved both behaviors).

- [ ] **Step 7: Commit**

```bash
git add src/ui/Landing.tsx src/ui/Landing.test.tsx
git commit -m "feat(ui): language picker on the title screen (set-preference-only)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Revised how-to copy + live localized examples

**Files:**
- Modify: `src/ui/Landing.tsx:86-98` (the `.howto` block)
- Test: `src/ui/Landing.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/ui/Landing.test.tsx`:

```tsx
import { LANDING_EXAMPLES } from './landingExamples'

it('shows plain-language how-to copy, not the old canonical-command framing', () => {
  render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
  expect(screen.getByText(/Type what you want to do in plain language/i)).toBeInTheDocument()
  expect(screen.queryByText(/the way the game expects it/i)).not.toBeInTheDocument()
})

it('shows English examples by default and localizes them on selection', () => {
  render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
  const region = screen.getByRole('region', { name: /examples/i })
  expect(region).toHaveTextContent(LANDING_EXAMPLES.en.join(' · '))
  fireEvent.click(screen.getByRole('radio', { name: 'Français' }))
  expect(region).toHaveTextContent(LANDING_EXAMPLES.fr.join(' · '))
})

it('announces example changes politely (aria-live)', () => {
  render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
  expect(screen.getByRole('region', { name: /examples/i })).toHaveAttribute('aria-live', 'polite')
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/Landing.test.tsx -t "how-to|examples"`
Expected: FAIL — old copy still present, no examples region.

- [ ] **Step 3: Rewrite the how-to block**

Add the example selector near the other derived values (after the `language`
state):

```tsx
const exampleLang = language === 'off' || language === 'en' ? 'en' : language
const examples = LANDING_EXAMPLES[exampleLang]
```

Replace the `.howto` block contents (lines 86-98) with:

```tsx
<div className="howto">
  <b>How to play.</b> Type what you want to do in plain language.
  <br />
  <span
    className="cmds"
    role="region"
    aria-label="Example commands"
    aria-live="polite"
  >
    {examples.join(' · ')}
  </span>
  <br />
  <span style={{ opacity: 0.75 }}>
    Your progress is kept; close the tab and return whenever you like.
  </span>
</div>
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/Landing.test.tsx -t "how-to|examples"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Landing.tsx src/ui/Landing.test.tsx
git commit -m "feat(ui): plain-language how-to copy with live localized examples

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Model caveat line + trademark/open-source footnote

**Files:**
- Modify: `src/ui/Landing.tsx`
- Test: `src/ui/Landing.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/ui/Landing.test.tsx`:

```tsx
it('shows the basic-now / optional-model caveat under the picker', () => {
  render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
  expect(screen.getByText(/Basic commands work now/i)).toBeInTheDocument()
  expect(screen.getByText(/optional, experimental model/i)).toBeInTheDocument()
})

it('shows the Zork trademark / open-source footnote', () => {
  render(<Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />)
  // A <footer> nested in the landing's <main> is scoped to main (NOT exposed
  // as contentinfo), and the overlay variant differs again — so query by text,
  // which is stable across both Landing variants.
  expect(screen.getByText(/trademark of Activision/i)).toBeInTheDocument()
  expect(screen.getByText(/MIT License/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/Landing.test.tsx -t "caveat|footnote"`
Expected: FAIL.

- [ ] **Step 3: Add the caveat and footnote**

Add the caveat directly under the `.langpick` block (after its closing `</div>`):

```tsx
<p className="lang-caveat">
  Basic commands work now. To understand more of what you type, you can add
  an optional, experimental model — a one-time download that may not support
  every language.
</p>
```

Add the footnote just before the plate's closing `</div>` (after the
`loadError` block, around line 139):

```tsx
<footer className="folio-footnote">
  Zork is a trademark of Activision Publishing, Inc. (a Microsoft company);
  the name and brand are not licensed here. The Zork I–III game code was
  released by Microsoft under the MIT License in 2025 — this project plays
  those open-source games.
</footer>
```

Note: don't rely on the `contentinfo` role — a `<footer>` nested in the landing's
`<main>` is scoped to `main` and is not exposed as `contentinfo`, and the overlay
variant (Root is a `div`) differs again. The test queries by text, which is
stable across both variants.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ui/Landing.test.tsx -t "caveat|footnote"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Landing.tsx src/ui/Landing.test.tsx
git commit -m "feat(ui): model caveat + Zork trademark/open-source footnote

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Style the picker, caveat, and footnote

**Files:**
- Modify: `src/ui/landing.css`
- Test: manual (`make dev`) — visual only; existing tests must stay green.

- [ ] **Step 1: Add styles**

Append to `src/ui/landing.css`, reusing existing theme tokens (`--rule`,
`--brass-soft`, `--ink`, etc. — match the `.vol`/`.label` rules already in the
file for consistency):

```css
/* ---------- Language picker ---------- */
.langpick {
  margin: 18px 0 6px;
  text-align: center;
}
.lang-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}
.lang-opt {
  padding: 4px 12px;
  border: 1px solid var(--rule);
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
}
.lang-opt.sel {
  border-color: var(--brass-soft);
  /* Non-colour cue (a11y §4): the selected option is also outlined + bold. */
  font-weight: 600;
  outline: 1px solid var(--brass-soft);
}
.lang-opt:focus-visible {
  outline: 2px solid var(--brass-soft);
  outline-offset: 2px;
}
.lang-caveat {
  max-width: 52ch;
  margin: 4px auto 0;
  text-align: center;
  font-size: 0.85em;
  opacity: 0.8;
}
/* ---------- Licensing footnote ---------- */
.folio-footnote {
  margin-top: 28px;
  padding-top: 14px;
  border-top: 1px solid var(--rule);
  font-size: 0.75em;
  opacity: 0.7;
  text-align: center;
}
```

- [ ] **Step 2: Verify both themes visually**

Run: `make dev`, open the landing, confirm the picker/caveat/footnote read
clearly in **both** themes (toggle in the corner), the selected language is
distinguishable without relying on colour alone, and Tab/arrow keys operate the
picker with a visible focus ring.
Expected: legible, AA-contrast text in both themes; keyboard-operable picker.

- [ ] **Step 3: Commit**

```bash
git add src/ui/landing.css
git commit -m "style(ui): landing language picker, caveat, and footnote

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite**

Run: `make test`
Expected: PASS, with no stray `console.error`/`console.warn` and no React
`act(...)` warnings on stderr (CLAUDE.md test-pristineness rule).

- [ ] **Step 2: Lint, format, typecheck**

Run: `make all`
Expected: clean.

- [ ] **Step 3: Manual a11y smoke (screen-reader-ish)**

With `make dev` running: Tab through the landing. Confirm the language
radiogroup announces "Language, radiogroup" with "N of 5", arrow keys move
selection+focus, changing language re-announces the examples (aria-live), and
the footnote text is reachable. No mouse-only affordances.
Expected: all controls keyboard-operable with correct names/roles.

- [ ] **Step 4: Final commit (if anything was adjusted)**

```bash
git add -A
git commit -m "chore(ui): landing language-picker verification pass

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
