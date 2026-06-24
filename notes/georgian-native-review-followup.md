# BLOCKING follow-up: Georgian native review (spec §8 Tbilisi loop)

> Track this as a real issue, not a buried TODO. **The `(beta)` marker MUST NOT be removed,
> and Georgian MUST NOT be described as "supported" (README / release notes / marketing),
> until a native Georgian speaker has reviewed the corpus and confirmed naturalness.**

## Why this is blocking

The entire Georgian corpus (`src/translate/corpus/zork1.ka.*`) and chrome copy were **LLM-authored
and machine-unvalidated**. The automated gates prove _coverage_ (every line a player sees has a
Georgian rendering) and _no-English-passthrough_ (no value left identical to its English key) — they
prove **nothing about linguistic correctness or naturalness**. Only a Georgian speaker can.

## What to review

1. **Corpus prose** — `zork1.ka.strings.ts` (1093 lines): naturalness, register, idiom.
2. **Object terms** — `zork1.ka.objects.ts`: the `indef` citation forms (the terminology backbone).
3. **Templates** — `zork1.ka.templates.ts`: the composed listing/state lines.
4. **Chrome** — `landingStrings.ts` (`ka`), `PreferencesModal`/`ModelDownloadModal`/`progress` `ka`,
   `statusTranslate` (`ka` score/turns labels), the in-game beta notice (`Terminal.tsx`).
5. **Glossary** — `notes/georgian-translation-glossary.md` documents every consistency decision and
   carries an "open questions for native review" section; reviewers should start here.

## Specific items the authors flagged for a native eye

(See the glossary's "Open questions" plus, non-exhaustively:)

- **Register split** (deliberate): in-game text uses informal `შენ`; UI chrome uses formal `თქვენ`. Confirm this reads right.
- **"Dungeon Master"** → `დილეგის მბრძანებელი` (chosen over fortress/velvet renderings). Confirm idiom.
- **"grue"** → `გრუ` (transliteration); **"zorkmid"**, **"Zorker"** → `ზორკმიდი` / `ზორკელი`.
- Room-name renderings (maze, canyon, dam, reservoir, Hades/Land-of-the-Dead set, barrow).
- Combat-log idioms, wound-status ladder, water-level body-part ladder.
- The "contains:" / "is now on/off" / ": Dropped." composed templates.
- Onomatopoeia and Easter-egg lines (`Fweep!`, `Hello, Sailor!`, the 12-days-of-Christmas joke, the death/`BOOOOOOOOOOOM` banners).
- Cultural allusions kept literal that may not land (little Dutch boy, "axe to grind", "lean and hungry", "Greek to you").

## Process suggestion

Run the app in Georgian, play through, and capture any awkward line. The corpus-miss logger
(`logMiss`, surfaced via `window.loquorMisses()`) and the UAT regression file
(`zork1.ka.uat.test.ts`) are the seams to record confirmed findings as regression pins.

## Composed-line leaks — now gate-enforced (P2.1, branch `ovid/composed-line-gate`)

- **Parser orphan prompt** `What do you want to <verb> the <typed-tokens> <prep>?`
  (`zork1/gparser.zil` ~758-774) is **no longer a deferred leak** — it is now **gated and
  templated**. Task 4 of the composed-line gate templated it in all four corpora as
  `What do you want to {verb} the {raw} in?/with?/` + the no-noun `What do you want to {verb}?`
  (object dropped; the `ka` draft drops `{verb}`/`{raw}` entirely, so it is Phase-2-clean).
  The broader composed-line class — runtime-spliced listing/state/refusal lines that fell
  through both existing gates — is now closed too: Ovid's **author-all** call means every
  reachable splice family is a `ka` draft, not a deferred list. See
  `src/translate/corpus/composed-families.ts` (the inventory),
  `src/translate/corpus/composed-lines.test.ts` (the gate that drives every family through
  `matchLine` per language and asserts a non-English, Georgian-bearing `ka`), and
  **`notes/georgian-composed-line-review.md`** (the per-line wording worklist for native
  review — 62 authored `ka` composed lines).

- **NOW GATED & TEMPLATED (UAT 2026-06-24) — parser implicit-object parenthetical
  `(with the <obj>)` / `(<obj>)`.** When the parser auto-supplies a uniquely-determined
  missing object it announces the assumption on its own line: `attack trophy case` with a
  weapon in reach prints **`(with the sword)`**; a bare DOBJ auto-supply prints `(brass
lantern)` (`zork1/gparser.zil` GWIM :907-925). This is a **golden-path** line — `attack
troll` → `(with the sword)` is THE combat command. It was a **recon miss** in the original
  P2.1 inventory: fr/de/es already generalized both shapes (`(avec/con/mit {obj.def})` +
  `({obj.def})`, so German renders `(mit Schwert)`), but **`ka` had only the single
  `(with the match)` → `(ასანთით)` string pin**, so every other auto-supply leaked raw English
  for a Georgian player (confirmed in basic-mode play). Both shapes are now **registered as
  families in `composed-families.ts` and gated** (all-objects union drive), with `ka`
  templates added (`zork1.ka.templates.ts`, COMPOSED-GATE-DRAFTS block, **NATIVE-REVIEW-DRAFT**):
  - **Bare `({obj})`** → nominative citation `({obj.indef})` (rung 1, caseless — like the
    listing-engine subject). Browser-verified: `turn off` → `(სპილენძის ფარანი)`.
  - **`(with the {obj})`** → originally the drop-noun `(ამით)` ("with this"); **now upgraded
    (this branch, 2026-06-24) to per-object named INSTRUMENTAL string pins** in
    `zork1.ka.strings.ts` (`(with the sword)` → `(მახვილით)`, etc.), modelled on the
    pre-existing `(with the match)` → `(ასანთით)`. Each pin beats the template by specificity;
    the drop-noun `(ამით)` **stays as the leak-proof fallback** for any auto-suppliable object
    not pinned. GWIM fires only when ONE instrument is eligible, so the fallback is unambiguous.
  - **NATIVE-REVIEW decision — RESOLVED: per-object instrumental chosen** (Ovid's naturalness
    call, upgrading the drop-noun). All 14 auto-suppliable weapons/tools are now pinned with a
    named instrumental (sword/stiletto/sceptre/torch/shovel/screwdriver + the ⚠ multi-word
    nasty-knife/rusty-knife/bloody-axe/skeleton-key/viscous-material/wrench, the numeral
    `pair of candles`, and the genitive-chain `hand-held air pump`). **What we still need from
    a native reviewer:** confirm the §4 case of each — especially the ⚠ multi-word adj+noun
    (head noun declined, attributive adjective left in its `-ი` citation form) and the
    syncopated stems (torch `ჩირაღდნ-`, candles `სანთლ-`). Pins + per-row case notes are in the
    Group H worklist of `notes/georgian-composed-line-review.md` (rows 63–76); a focused
    regression test (`zork1.ka.uat.test.ts`) pins each named form against a regression back to
    `(ამით)`. Still `NATIVE-REVIEW-DRAFT`; the `(beta)` marker stays.
  - **Browser UAT 2026-06-24 confirmed the MECHANISM live (`notes/uat-6.md`)** for 3 of the
    pins — sword `(მახვილით)` (static `attack trophy case` + 6× live `attack troll` combat),
    nasty knife `(საზიზღარი დანით)` (`cut rope`), bloody axe `(სისხლიანი ცულით)` (post-kill
    `attack troll`). Each fired its own `aria-live` display line, named (never `(ამით)`, no
    Latin), zero `loquorMisses()`. **Routing/rendering only — §4 case/naturalness of these
    (and the 12 deep-dungeon pins not reached live) still needs the native eye above.**

- **NEW follow-up (raw-English leak, separate from the parenthetical) — `ka` player-attack
  combat-result lines.** Surfaced in the same UAT-6 troll fight. The **player-attack**
  randomization variants leak raw English in `ka` (no LLM net): `The troll is staggered, and
drops to his knees.` / `The troll slowly regains his feet.` / `A good slash, but it misses
the troll by a mile.` / `A good stroke, but it's too slow; the troll dodges.` / `The force
of your blow knocks the troll back, stunned.` / `It's curtains for the troll as your sword
removes his head.` (the troll's-own-attack variants and the death-fog line **are** covered).
  This is a **golden-path** leak (every player fights the troll) that the walkthrough-coverage
  gate misses because combat messages are **probabilistic** — only the variants in the recorded
  walkthrough run got captured. **Out of scope for the `(with the …)` branch and pre-existing**
  (the branch only added the instrumental pins). Needs native Georgian combat strings (likely a
  broader sweep: troll + thief + cyclops attack/parry/wound variants) — raised with Ovid for a
  decision; not auto-fixed (machine-translated combat prose would bypass this review).

## Provisional `ka` draft lines (NATIVE-REVIEW-DRAFT) — two batches

> **Two separate batches, both NATIVE-REVIEW-DRAFT:** the 5 lines below were added on the
> PRIOR branch `ovid/zork1-input-parity`. Branch `ovid/composed-line-gate` adds **62 more**
> composed-line templates inside the `COMPOSED-GATE-DRAFTS (P2.1)` sentinel block of
> `zork1.ka.templates.ts` — those have their **own dedicated worklist**,
> **`notes/georgian-composed-line-review.md`** (grouped by family, with the rung/case notes
> a reviewer needs). Review both; don't let the two lists drift.

These Georgian strings were added on `ovid/zork1-input-parity` and each carries a
`// NATIVE-REVIEW-DRAFT (ka §4 case forms)` marker. A test pins the markers in place
(`src/translate/corpus/ka-native-review-draft.test.ts`) so one can't be silently dropped —
removing a marker fails the suite. **Review these lines for naturalness, register, and §4 case
correctness; only then strip the markers (and the `(beta)` gate).**

1. **Help block** — `src/llm/help.ts`, `helpResponse()` `case 'ka'`: the Georgian cheat-sheet
   (intro line, the special-commands line, the "type `help` to see this again" line).
2. **Command placeholder** — `src/llm/notices.ts`, `commandPlaceholder()` `ka`:
   `აკრიფეთ ინგლისურად — მაგ. open the mailbox`.
3. **Command label (a11y name)** — `src/llm/notices.ts`, `commandLabel()` `ka`:
   `თამაშის ბრძანება — აკრიფეთ ინგლისურად`.
4. **Activation notice** — `src/llm/notices.ts`, `escapeHatchOnActivation()` `case 'ka'`:
   `რჩევა: ბრძანებები აკრიფეთ ინგლისურად; ტექსტი ქართულად ჩანს. დახმარებისთვის აკრიფეთ help.`
5. **Disambiguation template** — `src/translate/corpus/zork1.ka.templates.ts`, the generalized
   `Which {raw} do you mean, the {obj} or the {obj2}?` → `რომელ {raw}-ს გულისხმობ — {obj.indef} თუ {obj2.indef}?`
   (the `{raw}` echoes the player's typed English noun; confirm the §4 nominative composition reads naturally).

### a11y follow-up: wrap embedded English in `lang="en"` spans (do this in the native-review pass)

The `ka` help/notices strings above deliberately mix Georgian framing with **literal English
tokens** the player must type — e.g. `open the mailbox`, `help`, and the meta-verb list
(`save`, `restore`, `restart`, `quit`, `score`, `diagnose`, `look`, `inventory`,
`verbose` / `brief`, `version`). With the whole string rendered under a Georgian `lang="ka"`
container, a screen reader pronounces those English tokens with **Georgian phonemes**, so a
blind player hears garbled command words they then can't type. The persistent in-game beta
notice already solves this by splitting `lang` spans (see the `Terminal.tsx` pattern). The
native-review pass should do the same here: wrap each embedded English run in a
`<span lang="en">…</span>` (or the localized-notice equivalent) so assistive tech switches voice
for the English commands. This applies to **every** `ka` string with embedded English above
(help block, placeholder, label, activation notice). Out of scope for the marker-enforcement
task; recorded here so it isn't lost.
