# Loquor landing-page localization — design

**Date:** 2026-06-17
**Status:** approved (design); plan to follow

## Problem

The title screen (`src/ui/Landing.tsx`) hardcodes all its copy in English.
Choosing a language (Français / Deutsch / Español) currently switches **only**
the command examples (`landingExamples.ts`); everything else — the "How to
play" block, the progress note, the `Language:` label, the model caveat,
`— choose your descent —`, the volume subtitles, `Light the lamp →`, the resume
line, and the legal footer — stays in English.

This hurts exactly the player it should help most: a French/German/Spanish
speaker picks their language at the onboarding moment and is told, in English,
how to play. If they don't read English well, they can't follow the
instructions. That is a player-experience bug, not a polish item.

## Scope

Localize **everything readable on the landing page except the title**, for the
four play languages (EN/FR/DE/ES):

- **Translated:** How-to title + body, the progress note, the `Language:`
  label, the model caveat, `— choose your descent —`, the three volume
  subtitles, the `Light the lamp →` button, the resume line, and the legal
  footer (Zork trademark + MIT-license sentence, **visible text only**).
- **Not translated (by decision):** the `Loquor` wordmark and its Latin-ish
  tagline (`to speak, and be understood, in the dark`) — brand/identity.
- **Never translated:** the footer link `href`s, and any `Off` handling
  (the landing never shows `off`; it maps to `en` as today).

Out of scope: the in-game UI (status bar, pickers, modals, transcript), which
is a separate surface; output translation (`src/translate/`); any new language.

## Approach (chosen)

**Static per-language string table**, mirroring `landingExamples.ts`. No new
dependency, no i18n framework, no LLM. The landing renders before the engine
boots and before any model download, so translations must be static,
hand-authored, deterministic, and fully offline — consistent with the
no-CDN/offline promise and with the existing examples pattern.

Rejected alternatives:

- **i18n library (react-i18next / FormatJS):** a provider + JSON catalogs +
  a new dependency for ~10 strings on one screen. Over-engineered; nothing
  else in the app is internationalized this way.
- **Reuse `src/translate/` corpus machinery:** wrong layer — that pipeline
  translates *game output* keyed by Zork strings with an LLM fallback. Landing
  chrome is static UI text shown before the engine exists.

## Components

### `src/ui/landingStrings.ts` (new)

```ts
export interface LandingCopy {
  howToTitle: string      // "How to play."
  howToBody: string       // "Type what you want to do in plain language."
  progressNote: string    // "Your progress is kept; close the tab and return…"
  languageLabel: string   // "Language:"
  caveat: string          // the model-upgrade caveat paragraph
  descent: string         // "— choose your descent —"
  enter: string           // "Light the lamp →"
  resume: string          // "↩ a saved descent awaits — you will resume…"
  // Footer split so the two <a> links stay live; only visible text is per-language.
  footer: {
    trademark: string     // "Zork is a trademark of Activision Publishing, Inc., a Microsoft company."
    licenseLinkText: string // "The Zork I–III game code was released by Microsoft under the MIT License in 2025."
    githubLinkText: string  // "View on GitHub"
  }
  // Per-game volume subtitles, replacing the English-only g.subtitle on the landing.
  subtitles: Record<Game['slug'], string>
}

export const LANDING_STRINGS: Record<ActiveLanguage, LandingCopy>
```

- Keyed by `ActiveLanguage` (`'en' | 'fr' | 'de' | 'es'`) — the same four
  the examples table uses.
- The English entry is the current literal copy verbatim (no behavior change
  for English players).
- Volume subtitles move here keyed by `Game['slug']` so the landing reads a
  localized subtitle. `catalog`'s `g.subtitle` stays as the English/canonical
  source; the landing simply prefers the localized table.

### `src/ui/Landing.tsx` (edit)

- `const s = LANDING_STRINGS[exampleLang]` — reuse the existing `exampleLang`
  computation (which already maps `off`/`en` → `en`).
- Replace each hardcoded literal with `s.<key>`.
- Volume buttons render `s.subtitles[g.slug]` instead of `g.subtitle`.
- Footer renders `s.footer.trademark`, then the `<a>` with
  `s.footer.licenseLinkText`, then the `<a>` with `s.footer.githubLinkText` —
  same `href`s as today.
- Add `lang={exampleLang}` to the plate (or the localized text container) so a
  screen reader voices the right pronunciation. The existing
  `aria-live="polite"` region keeps announcing example changes; the broader
  instruction text re-rendering on language switch is the desired behavior.

## Data flow

Unchanged from today: the picker sets `language` state → `exampleLang` derives
the active table key → render reads `LANDING_STRINGS[exampleLang]` (and
`LANDING_EXAMPLES[exampleLang]`). No async, no engine, no model. Switching the
picker re-renders the whole plate in the new language synchronously.

## Accessibility

- All controls keep their current roles/names; only their **text** changes
  per language. The `Language:` label, the radiogroup label
  (`— choose your descent —`), and the enter button stay semantic elements.
- `lang` attribute on the localized container so assistive tech switches
  pronunciation with the content.
- The footer links remain real `<a>` elements with accessible text; the
  `aria-label` on the dismiss/return control (overlay mode) is also localized.
- A11y tests assert localized accessible names (e.g. the German enter button is
  found by its German name), per the project's a11y-test requirement.

## Testing

- **`landingStrings.test.ts`** — for every `ActiveLanguage`: every `LandingCopy`
  key is present and non-empty; `subtitles` covers every `Game['slug']`; the
  footer has all three text segments. A missing/empty translation fails the
  suite (never ships half-English).
- **`Landing.test.tsx`** — add cases: rendering with `de` (and at least one
  other non-English) shows the localized how-to body, the localized enter
  button (by accessible name), and the localized volume subtitle; rendering
  with `en` is unchanged from current snapshots/queries.

## Risks / follow-ups (handled in implementation, not blocking design)

- **Layout reflow:** German/French copy runs longer and may reflow the plate.
  Eyeball after wiring; tighten `landing.css` only if it actually breaks.
  No layout redesign planned.
- **Translation quality:** governed by the multilingual-consistency rule — a
  wording fix in one language prompts a check of the other three. Initial
  translations are hand-authored; refinements are normal follow-up.
