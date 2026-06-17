# BLOCKING follow-up: Georgian native review (spec §8 Tbilisi loop)

> Track this as a real issue, not a buried TODO. **The `(beta)` marker MUST NOT be removed,
> and Georgian MUST NOT be described as "supported" (README / release notes / marketing),
> until a native Georgian speaker has reviewed the corpus and confirmed naturalness.**

## Why this is blocking
The entire Georgian corpus (`src/translate/corpus/zork1.ka.*`) and chrome copy were **LLM-authored
and machine-unvalidated**. The automated gates prove *coverage* (every line a player sees has a
Georgian rendering) and *no-English-passthrough* (no value left identical to its English key) — they
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
