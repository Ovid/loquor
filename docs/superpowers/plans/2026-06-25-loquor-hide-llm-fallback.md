# Hide the LLM fallback behind one preference — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide every user-facing trace of the experimental WebLLM natural-language
fallback by default, controllable by one new preference toggle (`loquor.llm`,
default off) below the existing debug toggle; turning it on restores today's
behavior in full.

**Architecture:** A persisted boolean (`useLlmFeature()`, mirroring `useDebug()`)
owned by `Terminal`, threaded to every consumer of the model state. The
discipline is a **single derived value** — `effectiveModel = llmEnabled ?
internal.model : 'grammar'` — computed once in `useNaturalLanguage` and fed into
the public `NlState` and the live pipeline ref, so the input pipeline never
reaches the LLM stage, the engine never lazy-loads, and the picker/summary/output
gate all read the effective value. One imperative (abort an in-flight download on
turn-off) plus render-gated affordances complete the live behavior. A one-time
migration notice and a live mode-change announcement reach assistive tech.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library, localStorage
preferences. Source of truth:
`docs/superpowers/specs/2026-06-25-loquor-hide-llm-fallback-design.md`.

---

## File map (what each task touches)

- **Create** `src/ui/useLlmFeature.ts` + `.test.ts` — the toggle hook (mirror of `useDebug`).
- `src/storageKeys.ts` — two new keys.
- `src/llm/notices.ts` + `.test.ts` — mode-change + migration notice strings (byLang).
- `src/ui/PreferencesModal.tsx` + `.test.tsx` — toggle row + localized copy.
- `src/ui/nlModeSummary.ts`, `src/ui/BottomBar.tsx` + `BottomBar.test.tsx` — drop the tier token when off.
- `src/ui/NlLanguagePicker.tsx` + `.test.tsx` — gate the improve button, basic chip, installed chip.
- `src/ui/landingStrings.ts`, `src/ui/Landing.tsx` + `Landing.test.tsx`, `landingStrings.test.ts` — short-vs-full caveat per flag.
- `src/llm/useNaturalLanguage.ts` + `.test.tsx` — accept `llmEnabled`; derive `effectiveModel` into `NlState` and `liveRef`.
- `src/llm/translatePipeline.ts` + `translatePipeline.test.ts` — suppress the upgrade-pitch notice when the feature is hidden (`LiveState.llmEnabled`).
- `src/translate/useOutputTranslation.ts` + `.test.tsx` — gate `lexLang` on `llmEnabled` (corpus-only when off).
- `src/ui/Terminal.tsx` + `Terminal.test.tsx` — own the hook, thread it, gate the modal, abort effect, M2 + mode-change region.

**Default-arg discipline (read before starting):** every new prop/arg
(`llmEnabled` on the picker, bottom bar, summary, output hook, NL hook;
`onToggleLlm`/`llmEnabled` on the prefs modal) gets a **default that preserves
today's behavior** so the existing suite stays green without edits — `true` for
the model-state consumers (`useNaturalLanguage`, `useOutputTranslation`,
`NlLanguagePicker`, `BottomBar`, `nlModeSummary`), `false`/noop for the prefs
modal's controlled checkbox. `Terminal` passes the real flag (default **off**).

**Existing tests we deliberately edit (the complete list — do not expect these to
stay green untouched):**
- **Landing caveat** test (Task 6) — its default render now shows the short caveat.
- **`translatePipeline.test.ts`** (Task 8) — three inline `liveRef` literals
  (`:397` shared helper, `:625` and `:867` ka tests) gain `llmEnabled: true`; the
  fr first-miss assertion at `:709` stays green **because** of the `:397` edit.

Everything else stays green via the default-arg discipline above — in particular
the new Terminal live region is a **bare `aria-live="polite"`** region (NOT
`role="status"`), so it does **not** collide with the five existing
`getByRole('status')`/`findByRole('status')` queries in `Terminal.test.tsx`
(`:129,160,446,795,824`), which still resolve the single `role="status"` region
at `Terminal.tsx:306`.

---

## Task 1: storage keys + `useLlmFeature` hook

**Files:**
- Modify: `src/storageKeys.ts`
- Create: `src/ui/useLlmFeature.ts`
- Create: `src/ui/useLlmFeature.test.ts`

- [ ] **Step 1: Add the two keys**

In `src/storageKeys.ts`, add to `LS_KEYS` (after `debug`):

```ts
  /** Debug-view preference ('1' = on). Owner: src/ui/useDebug.ts */
  debug: 'loquor.debug',
  /** LLM-fallback preference ('1' = on; absent = off/hidden). Owner: src/ui/useLlmFeature.ts */
  llm: 'loquor.llm',
  /** Write-once marker: the one-time "LLM now hidden" migration notice was shown
   * to a returning opted-in user. Owner: src/ui/Terminal.tsx (M2). */
  llmHiddenNoticeSeen: 'loquor.llm.hiddenNoticeSeen',
} as const
```

- [ ] **Step 2: Write the failing test** — `src/ui/useLlmFeature.test.ts`

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLlmFeature } from './useLlmFeature'
import { LS_KEYS } from '../storageKeys'

afterEach(() => localStorage.clear())

describe('useLlmFeature', () => {
  it('defaults to false (LLM hidden)', () => {
    const { result } = renderHook(() => useLlmFeature())
    expect(result.current[0]).toBe(false)
  })

  it('toggles on and persists the sentinel', () => {
    const { result } = renderHook(() => useLlmFeature())
    act(() => result.current[1]())
    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem(LS_KEYS.llm)).toBe('1')
  })

  it('toggles back off and removes the key', () => {
    localStorage.setItem(LS_KEYS.llm, '1')
    const { result } = renderHook(() => useLlmFeature())
    expect(result.current[0]).toBe(true)
    act(() => result.current[1]())
    expect(result.current[0]).toBe(false)
    expect(localStorage.getItem(LS_KEYS.llm)).toBeNull()
  })

  it('treats any non-sentinel value as false', () => {
    localStorage.setItem(LS_KEYS.llm, 'true')
    const { result } = renderHook(() => useLlmFeature())
    expect(result.current[0]).toBe(false)
  })

  it('survives a throwing localStorage (defaults false, no crash)', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked')
      })
    try {
      const { result } = renderHook(() => useLlmFeature())
      expect(result.current[0]).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})
```

- [ ] **Step 3: Run it, expect failure**

Run: `npx vitest run src/ui/useLlmFeature.test.ts`
Expected: FAIL — cannot find module `./useLlmFeature`.

- [ ] **Step 4: Implement the hook** — `src/ui/useLlmFeature.ts`

```ts
import { useCallback, useEffect, useState } from 'react'
import { LS_KEYS } from '../storageKeys'

const KEY = LS_KEYS.llm

/**
 * LLM-fallback preference: whether the experimental WebLLM natural-language layer
 * (richer input understanding + the LLM output-translation fallback) is exposed.
 * Default OFF (hidden) — the deterministic grammar-only / corpus-only floor is
 * the baseline; turning this on restores the model, its download modal, and its
 * affordances. A clone of useDebug (same persistence contract): localStorage '1'
 * when on, key removed when off; try/catch because storage throws when cookies
 * are blocked.
 */
export function useLlmFeature(): [boolean, () => void] {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      if (enabled) localStorage.setItem(KEY, '1')
      else localStorage.removeItem(KEY)
    } catch {
      // Blocked/quota'd storage — the preference still applies, it just won't stick.
    }
  }, [enabled])

  const toggle = useCallback(() => setEnabled(e => !e), [])
  return [enabled, toggle]
}
```

- [ ] **Step 5: Run it, expect pass**

Run: `npx vitest run src/ui/useLlmFeature.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/storageKeys.ts src/ui/useLlmFeature.ts src/ui/useLlmFeature.test.ts
git commit -m "feat: useLlmFeature toggle hook + storage keys (default off)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: notice strings — mode-change + migration (byLang)

**Files:**
- Modify: `src/llm/notices.ts`
- Modify: `src/llm/notices.test.ts`

These strings live with the other NL notices (gate-points instruction), follow
the existing `byLang` pattern, and carry mandatory en/fr/de/es plus a `ka`
native-review draft (a returning `ka` user never caches a model, so M2 rarely
renders for them — but the deterministic-coverage rule still wants the entry).

- [ ] **Step 1: Write the failing test** — append to `src/llm/notices.test.ts`

```ts
import { llmModeChange, llmHiddenMigrationNotice } from './notices'

describe('LLM-feature notices (hide-LLM-fallback)', () => {
  it('llmModeChange announces enabled/hidden per language', () => {
    expect(llmModeChange('en', true)).toBe('Natural-language model enabled.')
    expect(llmModeChange('en', false)).toBe('Natural-language model hidden.')
    expect(llmModeChange('fr', true)).toBe('Modèle de langage naturel activé.')
    expect(llmModeChange('fr', false)).toBe('Modèle de langage naturel masqué.')
    expect(llmModeChange('de', false)).toBe(
      'Sprachmodell für natürliche Sprache ausgeblendet.',
    )
    expect(llmModeChange('es', false)).toBe(
      'Modelo de lenguaje natural oculto.',
    )
  })

  it('llmHiddenMigrationNotice names the localized Preferences panel', () => {
    expect(llmHiddenMigrationNotice('en')).toMatch(/Preferences/)
    expect(llmHiddenMigrationNotice('fr')).toMatch(/Préférences/)
    expect(llmHiddenMigrationNotice('de')).toMatch(/Einstellungen/)
    expect(llmHiddenMigrationNotice('es')).toMatch(/Preferencias/)
  })

  it('both notices have a non-empty entry for every NL language incl. ka', () => {
    for (const lang of ['en', 'fr', 'de', 'es', 'ka'] as const) {
      expect(llmModeChange(lang, true)).toBeTruthy()
      expect(llmModeChange(lang, false)).toBeTruthy()
      expect(llmHiddenMigrationNotice(lang)).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/llm/notices.test.ts -t "hide-LLM-fallback"`
Expected: FAIL — `llmModeChange`/`llmHiddenMigrationNotice` are not exported.

- [ ] **Step 3: Implement the two notices** — append to `src/llm/notices.ts`

```ts
/** Live announcement when the LLM-feature toggle flips (a11y rule 3): the
 * status-bar affordances appear/disappear OUTSIDE the prefs modal the user is in,
 * so the change must reach assistive tech via an aria-live region. */
export function llmModeChange(lang: ActiveLanguage, enabled: boolean): string {
  return byLang(
    enabled
      ? {
          en: 'Natural-language model enabled.',
          fr: 'Modèle de langage naturel activé.',
          de: 'Sprachmodell für natürliche Sprache aktiviert.',
          es: 'Modelo de lenguaje natural activado.',
          // NATIVE-REVIEW-DRAFT (ka §7): mode-change announcement, Georgian.
          ka: 'ბუნებრივი ენის მოდელი ჩაირთო.',
        }
      : {
          en: 'Natural-language model hidden.',
          fr: 'Modèle de langage naturel masqué.',
          de: 'Sprachmodell für natürliche Sprache ausgeblendet.',
          es: 'Modelo de lenguaje natural oculto.',
          // NATIVE-REVIEW-DRAFT (ka §7): mode-change announcement, Georgian.
          ka: 'ბუნებრივი ენის მოდელი დაიმალა.',
        },
    lang,
  )
}

/** One-time notice (M2) for a returning user whose model was cached before this
 * feature shipped: the model is now hidden, not gone — re-enable it in
 * Preferences (the weights stay on disk, no re-download). The text references the
 * LOCALIZED Preferences panel name (matches PreferencesModal copy). */
export function llmHiddenMigrationNotice(lang: ActiveLanguage): string {
  return byLang(
    {
      en: 'The experimental natural-language model is now hidden — re-enable it in Preferences.',
      fr: 'Le modèle expérimental de langage naturel est maintenant masqué — réactivez-le dans les Préférences.',
      de: 'Das experimentelle Sprachmodell ist jetzt ausgeblendet — aktivieren Sie es in den Einstellungen wieder.',
      es: 'El modelo experimental de lenguaje natural ahora está oculto — vuelve a activarlo en Preferencias.',
      // NATIVE-REVIEW-DRAFT (ka §7): ka never caches a model, so this rarely
      // renders for ka — entry present for completeness. Names the localized
      // Preferences panel ("პარამეტრები", per PreferencesModal ka copy).
      ka: 'ბუნებრივი ენის ექსპერიმენტული მოდელი ახლა დამალულია — ჩართეთ ის ხელახლა პარამეტრებში.',
    },
    lang,
  )
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `npx vitest run src/llm/notices.test.ts -t "hide-LLM-fallback"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/llm/notices.ts src/llm/notices.test.ts
git commit -m "feat: LLM mode-change + migration notice strings (en/fr/de/es + ka draft)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: PreferencesModal — the toggle row below debug

**Files:**
- Modify: `src/ui/PreferencesModal.tsx`
- Modify: `src/ui/PreferencesModal.test.tsx`

The new row mirrors the debug row exactly (a `<label>` wrapping `<input
type="checkbox">` + an `aria-describedby` help paragraph), sits directly below the
debug help paragraph, and is localized. The new props default to off/noop so the
existing render tests stay green.

- [ ] **Step 1: Write the failing test** — append to `src/ui/PreferencesModal.test.tsx`

```ts
describe('PreferencesModal — LLM toggle', () => {
  it('exposes the LLM checkbox by accessible name/description and reflects state', () => {
    render(
      <PreferencesModal
        open
        debug={false}
        llmEnabled
        onToggleDebug={noop}
        onToggleLlm={noop}
        onClose={noop}
      />,
    )
    const box = screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel })
    expect(box).toBeChecked()
    expect(box).toHaveAccessibleDescription(PREFS_COPY.en.llmHelp)
  })

  it('sits BELOW the debug row (DOM order)', () => {
    render(
      <PreferencesModal
        open
        debug={false}
        llmEnabled={false}
        onToggleDebug={noop}
        onToggleLlm={noop}
        onClose={noop}
      />,
    )
    const debugBox = screen.getByRole('checkbox', {
      name: PREFS_COPY.en.debugLabel,
    })
    const llmBox = screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel })
    // debug precedes llm in document order (rows are siblings under the modal).
    expect(
      debugBox.compareDocumentPosition(llmBox) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('calls onToggleLlm when clicked', () => {
    const onToggleLlm = vi.fn()
    render(
      <PreferencesModal
        open
        debug={false}
        llmEnabled={false}
        onToggleDebug={noop}
        onToggleLlm={onToggleLlm}
        onClose={noop}
      />,
    )
    fireEvent.click(
      screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel }),
    )
    expect(onToggleLlm).toHaveBeenCalledTimes(1)
  })

  it('has LLM copy for every NL language (incl. ka)', () => {
    for (const lang of ['en', 'fr', 'de', 'es', 'ka'] as const) {
      expect(PREFS_COPY[lang].llmLabel).toBeTruthy()
      expect(PREFS_COPY[lang].llmHelp).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/ui/PreferencesModal.test.tsx -t "LLM toggle"`
Expected: FAIL — `llmLabel`/`llmHelp`/`onToggleLlm` do not exist.

- [ ] **Step 3: Extend the copy interface + map**

In `src/ui/PreferencesModal.tsx`, add to `interface PrefsCopy` (after `debugHelp`):

```ts
  debugHelp: string
  llmLabel: string
  llmHelp: string
```

Add `llmLabel`/`llmHelp` to each language block in `PREFS_COPY`:

```ts
  en: {
    heading: 'Preferences',
    debugLabel: 'Debug mode',
    debugHelp: 'Show translated commands (e.g. “> up”) in the transcript.',
    llmLabel: 'Natural-language model (experimental)',
    llmHelp:
      'Adds an optional on-device model that understands more of what you type. Hidden by default.',
    close: 'Done',
    openLabel: 'Preferences',
  },
  fr: {
    heading: 'Préférences',
    debugLabel: 'Mode débogage',
    debugHelp:
      'Afficher les commandes traduites (par ex. « > up ») dans la transcription.',
    llmLabel: 'Modèle de langage naturel (expérimental)',
    llmHelp:
      'Ajoute un modèle optionnel, exécuté sur l’appareil, qui comprend mieux ce que vous tapez. Masqué par défaut.',
    close: 'Terminé',
    openLabel: 'Préférences',
  },
  de: {
    heading: 'Einstellungen',
    debugLabel: 'Debug-Modus',
    debugHelp: 'Übersetzte Befehle (z. B. „> up“) im Protokoll anzeigen.',
    llmLabel: 'Sprachmodell für natürliche Sprache (experimentell)',
    llmHelp:
      'Fügt ein optionales, auf dem Gerät laufendes Modell hinzu, das mehr von dem versteht, was Sie eingeben. Standardmäßig ausgeblendet.',
    close: 'Fertig',
    openLabel: 'Einstellungen',
  },
  es: {
    heading: 'Preferencias',
    debugLabel: 'Modo de depuración',
    debugHelp:
      'Mostrar los comandos traducidos (p. ej. «> up») en la transcripción.',
    llmLabel: 'Modelo de lenguaje natural (experimental)',
    llmHelp:
      'Añade un modelo opcional, ejecutado en el dispositivo, que entiende mejor lo que escribes. Oculto por defecto.',
    close: 'Hecho',
    openLabel: 'Preferencias',
  },
```

And the `ka` block (after `debugHelp`):

```ts
  ka: {
    heading: 'პარამეტრები',
    debugLabel: 'გამართვის რეჟიმი',
    debugHelp: 'ჩანაწერში თარგმნილი ბრძანებების ჩვენება (მაგ. „> up“).',
    // NATIVE-REVIEW-DRAFT (§8): ka has no input/output LLM in either state, so
    // this toggle is functionally inert for ka — but the panel still renders in
    // Georgian when ka is active, so the copy must exist. Mkhedruli is unicameral.
    llmLabel: 'ბუნებრივი ენის მოდელი (ექსპერიმენტული)',
    llmHelp:
      'ამატებს არასავალდებულო მოდელს, რომელიც მოწყობილობაზევე მუშაობს და უკეთ იგებს თქვენს აკრეფილ ტექსტს. ნაგულისხმევად დამალულია.',
    close: 'მზადაა',
    openLabel: 'პარამეტრები',
  },
```

- [ ] **Step 4: Add the props + render the row**

Change the component signature:

```ts
export function PreferencesModal({
  open,
  debug,
  llmEnabled = false,
  lang = 'en',
  onToggleDebug,
  onToggleLlm = () => {},
  onClose,
}: {
  open: boolean
  debug: boolean
  /** LLM-feature preference; controls whether the model + its affordances are exposed. */
  llmEnabled?: boolean
  /** Active NL language — renders the panel chrome in this language. */
  lang?: ActiveLanguage
  onToggleDebug: () => void
  onToggleLlm?: () => void
  onClose: () => void
}) {
```

In the JSX, add the LLM row directly after the debug help `<p>` (and before
`<div className="modal-actions">`):

```tsx
      <p id="prefs-debug-help" className="prefs-help">
        {copy.debugHelp}
      </p>
      <label className="prefs-row">
        <input
          type="checkbox"
          checked={llmEnabled}
          aria-describedby="prefs-llm-help"
          onChange={onToggleLlm}
        />{' '}
        {copy.llmLabel}
      </label>
      <p id="prefs-llm-help" className="prefs-help">
        {copy.llmHelp}
      </p>
      <div className="modal-actions">
```

- [ ] **Step 5: Run it, expect pass**

Run: `npx vitest run src/ui/PreferencesModal.test.tsx`
Expected: PASS (all — existing debug tests unaffected, 4 new pass).

- [ ] **Step 6: Commit**

```bash
git add src/ui/PreferencesModal.tsx src/ui/PreferencesModal.test.tsx
git commit -m "feat: LLM-feature toggle row in PreferencesModal (below debug)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `nlModeSummary` + BottomBar — drop the tier token when off

**Files:**
- Modify: `src/ui/nlModeSummary.ts`
- Modify: `src/ui/BottomBar.tsx`
- Modify: `src/ui/BottomBar.test.tsx`

When the feature is off, `nlModeSummary` returns just the localized input
indicator — no tier token, no `·` separator (per *Pinned strings*). The `ka`
empty-string case is unchanged (its guard runs first).

- [ ] **Step 1: Write the failing test** — add to the `nlModeSummary` describe in `src/ui/BottomBar.test.tsx`

```ts
  it('flag OFF: drops the tier token and separator, keeps the input indicator', () => {
    const on = {
      phase: 'on',
      language: 'fr',
      model: 'grammar',
      canUpgrade: false,
    } as const
    // On (default) keeps the tier; off returns just the localized input word.
    expect(nlModeSummary(on)).toBe('simplifié · saisie')
    expect(nlModeSummary(on, false)).toBe('saisie')
    expect(
      nlModeSummary(
        { phase: 'on', language: 'de', model: 'full', canUpgrade: true },
        false,
      ),
    ).toBe('Eingabe')
  })

  it('flag OFF: ka still shows no chip (output-only guard runs first)', () => {
    expect(
      nlModeSummary(
        { phase: 'on', language: 'ka', model: 'grammar', canUpgrade: true },
        false,
      ),
    ).toBe('')
  })
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/ui/BottomBar.test.tsx -t "flag OFF"`
Expected: FAIL — `nlModeSummary` ignores the second arg (returns `simplifié · saisie`).

- [ ] **Step 3: Implement the parameter** — `src/ui/nlModeSummary.ts`

Change the signature and the `on` branch:

```ts
export function nlModeSummary(state: NlState, llmEnabled = true): string {
  switch (state.phase) {
    case 'disabled':
      return 'no NL' // this game has no vocab — the picker never appears
    case 'off':
      return 'off'
    case 'downloading':
      return 'downloading…'
    case 'on': {
      if (OUTPUT_ONLY_LANGS.has(state.language)) return '' // ka: title-only
      const lang = state.language as 'en' | 'fr' | 'de' | 'es'
      // Feature hidden: no tier token / separator — the model concept is gone,
      // so report only what stays true (the localized input indicator).
      if (!llmEnabled) return INPUT[lang]
      const tier = state.model === 'grammar' ? basicChip(lang) : FULL[lang]
      return `${tier} · ${INPUT[lang]}`
    }
  }
}
```

- [ ] **Step 4: Thread it through BottomBar**

In `src/ui/BottomBar.tsx`, add the prop (default true) and pass it:

```ts
export function BottomBar({
  debug,
  nlState,
  storyTitle,
  signature,
  showBeta,
  showNoCorpus,
  kaInput,
  llmEnabled = true,
}: {
  debug: boolean
  nlState: NlState
  storyTitle: string
  signature: string
  showBeta: boolean
  showNoCorpus: boolean
  kaInput: boolean
  /** LLM-feature preference — drops the tier token from the readout when off. */
  llmEnabled?: boolean
}) {
  const summary = nlModeSummary(nlState, llmEnabled)
```

- [ ] **Step 5: Run it, expect pass**

Run: `npx vitest run src/ui/BottomBar.test.tsx`
Expected: PASS (existing BottomBar tests default `llmEnabled=true`, unaffected; new pass).

- [ ] **Step 6: Commit**

```bash
git add src/ui/nlModeSummary.ts src/ui/BottomBar.tsx src/ui/BottomBar.test.tsx
git commit -m "feat: drop the tier token from the readout when the LLM feature is hidden

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: NlLanguagePicker — gate improve/basic/installed chips

**Files:**
- Modify: `src/ui/NlLanguagePicker.tsx`
- Modify: `src/ui/NlLanguagePicker.test.tsx`

When off, the picker keeps the language combobox (the language picker is NOT
affected) but renders **none** of the three model affordances: the `installed /
not installed` chip (off phase), the `basic` chip, and the `✦ improve` button.
`grammarOnly` (which drives the combobox `aria-describedby` to the basic-state
span) must also fold in `llmEnabled` so the description isn't dangling.

- [ ] **Step 1: Write the failing test** — append to `src/ui/NlLanguagePicker.test.tsx`

```ts
describe('NlLanguagePicker — LLM feature hidden', () => {
  it('off · cached: no installed chip when llmEnabled is false', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'off', installed: true, canUpgrade: true }}
        onSelect={() => {}}
        onUpgrade={() => {}}
        llmEnabled={false}
      />,
    )
    expect(screen.queryByText('installed')).toBeNull()
    expect(screen.queryByText('not installed')).toBeNull()
    // The combobox itself is unaffected — the language picker still works.
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('grammar-only: no basic chip, no improve button, no dangling description', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr', model: 'grammar', canUpgrade: true }}
        onSelect={() => {}}
        onUpgrade={() => {}}
        llmEnabled={false}
      />,
    )
    expect(screen.queryByText('simplifié')).toBeNull()
    expect(
      screen.queryByRole('button', { name: /improve|model anyway/i }),
    ).toBeNull()
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-describedby')
  })

  it('regression: with llmEnabled (default) the affordances still render', () => {
    render(
      <NlLanguagePicker
        state={{ phase: 'on', language: 'fr', model: 'grammar', canUpgrade: true }}
        onSelect={() => {}}
        onUpgrade={() => {}}
      />,
    )
    expect(screen.getByText('simplifié')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /improve/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx -t "LLM feature hidden"`
Expected: FAIL — `llmEnabled` prop is unknown; chips/improve still render.

- [ ] **Step 3: Add the prop + gate the three affordances** — `src/ui/NlLanguagePicker.tsx`

Add to the props destructure and type (default true):

```ts
export function NlLanguagePicker({
  state,
  onSelect,
  onUpgrade,
  hideUpgrade = false,
  llmEnabled = true,
}: {
  state: NlState
  onSelect: (lang: NlLanguage) => void
  onUpgrade: () => void
  hideUpgrade?: boolean
  /** LLM-feature preference. When false, the model affordances (installed chip,
   * basic chip, improve button) are not rendered — the combobox stays. */
  llmEnabled?: boolean
}) {
```

Fold `llmEnabled` into the grammar-only derivation:

```ts
  const value: NlLanguage = state.phase === 'on' ? state.language : 'off'
  const grammarOnly =
    state.phase === 'on' &&
    state.model === 'grammar' &&
    !hideUpgrade &&
    llmEnabled
```

Gate the off-phase installed chip:

```tsx
      {state.phase === 'off' && llmEnabled && (
        <span className="nl-chip">
          {' '}
          <span className="sep" aria-hidden="true">
            ·
          </span>{' '}
          {state.installed ? 'installed' : 'not installed'}
        </span>
      )}
```

Gate the grammar-only block (basic chip + improve button) — add `&& llmEnabled` to
its condition:

```tsx
      {state.phase === 'on' &&
        state.model === 'grammar' &&
        !hideUpgrade &&
        llmEnabled && (
        <>
          {' '}
          <span className="sep" aria-hidden="true">
            ·
          </span>{' '}
          <span className="nl-basic" id="nl-basic-state" lang={state.language}>
            {basicChip(state.language)}
          </span>{' '}
          <button
            className="sw"
            type="button"
            aria-label={
              state.canUpgrade
                ? 'Improve natural-language input (download AI model)'
                : undefined
            }
            onClick={onUpgrade}
          >
            {state.canUpgrade ? (
              <>
                <span aria-hidden="true">✦</span> improve
              </>
            ) : (
              'try the model anyway'
            )}
          </button>
        </>
      )}
```

- [ ] **Step 4: Run it, expect pass**

Run: `npx vitest run src/ui/NlLanguagePicker.test.tsx`
Expected: PASS (existing tests default `llmEnabled=true`, unaffected; 3 new pass).

- [ ] **Step 5: Commit**

```bash
git add src/ui/NlLanguagePicker.tsx src/ui/NlLanguagePicker.test.tsx
git commit -m "feat: hide installed/basic chips + improve button when LLM feature is off

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Landing — short-vs-full caveat per flag

**Files:**
- Modify: `src/ui/landingStrings.ts`
- Modify: `src/ui/landingStrings.test.ts`
- Modify: `src/ui/Landing.tsx`
- Modify: `src/ui/Landing.test.tsx`

A new `caveatShort` field (the no-model wording). Landing reads `useLlmFeature()`
and shows the short caveat when off, the full caveat when on — for en/fr/de/es.
**`ka` is unchanged in both states** (its caveat is about translation maturity,
not the LLM), so Landing always uses `s.caveat` for `ka`; `ka.caveatShort` is
set equal to its caveat only to satisfy the completeness test.

- [ ] **Step 1: Add `caveatShort` to the interface, the strings, and the test's exhaustiveness list**

In `src/ui/landingStrings.ts`, add to `interface LandingCopy` after `caveat`:

```ts
  caveat: string // the optional-model caveat paragraph (shown when the LLM feature is ON)
  caveatShort: string // the no-model caveat (shown when the LLM feature is OFF)
```

Add `caveatShort` to each language block:

```ts
  // en (after its `caveat`):
    caveatShort: 'Commands work in all four languages.',
  // fr:
    caveatShort: 'Les commandes fonctionnent dans les quatre langues.',
  // de:
    caveatShort: 'Befehle funktionieren in allen vier Sprachen.',
  // es:
    caveatShort: 'Los comandos funcionan en los cuatro idiomas.',
```

For `ka`, set `caveatShort` to the same string the `ka.caveat` field holds (the
beta note) — Landing never uses it for `ka`, but the completeness gate requires
it. Add after `ka`'s `caveat`:

```ts
    // ka caveat is about translation maturity, not the LLM — unchanged in both
    // toggle states. caveatShort mirrors it so the completeness gate passes;
    // Landing always renders s.caveat for ka regardless of the flag.
    caveatShort:
      `ქართული თარგმანი ჯერ სატესტოა ${GEORGIAN_STATUS_MARKER} — ზოგი ტექსტი შეიძლება ჯერ კიდევ ` +
      'ინგლისურად გამოჩნდეს. ამ ეტაპზე ბრძანებები ინგლისურად აკრიფეთ.',
```

In `src/ui/landingStrings.test.ts`, add `'caveatShort'` to `SCALAR_KEYS` (the
compile-time `Exhaustive` guard fails `tsc -b` otherwise):

```ts
  'languageLabel',
  'caveat',
  'caveatShort',
  'descent',
```

- [ ] **Step 2: Write the failing Landing test** — replace the existing
  "shows the basic-now / optional-model caveat" test in `src/ui/Landing.test.tsx`
  and add a flag-on test. Also import `LS_KEYS` is already imported.

Replace the existing test (lines ~327-335) with:

```ts
  it('flag OFF (default): shows the SHORT caveat, no model mention', () => {
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(
      screen.getByText(LANDING_STRINGS.en.caveatShort),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Basic commands work now/i)).toBeNull()
    expect(screen.queryByText(/optional, experimental model/i)).toBeNull()
  })

  it('flag ON: shows the full optional-model caveat (en/fr/de/es)', () => {
    localStorage.setItem(LS_KEYS.llm, '1')
    render(
      <Landing onEnter={() => {}} savedSlugs={new Set()} themeToggle={null} />,
    )
    expect(screen.getByText(/Basic commands work now/i)).toBeInTheDocument()
    expect(
      screen.getByText(/optional, experimental model/i),
    ).toBeInTheDocument()
  })
```

(`LANDING_STRINGS` is already imported at the top of `Landing.test.tsx`.)

- [ ] **Step 3: Run it, expect failure**

Run: `npx vitest run src/ui/Landing.test.tsx -t "caveat"`
Expected: FAIL — Landing always renders `s.caveat`; the short-caveat test fails.

- [ ] **Step 4: Wire the flag into Landing** — `src/ui/Landing.tsx`

Add the import near the other UI hooks:

```ts
import { useLlmFeature } from './useLlmFeature'
```

Inside the component, after the existing `s` derivation (around line 87-89), read
the flag and pick the caveat:

```ts
  const [llmEnabled] = useLlmFeature()
  // ka's caveat is about translation maturity, not the LLM — unchanged in both
  // states. en/fr/de/es show the short (no-model) caveat when the feature is off.
  const caveatText =
    exampleLang === 'ka' || llmEnabled ? s.caveat : s.caveatShort
```

Replace the caveat render:

```tsx
        <p className="lang-caveat">{caveatText}</p>
```

- [ ] **Step 5: Run it, expect pass**

Run: `npx vitest run src/ui/Landing.test.tsx`
Expected: PASS (both new caveat tests; the rest unaffected).

- [ ] **Step 6: Run the landingStrings completeness suite + typecheck**

Run: `npx vitest run src/ui/landingStrings.test.ts && npx tsc -b`
Expected: PASS / no type errors (the `Exhaustive` guard now lists `caveatShort`).

- [ ] **Step 7: Commit**

```bash
git add src/ui/landingStrings.ts src/ui/landingStrings.test.ts src/ui/Landing.tsx src/ui/Landing.test.tsx
git commit -m "feat: short landing caveat (no model mention) when LLM feature is off

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: useNaturalLanguage — `effectiveModel` into state + liveRef

**Files:**
- Modify: `src/llm/useNaturalLanguage.ts`
- Modify: `src/llm/useNaturalLanguage.test.tsx`

This is the **single derived value** of the design. The hook accepts `llmEnabled`
(default true). When off, the public `NlState.model` reports `grammar` even if
`internal.model === 'full'` (a cached model promoted it), and the `liveRef` the
input pipeline reads carries a grammar-forced `internal` so `runLine`'s
`grammarOnly` is true — the engine is never reached, never lazy-loads.

- [ ] **Step 1: Write the failing test** — add to `src/llm/useNaturalLanguage.test.tsx`

```ts
describe('effectiveModel (LLM feature hidden)', () => {
  it('off: a cached model still reports grammar in the public state', async () => {
    const { hook } = setup({
      engine: new FakeLlmEngine({ cached: true }),
      llmEnabled: false,
    })
    // Wait for the on-mount cache probe to settle (installed:true).
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    // internal would be on/full (cached), but effectiveModel forces grammar.
    expect(hook.result.current.state).toMatchObject({
      phase: 'on',
      language: 'fr',
      model: 'grammar',
    })
  })

  it('on (default): a cached model reports full (regression)', async () => {
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    expect(hook.result.current.state).toMatchObject({
      phase: 'on',
      language: 'fr',
      model: 'full',
    })
  })

  it('t3: boot with stored fr + cached model + flag off ⇒ fr/grammar, engine never loads', async () => {
    // Returning player: language persisted (LS_KEYS.nlPref === 'loquor.nl'),
    // model cached on disk, feature default off. The on-mount cache-restore would
    // normally promote to on/full; effectiveModel forces grammar, and the engine
    // is never lazy-loaded (the input pipeline never reaches the LLM stage). This
    // is the spec's t3 boot case.
    localStorage.setItem('loquor.nl', JSON.stringify({ language: 'fr' }))
    const engine = new FakeLlmEngine({ cached: true })
    const loadSpy = vi.spyOn(engine, 'load')
    const { hook } = setup({ engine, llmEnabled: false })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'on',
        language: 'fr',
        model: 'grammar',
      }),
    )
    expect(loadSpy).not.toHaveBeenCalled()
  })
})
```

(`vi`/`waitFor`/`act`/`FakeLlmEngine` are already imported in this test file.)

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx -t "effectiveModel"`
Expected: FAIL — `llmEnabled` is ignored; off reports `model: 'full'`, and t3's
`model: 'grammar'` assertion fails.

- [ ] **Step 3: Accept the arg + derive** — `src/llm/useNaturalLanguage.ts`

First add the `Internal` type import (it is **not** currently imported here) —
add to the existing `import { useModelDownload } from './useModelDownload'` line:

```ts
import { useModelDownload } from './useModelDownload'
import type { Internal } from './useModelDownload'
```

Add to `UseNaturalLanguageArgs` (after `gate`):

```ts
  gate?: EngineGate
  /** LLM-feature preference (default true so existing callers/tests are
   * unchanged). When false the effective model is forced to 'grammar' at every
   * read, so the input pipeline never reaches the LLM stage and the engine never
   * lazy-loads — even if a cached model promoted `internal.model` to 'full'. */
  llmEnabled?: boolean
```

Destructure with the default (in the `const { ... } = args` block):

```ts
    gate: gateArg,
    llmEnabled = true,
  } = args
```

In the `state` memo `on` branch, read the effective model and add `llmEnabled` to deps:

```ts
    if (internal.phase === 'on')
      return {
        phase: 'on',
        language: internal.language,
        model: llmEnabled ? internal.model : 'grammar',
        canUpgrade,
      }
    return { phase: 'off', installed, canUpgrade }
  }, [hasVocab, canUpgrade, internal, installed, llmEnabled])
```

Change the `liveRef` sync effect to feed a grammar-forced internal when off (and
carry `llmEnabled` for Task 8's notice gate):

```ts
  const liveRef = useRef<LiveState>({ internal, lex, llmEnabled })
  useEffect(() => {
    // effectiveModel: when the feature is hidden, the live input pipeline must
    // see grammar-only regardless of internal.model (a cached model may say
    // 'full'). Forcing it here makes runLine's grammarOnly true → stage 7 skips
    // the engine → no lazy-load. `llmEnabled` is also carried so stage 8 can
    // suppress the upgrade-pitch notice (Task 8).
    const liveInternal: Internal =
      !llmEnabled && internal.phase === 'on'
        ? { ...internal, model: 'grammar' }
        : internal
    liveRef.current = { internal: liveInternal, lex, llmEnabled }
  })
```

(`Internal` is imported at the top of this task; `LiveState`/`Lex` are already
imported from `translatePipeline` for the existing `liveRef`.)

- [ ] **Step 4: Thread `llmEnabled` through the test `setup` helper**

The `setup` helper already spreads `...over` into the hook args, so passing
`llmEnabled: false` in `over` works once the arg type exists. No helper edit
needed — verify by running.

- [ ] **Step 5: Run it, expect pass**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx`
Expected: PASS (the 2 new tests; all existing default `llmEnabled=true`).

Note: `LiveState` now requires `llmEnabled` — this step will not fully compile
until Task 8 adds the field to `LiveState`. If running standalone before Task 8,
temporarily expect a type error on `liveRef`; otherwise do Task 8 Step 3 first
(add the field) then return here. **Recommended ordering: do Task 8 Step 3 (the
`LiveState` field) immediately before Task 7 Step 3**, so both compile together.

- [ ] **Step 6: Commit** (after Task 8's field exists)

```bash
git add src/llm/useNaturalLanguage.ts src/llm/useNaturalLanguage.test.tsx
git commit -m "feat: effectiveModel — force grammar-only at every read when LLM feature is off

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: translatePipeline — suppress the upgrade pitch when hidden

**Files:**
- Modify: `src/llm/translatePipeline.ts`
- Modify: `src/llm/translatePipeline.test.ts`

**Why this exists (beyond the spec's gate-point list):** the design's north star
is "hide every user-facing LLM trace." With the feature off, a fresh fr/de/es
player in basic mode who types an unparseable line hits the first-abstain
education notice — `grammarOnlyFirstMiss`, which literally says *"add the optional
upgrade for full sentences."* That is an LLM trace on a common path. We carry
`llmEnabled` on `LiveState` and suppress the pitch (fall back to
`couldntTranslate`) when off. `ka` is preserved exactly (its `grammarOnlyFirstMiss`
already has no pitch — see CLAUDE.md `ka` deterministic-coverage).

- [ ] **Step 1: Write the failing test** — add to `src/llm/translatePipeline.test.ts`

Locate the existing first-miss / grammar-only abstain test for guidance (search
the file for `grammarOnlyFirstMiss`), then add a test that drives a grammar-only
non-English abstain with `llmEnabled: false` on the live ref and asserts the
notice is `couldntTranslate('fr')`, not `grammarOnlyFirstMiss('fr')`.

```ts
import { couldntTranslate, grammarOnlyFirstMiss } from './notices'

it('grammar-only abstain with the LLM feature hidden omits the upgrade pitch', async () => {
  // Build the live ref as the grammar-only suite does, but with llmEnabled:false.
  // (Mirror the existing grammar-only test's harness — same vocab/grammar/refs —
  // changing only liveRef.current to { internal: <on/grammar/fr>, lex, llmEnabled:false }.)
  // … run a French line that misses every deterministic stage and abstains …
  expect(setNotice).toHaveBeenLastCalledWith(couldntTranslate('fr'))
  expect(setNotice).not.toHaveBeenCalledWith(grammarOnlyFirstMiss('fr'))
})
```

> Implementer: clone the closest existing grammar-only abstain test in this file
> (it already constructs `liveRef`, `educatedRef`, `setNotice`, vocab, and a
> French line that abstains). The ONLY delta is `llmEnabled: false` in the
> `liveRef.current` object and the two assertions above. Do not invent a new
> harness — reuse the file's existing one verbatim.

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/llm/translatePipeline.test.ts -t "upgrade pitch"`
Expected: FAIL — `LiveState` has no `llmEnabled`; the pitch still fires.

- [ ] **Step 3: Add the field to `LiveState`** — `src/llm/translatePipeline.ts` (line ~169)

```ts
export interface LiveState {
  internal: Internal
  lex: Lex | null
  /** LLM-feature preference (carried from useNaturalLanguage's liveRef). When
   * false, stage 8 omits the upgrade-pitch first-miss notice — hiding the model
   * means hiding its sales pitch (the deterministic floor is the same). */
  llmEnabled: boolean
}
```

- [ ] **Step 4: Gate the pitch in stage 8** — `src/llm/translatePipeline.ts` (line ~967)

Change the condition so the pitch is shown only when the upgrade is actually
reachable (`live.llmEnabled`), while preserving `ka` exactly (its first-miss
notice has no pitch and is the no-LLM language's chosen wording):

```ts
        } else if (
          grammarOnly &&
          !educatedRef.current &&
          (live.llmEnabled || activeLang === 'ka')
        ) {
          // First grammar-only abstain this stint: connect the miss to the
          // declined/absent upgrade at the moment of confusion (once per stint).
          // Suppressed when the LLM feature is HIDDEN (no upgrade to pitch) —
          // except ka, whose first-miss notice carries no pitch anyway and stays
          // the no-LLM language's chosen Georgian wording (CLAUDE.md ka rule).
          educatedRef.current = true
          setNotice(grammarOnlyFirstMiss(activeLang))
        } else {
          setNotice(couldntTranslate(activeLang))
        }
```

(`live` is the `liveRef.current` snapshot already read at the top of `runLine`
as `const live = liveRef.current`; confirm it's in scope at this point — it is,
within the same function.)

- [ ] **Step 5: Run it, expect pass**

**Before running, make these three required edits** — `LiveState.llmEnabled` is
now non-optional, and the test file builds `liveRef` literals inline that would
otherwise (a) fail `tsc -b` (missing property) and (b) suppress the fr pitch the
existing `:709` assertion expects. Add `llmEnabled: true` to each:

- `src/llm/translatePipeline.test.ts:397` — the **shared helper**:
  `current: { internal: opts.internalOn, lex: opts.lex ?? null, llmEnabled: true }`.
  This is what keeps the fr first-miss assertion at `:709`
  (`grammarOnlyFirstMiss('fr')`) green — with `llmEnabled: true`, the gate
  `(live.llmEnabled || activeLang === 'ka')` still pitches.
- `src/llm/translatePipeline.test.ts:625` — ka literal:
  `{ current: { internal: internalOn, lex: kaLex, llmEnabled: true } }`.
- `src/llm/translatePipeline.test.ts:867` — ka literal: same addition.

The ka assertions at `:916`/`:934` are unaffected by the gate (the `|| activeLang
=== 'ka'` branch keeps ka behavior identical), and the en assertion at `:766`
(en raw-sends, never pitches) is also unaffected.

Run: `npx vitest run src/llm/translatePipeline.test.ts`
Expected: PASS (new test + all existing, with the three literal edits above).

- [ ] **Step 6: Run the NL hook suite too (LiveState now has the field)**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx src/llm/translatePipeline.test.ts`
Expected: PASS both.

- [ ] **Step 7: Commit**

```bash
git add src/llm/translatePipeline.ts src/llm/translatePipeline.test.ts
git commit -m "feat: suppress the grammar-only upgrade-pitch notice when LLM feature is off

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> If Task 7 was committed separately and failed to compile without this field,
> amend by running Task 7's tests now and committing Task 7 immediately after
> this task.

---

## Task 9: useOutputTranslation — corpus-only when off

**Files:**
- Modify: `src/translate/useOutputTranslation.ts`
- Modify: `src/translate/useOutputTranslation.test.tsx`

`lexLang` (the subset of the active language that has an LLM fallback) becomes
`null` when `llmEnabled` is false — so the output stays corpus-only: a live miss
degrades to English, no shimmer/`pending` UI. (Note: an fr/de/es **live** miss
with `lexLang=null` hits `if (!resolver) continue` at `useOutputTranslation.ts:313`
and is **not** logged — only `ka`/corpus-only misses and resolver-driven branches
log; this is fine, no test asserts logging here.) This is defense-in-depth (with
the input path suppressed the engine never loads anyway), but it covers the
toggle-off-mid-session-with-engine-already-loaded case (t1).

- [ ] **Step 1: Write the failing test** — `src/translate/useOutputTranslation.test.tsx`

Add `llmEnabled` to the `setup` helper opts and thread it:

```ts
function setup(opts: {
  language?: NlLanguage
  engine?: FakeLlmEngine
  initial: ViewState
  watchdogMs?: number
  echoMap?: ReadonlyMap<string, string>
  llmEnabled?: boolean
}) {
```

…and in the `useOutputTranslation({ … })` call inside `renderHook`, add:

```ts
        echoMap: em === undefined ? opts.echoMap : em,
        llmEnabled: opts.llmEnabled ?? true,
```

Then add the test (model loaded, flag off ⇒ corpus-only, no shimmer):

```ts
describe('LLM feature off ⇒ corpus-only (t1)', () => {
  it('a live miss stays English with no shimmer when llmEnabled is false', async () => {
    // A French line not in the corpus would normally get the LLM fallback once
    // the engine is loaded; with the feature off it must stay English (no
    // pending/shimmer line, no overlay entry).
    const engine = new FakeLlmEngine({ cached: true, default: 'fallback-fr' })
    await engine.load(() => {}, new AbortController().signal) // engine.isLoaded() === true
    const v = view([line('output', 'A brand new uncovered sentence.')])
    const { result } = setup({
      language: 'fr',
      engine,
      initial: v,
      llmEnabled: false,
    })
    // No line is marked pending (no shimmer), and the text is unchanged English.
    expect(result.current.lines.some(l => l.pending)).toBe(false)
    expect(result.current.lines[0].text).toBe('A brand new uncovered sentence.')
  })
})
```

> Implementer: confirm `FakeLlmEngine` supports `{ cached: true }` and that
> `engine.load` resolves so `isLoaded()` is true (it does — see
> `engine.fake.ts`). If the corpus override matches this exact string, change the
> string to one guaranteed absent from the test corpus.

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/translate/useOutputTranslation.test.tsx -t "corpus-only (t1)"`
Expected: FAIL — `llmEnabled` is ignored; the line shimmers / gets a fallback.

- [ ] **Step 3: Implement the gate** — `src/translate/useOutputTranslation.ts`

Add `llmEnabled` to the hook args (default true) and fold it into `lexLang`:

```ts
export function useOutputTranslation(args: {
  view: ViewState
  language: NlLanguage
  signature: string
  engine: LlmEngine
  gate: EngineGate
  corpusOverride?: TranslationCorpus
  watchdogMs?: number
  echoMap?: ReadonlyMap<string, string> | null
  /** LLM-feature preference (default true). When false the LLM output fallback
   * is disabled (lexLang=null) — corpus-only, a miss degrades to English. */
  llmEnabled?: boolean
}): OutputTranslation {
  const { view, language, signature, engine, gate, corpusOverride } = args
  const watchdogMs = args.watchdogMs ?? XLATE_WATCHDOG_MS
  const echoMap = args.echoMap ?? null
  const llmEnabled = args.llmEnabled ?? true
```

Change the `lexLang` derivation (line ~140):

```ts
  // The subset of `lang` that has an LLM fallback (i.e. not corpus-only): used
  // only where a LexLang is structurally required. Null for 'ka' / inactive —
  // and null whenever the LLM feature is hidden (corpus-only, defense-in-depth).
  const lexLang: LexLang | null =
    llmEnabled && lang !== null && !CORPUS_ONLY_LANGS.has(lang)
      ? (lang as LexLang)
      : null
```

Add `llmEnabled` to the async-fallback effect's dependency array (line ~373) so
toggling off mid-session re-runs the scan with the resolver disabled:

```ts
  }, [view, corpus, lang, lexLang, signature, engine, gate, watchdogMs])
```

(`lexLang` is already a dep and now changes with `llmEnabled`, so the effect
re-runs — no new dep strictly required. Verify `react-hooks/exhaustive-deps`
stays clean; `llmEnabled` only influences the already-listed `lexLang`.)

- [ ] **Step 4: Run it, expect pass**

Run: `npx vitest run src/translate/useOutputTranslation.test.tsx`
Expected: PASS (new t1 test; existing default `llmEnabled=true`, unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/translate/useOutputTranslation.ts src/translate/useOutputTranslation.test.tsx
git commit -m "feat: output translation stays corpus-only when LLM feature is off (t1)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Terminal — own the hook, thread it, gate the modal

**Files:**
- Modify: `src/ui/Terminal.tsx`
- Modify: `src/ui/Terminal.test.tsx`

`Terminal` owns `useLlmFeature()` next to `useDebug()` and threads `llmEnabled`
to every consumer wired in Tasks 4-9, plus the prefs modal and the
`ModelDownloadModal` `open` gate. (The live behaviors — abort, M2, announce —
are Task 11.)

- [ ] **Step 1: Write the failing render test** — append to `src/ui/Terminal.test.tsx`

```ts
describe('Terminal — LLM feature default off', () => {
  it('renders the LLM toggle in Preferences (default unchecked) and no model modal', async () => {
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    // Open Preferences via the gear button.
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    const llmBox = screen.getByRole('checkbox', {
      name: PREFS_COPY.en.llmLabel,
    })
    expect(llmBox).not.toBeChecked()
  })
})
```

Add the import at the top of the test file:

```ts
import { PREFS_COPY } from './PreferencesModal'
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "LLM feature default off"`
Expected: FAIL — `PREFS_COPY.en.llmLabel` checkbox isn't wired into Terminal's
PreferencesModal yet.

- [ ] **Step 3: Own the hook + thread it** — `src/ui/Terminal.tsx`

Add the import:

```ts
import { useDebug } from './useDebug'
import { useLlmFeature } from './useLlmFeature'
```

Own the hook next to `useDebug` (around line 149):

```ts
  const [debug, toggleDebug] = useDebug()
  const [llmEnabled, toggleLlm] = useLlmFeature()
  const [prefsOpen, setPrefsOpen] = useState(false)
```

Pass `llmEnabled` to the NL hook (in the `useNaturalLanguage({ … })` call):

```ts
    signature,
    gate,
    llmEnabled,
  })
```

Pass it to the output-translation hook:

```ts
  const xl = useOutputTranslation({
    view,
    language: outLang,
    signature,
    engine: llmEngine,
    gate,
    echoMap,
    llmEnabled,
  })
```

Gate the upgrade-modal visibility (line ~230):

```ts
  // The upgrade/download modal is suppressed for output-only languages AND
  // whenever the LLM feature is hidden (no model to offer).
  const upgradeModalOpen = nl.modalOpen && !outputOnly && llmEnabled
```

Gate the `ModelDownloadModal` `open` prop's downloading clause too (line ~431):

```tsx
      <ModelDownloadModal
        open={
          upgradeModalOpen || (llmEnabled && nl.state.phase === 'downloading')
        }
```

Pass `llmEnabled` to the picker (in the `<NlLanguagePicker … />` inside StatusBar):

```tsx
          <NlLanguagePicker
            state={nl.state}
            onSelect={nl.setLanguage}
            onUpgrade={nl.requestUpgrade}
            hideUpgrade={outputOnly}
            llmEnabled={llmEnabled}
          />
```

Pass it to the BottomBar:

```tsx
      <BottomBar
        debug={debug}
        nlState={nl.state}
        storyTitle={storyTitle}
        signature={signature}
        showBeta={showBetaNotice}
        showNoCorpus={showNoCorpusNotice}
        kaInput={kaActive}
        llmEnabled={llmEnabled}
      />
```

Pass `llmEnabled` + a toggle handler to the PreferencesModal (line ~449). For now
wire a plain `toggleLlm`; Task 11 wraps it to also announce the change:

```tsx
      <PreferencesModal
        open={prefsOpen}
        debug={debug}
        llmEnabled={llmEnabled}
        lang={activeLang}
        onToggleDebug={toggleDebug}
        onToggleLlm={toggleLlm}
        onClose={() => setPrefsOpen(false)}
      />
```

- [ ] **Step 4: Run it, expect pass**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "LLM feature default off"`
Expected: PASS. Also run the full Terminal suite to confirm no regressions:
`npx vitest run src/ui/Terminal.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/Terminal.test.tsx
git commit -m "feat: Terminal owns useLlmFeature and threads it to every model consumer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Terminal — live behaviors (abort, mode-change announce, M2)

**Files:**
- Modify: `src/ui/Terminal.tsx`
- Modify: `src/ui/Terminal.test.tsx`

Three live behaviors: (a) abort an in-flight download when toggled off mid-flight
(t2); (b) announce the mode change via an aria-live region (t4); (c) a one-time
migration notice for a returning opted-in user (M2). All three share one
Terminal-owned, visible **`aria-live="polite"`** region (`llmMsg`) — visible so
the M2 "re-enable in Preferences" guidance is actionable, and `aria-live` so both
messages reach assistive tech. It is **not** `role="status"`: Terminal already
has exactly one `role="status"` region (`Terminal.tsx:306`), and five existing
tests query it singularly (`getByRole('status')`/`findByRole('status')`) — a
second status landmark would break them and re-create the very collision the
ka-region comment at `Terminal.tsx:399-401` was written to avoid. A bare
`aria-live` region announces without claiming the `status` role (same pattern as
the ka announce region at `:412`). The Task 11 tests query by **text**, so they
don't depend on the region's role either way.

> **Deviation note (record in the commit):** the spec's a11y §2 references
> `Terminal.tsx:~413` for M2 delivery — that line is the **ka-only** announce
> region (gated on `outLang==='ka'`), which can't carry an en/fr/de/es migration
> notice. We use a dedicated Terminal-owned region instead; it satisfies the same
> requirement (localized, announced, once) for every language.

- [ ] **Step 1: Write the failing tests** — append to `src/ui/Terminal.test.tsx`

These use the existing `nlOverride` mock seam (top of the file) to place the NL
hook in a downloading state with a spy `cancelDownload`, and mock the engine's
cache probe for M2.

```ts
import { WebLlmEngine } from '../llm/engine.webllm'
import { llmModeChange, llmHiddenMigrationNotice } from '../llm/notices'
import { LS_KEYS } from '../storageKeys'

describe('Terminal — LLM live behaviors', () => {
  afterEach(() => {
    nlOverride = null
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('t4: flipping the toggle on announces the mode change via aria-live', async () => {
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    fireEvent.click(
      screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel }),
    )
    // Default off → toggling makes it ON → "enabled." announcement.
    expect(
      await screen.findByText(llmModeChange('en', true)),
    ).toBeInTheDocument()
  })

  it('t2: toggling off during a download aborts it (cancelDownload called)', async () => {
    const cancelDownload = vi.fn()
    nlOverride = {
      state: {
        phase: 'downloading',
        language: 'fr',
        loaded: 1,
        total: 2,
        etaSeconds: null,
      },
      cancelDownload,
    }
    // Start with the feature ON so a download could be in flight, then toggle off.
    localStorage.setItem(LS_KEYS.llm, '1')
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    fireEvent.click(
      screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel }),
    )
    await waitFor(() => expect(cancelDownload).toHaveBeenCalled())
  })

  it('M2: a cached model + flag off + marker unset shows the one-time notice', async () => {
    vi.spyOn(WebLlmEngine.prototype, 'isCached').mockResolvedValue(true)
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    expect(
      await screen.findByText(llmHiddenMigrationNotice('en')),
    ).toBeInTheDocument()
    expect(localStorage.getItem(LS_KEYS.llmHiddenNoticeSeen)).toBe('1')
  })

  it('M2: not shown when the marker is already set', async () => {
    vi.spyOn(WebLlmEngine.prototype, 'isCached').mockResolvedValue(true)
    localStorage.setItem(LS_KEYS.llmHiddenNoticeSeen, '1')
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    expect(screen.queryByText(llmHiddenMigrationNotice('en'))).toBeNull()
  })

  it('M2: not shown to a user with no cached model', async () => {
    vi.spyOn(WebLlmEngine.prototype, 'isCached').mockResolvedValue(false)
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    expect(screen.queryByText(llmHiddenMigrationNotice('en'))).toBeNull()
  })

  it('t5: rapid toggle on→off→on never strands a download/upgrade modal', async () => {
    // The spec's t5: toggling the feature must not leave a stuck modal or
    // re-trigger an auto-modal. The download/upgrade modal is reached ONLY via a
    // non-cached language pick or the ✦ improve button — toggling does neither —
    // and `upgradeModalOpen` is render-gated on `llmEnabled`. So after a rapid
    // on→off→on the only open dialog is Preferences (no second download dialog).
    render(
      <Terminal
        storyBytes={bytes}
        storyTitle="Zork I"
        onChangeStory={() => {}}
        themeToggle={null}
      />,
    )
    await waitFor(
      () => expect(screen.getAllByText('West of House')[0]).toBeInTheDocument(),
      { timeout: 8000 },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }))
    const box = screen.getByRole('checkbox', { name: PREFS_COPY.en.llmLabel })
    fireEvent.click(box) // on
    fireEvent.click(box) // off
    fireEvent.click(box) // on
    // Only the Preferences dialog is open — the ModelDownloadModal renders
    // nothing when closed, so no download dialog is stacked behind it.
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })
})
```

(Ensure `afterEach`/`vi`/`waitFor` are imported — they already are in this file;
add `afterEach` to the vitest import if missing. The t5 test reuses the
already-imported `PREFS_COPY`.)

> **t5 scope note:** this covers the drivable, highest-value part of the spec's
> t5 — toggling never strands or re-triggers the modal. The full
> declined-flag-suppresses-the-auto-modal interaction (which needs a real
> non-cached language pick + download round-trip) is unit-covered by
> `useModelDownload`'s existing `declined` test plus the render-gating verified
> here; jsdom can't drive a real WebLLM download.

> **Pristine-output watch (CLAUDE.md):** the positive M2 test settles its
> `setLlmMsg` inside `await screen.findByText(...)` (RTL wraps it in `act`). The
> two **negative** M2 tests assert *absence* after `await waitFor('West of
> House')` — which flushes the `useModelDownload` cache probe — and their M2 paths
> never call `setLlmMsg` (marker-set returns before `isCached`; not-cached resolves
> to `false` and returns), so there is no post-resolve `setState` to leak an
> `act(...)` warning. If one nonetheless appears, add
> `await waitFor(() => expect(WebLlmEngine.prototype.isCached).toHaveBeenCalled())`
> before the absence assertion to flush the M2 promise chain.

- [ ] **Step 2: Run them, expect failure**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "LLM live behaviors"`
Expected: FAIL — no announce region, no abort effect, no M2 effect.

- [ ] **Step 3: Implement in Terminal** — `src/ui/Terminal.tsx`

Add imports:

```ts
import { llmModeChange, llmHiddenMigrationNotice } from '../llm/notices'
import { readNlPref } from '../llm/nlpref'
import { LS_KEYS } from '../storageKeys'
import type { ActiveLanguage } from '../llm/types'
```

(`OUTPUT_ONLY_LANGS` is already imported from `../llm/types`; add `ActiveLanguage`
to that import or a new `import type` line.)

Add the message state next to the other Terminal state (after `restore`):

```ts
  // One Terminal-owned, visible aria-live region for LLM-feature events: the M2
  // migration notice (actionable → visible) and the live mode-change
  // announcement. Carries its own lang so a screen reader voices it correctly.
  const [llmMsg, setLlmMsg] = useState<{
    text: string
    lang: ActiveLanguage
  } | null>(null)
```

Wrap the prefs toggle to also announce (replace the `onToggleLlm={toggleLlm}`
from Task 10):

```tsx
        onToggleLlm={() => {
          const next = !llmEnabled
          toggleLlm()
          setLlmMsg({ text: llmModeChange(activeLang, next), lang: activeLang })
        }}
```

Add the abort effect (after the existing effects, e.g. after the `view.inputRequest`
char-ack effect):

```ts
  // Turn-off mid-download: a load in flight would otherwise resolve into on/full
  // AFTER the user hid the feature. cancelDownload aborts it and settles to
  // on/grammar. (downloads can't START while off — the modal is gated — so this
  // only fires for an in-flight load at the moment of toggle-off.)
  useEffect(() => {
    if (!llmEnabled && nl.state.phase === 'downloading') nl.cancelDownload()
  }, [llmEnabled, nl.state.phase, nl.cancelDownload])
```

Add the M2 mount effect (one-time):

```ts
  // M2: a returning user whose model was cached before this feature shipped would
  // find it silently gone. Show a one-time notice (model weights stay on disk).
  // Trigger: feature off + a cached model + marker unset. Localized to the stored
  // language (read synchronously so the notice isn't English before the async
  // cache-restore resolves the active language). Mount-only.
  useEffect(() => {
    if (llmEnabled) return
    try {
      if (localStorage.getItem(LS_KEYS.llmHiddenNoticeSeen) === '1') return
    } catch {
      return
    }
    let cancelled = false
    void llmEngine
      .isCached()
      .then(cached => {
        if (cancelled || !cached) return
        const pref = readNlPref().language
        const lang: ActiveLanguage = pref === 'off' ? 'en' : pref
        setLlmMsg({ text: llmHiddenMigrationNotice(lang), lang })
        try {
          localStorage.setItem(LS_KEYS.llmHiddenNoticeSeen, '1')
        } catch {
          // best-effort marker — if storage is blocked the notice may recur,
          // which is benign (it never blocks play).
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // Mount-only one-time migration check (llmEngine is stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

Render the region (add right after `<BottomBar … />`):

```tsx
      {/* LLM-feature live region (M2 migration notice + mode-change). Always
          mounted so the live region is registered before content appears;
          visible so M2's "re-enable in Preferences" guidance is actionable.
          A BARE aria-live region — deliberately NOT role="status": Terminal
          already has one role="status" region (the nl-status at the transcript),
          and the existing tests + the ka-region comment (Terminal.tsx ~399-401)
          rely on there being exactly ONE status landmark. A second role="status"
          would break the five getByRole('status')/findByRole('status') queries in
          Terminal.test.tsx. aria-live="polite" alone still announces (same pattern
          as the ka announce region). */}
      <div
        aria-live="polite"
        className="nl-notice"
        lang={llmMsg?.lang}
      >
        {llmMsg?.text}
      </div>
```

- [ ] **Step 4: Run them, expect pass**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "LLM live behaviors"`
Expected: PASS (t4, t2, and the three M2 cases).

- [ ] **Step 5: Run the full Terminal suite**

Run: `npx vitest run src/ui/Terminal.test.tsx`
Expected: PASS (no regressions in the existing Terminal tests).

- [ ] **Step 6: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/Terminal.test.tsx
git commit -m "feat: live LLM-feature behaviors — download abort, mode-change announce, M2 notice

Deviation: M2 uses a dedicated Terminal-owned aria-live region (the spec's
~413 reference is the ka-only region, which can't carry a multilingual notice).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: full-suite verification + manual responsive/a11y checklist

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite + lint + typecheck**

Run: `make all`
Expected: lint clean, format clean, `tsc -b` clean, all tests pass. In particular
confirm no stray `console.error`/`console.warn` (pristine-output rule) and no
`act(...)` warnings from the new Terminal effects.

- [ ] **Step 2: Manual responsive check (no automated guard — CLAUDE.md)**

There's no Playwright; the new prefs row + the visible LLM-notice region (a
`.nl-notice` `aria-live` div placed after `<BottomBar>`) are the only layout
additions. Manually verify at 320 / 375 / 520px and a short landscape window,
**both themes**, that:
- the new Preferences row wraps/stacks like the debug row (no overflow);
- the LLM-notice region (when populated by M2) doesn't push the input off-screen
  — it reuses the existing `.nl-notice` style, so no new CSS is added.
If `src/ui/landing.css` / `src/ui/components.css` were not touched, the existing
scroll-safe overlay rules are unaffected — but eyeball the prefs modal at 320px.

- [ ] **Step 3: Manual smoke (the live paths jsdom can't fully exercise)**

In `make dev`:
- Default (off): pick French → no download modal, no improve button, no
  installed/basic chips, short landing caveat, bottom-bar readout shows just
  "saisie — Zork I". Type unparseable French → abstain notice with **no** upgrade
  pitch.
- Toggle on in Preferences → improve button + basic chip reappear; the picker's
  `✦ improve` opens the modal; full caveat on a fresh landing.
- Toggle off while a download is mid-flight → it aborts, chip/modal vanish, state
  doesn't complete to full.

- [ ] **Step 4: Commit (if any lint/format fixups were applied)**

```bash
git add -A
git commit -m "chore: lint/format fixups for hide-LLM-fallback

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (done while writing — recorded for the implementer)

**Spec coverage:**
- *The single lever / `loquor.llm` / `useLlmFeature`* → Task 1.
- *Behavior off: download modal never opens, improve/chips hidden, basic markers
  gone, short caveat, engine never lazy-loads* → Tasks 5 (chips/improve), 4
  (summary tier), 6 (caveat), 7 (effectiveModel → no LLM stage → no lazy-load),
  10 (modal `open` gate).
- *Cached models (effectiveModel dominates reads)* → Task 7 (state + liveRef).
- *Output corpus-only (defense-in-depth, t1)* → Task 9.
- *Live application: derivation is free; downloading needs an imperative abort* →
  Task 11 (abort effect).
- *Turn-on: affordances reappear; no surprise auto-modal* → render-gated (Tasks
  5/10) + `declined` flag unchanged.
- *A11y: live mode change + migration notice* → Task 11 (aria-live region);
  *toggle accessible name/role/position* → Task 3.
- *M2 one-time migration notice* → Task 11.
- *Multilingual + ka* → Tasks 2/3/6 strings (en/fr/de/es + ka draft); ka left
  functionally alone (no gating of ka-specific paths; ka pitch preserved in Task 8).
- *Pinned strings* → short caveat (Task 6), nlModeSummary off (Task 4), M2 +
  mode-change (Task 2), prefs copy (Task 3).
- *Gate points* → every file in the spec's list has a task; `useModelDownload`
  needs **no** per-write gating (derivation dominates) — correctly untouched.
- *Tests t1-t5, M2, multilingual* → t1 (Task 9), t2/t4/M2 (Task 11), the
  static/render cases (Tasks 3-7). **t3** (boot with `loquor.nl={language:'fr'}` +
  cached model + flag off ⇒ fr/grammar, never full, **engine never loads**) is an
  **explicit test** in Task 7 (asserts `model: 'grammar'` after the cache-restore
  AND `engine.load` is never called via a spy). **t5** (rapid off→on→off) is an
  **explicit test** in Task 11 (asserts toggling never strands/re-triggers the
  download modal — only Preferences stays open); the deeper declined-flag
  interaction is unit-covered by `useModelDownload`'s existing `declined` test plus
  the render-gating (jsdom can't drive a real WebLLM download). *[Both made
  explicit per the 2026-06-25 alignment pass.]*

**Type consistency:** `llmEnabled` is the prop/arg name everywhere
(`useLlmFeature`, `useNaturalLanguage`, `useOutputTranslation`, `NlLanguagePicker`,
`BottomBar`, `nlModeSummary`, `PreferencesModal`, `Terminal`). `LiveState` gains
`llmEnabled` (Task 8) which Task 7 writes — **ordering caveat flagged in Task 7/8**:
add the `LiveState` field (Task 8 Step 3) before compiling Task 7 Step 3. Notice
functions: `llmModeChange(lang, enabled)`, `llmHiddenMigrationNotice(lang)`.
Storage keys: `LS_KEYS.llm`, `LS_KEYS.llmHiddenNoticeSeen`.

**Task 8 (upgrade-pitch suppression) — ratified into the spec (2026-06-25
alignment pass):** originally beyond the spec's literal gate points, now an
explicit requirement under the spec's *Behavior when off* (with a
`translatePipeline.ts` gate point), because `grammarOnlyFirstMiss` ("add the
optional upgrade") is a common-path user-facing LLM trace. Kept minimal (one
`LiveState` field + one condition), `ka` preserved exactly via `(live.llmEnabled
|| activeLang === 'ka')`.

**M2 delivery channel — ratified (2026-06-25 alignment pass):** the spec's a11y §2
+ M2 *Delivery* now describe a dedicated Terminal-owned `aria-live` region (Task
11), correcting the prior `Terminal.tsx:~413` reference (that line is the
`ka`-only announce region and cannot carry a multilingual notice).
