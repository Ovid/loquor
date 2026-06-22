# Georgian-mode bottom status bar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate the Georgian (`ka`) output-only mode notices out of the inline command flow into a new, quieter bottom status bar — dropping the *beta* notice's English half, keeping the *no-corpus* notice bilingual, and making the type-English/`help` tip permanent-but-quiet with a one-shot screen-reader announcement on entry.

**Architecture:** Display-layer only. A new `GeorgianStatusBar` (`<footer>`) renders after `<main>` inside `.screen.term`, gated on `outLang === 'ka'`, pinned to the bottom by the existing flex column (no `position: fixed`). The persistent visible tip text lives in that static footer; the *one-shot* "type in English" announcement keeps riding the existing `makeActivationNotice` once-per-language latch but is re-routed from the inline `nl.notice` channel into a new dedicated `nl.announce` polite live region, so it can't be clobbered by a `help` reply. No engine, pipeline, or non-`ka` behavior changes.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react (jsdom), CSS (`src/ui/components.css`), no new dependencies.

---

## Background the engineer needs

- **`ka` is OUTPUT-ONLY (Phase 1).** It has a display corpus but **no input lexicon and no input LLM** — the command field raw-sends English. Do **not** add `ka` to any input path. (CLAUDE.md.)
- **Two notices, NOT symmetric (Decision 1 in the spec):**
  - **Beta notice** fires when the screen IS Georgian (this game has a `ka` corpus). It becomes **Georgian-only** — drop the English half.
  - **No-corpus notice** fires when Georgian was picked but THIS game has **no `ka` corpus** (Zork II/III), so the screen has fallen back to **English**. It **stays bilingual** (`lang="ka"` + `lang="en"`) — telling an English-reading player *only in Georgian* that the game is in English is self-defeating, and wrapping an all-English notice in `lang="ka"` makes a screen reader mispronounce it (WCAG 3.1.2).
- **The latch is load-bearing.** `makeActivationNotice()` (`src/llm/notices.ts`) returns the activation nudge the FIRST time a language is activated, then `null` — this is the tested mechanism guarding against the re-announce bug that commit `3ac3508` fixed. **Reuse it; do not rebuild "fire once".** We only change WHERE its `ka` output lands (a new `announce` channel instead of `notice`).
- **Today's `ka` behavior we are MOVING (not deleting):** `Terminal.tsx` renders the beta + no-corpus notices inline in the `role="status"` region; the activation tip rides the latch into `nl.notice` (also inline). After this plan: beta+tip live in the footer (visible), no-corpus lives in the footer (bilingual), and the tip's one-shot announcement rides the latch into the new dedicated `announce` live region. The inline `nl.notice` region for `ka` then carries only `help` replies.

## File map

- **Modify** `src/llm/notices.ts` — export the Georgian tip as a shared const so the footer (visible) and the latch (announcement) can't drift.
- **Modify** `src/llm/notices.test.ts` — assert the const is the source of the `ka` latch output.
- **Modify** `src/llm/useNaturalLanguage.ts` — add the `announce` channel; route the `ka` (output-only) activation tip to `announce`, all others stay on `notice`.
- **Modify** `src/llm/useNaturalLanguage.test.tsx` — update the existing `ka → en` repro to assert `announce` (not `notice`); add a routing test.
- **Create** `src/ui/GeorgianStatusBar.tsx` — the `<footer>` bottom bar (beta+tip OR bilingual no-corpus).
- **Create** `src/ui/GeorgianStatusBar.test.tsx` — unit tests for the footer's two modes.
- **Modify** `src/ui/components.css` — `.bottombar` base rules + a phone wrap rule in the `@media (max-width: 520px)` block.
- **Modify** `src/ui/Terminal.tsx` — remove the inline beta/no-corpus `<p>` blocks; add the dedicated `announce` live region and the footer.
- **Modify** `src/ui/Terminal.test.tsx` — update the existing beta/no-corpus tests (they now assert the footer, not `role="status"`); add the new bottom-bar tests.

## Conventions (from CLAUDE.md — follow exactly)

- **TDD red→green→refactor**, one small commit per task. End every commit message with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Tests emit only test data** — no stray `console.error`/`console.warn`, no `act(...)` warnings. A test exercising a log path must spy + assert it.
- Run a single test file: `npx vitest run src/path/file.test.tsx`. Full suite: `make test`.
- After the last task: `make all` (lint + format + typecheck + test) must pass.

---

### Task 1: Share the Georgian activation-tip string

The footer's **visible** tip and the **announced** tip must be the same string (Decision 6: reuse the existing approved-draft strings verbatim; no new wording). Extract it to one exported const.

**Files:**
- Modify: `src/llm/notices.ts` (the `ka` case of `escapeHatchOnActivation`, ~line 255-259)
- Test: `src/llm/notices.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside the existing top-level `describe` in `src/llm/notices.test.ts` (and add `GEORGIAN_ACTIVATION_TIP` to the import from `./notices` at the top of the file):

```ts
it('exposes the ka activation tip as the shared GEORGIAN_ACTIVATION_TIP const', () => {
  // The bottom bar renders this string visibly while the latch announces it
  // once — they must be the SAME string so they cannot drift (spec Decision 6).
  const notice = makeActivationNotice()
  expect(notice('ka')).toBe(GEORGIAN_ACTIVATION_TIP)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/llm/notices.test.ts -t "GEORGIAN_ACTIVATION_TIP"`
Expected: FAIL — `GEORGIAN_ACTIVATION_TIP` is not exported (import is `undefined`).

- [ ] **Step 3: Extract the const**

In `src/llm/notices.ts`, add the exported const just above `escapeHatchOnActivation` (keep the existing NATIVE-REVIEW-DRAFT note):

```ts
/** The Georgian (`ka`) activation tip. Output-only: raw-sends English, so the
 * tip says "type commands in English; text appears in Georgian" with NO
 * quoted-escape instruction (quoting is meaningless without an input LLM).
 * Shared by the bottom-bar's persistent visible copy and the one-shot
 * activation announcement so the two can't drift (spec Decision 6).
 * NATIVE-REVIEW-DRAFT (ka §4 case forms). */
export const GEORGIAN_ACTIVATION_TIP =
  'რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს. დახმარებისთვის აკრიფეთ help.'
```

Then replace the `ka` case body in `escapeHatchOnActivation` so it returns the const:

```ts
    case 'ka':
      return GEORGIAN_ACTIVATION_TIP
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/llm/notices.test.ts`
Expected: PASS — the new test plus all existing `ka` tests (line 62 "tells ka to type in English…") stay green (behavior is unchanged; only the literal moved to a const).

- [ ] **Step 5: Commit**

```bash
git add src/llm/notices.ts src/llm/notices.test.ts
git commit -m "refactor(notices): share Georgian activation tip as a const"
```

---

### Task 2: Add the dedicated `announce` channel to the NL hook

The `ka` activation tip must stop landing in the inline `notice` channel (where a `help` reply clobbers it — finding [6]) and instead drive a new `announce` channel. The latch is unchanged; only the destination differs, and only for output-only (`ka`) languages.

**Files:**
- Modify: `src/llm/useNaturalLanguage.ts` (imports; `notice` state area ~line 119; interface ~line 53-81; activation effect ~line 204-220; return ~line 364-379)
- Test: `src/llm/useNaturalLanguage.test.tsx` (update the existing `ka → en` repro ~line 505-521; add a routing test)

- [ ] **Step 1: Update the existing `ka → en` repro test (it now asserts `announce`)**

In `src/llm/useNaturalLanguage.test.tsx`, replace the body of the existing test
`it('clears the Georgian activation tip when switching ka → en (reported repro)', …)`
(currently ~line 505-521) with this. The `ka` tip now rides `announce`, so the inline `notice` is never polluted in the first place — a stronger guarantee than the old "clear it on switch":

```ts
  it('routes the Georgian activation tip to announce, not the inline notice (reported repro)', async () => {
    // ka is OUTPUT-ONLY (no modal, no input LLM). Its "რჩევა: …" activation tip
    // must NOT land in the inline `notice` channel — there a `help` reply would
    // clobber it (spec finding [6]). It rides the new dedicated `announce`
    // channel instead, so the inline notice stays clean for help/abstain.
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('ka'))
    await waitFor(() =>
      expect(hook.result.current.announce).toMatch(/^რჩევა/),
    )
    // The inline notice channel was never written for ka's tip.
    expect(hook.result.current.notice).toBeNull()
    // Switching away never strands the tip in the inline notice region (the
    // original repro): the tip lives only on `announce`, so `notice` stays
    // null across the switch. `announce` is a once-per-session latch (matching
    // the 3ac3508 contract) — it is NOT cleared on switch and NOT re-announced
    // on a later re-entry; the ka-gated live region simply unmounts, so a stale
    // value can never surface under English. We assert the inline channel only.
    act(() => hook.result.current.setLanguage('en'))
    expect(hook.result.current.notice).toBeNull()
  })
```

- [ ] **Step 2: Add a routing test for a non-output-only language (regression guard)**

Add this test next to the one above, to pin that fr/de/es activation nudges keep using `notice` (NOT `announce`):

```ts
  it('keeps the fr activation nudge on the inline notice channel (not announce)', async () => {
    // Input languages (fr/de/es) keep their one-time nudge inline — only the
    // output-only ka tip moves to the dedicated announce region.
    const { hook } = setup({ engine: new FakeLlmEngine({ cached: true }) })
    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        phase: 'off',
        installed: true,
      }),
    )
    act(() => hook.result.current.setLanguage('fr'))
    await waitFor(() => expect(hook.result.current.notice).toMatch(/^Astuce/))
    expect(hook.result.current.announce).toBeNull()
  })
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx -t "announce"`
Expected: FAIL — `hook.result.current.announce` is `undefined` (the field does not exist yet).

- [ ] **Step 4: Add the `announce` channel to the hook**

In `src/llm/useNaturalLanguage.ts`:

(a) Add a **value** import of `OUTPUT_ONLY_LANGS` (it is a runtime const, so it cannot go in the existing `import type` block). Add immediately after the `import type { … } from './types'` block (after line 9):

```ts
import { OUTPUT_ONLY_LANGS } from './types'
```

(b) Add `announce` to the `UseNaturalLanguage` interface, just below the `notice` field (~line 56):

```ts
  notice: string | null
  /** A dedicated one-shot, polite live-region message for OUTPUT-ONLY languages
   * (ka): the must-read "type in English" activation tip, announced once on
   * entry via the makeActivationNotice latch. Kept SEPARATE from `notice` so a
   * help/abstain reply in the inline region can't clobber it (spec finding [6]).
   * LIFECYCLE: set once per language per session by the latch; NOT cleared on
   * switch-away and NOT re-announced on re-entry (the 3ac3508 once-per-session
   * contract). Terminal gates the live region on `outLang === 'ka'`, so a stale
   * value can never render under another language. */
  announce: string | null
```

(c) Add the state, just below the `notice` state (~line 119):

```ts
  const [notice, setNotice] = useState<string | null>(null)
  const [announce, setAnnounce] = useState<string | null>(null)
```

(d) In the activation effect (~line 218), replace the final two lines:

```ts
    const msg = activationNoticeRef.current(active)
    if (msg) setNotice(msg)
```

with the routing branch:

```ts
    const msg = activationNoticeRef.current(active)
    // OUTPUT-ONLY languages (ka) route their must-read tip to the dedicated
    // one-shot `announce` live region; input languages keep the inline notice.
    if (msg) {
      if (OUTPUT_ONLY_LANGS.has(active)) setAnnounce(msg)
      else setNotice(msg)
    }
```

(e) Add `announce` to the returned object (~line 367, next to `notice`):

```ts
    state,
    pending,
    notice,
    announce,
    modalOpen,
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/llm/useNaturalLanguage.test.tsx`
Expected: PASS — the two new/updated tests plus all existing ones (the fr "Astuce" and de "Tipp" nudge tests are unaffected; they assert `notice`).

- [ ] **Step 6: Commit**

```bash
git add src/llm/useNaturalLanguage.ts src/llm/useNaturalLanguage.test.tsx
git commit -m "feat(nl): route the Georgian activation tip to a dedicated announce channel"
```

---

### Task 3: Build the `GeorgianStatusBar` footer component

A static `<footer>` (role `contentinfo`) with an explicit `aria-label`. It is **not** a live region (a persistent live region chatters on every re-render — finding [7]). It renders the beta notice (Georgian-only) + the persistent tip, OR the bilingual no-corpus notice.

**Files:**
- Create: `src/ui/GeorgianStatusBar.tsx`
- Create: `src/ui/GeorgianStatusBar.test.tsx`
- Modify: `src/ui/components.css`

- [ ] **Step 1: Write the failing test**

Create `src/ui/GeorgianStatusBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { GeorgianStatusBar } from './GeorgianStatusBar'
import { GEORGIAN_ACTIVATION_TIP } from '../llm/notices'

describe('GeorgianStatusBar', () => {
  it('beta mode: Georgian-only beta notice + the persistent tip, no English half', () => {
    render(<GeorgianStatusBar showBeta={true} showNoCorpus={false} />)
    const bar = screen.getByRole('contentinfo', {
      name: /Georgian mode information/i,
    })
    // Beta notice, Georgian only (Decision 1) — the English half is GONE.
    const beta = within(bar).getByText(/ქართული თარგმანი ჯერ სატესტოა/)
    expect(beta).toHaveAttribute('lang', 'ka')
    expect(bar).not.toHaveTextContent(/Georgian is a beta translation/)
    // The relocated activation tip is permanent visible content here.
    expect(within(bar).getByText(GEORGIAN_ACTIVATION_TIP)).toHaveAttribute(
      'lang',
      'ka',
    )
    // It is NOT a live region (finding [7]) — persistent content must not chatter.
    expect(bar).not.toHaveAttribute('aria-live')
    // Decorative glyph is hidden from the a11y tree.
    expect(screen.getByText('ⓘ')).toHaveAttribute('aria-hidden', 'true')
  })

  it('no-corpus mode: bilingual notice (ka + en), NO tip', () => {
    render(<GeorgianStatusBar showBeta={false} showNoCorpus={true} />)
    const bar = screen.getByRole('contentinfo', {
      name: /Georgian mode information/i,
    })
    // Stays bilingual (Decision 1): both halves present, each with its own lang.
    expect(
      within(bar).getByText(/ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის/),
    ).toHaveAttribute('lang', 'ka')
    expect(
      within(bar).getByText(/Georgian isn’t available for this story/),
    ).toHaveAttribute('lang', 'en')
    // The display IS English here, so "type in English" is moot — tip omitted.
    expect(bar).not.toHaveTextContent(GEORGIAN_ACTIVATION_TIP)
    // Not the beta notice — the two are mutually exclusive.
    expect(bar).not.toHaveTextContent(/ქართული თარგმანი ჯერ სატესტოა/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/GeorgianStatusBar.test.tsx`
Expected: FAIL — `Cannot find module './GeorgianStatusBar'`.

- [ ] **Step 3: Create the component**

Create `src/ui/GeorgianStatusBar.tsx`:

```tsx
import { GEORGIAN_ACTIVATION_TIP } from '../llm/notices'

/**
 * The Georgian (`ka`) bottom status bar (spec 2026-06-21). A static, labeled
 * `<footer>` (NOT a live region — finding [7]) holding the persistent ka mode
 * info, pinned to the column bottom by `.screen.term`'s flex layout (no
 * position:fixed). Rendered ONLY under ka (the caller gates on outLang === 'ka'
 * and the presence of one of the two notices), so en/fr/de/es pay no layout cost.
 *
 * `showBeta` and `showNoCorpus` are mutually exclusive (the caller derives them
 * from the same corpus check). They are NOT symmetric (spec Decision 1):
 *  - Beta: the screen IS Georgian → Georgian-only notice + the type-English tip.
 *  - No-corpus: the screen fell back to English → bilingual notice, NO tip.
 */
export function GeorgianStatusBar({
  showBeta,
  showNoCorpus,
}: {
  showBeta: boolean
  showNoCorpus: boolean
}) {
  return (
    <footer className="bottombar" aria-label="Georgian mode information">
      <span className="bottombar-icon" aria-hidden="true">
        ⓘ
      </span>
      {showBeta && (
        <>
          {/* Beta notice — Georgian ONLY (Decision 1): the screen is Georgian,
              so a Georgian screen reader voices it correctly and the English
              half is just clutter. SIBLING COPY: landingStrings.ts `ka.caveat`
              is the landing-plate variant of this same beta note — apply any
              wording fix to BOTH so they don't drift (review S4). Both are
              NATIVE-REVIEW-DRAFT (§8). */}
          <span lang="ka">
            ქართული თარგმანი ჯერ სატესტოა — ზოგი ტექსტი შეიძლება ინგლისურად
            გამოჩნდეს.
          </span>
          {/* Relocated activation tip — now PERMANENT visible content (Decision
              3). Its one-shot announcement still rides the latch into Terminal's
              dedicated announce region; this is the always-visible copy. */}
          <span lang="ka">{GEORGIAN_ACTIVATION_TIP}</span>
        </>
      )}
      {showNoCorpus && (
        // No-corpus notice — STAYS bilingual (Decision 1): the screen fell back
        // to English, so each half carries its own lang and a screen reader
        // voices the English with English phonemes, not Georgian (WCAG 3.1.2).
        // NATIVE-REVIEW-DRAFT (§8). No type-English tip — the display is English.
        <span>
          <span lang="ka">
            ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის — თამაში ინგლისურად
            გამოჩნდება.
          </span>{' '}
          <span lang="en">
            Georgian isn’t available for this story yet; it is shown in English.
          </span>
        </span>
      )}
    </footer>
  )
}
```

- [ ] **Step 4: Add the CSS**

In `src/ui/components.css`, add a new block after the StatusBar rules (after the `.meta .sw:focus-visible` block, ~line 110, before the existing later sections). It mirrors `.statusbar` tokens but reads quieter — a **top** border (it sits at the bottom), smaller font, dimmer text:

```css
/* ---------- Georgian bottom status bar (ka only) ---------- */
/* Mirrors .statusbar tokens but reads as quieter ambient chrome: a TOP border
   (it sits at the column's bottom), a smaller font, dimmer text. Pinned to the
   bottom by the .screen.term flex column — NO position:fixed (responsive spec's
   scroll-safe rule). ka-only; absent (not empty) for en/fr/de/es, so <main>
   (flex:1) reclaims the space and there is no layout change for them. */
.bottombar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 3px 12px;
  background: var(--status-grad);
  border-top: 1px solid var(--rule);
  padding: 6px 18px;
  /* --text-dim alone clears WCAG AA (>=4.5:1) in BOTH themes (same basis as
     .nl-thinking) — do NOT add opacity, which dropped the light theme to 3.45:1
     (1.4.3). The smaller font is the "quieter" cue, not reduced contrast. */
  color: var(--text-dim);
  font-size: 0.75rem;
  line-height: 1.4;
  transition: background 0.5s;
}
.bottombar-icon {
  color: var(--brass-soft);
}
```

Then add a phone wrap rule **inside** the existing `@media (max-width: 520px)` block (~line 437-446) — the existing block styles only `.statusbar`/`.meta`, so the bar needs its own (finding [3]). The base `flex-wrap: wrap` already prevents overflow; the media rule just tightens padding so the always-present strip costs minimal play area on a phone:

```css
  .bottombar {
    padding: 5px 12px;
    row-gap: 3px;
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/ui/GeorgianStatusBar.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 6: Commit**

```bash
git add src/ui/GeorgianStatusBar.tsx src/ui/GeorgianStatusBar.test.tsx src/ui/components.css
git commit -m "feat(ui): add the Georgian-mode bottom status bar component"
```

---

### Task 4: Wire the footer + announce region into Terminal

Remove the inline beta/no-corpus `<p>` blocks from the `role="status"` region; add the dedicated one-shot `announce` live region and the footer. Update the existing Terminal tests that asserted those notices in `role="status"` (they now live in the footer), and add the new bottom-bar integration tests.

**Files:**
- Modify: `src/ui/Terminal.tsx` (import; inline notice blocks ~line 279-313; new region + footer ~after line 384)
- Modify: `src/ui/Terminal.test.tsx` (update ~line 486-615; add new tests)

- [ ] **Step 1: Update the existing Terminal tests to the new structure (write them red first)**

In `src/ui/Terminal.test.tsx`, inside `describe('Georgian beta notice (spec §5)', …)` (~line 486):

(a) Replace the body of `it('announces a bilingual beta notice on first Georgian activation', …)` (~line 487-524) — the notice is now Georgian-only in the footer, and the tip is present. Rename and rewrite:

```tsx
    it('shows a Georgian-only beta notice + the tip in the bottom bar (no English half)', async () => {
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
      }
      try {
        render(
          <Terminal
            storyBytes={bytes}
            storyTitle="Zork I"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        // The footer surfaces once the signature resolves and the corpus is
        // consulted at boot — wait for the Georgian beta text.
        const ka = await screen.findByText(
          /ქართული თარგმანი ჯერ სატესტოა/,
          {},
          { timeout: 8000 },
        )
        expect(ka).toHaveAttribute('lang', 'ka')
        const bar = screen.getByRole('contentinfo', {
          name: /Georgian mode information/i,
        })
        expect(bar).toContainElement(ka)
        // Decision 1: the English half is GONE from the beta notice.
        expect(bar).not.toHaveTextContent(/Georgian is a beta translation/)
        // The relocated tip is permanent visible content in the bar.
        expect(bar).toHaveTextContent(/რჩევა: ბრძანებები აკრიფეთ ინგლისურად/)
      } finally {
        nlOverride = null
      }
    })
```

(b) Replace the body of `it('does not show the beta notice for French', …)` (~line 526-544) — French must have **no footer at all** (Decision 5 / testing item 3):

```tsx
    it('renders no bottom bar for French', async () => {
      nlOverride = {
        state: { phase: 'on', language: 'fr', model: 'full', canUpgrade: true },
      }
      try {
        render(
          <Terminal
            storyBytes={bytes}
            storyTitle="Zork I"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        // Wait for boot output so the corpus/signature has resolved.
        await waitFor(
          () => expect(screen.getByRole('log')).toHaveTextContent(/\S/),
          { timeout: 8000 },
        )
        expect(
          screen.queryByRole('contentinfo', {
            name: /Georgian mode information/i,
          }),
        ).toBeNull()
      } finally {
        nlOverride = null
      }
    })
```

(c) The test `it('suppresses the beta notice when the game has no Georgian corpus (review S5)', …)` (~line 546-578) still asserts the beta Georgian text is absent on Zork II — that remains true (Zork II shows the no-corpus notice instead). **Leave it unchanged.**

(d) Replace the body of `it('shows a bilingual "no Georgian for this story" cue on a corpus-less game ([I4])', …)` (~line 580-615) so it asserts the bilingual cue lives in the footer and there is NO tip:

```tsx
    it('shows the bilingual no-corpus cue in the bottom bar, with no tip ([I4])', async () => {
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      nlOverride = {
        state: {
          phase: 'on',
          language: 'ka',
          model: 'grammar',
          canUpgrade: true,
        },
      }
      try {
        render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        const ka = await screen.findByText(
          /ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის/,
          {},
          { timeout: 8000 },
        )
        expect(ka).toHaveAttribute('lang', 'ka')
        const bar = screen.getByRole('contentinfo', {
          name: /Georgian mode information/i,
        })
        expect(bar).toContainElement(ka)
        // Stays bilingual (Decision 1).
        const en = within(bar).getByText(
          /Georgian isn’t available for this story/,
        )
        expect(en).toHaveAttribute('lang', 'en')
        // No type-English tip — the display IS English here.
        expect(bar).not.toHaveTextContent(/რჩევა: ბრძანებები აკრიფეთ/)
        // Not the beta notice — mutually exclusive.
        expect(bar).not.toHaveTextContent(/ქართული თარგმანი ჯერ სატესტოა/)
      } finally {
        nlOverride = null
      }
    })
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "Georgian beta notice"`
Expected: FAIL — there is no `contentinfo` footer yet; the beta notice is still bilingual in `role="status"`.

- [ ] **Step 3: Edit Terminal.tsx — import + remove inline blocks + add region & footer**

(a) Add the import near the other `./` UI imports (after line 8, the `ModelDownloadModal` import):

```tsx
import { GeorgianStatusBar } from './GeorgianStatusBar'
```

(b) **Remove** the two inline notice blocks from the `role="status"` region. Delete the `showBetaNotice && (…)` block (current lines 279-297) and the `showNoCorpusNotice && (…)` block (current lines 298-313) **in full**, including their comments. The region keeps only the `nl.pending` thinking line and the `nl.notice` line:

```tsx
          <div role="status" aria-live="polite" className="nl-status">
            {nl.pending && (
              <p className="nl-thinking" lang={nlLang}>
                {thinking(activeLang)}
              </p>
            )}
            {nl.notice && (
              <p className="nl-notice" lang={nlLang}>
                {nl.notice}
              </p>
            )}
          </div>
```

(c) Add the dedicated announce live region and the footer as siblings **after** `</main>` (current line 384) and **before** `<ModelDownloadModal …>` (current line 385):

```tsx
      </main>
      {/* Georgian (ka) mode chrome (spec 2026-06-21). Both are ka-only, so
          en/fr/de/es get no extra DOM and <main> (flex:1) keeps the full height.
          The announce region is a DEDICATED polite live region (NOT role=status,
          to avoid a second status landmark colliding with the inline one, and
          NOT the static footer) for the one-shot "type in English" tip on ka
          entry — finding [6].
          MOUNT vs. CONTENT: the region is mounted whenever ka is active (so the
          live region is REGISTERED while still empty, before content fills on a
          later render — a region that mounts already populated may not announce).
          But its CONTENT is gated on `showBetaNotice` (corpus present): on a
          no-corpus ka game (Zork II/III) the display is ENGLISH, so announcing
          "type in English; text appears in Georgian" would be locally wrong — the
          same reason Decision 1 omits the VISIBLE tip there. The latch fires
          `nl.announce` on ka entry regardless of corpus (it can't see the
          corpus), so the corpus gate lives HERE, mirroring the visible-tip gate.
          lang="ka" voices it in Georgian. */}
      {outLang === 'ka' && (
        <div className="sr-only" aria-live="polite" lang="ka">
          {showBetaNotice ? nl.announce : null}
        </div>
      )}
      {/* The persistent visible bar. Gated additionally on a notice being
          present so it is absent (not an empty strip) during the boot window
          before the signature resolves — preserving the boot-flash guard
          (finding [5]): showNoCorpusNotice already requires signature !== ''. */}
      {outLang === 'ka' && (showBetaNotice || showNoCorpusNotice) && (
        <GeorgianStatusBar
          showBeta={showBetaNotice}
          showNoCorpus={showNoCorpusNotice}
        />
      )}
```

Note: `showBetaNotice` and `showNoCorpusNotice` (Terminal lines 180-190) and `outLang` (line 147) already exist and are unchanged — they keep their `corpusFor(signature, …)` / `signature !== ''` logic, which is what preserves the boot-flash guard.

- [ ] **Step 4: Run the updated tests to verify they pass**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "Georgian beta notice"`
Expected: PASS — all four tests in the block green.

- [ ] **Step 5: Add the new bottom-bar integration tests**

Append a new `describe` block to `src/ui/Terminal.test.tsx` (the file already imports `render, screen, fireEvent, waitFor, within` and `readFileSync`). It covers testing items 4, 5, 6, 7, 8:

```tsx
  describe('Georgian bottom status bar (spec 2026-06-21)', () => {
    const ka = {
      phase: 'on' as const,
      language: 'ka' as const,
      model: 'grammar' as const,
      canUpgrade: true,
    }

    it('fires the one-shot tip in a dedicated live region, not role=status (item 4)', async () => {
      nlOverride = {
        state: ka,
        announce: 'რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს.',
      }
      try {
        render(
          <Terminal
            storyBytes={bytes}
            storyTitle="Zork I"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        const tip = await screen.findByText(
          /^რჩევა: ბრძანებები აკრიფეთ ინგლისურად/,
          {},
          { timeout: 8000 },
        )
        // Dedicated polite live region, Georgian-voiced.
        expect(tip).toHaveAttribute('aria-live', 'polite')
        expect(tip).toHaveAttribute('lang', 'ka')
        // NOT inside the inline role=status region (that carries help/abstain).
        const status = screen.getByRole('status')
        expect(status).not.toContainElement(tip)
        // The static footer is NOT a live region (finding [7]).
        const bar = screen.getByRole('contentinfo', {
          name: /Georgian mode information/i,
        })
        expect(bar).not.toHaveAttribute('aria-live')
      } finally {
        nlOverride = null
      }
    })

    it('keeps transient NL notices inline, not in the bar (item 5)', async () => {
      nlOverride = {
        state: ka,
        notice: 'დახმარება — ბრძანებები აკრიფეთ ინგლისურად.',
      }
      try {
        render(
          <Terminal
            storyBytes={bytes}
            storyTitle="Zork I"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        const notice = await screen.findByText(
          /დახმარება — ბრძანებები აკრიფეთ/,
          {},
          { timeout: 8000 },
        )
        // The help reply lives in the inline role=status region…
        const status = screen.getByRole('status')
        expect(status).toContainElement(notice)
        // …and the activation tip never leaks INTO that inline region (finding
        // [6], both sides): it rides the dedicated announce region, so a help
        // reply and the tip can never co-occupy / clobber each other.
        expect(status).not.toHaveTextContent(/^რჩევა/)
        // …not in the bottom bar.
        const bar = screen.getByRole('contentinfo', {
          name: /Georgian mode information/i,
        })
        expect(bar).not.toContainElement(notice)
      } finally {
        nlOverride = null
      }
    })

    it('suppresses the one-shot tip announcement on a no-corpus ka game (finding [6])', async () => {
      // Zork II has no ka corpus → the display is English. Announcing "type in
      // English; text appears in Georgian" would be locally wrong, so the
      // announce region's content is corpus-gated even though the latch fired
      // nl.announce on ka entry. The bilingual no-corpus footer still shows.
      const zork2 = new Uint8Array(readFileSync('public/games/zork2.z3'))
      nlOverride = {
        state: ka,
        announce: 'რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს.',
      }
      try {
        render(
          <Terminal
            storyBytes={zork2}
            storyTitle="Zork II"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        // Wait for the no-corpus footer to confirm boot + corpus resolution.
        await screen.findByText(
          /ამ ისტორიისთვის ქართული თარგმანი ჯერ არ არის/,
          {},
          { timeout: 8000 },
        )
        // The tip is announced NOWHERE — neither the dedicated region nor the bar.
        expect(screen.queryByText(/^რჩევა: ბრძანებები აკრიფეთ/)).toBeNull()
      } finally {
        nlOverride = null
      }
    })

    it('removes the bar when switching ka → en (item 6)', async () => {
      nlOverride = { state: ka }
      try {
        const { rerender } = render(
          <Terminal
            storyBytes={bytes}
            storyTitle="Zork I"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        await screen.findByRole(
          'contentinfo',
          { name: /Georgian mode information/i },
          { timeout: 8000 },
        )
        // Switch to English: the bar (and its content) must vanish.
        nlOverride = {
          state: { phase: 'on', language: 'en', model: 'full', canUpgrade: true },
        }
        rerender(
          <Terminal
            storyBytes={bytes}
            storyTitle="Zork I"
            onChangeStory={() => {}}
            themeToggle={null}
          />,
        )
        await waitFor(() =>
          expect(
            screen.queryByRole('contentinfo', {
              name: /Georgian mode information/i,
            }),
          ).toBeNull(),
        )
      } finally {
        nlOverride = null
      }
    })
  })
```

- [ ] **Step 6: Run the new tests to verify they pass**

Run: `npx vitest run src/ui/Terminal.test.tsx -t "Georgian bottom status bar"`
Expected: PASS — all three tests green.

> Boot-flash guard (item 7) and the mid-session story switch (item 8) are already exercised by the existing `corpusFor`/`signature` logic and the Zork II suppression test (Task 4 Step 1c, unchanged) plus the no-corpus test (Step 1d): the bar's render is gated on `showBetaNotice || showNoCorpusNotice`, both of which require a resolved signature, so nothing renders during boot. No additional test is needed beyond those — they assert the same code path.

- [ ] **Step 7: Run the full Terminal suite to confirm no collateral breakage**

Run: `npx vitest run src/ui/Terminal.test.tsx`
Expected: PASS — including the ka help test (~line 335) which uses `getByRole('status')`; the announce region is `aria-live` WITHOUT a `status` role, so it does not create a second status landmark.

- [ ] **Step 8: Commit**

```bash
git add src/ui/Terminal.tsx src/ui/Terminal.test.tsx
git commit -m "feat(ui): render the Georgian bottom bar and relocate ka mode notices"
```

---

### Task 5: Full verification + manual responsive checklist

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated suite + lint/format/typecheck**

Run: `make all`
Expected: lint, format, typecheck, and the full `vitest run` all PASS.

- [ ] **Step 2: HUMAN GATE — manual responsive + a11y checklist (no automated layout guard; jsdom has no layout engine and the stack has no Playwright)**

> **An agentic worker MUST NOT mark this step complete.** It requires a real browser at multiple widths/themes and a screen reader, which a subagent cannot drive. Hand back to Ovid to run this checklist before merge.

Run `make dev`, pick **Georgian (ka)** on **Zork I** (corpus → beta+tip) **and** **Zork II** (no-corpus → bilingual notice), and verify at **320 / 375 / 520px** widths and a **short landscape** window, in **both themes**:

- The bottom bar wraps to 1–3 short lines, never overflows or clips, and never pushes the command input off-screen.
- The top of the scrollback stays reachable (the responsive spec's locked "top of content stays reachable" rule) with the bar always present.
- Beta mode (Zork I): the beta notice reads Georgian-only (no English), and the type-English/`help` tip is visible.
- No-corpus mode (Zork II): the notice is bilingual (Georgian + English), no tip.
- The bar's dim text meets WCAG AA contrast in both themes.
- With a screen reader: on `ka` entry the type-English tip is announced once; navigating to the footer reads "Georgian mode information"; the `ⓘ` glyph is not announced.

Re-run this checklist whenever `landing.css` / `components.css` change.

- [ ] **Step 3: Final commit (only if Step 1 autofixed formatting/lint)**

```bash
git add -A
git commit -m "chore: formatting/lint after Georgian bottom-bar work"
```

---

## Self-review against the spec

- **Decision 1 (beta Georgian-only, no-corpus stays bilingual):** Task 3 component + Task 4 tests (Step 1a asserts no English in beta; Step 1d asserts both halves in no-corpus). ✅
- **Decision 2 (new bottom bar mirrors StatusBar styling, quieter):** Task 3 Step 4 CSS (`.bottombar`, top border, smaller font, `--text-dim`). ✅
- **Decision 3 (tip permanent visible + one-shot announcement via existing latch, separate static element):** Task 1 (shared const) + Task 2 (latch routed to `announce`, not rebuilt) + Task 3 (visible tip in footer) + Task 4 (dedicated announce region). ✅
- **Decision 4 (transients stay inline):** Task 4 Step 1 leaves `nl.pending`/`nl.notice` in `role="status"`; Step 5 item-5 test asserts it. ✅
- **Decision 5 (`ka`-only, absent for others, no layout change):** Task 4 `outLang === 'ka'` gate; Step 1b test asserts no footer for French; CSS comment notes `<main>` flex:1 reclaims space. ✅
- **Decision 6 (reuse existing strings verbatim):** Task 1 reuses the exact tip; Task 3 reuses the exact beta/no-corpus strings from today's Terminal. No new wording. ✅
- **Finding [5] boot-flash guard:** render gated on `showBetaNotice || showNoCorpusNotice`, both requiring a resolved signature (`signature !== ''`). Task 4 Step 3 comment + Step 6 note. ✅
- **Finding [6] one-shot vs help co-occupancy:** announce uses a dedicated `aria-live` region, separate from the inline `nl.notice` (help/abstain) region; Task 4 Step 5 item-4 test asserts the tip is NOT inside `role="status"`, and the transients test asserts the inline region is clean of the tip (both sides). The announce CONTENT is additionally corpus-gated (`showBetaNotice ? nl.announce : null`) so a no-corpus ka game doesn't announce a Georgian-display claim over an English screen — asserted by the new "suppresses … on a no-corpus ka game" test. The region stays mounted-while-empty for reliable registration. ✅
- **`announce` lifecycle (pushback [2]/[3]):** documented as once-per-session, not cleared on switch, not re-announced (the `3ac3508` contract); the updated repro test drives `ka → en` and asserts the inline `notice` stays null across the switch. ✅
- **Responsive checklist (pushback [7]):** Task 5 Step 2 is explicitly a HUMAN GATE the agent must not auto-complete. ✅
- **Finding [7] footer is not a live region:** Task 3 footer has no `aria-live`; tests assert `not.toHaveAttribute('aria-live')`. ✅
- **Finding [3] new CSS required incl. media block:** Task 3 Step 4 adds base rules AND a `@media (max-width: 520px)` rule. ✅
- **A11y (labeled region, aria-label, decorative glyph aria-hidden, contrast):** Task 3 component + CSS + tests. ✅
- **Testing items 1-8:** items 1-3 (Task 4 Step 1a/1b/1d), item 4 (Step 5), item 5 (Step 5), item 6 (Step 5), items 7-8 (existing corpus/signature logic + unchanged Zork II suppression test, per Step 6 note). ✅
