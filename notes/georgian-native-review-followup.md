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
  review — 60 authored `ka` composed lines).

- **STILL OPEN — parser implicit-object parenthetical `(with the <obj>)` / `(<obj>)`**
  (UAT 2026-06-23, NOT yet gated — a recon miss). When the parser auto-supplies a missing
  object it announces the assumption on its own line: `attack trophy case` with a weapon in
  reach prints **`(with the sword)`**, `open` with one openable present prints `(the door)`,
  etc. (`zork1/gparser.zil`). This is a **golden-path** line — `attack troll` → `(with the
  sword)` is THE combat command. fr/de/es **generalize** it with a template
  (`(with the {obj})` → `(mit {obj.bare})` / `(con {obj.def})` / `(avec {obj.def})`, plus the
  bare `({obj})` form), so German renders `(mit Schwert)` deterministically. **`ka` has only a
  single per-object string pin** — `'(with the match)': '(ასანთით)'` — and **no general
  template**, so EVERY other object leaks raw English to a Georgian player (confirmed in
  basic-mode play: `attack trophy case` → raw `(with the sword)`). This is exactly the
  coverage-asymmetry trap the P2.1 spec describes: pinning a couple of instances (sword/knife)
  would false-pass the gate while the rest still leak.
  - **Why it isn't fixed in this UAT pass:** the natural `ka` form is INSTRUMENTAL
    (`X-ით`), which `zork1.ka.templates.ts` (header note) deliberately does **not** template —
    it is the §4 case problem (per-object stem/case). Authoring a general `ka` instrumental
    template (or per-object instrumental pins for every auto-suppliable weapon/tool) is a
    Georgian-gift case decision that needs native review, not an unsupervised guess — so it is
    surfaced here per CLAUDE.md "talk to me first" rather than half-fixed.
  - **Recommended fix:** register `(with the {obj})` and `({obj})` as families in
    `composed-families.ts` (object binding = `all-objects`, so the union-drive exposes every
    leaking object); add the fr/de/es templates to the drive (already present → green); author
    the `ka` instrumental form with the native reviewer (safe-but-stiff over natural-but-wrong),
    marked `NATIVE-REVIEW-DRAFT`. The gate will then enforce it like every other family.

## Provisional `ka` draft lines (NATIVE-REVIEW-DRAFT) — two batches

> **Two separate batches, both NATIVE-REVIEW-DRAFT:** the 5 lines below were added on the
> PRIOR branch `ovid/zork1-input-parity`. Branch `ovid/composed-line-gate` adds **60 more**
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
