# UAT-4 — Output translation v1 (Zork I × French), 2026-06-11

Black-box browser session against
`docs/superpowers/specs/2026-06-10-loquor-output-translation-design.md`.
Dev server on :5173, `?model=full`, Chrome automation. French (+ English
baseline/toggles) only, per Ovid.

## Test plan results

1. **English baseline** — ✅ PASS. Fresh restart: banner, room description,
   status bar (`West of House · Score: 0 Turns: 0`) all English, no overlay
   artifacts.
2. **Switch EN→FR with backlog on screen** — ✅ PASS. Entire backlog flipped
   instantly (banner « ZORK I : Le Grand Empire Souterrain », room title,
   description, status bar « Score : 0 Coups : 0 »). No shimmer burst.
3. **Live French output (walkthrough opening)** — ✅ PASS. Room titles,
   descriptions, « Pris. », « Posé. », mailbox/window/trapdoor/rug responses
   all instant French.
4. **Listings + indent** — ✅ PASS (translation). « Dans la bouteille en
   verre, il y a : » / « De l'eau » (irregular pin works); inventory uses the
   built-in listing template « Une lampe en laiton (allumée) » with the
   suffix parenthetical composed. See pre-existing quirk below re styling.
5. **Status bar** — ✅ PASS. French room names (« Salon », « Cuisine »),
   « Score : N Coups : N » tracked correctly all session.
6. **Input lines untouched** — ✅ PASS. `nl-source` shows typed French
   verbatim; canonical echo stays English and de-emphasized.
7. **{raw} template** — ✅ PASS. `"gronk blorple"` → « Je ne connais pas le
   mot « gronk ». » instantly (guillemets around the verbatim token — nice).
8. **Miss → shimmer → LLM → cache** — ✅ PASS. `"open"` → "What do you want
   to open?" shimmered « …traduction » ~5 s, resolved to « Qu'est-ce que vous
   voulez ouvrir ? » (LLM); re-provoking the same line rendered French
   instantly (IndexedDB cache hit, no shimmer). `window.loquorMisses()`
   logged each miss with context.
   Note: with the engine **not yet loaded**, misses resolve to English
   immediately (the designed unavailable-engine fallback) — seen earlier in
   the session before the input layer's first LLM call warmed the engine.
9. **Switch FR→EN mid-game** — ✅ PASS. Transcript reverts to English
   instantly; switching back re-translates the backlog (corpus hits only).

## Findings (fixed this session, TDD red→green, re-verified in-browser)

Commits: `cfe4eb1` ((Taken) pin), `98ac319` (GWIM parenthetical templates),
`19a799a` (glued-prompt residue in matchLine). Browser re-test after HMR:
`take` → « (l'épée) » + « Pris. »; `restart` → « Voulez-vous recommencer ?
(Y pour oui) : > » (score/rank lines composed too); `lis le dépliant` with
the leaflet on the ground → « (Pris) ». Full suite 667/667; typecheck,
eslint and prettier clean on the touched files (skipped `make lint`/`format`
autofix to avoid touching unrelated uncommitted WIP in the tree).

- **`(Taken)` miss** — the implicit-take parenthetical (`read leaflet`
  without holding it) isn't pinned; golden-path fixture never triggers an
  implicit take so the coverage gate can't see it. Fix: exact pin
  `'(Taken)' → '(Pris)'`.
- **`(sword)` miss** — the implicit-noun parenthetical class (`take` with one
  candidate). Only `(magic boat)` was pinned (the one the fixture hits).
  Fix: templates `({obj})` → `({obj.def})` and `(with the {obj})` →
  `(avec {obj.def})` (same GWIM class, walkthrough-visible shape).
- **Glued-prompt miss** — `Do you wish to restart? (Y is affirmative): >`
  missed despite the line being pinned, because the CR-less question merges
  with the `>` input prompt into one BufferLine. Matcher fix: split a
  trailing ` >` prompt residue before lookup and re-append verbatim
  (mirrors the indent split). Related to commit 3e5205a (bare `>` line).

## Out-of-scope observations (not fixed)

- ~~**Pre-existing styling quirk:** container/inventory listing lines render
  as room-title headings; leading indent invisible.~~ **Fixed in a follow-up
  this session** (`9ad70a8` + `1d009f2`): `classify()` now excludes indented
  lines and trailing-colon lines (verified against every fixture buffer line:
  demotes exactly the 34 listing lines, keeps all 71 room titles and the
  banner heading), and `.scroll p` gained `white-space: pre-wrap` so the
  nesting indent renders. Verified in-browser in English and French.
  Gotcha for future sessions: a `reduce.ts` edit does NOT reach the running
  page via HMR (the live bridge holds the old closure) — hard-reload before
  judging a reducer change.
- ~~**`nl debug` log replay:** every new turn re-logs the entire clause
  history.~~ **Investigated in a follow-up this session: NOT an app bug.**
  An in-page `console.log` patch proved each clause logs exactly once from
  the live translate path; the "replays" were the Claude-in-Chrome console
  capture re-delivering the page's buffered history on tool-call re-attach
  (waves bunched at single capture timestamps, carrying their ORIGINAL
  scene data verbatim, growing by the full buffer each wave). No code
  change. Technique recorded in notes/uat.md.
- ~~**Miss-log noise:** a fallback-served line logs repeatedly (~7 entries
  for 2 occurrences).~~ **Root-caused and fixed in a follow-up this session**
  (`e5a45c4`): corpus re-activation (language re-switch, HMR module swap,
  session restore) re-scans the transcript and re-logged every on-screen
  miss via the backlog path — the per-activation guards reset by design, so
  `logMiss` itself now dedupes by `(game, language, en)`; the ring buffer is
  a set of distinct gaps and `window.loquorMisses()` dumps are clean. The
  old bare-`>` entries were pre-3e5205a leftovers (cleared with the buffer).

## Session technique notes

- The language picker steals focus (known, notes/uat.md) — first typed
  command after a picker change silently vanished; re-click the input line
  and verify the turn counter moved.
- `?model=full` does not pre-load the engine; the first LLM-needing _input_
  (idiomatic phrase) warms it (~10 s from cache), after which output
  fallbacks generate. Output misses before that warm-up resolve to English
  by design — if a UAT session wants to test shimmer behaviour early, warm
  the engine first with one idiomatic input.
