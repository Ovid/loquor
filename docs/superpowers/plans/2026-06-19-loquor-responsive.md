# Loquor Responsive Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Loquor UI usable from 320px wide up (including short landscape windows), in both themes, across all UI languages, and fix the acute scroll-trap that strands the dismiss ✕ off-screen.

**Architecture:** Targeted, native-only CSS. Two root causes: (1) fixed, hard-centered flex containers with no overflow clip their tops when taller than the viewport — fixed once with a scroll-safe `overflow-y:auto` + `margin:auto` pattern scoped to the plate surfaces and the modal backdrop; (2) no width adaptation — fixed with one phone breakpoint, status-bar wrapping, and fluid title/tagline. No new dependencies, no JS layout logic, no DOM-structure change (the `margin:auto` pattern works on the existing direct-child markup).

**Tech Stack:** Plain CSS (`src/ui/landing.css`, `src/ui/components.css`); Vitest for the regression gate.

**Source spec:** `docs/superpowers/specs/2026-06-19-loquor-responsive-design.md`

---

## A note on testing this plan (read first)

This is **CSS-only layout work**. jsdom has no layout engine and the stack has no Playwright (adding one for a single plate + status bar is an explicit non-goal in the spec). Therefore:

- **There is no red→green unit test for the layout itself.** Do not invent a fake one. The spec (§Testing) explicitly accepts that the manual checklist is the only gate against the scroll trap reappearing.
- **The automated gate for every code task is the existing suite staying green** — especially the focus-trap and Escape-dismiss tests, because the scroll fix changes alignment/overflow on the plate and modal wrappers. Each task runs `npx vitest run` and expects PASS across the board.
- **Line numbers below reference the pristine (pre-edit) files.** Tasks run sequentially and some insert lines, so a cited "(line N)" later in a file may have drifted by the time you reach it. **Always match by the quoted text, not the line number** — every edit anchor is a unique string.
- **The real acceptance is manual** (Task 5): a fixed checklist at 320 / 375 / 520px + one short landscape window, both themes.

Full suite command used throughout: `npx vitest run` (alias: `make test`).

---

## File Structure

- `src/ui/landing.css` — owns the landing plate + the in-game overlay (`.screen`, `.plate`, `.volumes`, `.title`, `.tagline`) and the new `@media (max-width: 520px)` block. **Scroll fix targets `.screen:not(.term)`, never base `.screen`** (base `.screen` also clothes the live terminal, `.screen.term`).
- `src/ui/components.css` — owns the modal backdrop and the status bar (`.modal-backdrop`/`.modal`, `.statusbar`/`.meta`).
- `src/ui/Landing.tsx`, `src/ui/ModelDownloadModal.tsx`, `src/ui/PreferencesModal.tsx` — **read-only for this plan.** Confirmed `.plate` is a direct child of `.screen` and `.modal` is a direct child of `.modal-backdrop`, so the `margin:auto` pattern needs no wrapper. Do not edit these unless Task 5 surfaces an unavoidable markup need (it should not).

---

## Task 1: Scroll-safe, top-reachable plate + modal containers (the acute bug)

Fixes the reported scroll trap. Today `.screen` (landing + `.screen.overlay`) and `.modal-backdrop` are `position:fixed; inset:0` flex containers that hard-center one child with no overflow, while `body{overflow:hidden}` (`theme.css:75`). When the child is taller than the viewport its top is clipped and unreachable, stranding the dismiss ✕ and theme toggle.

The fix: scope a scroll-safe pattern to the plate surfaces and the modal backdrop. `align-items: flex-start` + `overflow-y: auto` on the container, `margin: auto` on the child. When the child fits, `margin:auto` centers it in both axes; when it overflows, the top margin collapses against the scroll origin so the top stays scrollable-to (this is the specific reason `margin:auto` is used instead of `align-items: center`, which clips the top even in a scroll container). `overscroll-behavior: contain` stops scroll-chaining into the inert game behind an overlay.

**Do NOT use `align-items: safe center`** — the `safe` keyword has a browser-support cliff and falls back to plain `center` where unsupported, silently reintroducing this exact bug.

**Files:**
- Modify: `src/ui/landing.css` — `.screen` block (~lines 7–15), add a scoped `.screen:not(.term)` rule + `.plate margin`.
- Modify: `src/ui/components.css` — `.modal-backdrop` block (lines 355–364), add `.modal-backdrop .modal` margin.
- Test (regression only): `src/ui/Landing.test.tsx`, `src/ui/useFocusTrap.test.tsx`, `src/ui/ModelDownloadModal.test.tsx`, `src/ui/PreferencesModal.test.tsx`.

- [ ] **Step 1: Add the scoped scroll-safe rule in `landing.css`**

Leave the base `.screen` rule (lines 7–15) as-is, and add **immediately after** the `.hidden` rule (after line 19) this new block:

```css
/* ---------- Scroll-safe, top-reachable plate surface ---------- */
/* The acute bug (responsive design 2026-06-19 §1): a fixed, hard-centered flex
   container with no overflow clips the top of any child taller than the
   viewport, stranding the corner controls. `.screen` is shared with the live
   terminal (`.screen.term`, which re-lays-out to a stretched column), so scope
   this to `:not(.term)` — never put it on base `.screen` or it lands on the
   running game's root container.
   `align-items:flex-start` + `overflow-y:auto` + `margin:auto` on the child is
   the scroll-safe centering recipe: it centers when there's room and pins the
   top scrollable-to when there isn't. `align-items:center` would clip the top
   even with overflow; `align-items:safe center` has a support cliff and falls
   back to plain `center` — do not use it. */
.screen:not(.term) {
  align-items: flex-start;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.screen:not(.term) .plate {
  margin: auto;
}
```

- [ ] **Step 2: Make `.modal-backdrop` scroll-safe in `components.css`**

Modify the `.modal-backdrop` rule (lines 355–364) — change `align-items: center` to `align-items: flex-start`, add `overflow-y` + `overscroll-behavior`, keep everything else:

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start; /* was center — scroll-safe top pin (responsive §1) */
  justify-content: center;
  overflow-y: auto; /* tall modal on a short viewport scrolls instead of clipping */
  overscroll-behavior: contain; /* don't chain-scroll the inert game behind it */
  background: var(--vignette);
  z-index: 50;
  padding: 1rem;
}
```

Then add, immediately after the `.modal-backdrop` rule (after line 364), the child-centering rule:

```css
/* `margin:auto` centers the modal when it fits and keeps its top reachable when
   it's taller than the viewport (same recipe as the plate, responsive §1). */
.modal-backdrop .modal {
  margin: auto;
}
```

- [ ] **Step 3: Run the full suite — regression gate for the focus trap + Escape dismiss**

Run: `npx vitest run`
Expected: PASS (all files). The alignment/overflow change touches no DOM structure, so the focus-trap and Escape tests must stay green:
- `src/ui/Landing.test.tsx` → "dismisses on the Escape key (overlay mode)", "traps Tab within the plate so focus cannot reach the game behind it"
- `src/ui/useFocusTrap.test.tsx` → "moves focus into the container on open" + the two restore tests
- `src/ui/ModelDownloadModal.test.tsx` → "moves focus into the dialog on open and restores it on close", "Escape dismisses…"
- `src/ui/PreferencesModal.test.tsx` → "closes on Escape (reuses useFocusTrap)"

If any fail: stop — the fix changed behavior it shouldn't have. Do not proceed.

- [ ] **Step 4: Commit**

```bash
git add src/ui/landing.css src/ui/components.css
git commit -m "fix(ui,a11y): scroll-safe plate + modal so corner controls stay reachable

Scope overflow-y:auto + margin:auto centering to .screen:not(.term) and
.modal-backdrop so a child taller than the viewport pins its top scrollable-to
instead of clipping the dismiss control off-screen. Resolves the reported
Change-story overlay scroll trap.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Phone breakpoint — `@media (max-width: 520px)`

The plate uses fixed `padding: 46px 48px 40px` and `.volumes` is a 3-column grid at every width, so the numerals + names cramp on phones. One breakpoint relaxes padding and stacks the volume picker to a single column. `.plate` keeps its existing `width: min(680px, 92vw)` (no change needed — it already adapts).

**Files:**
- Modify: `src/ui/landing.css` — append a new `@media` block at end of file (after line 383).

- [ ] **Step 1: Append the phone breakpoint**

Add at the **end** of `src/ui/landing.css`:

```css
/* ---------- Phone breakpoint ---------- */
/* Relax the plate's desktop padding and stop the 3-column volume grid from
   cramping numerals + names on narrow viewports (responsive design §2). The
   plate's own width is already fluid (min(680px, 92vw)). */
@media (max-width: 520px) {
  .plate {
    padding: 28px 20px 28px;
  }
  .volumes {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Run the full suite — confirm nothing regressed**

Run: `npx vitest run`
Expected: PASS (all files). This is presentational-only; no test asserts grid columns or padding, so green confirms no collateral damage.

- [ ] **Step 3: Commit**

```bash
git add src/ui/landing.css
git commit -m "feat(ui): phone breakpoint — relax plate padding, stack volume picker

@media (max-width:520px): plate padding 46/48/40 -> 28/20/28; .volumes 3-col ->
single column so numerals and names stop cramping on phones (responsive §2).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Status bar wraps instead of overflowing (phone widths only)

`.statusbar` is a `space-between` row and `.meta` is a `white-space:nowrap` flex row of up to five controls (score · Change story · language · ⚙ preferences · theme). With no wrap they overflow horizontally on narrow viewports.

**Gate the wrap behind the 520px breakpoint, do NOT add `flex-wrap` to the base rules.** The spec puts this under §2 (the phone breakpoint) for a reason: at desktop widths the bar must stay a single non-wrapping row so `.loc` (`flex:1; min-width:0`) keeps its *constrained* ellipsis truncation. If `flex-wrap` is on at all widths, flexbox prefers wrapping the `.meta` cluster to a second line over shrinking `.loc`, so the long-room-name truncation no longer engages at the constrained width — a silent behavior change no test catches (`StatusBar.test.tsx` asserts text/roles/aria-live, not truncation). Gating to ≤520px confines wrapping to exactly the widths where overflow was the real problem; on a wrapped phone line `.loc` is full-width and still ellipsizes if the name is very long. `.meta` keeps its base `white-space:nowrap` (each control's own label stays on one line while the cluster wraps as units).

**Files:**
- Modify: `src/ui/components.css` — append a new `@media (max-width: 520px)` block at end of file (after the last rule). Leave the base `.statusbar` (lines 51–61) and `.meta` (lines 77–83) rules unchanged.

- [ ] **Step 1: Append the status-bar phone breakpoint**

Add at the **end** of `src/ui/components.css`:

```css
/* ---------- Phone breakpoint: wrap the status bar ---------- */
/* Desktop keeps a single non-wrapping row so .loc keeps its constrained ellipsis
   truncation. On phones the up-to-five-control cluster would overflow, so let the
   bar and the meta cluster wrap; on its own wrapped line .loc is full-width and
   still ellipsizes if the room name is long (responsive design §2). */
@media (max-width: 520px) {
  .statusbar {
    flex-wrap: wrap;
    row-gap: 6px;
  }
  .meta {
    flex-wrap: wrap;
    row-gap: 6px;
  }
}
```

- [ ] **Step 2: Run the full suite**

Run: `npx vitest run`
Expected: PASS (all files), including `src/ui/StatusBar.test.tsx`. The controls' roles/accessible names are unchanged, so the StatusBar a11y assertions stay green.

- [ ] **Step 3: Commit**

```bash
git add src/ui/components.css
git commit -m "feat(ui): wrap the status bar on phone widths instead of overflowing

@media (max-width:520px): flex-wrap + row-gap on .statusbar and .meta so the
control cluster drops to a second line on phones. Gated to the breakpoint so
desktop keeps .loc's constrained ellipsis truncation (responsive §2).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Fluid title + tagline

`.title` is a fixed `4rem` and overflows / dominates narrow plates. Clamp it so it shrinks on phones and holds at the desktop size. `.tagline` gets a matching small clamp so it tracks the title. Everything else on the plate already uses small `rem` sizes that hold at 320px — leave them.

**Files:**
- Modify: `src/ui/landing.css` — `.title` rule (`font-size` at line 110) and `.tagline` rule (`font-size` at line 154).

- [ ] **Step 1: Clamp the title**

In the `.title` rule, change `font-size: 4rem;` (line 110) to:

```css
  font-size: clamp(2.5rem, 9vw, 4rem);
```

- [ ] **Step 2: Clamp the tagline to track it**

In the `.tagline` rule, change `font-size: 1.125rem;` (line 154) to:

```css
  font-size: clamp(1rem, 4vw, 1.125rem);
```

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run`
Expected: PASS (all files). No test asserts a pixel font-size; green confirms no collateral damage.

- [ ] **Step 4: Commit**

```bash
git add src/ui/landing.css
git commit -m "feat(ui): fluid title + tagline so the masthead fits a phone plate

.title 4rem -> clamp(2.5rem, 9vw, 4rem); .tagline gets a matching clamp so it
tracks the title (responsive §3). Other plate text already holds at 320px.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Manual acceptance pass + the one conditional tweak

The only real gate for layout (see "A note on testing" above). Run the app and walk the checklist. This task also resolves the **one conditional** the spec leaves open (§2): whether the absolutely-positioned corner controls (dismiss ✕ top-left at 14px, theme toggle top-right at 18px) overlap the title at 320px — observable only by looking.

**Files:**
- Possibly modify: `src/ui/landing.css` — only the `@media (max-width: 520px)` block from Task 2, **and only if** Step 2 below shows an overlap.

- [ ] **Step 1: Build/serve and open at phone widths**

Run: `make dev` (or `make build && make preview`). Open the app and use the browser devtools device toolbar to set widths **320, 375, 520px** and one **short landscape** window (e.g. 720×360). Test in **both themes** (toggle in the plate corner / status bar).

- [ ] **Step 2: Check corner-control vs. title overlap (likely needed)**

The corner controls are `position:absolute` to the plate — dismiss ✕ at `top:14px`, theme toggle at `top:18px`, each ~18–20px tall, so they extend to ~32–38px from the plate's top edge. Task 2 reduces the plate's `padding-top` to `28px`, so the controls now reach *past* the padding into the title's box. **Expect overlap, not a remote contingency** — check it directly rather than assuming it's clear.

At 320px **and** 520px, open the in-game **Change story** overlay (so both the dismiss ✕ top-left and the theme toggle top-right are present) and also check the initial landing (theme toggle only). If the controls touch the (now-clamped) title at any of these, add to the `@media (max-width: 520px)` block from Task 2:

```css
  .title {
    margin-top: 20px; /* clear the absolutely-positioned corner controls */
  }
```

Re-run `npx vitest run` (expect PASS) and commit with:
`git commit -am "fix(ui): nudge title clear of corner controls at narrow widths"` (use the standard Co-Authored-By trailer). If there is genuinely no overlap at any width, skip this commit and note it in Step 4.

- [ ] **Step 3: Walk the acceptance checklist (both themes)**

Confirm each, at the widths above. **Run the checklist in German (`de`) — the longest UI labels, so the worst case for the status-bar wrap and title clamp — and also eyeball the Georgian (`ka`) display once**; both themes. (English alone would leave the highest-overflow-risk language untested, and there is no automated layout guard.)
1. **Change story overlay scrolls**; the dismiss ✕ is reachable (scroll to it and by Tab) and **Escape dismisses** it. While scrolled on a short window, confirm the overlay's dark dim still fully covers the viewport (the `rgba` dim sits on the now-scrollable `.screen.overlay` — verify it doesn't reveal the live game at any scroll position).
2. **Initial landing on a short window scrolls**; nothing is clipped top or bottom.
3. **`.volumes` stacks to one column** at ≤520px.
4. **Status bar wraps** to a second line instead of overflowing horizontally.
5. **Download + preferences modals scroll** when taller than the viewport (force this on the short landscape window) and their controls stay reachable.

- [ ] **Step 4: Record the result**

If everything passes, the branch is done — note in the PR/commit message that manual acceptance passed at 320/375/520px + short landscape in both themes, and whether the Step 2 title nudge was needed. If any check fails, treat it as a bug against this plan and fix the corresponding task's CSS before claiming completion.

---

## Self-Review (author checklist — already run)

**Spec coverage:**
- §Problem 1 (scroll trap) → Task 1. ✓
- §Problem 2 (no width adaptation: plate padding, volumes grid, statusbar/meta overflow) → Tasks 2 + 3. ✓
- §Approach 1 (scroll-safe containers, scoped to `:not(.term)`, `margin:auto`, no `safe center`, `overscroll-behavior`) → Task 1. ✓
- §Approach 2 (phone breakpoint: padding, single column, corner-overlap check, status wrap) → Tasks 2, 3, 5. ✓
- §Approach 3 (fluid title + tagline) → Task 4. ✓
- §Approach 4 (short viewports handled by the scroll fix, no height breakpoint) → covered by Task 1; verified in Task 5. ✓
- §Preserve (Escape dismiss, focus trap + initial focus + restore) → regression gate in Task 1 Step 3. ✓
- §Testing (suite green + manual checklist; no automated layout guard, accepted) → "A note on testing" + Task 5. ✓
- §Files in scope (`landing.css`, `components.css`, `Landing.tsx` only if needed) → File Structure; `Landing.tsx` confirmed not needed. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases". The one conditional (title nudge) is a real, observable manual decision with the exact CSS to apply, not a placeholder. ✓

**Type/selector consistency:** Selectors are consistent throughout — `.screen:not(.term)`, `.screen:not(.term) .plate`, `.modal-backdrop .modal`, `.statusbar`, `.meta`, `.volumes`, `.title`, `.tagline`. No drift. ✓
