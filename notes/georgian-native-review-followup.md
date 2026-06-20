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

## Known ka raw-English leaks (deferred)

- **Parser orphan prompt** `What do you want to <verb> the <typed-tokens> <prep>?`
  (`zork1/gparser.zil` ~758-774). Unlike the disambiguation prompt (now templated as
  `Which {raw} do you mean, the {obj} or the {obj2}?`), this prompt echoes an **unbounded**
  run of the player's typed tokens between the verb and the preposition, so it is **not
  cleanly templatable** (a single `{raw}` cannot safely span an arbitrary noun phrase while
  also binding a trailing preposition reliably). ka has no LLM fallback (corpus-only), so this
  prompt currently **leaks raw English** for Georgian players. fr/de/es translate it via the
  LLM fallback (it is in `zork1.extraction-ignore.ts` `'What do you want to'`). Left to a future
  bounded-verb-set template or an input-phase fix. Do **not** add it to the extraction-ignore
  routing as a ka special case.

## Provisional `ka` draft lines added this branch (NATIVE-REVIEW-DRAFT)

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
