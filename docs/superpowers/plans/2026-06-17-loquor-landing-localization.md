# Loquor Landing-Page Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize all readable landing-page copy (except the `Loquor` wordmark and its tagline) for EN/FR/DE/ES, so a player who picks Français/Deutsch/Español reads the onboarding instructions in their own language.

**Architecture:** Add one static, hand-authored per-language string table (`src/ui/landingStrings.ts`) mirroring the existing `landingExamples.ts`. `Landing.tsx` reads `LANDING_STRINGS[lang]` instead of hardcoded English literals. A completeness test guarantees no language can ship half-English. No new dependency, no i18n framework, no LLM — fully offline, deterministic, rendered before the engine boots.

**Tech Stack:** TypeScript, React, Vitest, @testing-library/react. Run tests with `npx vitest run <file>`.

**Spec:** `docs/superpowers/specs/2026-06-17-loquor-landing-localization-design.md`

---

## File Structure

- **Create** `src/ui/landingStrings.ts` — the `LandingCopy` interface + `LANDING_STRINGS` table (one entry per `ActiveLanguage`). Single responsibility: own all localized landing chrome text.
- **Create** `src/ui/landingStrings.test.ts` — completeness test (every language has every non-empty key; subtitles cover every game slug).
- **Modify** `src/ui/Landing.tsx` — replace hardcoded literals with `LANDING_STRINGS[exampleLang]` lookups; add `lang` attributes; localize overlay accessible names.
- **Modify** `src/ui/Landing.test.tsx` — add localized-render cases (German copy, German enter button by accessible name, German volume subtitle).

The English entries reproduce the **current** literals verbatim, so English players see no change.

---

### Task 1: Localized string table + completeness test

**Files:**
- Create: `src/ui/landingStrings.ts`
- Test: `src/ui/landingStrings.test.ts`

- [ ] **Step 1: Write the failing completeness test**

Create `src/ui/landingStrings.test.ts`:

```ts
// src/ui/landingStrings.test.ts
// Player-first gate: a language can never ship half-English. Every ActiveLanguage
// must define every LandingCopy field (non-empty), and a subtitle for every game.
import { describe, it, expect } from 'vitest'
import { LANDING_STRINGS } from './landingStrings'
import { NL_LANGUAGES } from '../llm/types'
import { GAMES } from '../games/catalog'

const ACTIVE = NL_LANGUAGES.filter(l => l !== 'off') as Array<
  Exclude<(typeof NL_LANGUAGES)[number], 'off'>
>

const SCALAR_KEYS = [
  'howToTitle',
  'howToBody',
  'progressNote',
  'languageLabel',
  'caveat',
  'descent',
  'enter',
  'resume',
  'returnToGame',
  'changeStory',
] as const

const FOOTER_KEYS = ['trademark', 'licenseLinkText', 'githubLinkText'] as const

describe('LANDING_STRINGS', () => {
  for (const lang of ACTIVE) {
    const copy = LANDING_STRINGS[lang]
    it(`${lang} defines every scalar field, non-empty`, () => {
      for (const key of SCALAR_KEYS) {
        expect(copy[key], `${lang}.${key}`).toBeTruthy()
        expect(typeof copy[key]).toBe('string')
      }
    })
    it(`${lang} defines every footer segment, non-empty`, () => {
      for (const key of FOOTER_KEYS) {
        expect(copy.footer[key], `${lang}.footer.${key}`).toBeTruthy()
      }
    })
    it(`${lang} defines a subtitle for every game`, () => {
      for (const g of GAMES) {
        expect(copy.subtitles[g.slug], `${lang}.subtitles.${g.slug}`).toBeTruthy()
      }
    })
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/landingStrings.test.ts`
Expected: FAIL — cannot resolve import `./landingStrings` (module does not exist).

- [ ] **Step 3: Create the string table**

Create `src/ui/landingStrings.ts`. English entries are the current `Landing.tsx`
literals verbatim. FR/DE/ES are hand-authored translations (refinable later under
the multilingual-consistency rule). Proper nouns (Zork, Frobozz, Microsoft,
Activision, GitHub) are kept as-is inside translated sentences.

```ts
// src/ui/landingStrings.ts
// Localized landing-page chrome, one entry per play language. Static and
// hand-authored (mirrors landingExamples.ts): the landing renders before the
// engine boots and before any model download, so this must be offline and
// deterministic. Completeness is gated by landingStrings.test.ts so a language
// can never ship half-English. The `Loquor` wordmark and its tagline are NOT
// here — they stay untranslated by design (brand/identity).
//
// MULTILINGUAL RULE: a wording fix in one language is usually a fix in all four
// — when you touch one entry, check the other three for the same issue.
import type { ActiveLanguage } from '../llm/types'
import type { Game } from '../games/catalog'

export interface LandingCopy {
  howToTitle: string // bold lead-in of the how-to line
  howToBody: string // remainder of the how-to line
  progressNote: string // the dimmed "your progress is kept" line
  languageLabel: string // the inline picker label
  caveat: string // the optional-model caveat paragraph
  descent: string // the radiogroup label
  enter: string // the primary "enter the game" button
  resume: string // the saved-game resume hint
  returnToGame: string // overlay dismiss button aria-label
  changeStory: string // overlay dialog aria-label
  footer: {
    trademark: string // sentence before the two footer links
    licenseLinkText: string // visible text of the MIT-license link
    githubLinkText: string // visible text of the GitHub link
  }
  subtitles: Record<Game['slug'], string> // per-volume subtitle
}

export const LANDING_STRINGS: Record<ActiveLanguage, LandingCopy> = {
  en: {
    howToTitle: 'How to play.',
    howToBody: 'Type what you want to do in plain language.',
    progressNote:
      'Your progress is kept; close the tab and return whenever you like.',
    languageLabel: 'Language:',
    caveat:
      'Basic commands work now in all four languages. To understand more of ' +
      'what you type, you can add an optional, experimental model — a ' +
      'one-time download whose richer understanding may be uneven across ' +
      'languages.',
    descent: '— choose your descent —',
    enter: 'Light the lamp →',
    resume: '↩ a saved descent awaits — you will resume where you left off',
    returnToGame: 'Return to game',
    changeStory: 'Change story',
    footer: {
      trademark:
        'Zork is a trademark of Activision Publishing, Inc., a Microsoft company.',
      licenseLinkText:
        'The Zork I–III game code was released by Microsoft under the MIT License in 2025.',
      githubLinkText: 'View on GitHub',
    },
    subtitles: {
      zork1: 'The Great Underground Empire',
      zork2: 'The Wizard of Frobozz',
      zork3: 'The Dungeon Master',
    },
  },
  fr: {
    howToTitle: 'Comment jouer.',
    howToBody: 'Tapez ce que vous voulez faire en langage courant.',
    progressNote:
      'Votre progression est conservée ; fermez l’onglet et revenez quand vous voulez.',
    languageLabel: 'Langue :',
    caveat:
      'Les commandes de base fonctionnent dès maintenant dans les quatre ' +
      'langues. Pour mieux comprendre ce que vous tapez, vous pouvez ajouter ' +
      'un modèle optionnel et expérimental — un téléchargement unique dont la ' +
      'compréhension plus riche peut être inégale selon les langues.',
    descent: '— choisissez votre descente —',
    enter: 'Allumez la lampe →',
    resume:
      '↩ une descente sauvegardée vous attend — vous reprendrez là où vous vous êtes arrêté',
    returnToGame: 'Retour au jeu',
    changeStory: 'Changer d’histoire',
    footer: {
      trademark:
        'Zork est une marque déposée d’Activision Publishing, Inc., une société Microsoft.',
      licenseLinkText:
        'Le code des jeux Zork I–III a été publié par Microsoft sous licence MIT en 2025.',
      githubLinkText: 'Voir sur GitHub',
    },
    subtitles: {
      zork1: 'Le Grand Empire Souterrain',
      zork2: 'Le Sorcier de Frobozz',
      zork3: 'Le Maître du Donjon',
    },
  },
  de: {
    howToTitle: 'Spielanleitung.',
    howToBody: 'Schreibe in normaler Sprache, was du tun möchtest.',
    progressNote:
      'Dein Fortschritt wird gespeichert; schließe den Tab und kehre zurück, wann immer du willst.',
    languageLabel: 'Sprache:',
    caveat:
      'Grundbefehle funktionieren schon jetzt in allen vier Sprachen. Um mehr ' +
      'von dem zu verstehen, was du schreibst, kannst du ein optionales, ' +
      'experimentelles Modell hinzufügen — ein einmaliger Download, dessen ' +
      'umfassenderes Verständnis je nach Sprache unterschiedlich ausfallen kann.',
    descent: '— wähle deinen Abstieg —',
    enter: 'Entzünde die Lampe →',
    resume:
      '↩ ein gespeicherter Abstieg wartet — du machst dort weiter, wo du aufgehört hast',
    returnToGame: 'Zurück zum Spiel',
    changeStory: 'Geschichte wechseln',
    footer: {
      trademark:
        'Zork ist eine Marke von Activision Publishing, Inc., einem Microsoft-Unternehmen.',
      licenseLinkText:
        'Der Spielcode von Zork I–III wurde 2025 von Microsoft unter der MIT-Lizenz veröffentlicht.',
      githubLinkText: 'Auf GitHub ansehen',
    },
    subtitles: {
      zork1: 'Das große unterirdische Reich',
      zork2: 'Der Zauberer von Frobozz',
      zork3: 'Der Dungeon-Meister',
    },
  },
  es: {
    howToTitle: 'Cómo jugar.',
    howToBody: 'Escribe lo que quieres hacer en lenguaje natural.',
    progressNote:
      'Tu progreso se guarda; cierra la pestaña y vuelve cuando quieras.',
    languageLabel: 'Idioma:',
    caveat:
      'Los comandos básicos ya funcionan en los cuatro idiomas. Para entender ' +
      'mejor lo que escribes, puedes añadir un modelo opcional y experimental ' +
      '— una descarga única cuya comprensión más rica puede ser desigual ' +
      'según el idioma.',
    descent: '— elige tu descenso —',
    enter: 'Enciende la lámpara →',
    resume:
      '↩ un descenso guardado te espera — continuarás donde lo dejaste',
    returnToGame: 'Volver al juego',
    changeStory: 'Cambiar de historia',
    footer: {
      trademark:
        'Zork es una marca registrada de Activision Publishing, Inc., una empresa de Microsoft.',
      licenseLinkText:
        'El código de los juegos Zork I–III fue publicado por Microsoft bajo la licencia MIT en 2025.',
      githubLinkText: 'Ver en GitHub',
    },
    subtitles: {
      zork1: 'El Gran Imperio Subterráneo',
      zork2: 'El Hechicero de Frobozz',
      zork3: 'El Maestro del Calabozo',
    },
  },
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/landingStrings.test.ts`
Expected: PASS (all languages complete).

- [ ] **Step 5: Commit**

```bash
git add src/ui/landingStrings.ts src/ui/landingStrings.test.ts
git commit -m "feat(ui): add localized landing string table (EN/FR/DE/ES)

Static hand-authored per-language landing chrome, mirroring landingExamples.ts.
Completeness gated by landingStrings.test.ts so no language ships half-English.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Wire `Landing.tsx` to the table

**Files:**
- Modify: `src/ui/Landing.tsx`
- Test: `src/ui/Landing.test.tsx`

- [ ] **Step 1: Write the failing localized-render test**

Add these cases inside the `describe('Landing', …)` block in
`src/ui/Landing.test.tsx`. They seed the stored NL preference to German (the
landing initialises `language` from `readNlPref().language`), then assert German
copy renders. Import the table and storage key at the top of the file:

```ts
import { LANDING_STRINGS } from './landingStrings'
```

(`LS_KEYS` is already imported in this file.)

```ts
it('renders localized copy and volume subtitle for the stored language (de)', () => {
  localStorage.setItem(
    LS_KEYS.nlPref,
    JSON.stringify({ language: 'de', declined: false }),
  )
  render(
    <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
  )
  const de = LANDING_STRINGS.de
  expect(screen.getByText(de.howToBody)).toBeInTheDocument()
  // The primary action is found by its localized accessible name.
  expect(
    screen.getByRole('button', { name: new RegExp(de.enter.replace('→', '')) }),
  ).toBeInTheDocument()
  // The volume subtitle is localized, not the English catalog value.
  expect(screen.getByText(de.subtitles.zork1)).toBeInTheDocument()
  expect(
    screen.queryByText('The Great Underground Empire'),
  ).not.toBeInTheDocument()
})

it('localizes the radiogroup label for the stored language (es)', () => {
  localStorage.setItem(
    LS_KEYS.nlPref,
    JSON.stringify({ language: 'es', declined: false }),
  )
  render(
    <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
  )
  expect(
    screen.getByRole('radiogroup', { name: /elige tu descenso/i }),
  ).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/Landing.test.tsx`
Expected: FAIL — the German/Spanish strings are not rendered (the component still emits English literals).

- [ ] **Step 3: Wire the component to the table**

In `src/ui/Landing.tsx`:

3a. Add the import (next to the existing `LANDING_EXAMPLES` import):

```ts
import { LANDING_STRINGS } from './landingStrings'
```

3b. Just after the existing `examples` line (`const examples = LANDING_EXAMPLES[exampleLang]`), add:

```ts
const s = LANDING_STRINGS[exampleLang]
```

3c. Replace the dialog/dismiss accessible names. Change the plate's `aria-label`:

```tsx
        aria-label={onDismiss ? s.changeStory : undefined}
```

and the dismiss button's `aria-label`:

```tsx
            aria-label={s.returnToGame}
```

3d. Replace the how-to block body (keep the surrounding `<div className="howto">`, the `cmds` region, and the `<br />`s as-is). The first two text nodes become:

```tsx
          <b>{s.howToTitle}</b> {s.howToBody}
```

and the dimmed note span becomes:

```tsx
          <span style={{ opacity: 0.75 }}>{s.progressNote}</span>
```

3e. Replace the picker label:

```tsx
          <span className="langpick-label">{s.languageLabel}</span>{' '}
```

3f. Replace the caveat paragraph contents:

```tsx
        <p className="lang-caveat">{s.caveat}</p>
```

3g. Replace the descent label contents:

```tsx
        <span className="label" id="descent-label">
          {s.descent}
        </span>
```

3h. Replace the volume subtitle (inside the `GAMES.map`):

```tsx
              <span className="nm">{s.subtitles[g.slug]}</span>
```

3i. Replace the enter button label (keep the `onClick` exactly as-is):

```tsx
          {s.enter}
```

3j. Replace the resume hint contents:

```tsx
          <div className="resume">{s.resume}</div>
```

3k. Replace the footer contents (keep both `<a>` elements' `href`/`target`/`rel` exactly as-is; only the visible text changes):

```tsx
        <footer className="folio-footnote">
          {s.footer.trademark}{' '}
          <a
            href="https://opensource.microsoft.com/blog/2025/11/20/preserving-code-that-shaped-generations-zork-i-ii-and-iii-go-open-source/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {s.footer.licenseLinkText}
          </a>{' '}
          <a
            href="https://github.com/Ovid/loquor"
            target="_blank"
            rel="noopener noreferrer"
          >
            {s.footer.githubLinkText}
          </a>
          .
        </footer>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/Landing.test.tsx`
Expected: PASS — including the existing English cases (default pref is `off` → maps to `en` → English table, identical to today).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Landing.tsx src/ui/Landing.test.tsx
git commit -m "feat(ui): render landing copy from the localized string table

Landing now reads LANDING_STRINGS[lang] for all chrome (how-to, caveat,
descent label, volume subtitles, enter button, resume hint, footer text,
overlay accessible names) instead of hardcoded English. English is unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `lang` attributes for correct screen-reader pronunciation

**Files:**
- Modify: `src/ui/Landing.tsx`
- Test: `src/ui/Landing.test.tsx`

The localized text must carry a `lang` attribute so assistive tech pronounces it
correctly. The tagline is **English** (`to speak, and be understood, in the
dark`), not the chosen language, so it gets an explicit `lang="en"` to avoid
being voiced with German/French/Spanish phonetics when the plate is localized.

- [ ] **Step 1: Write the failing test**

Add inside `describe('Landing', …)` in `src/ui/Landing.test.tsx`:

```ts
it('marks the localized plate with a lang attribute and keeps the tagline English', () => {
  localStorage.setItem(
    LS_KEYS.nlPref,
    JSON.stringify({ language: 'fr', declined: false }),
  )
  const { container } = render(
    <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
  )
  expect(container.querySelector('.plate')).toHaveAttribute('lang', 'fr')
  expect(container.querySelector('.tagline')).toHaveAttribute('lang', 'en')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/Landing.test.tsx -t "lang attribute"`
Expected: FAIL — `.plate` has no `lang` attribute (currently undefined).

- [ ] **Step 3: Add the `lang` attributes**

In `src/ui/Landing.tsx`:

3a. Add `lang={exampleLang}` to the plate `<div className="plate" …>`:

```tsx
      <div
        className="plate"
        ref={plateRef}
        lang={exampleLang}
        role={onDismiss ? 'dialog' : undefined}
        aria-modal={onDismiss ? true : undefined}
        aria-label={onDismiss ? s.changeStory : undefined}
      >
```

3b. Add `lang="en"` to the tagline (it is English, not the chosen language):

```tsx
        <p className="tagline" lang="en">
          to speak, and be understood, in the dark
        </p>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/Landing.test.tsx`
Expected: PASS (all Landing cases, including the new `lang` case).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Landing.tsx src/ui/Landing.test.tsx
git commit -m "a11y(ui): mark localized landing plate with lang; keep tagline en

Screen readers now switch pronunciation with the chosen language; the English
tagline is pinned lang=en so it isn't voiced with the wrong phonetics.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full suite**

Run: `make test`
Expected: PASS, with no stray `console.warn`/`console.error` and no React `act(...)` warnings (per project test-hygiene rule).

- [ ] **Step 2: Lint, format, typecheck**

Run: `make lint && make format && make typecheck`
Expected: clean (no errors). `tsc -b` confirms the `LandingCopy`/`ActiveLanguage`/`Game['slug']` types line up across the new module and `Landing.tsx`.

- [ ] **Step 3: Visual smoke check for layout reflow**

Run: `make dev`, open the landing, and switch the picker through Français /
Deutsch / Español. Confirm the longer German/French copy does not break the
plate layout (button text not clipped, caveat paragraph wraps cleanly). If — and
only if — it visibly breaks, tighten `src/ui/landing.css` (no redesign); commit
any CSS fix separately:

```bash
git add src/ui/landing.css
git commit -m "style(ui): keep landing plate from reflowing under longer translations

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

If no fix is needed, note that the layout held and skip this commit.

---

## Self-Review Notes

- **Spec coverage:** translated strings (Task 1 table + Task 2 wiring), footer split with live links (Task 2 step 3k), volume subtitles localized (Task 2 step 3h), tagline/title untranslated (Task 3 pins tagline `lang="en"`, title untouched), `lang` attribute (Task 3), localized overlay accessible names (Task 2 steps 3c, 3d via `returnToGame`/`changeStory`), completeness test (Task 1), localized-render + a11y-name tests (Task 2), layout-reflow risk (Task 4 step 3). All spec sections map to a task.
- **Type consistency:** `LandingCopy`, `LANDING_STRINGS`, `ActiveLanguage`, `Game['slug']`, `NL_LANGUAGES` used identically across Task 1's module/test and Task 2's wiring. `exampleLang` is the existing variable in `Landing.tsx` (already maps `off`/`en` → `en`); `s = LANDING_STRINGS[exampleLang]` is keyed by `ActiveLanguage`, which `exampleLang` satisfies.
- **No placeholders:** every code/test step contains complete, runnable content.
