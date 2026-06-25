# Georgian composed-line review (P2.1) — please help us get these exactly right

> **A request to our Georgian colleagues.** Loquor wants a Georgian player to read
> Zork I entirely in Georgian — never forced back into English. To get there we had
> to translate dozens of lines the game _builds at runtime_ by gluing fragments and
> object names together ("composed lines"). The 76 lines below were **machine-drafted
> by a non-native author** and are deliberately **safe but stiff**: where the object
> is the grammatical subject we kept it (`{obj.indef}` as a nominative); everywhere
> else we **dropped the object** to a caseless demonstrative (ამას / ამაზე / ამაში /
> ამით) to dodge §4 case agreement we couldn't be sure of. The exception is Group H
> rows 63–76 (added later), where we **named the weapon/tool in the instrumental**
> (`-ით`) per object — those most need your §4 case check. They pass the coverage
> gate (non-English, Georgian-bearing) — they are **not** confirmed natural. This is
> the worklist where a native speaker fixes the wording. The **`(beta)` marker stays
> until you sign off.** Thank you — and sorry in advance for the stiff ones.

## How to read this

- Every line below is one authored `ka` composed-line template. The `en` side is the
  exact English skeleton the game splices at runtime; the **draft** is what a Georgian
  player sees today.
- **Rung** — how the object name was handled:
  - **NS** = _nominative subject kept_ — `{obj.indef}` stays as the grammatical
    subject (`{obj.indef} ცარიელია.` = "the X is empty"). Safe because nominative
    needs no case ending. **Review: is nominative the right case here, and does the
    verb agree?**
  - **DN** = _dropped to demonstrative_ — the object name is removed and replaced by a
    caseless demonstrative (ამას/ამაზე/ამაში/ამით) or folded away entirely. Chosen
    when the object would need an oblique case we weren't sure of. **Review: is the
    reframe natural, or would you rather name the object (with the right case)?**
  - **pin** = a full-string pin. The 14 named-instrument parentheticals (Group H, rows
    63–76) are pins in `zork1.ka.strings.ts`; the other 62 lines are templates.
    **Review: is the instrumental case (and any adjective agreement) right?**
- ⚠ marks the drafts the author was **least confident** about — start here.

The templates live in `src/translate/corpus/zork1.ka.templates.ts`, inside the
`COMPOSED-GATE-DRAFTS (P2.1) BEGIN … END` sentinel block. Each is gated by
`src/translate/corpus/composed-lines.test.ts` (coverage) and
`src/translate/corpus/ka-native-review-draft.test.ts` (marker can't be silently
dropped). The family inventory is `src/translate/corpus/composed-families.ts`.

---

## Group A — Parser orphan prompts (3)

The game asks the player to finish a half-typed command. We drop both the verb and
the echoed noun; ⚠ **Phase-2 note below.**

| #   | EN source                                    | Draft Georgian           | Rung | Note                                                   |
| --- | -------------------------------------------- | ------------------------ | ---- | ------------------------------------------------------ |
| 1   | `What do you want to {verb} the {raw} in?`   | რაში გსურთ მისი ჩადება?  | DN   | "into what do you wish to put it?" — verb+noun dropped |
| 2   | `What do you want to {verb} the {raw} with?` | რით გსურთ მისი გაკეთება? | DN   | "with what do you wish to do it?"                      |
| 3   | `What do you want to {verb}?`                | რისი გაკეთება გსურს?     | DN   | "what do you wish to do?"                              |

---

## Group B — Listing engine (5)

Lines built when listing contents, light sources, and vehicle contents.

| #   | EN source                                     | Draft Georgian                             | Rung | Note                                                 |
| --- | --------------------------------------------- | ------------------------------------------ | ---- | ---------------------------------------------------- |
| 4   | `There is a {obj} here (providing light).`    | აქ {obj.indef} არის (ანათებს).             | NS   | `{obj.indef}` nominative subject                     |
| 5   | `A {obj} (providing light)`                   | {obj.indef} (ანათებს)                      | NS   | bare noun-phrase fragment                            |
| 6   | `There is a {obj} here. (outside the {obj2})` | აქ {obj.indef} არის. (გარეთ: {obj2.indef}) | NS   | both slots nominative — confirm `გარეთ:` reads right |
| 7   | `Sitting on the {obj} is:`                    | ზედ დევს:                                  | DN   | "on top lies:" — object dropped                      |
| 8   | `The {obj} is holding:`                       | {obj.indef} შეიცავს:                       | NS   | "the X contains:"                                    |

---

## Group C — State / idempotent (2)

| #   | EN source                  | Draft Georgian        | Rung | Note                                                |
| --- | -------------------------- | --------------------- | ---- | --------------------------------------------------- |
| 9   | `The {obj} is now closed.` | {obj.indef} იხურება.  | NS   | present "closes"; confirm tense vs. "is now closed" |
| 10  | `The {obj} is empty.`      | {obj.indef} ცარიელია. | NS   | "the X is empty"                                    |

---

## Group D — Container / placement failures (5)

| #   | EN source                               | Draft Georgian             | Rung | Note                                                |
| --- | --------------------------------------- | -------------------------- | ---- | --------------------------------------------------- |
| 11  | `The {obj} is already in the {obj2}.`   | {obj.indef} უკვე შიგ დევს. | NS   | container `{obj2}` dropped → "already lies inside"  |
| 12  | `The {obj} isn't in the {obj2}.`        | {obj.indef} შიგ არ არის.   | NS   | container dropped → "isn't inside"                  |
| 13  | `You don't have the {obj}.`             | {obj.indef} არ გაქვს.      | NS   | "you don't have the X"                              |
| 14  | `The {obj} isn't here!`                 | {obj.indef} აქ არ არის!    | NS   | "the X isn't here!"                                 |
| 15  | `There's no good surface on the {obj}.` | ამაზე ვერაფერს დადებ.      | DN   | ⚠ "you can't put anything on this" — object dropped |

---

## Group E — Standard-verb refusals (7)

| #   | EN source                            | Draft Georgian                     | Rung | Note                                                  |
| --- | ------------------------------------ | ---------------------------------- | ---- | ----------------------------------------------------- |
| 16  | `Moving the {obj} reveals nothing.`  | გადაადგილებამ არაფერი გამოაჩინა.   | DN   | "the moving revealed nothing" — object folded away    |
| 17  | `You can't move the {obj}.`          | {obj.indef} ადგილიდან არ იძვრება.  | NS   | "the X won't budge"                                   |
| 18  | `You are now in the {obj}.`          | ახლა შიგ ხარ.                      | DN   | "now you are inside" — object dropped                 |
| 19  | `You are now wearing the {obj}.`     | ახლა {obj.indef} გაცვია.           | NS   | "now you wear the X"                                  |
| 20  | `You're not carrying the {obj}.`     | {obj.indef} თან არ გაქვს.          | NS   | "you aren't carrying the X"                           |
| 21  | `How does one read a {obj}?`         | ეს როგორ უნდა წაიკითხო?            | DN   | ⚠ reframe "how is one to read this?" — object dropped |
| 22  | `You aren't even holding the {obj}.` | {obj.indef} ხელშიც კი არ გიჭირავს. | NS   | "you aren't even holding the X"                       |

---

## Group F — Exotic single-object refusals (30)

The long tail of "you can't do _that_" verbs (burn / dig / cut / tie / wind / …).
Ovid's call was **author all of them** rather than leave the leak — so these are the
stiffest. Many are DN reframes; the ⚠ ones reword heavily.

| #   | EN source                                           | Draft Georgian                      | Rung | Note                                                |
| --- | --------------------------------------------------- | ----------------------------------- | ---- | --------------------------------------------------- |
| 23  | `The {obj} is rudely awakened.`                     | {obj.indef} უხეშად იღვიძებს.        | NS   | "the X is rudely awakened"                          |
| 24  | `The {obj} isn't sleeping.`                         | {obj.indef} არ სძინავს.             | NS   | "the X isn't sleeping"                              |
| 25  | `With a {obj}??!?`                                  | ამით??!?                            | DN   | "with this??!?"                                     |
| 26  | `You can't burn a {obj}.`                           | {obj.indef} არ იწვის.               | NS   | "the X doesn't burn"                                |
| 27  | `You can't climb onto the {obj}.`                   | ამაზე ვერ აძვრები.                  | DN   | "you can't climb onto this"                         |
| 28  | `You must tell me how to do that to a {obj}.`       | ვერ მივხვდი, რა გნებავთ.            | DN   | ⚠ full reframe "I couldn't tell what you want"      |
| 29  | `The {obj} pays no attention.`                      | {obj.indef} ყურადღებას არ აქცევს.   | NS   | "the X pays no attention"                           |
| 30  | `Strange concept, cutting the {obj}....`            | ამის ჭრა? უცნაური აზრია....         | DN   | "cutting this? a strange idea…."                    |
| 31  | `Digging with the {obj} is slow and tedious.`       | ამით თხრა ნელი და მოსაბეზრებელია.   | DN   | "digging with this is slow and tedious"             |
| 32  | `Digging with a {obj} is silly.`                    | ამით თხრა სისულელეა.                | DN   | "digging with this is silly"                        |
| 33  | `The {obj} refuses it politely.`                    | {obj.indef} თავაზიანად უარს ამბობს. | NS   | "the X politely refuses"                            |
| 34  | `Why knock on a {obj}?`                             | ამას რად აკაკუნებ?                  | DN   | "why knock on this?"                                |
| 35  | `The {obj} makes no sound.`                         | {obj.indef} ხმას არ გამოსცემს.      | NS   | "the X makes no sound"                              |
| 36  | `There is nothing behind the {obj}.`                | მის უკან არაფერია.                  | DN   | "there's nothing behind it"                         |
| 37  | `Look on a {obj}???`                                | ზედ რას ნახავ???                    | DN   | ⚠ reframe "what would you see on top???"            |
| 38  | `It's not clear that a {obj} can be melted.`        | {obj.indef} ალბათ ვერ დნება.        | NS   | "the X probably can't be melted"                    |
| 39  | `Ahoy -- {obj} overboard!`                          | ჰეი — {obj.indef} წყალში გადავარდა! | NS   | "hey — the X fell overboard!"                       |
| 40  | `Pump it up with a {obj}?`                          | ამით გაბერავ?                       | DN   | "pump it up with this?"                             |
| 41  | `How does one look through a {obj}?`                | ამაში როგორ გაიხედავ?               | DN   | "how would you look through this?"                  |
| 42  | `It is hardly likely that the {obj} is interested.` | {obj.indef} ნაკლებად დაინტერესდება. | NS   | "the X is hardly interested"                        |
| 43  | `Why would you send for the {obj}?`                 | ამას რად დაიბარებ?                  | DN   | "why send for this?"                                |
| 44  | `It smells like a {obj}.`                           | უცნაური სუნი აქვს.                  | DN   | ⚠ reframe "it has a strange smell" — object dropped |
| 45  | `The {obj} does not understand this.`               | {obj.indef} ამას ვერ იგებს.         | NS   | "the X doesn't understand this"                     |
| 46  | `You can't talk to the {obj}!`                      | ამას ვერ დაელაპარაკები!             | DN   | "you can't talk to this!"                           |
| 47  | `You can't tie the {obj} to that.`                  | ამის იქ მიბმა ვერ მოხერხდება.       | DN   | "tying this there can't be done"                    |
| 48  | `You cannot wind up a {obj}.`                       | ამის დაჭიმვა ვერ მოხერხდება.        | DN   | "winding this up can't be done"                     |
| 49  | `A nice idea, but with a {obj}?`                    | კარგი აზრია, მაგრამ ამით?           | DN   | "a nice idea, but with this?"                       |
| 50  | `It seems that a {obj} won't do.`                   | როგორც ჩანს, ამით არ გამოვა.        | DN   | "it seems this won't do"                            |
| 51  | `Why would you tie up a {obj}?`                     | ამას რად შეკრავ?                    | DN   | "why tie this up?"                                  |
| 52  | `It looks pretty much like a {obj}.`                | ჩვეულებრივ რამეს ჰგავს.             | DN   | ⚠ reframe "it looks like an ordinary thing"         |

---

## Group G — Multi-slot + all-language gaps (8)

Two-object splices, plus the last two (`extinguished` / `burns and is consumed`)
which were **uncovered in every language** and authored fresh.

| #   | EN source                                                                                 | Draft Georgian                            | Rung | Note                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 53  | `You can't give a {obj} to a {obj2}!`                                                     | ამის მიცემა ვერ მოახერხებ!                | DN   | both slots dropped → "you can't give this away!"                                                                             |
| 54  | `Trying to destroy the {obj} with a {obj2} is futile.`                                    | ამის დანგრევა ამით ფუჭია.                 | DN   | object→ამის, instrument→ამით                                                                                                 |
| 55  | `Trying to destroy the {obj} with your bare hands is futile.`                             | ამის ხელით დანგრევა ფუჭია.                | DN   | "destroying this by hand is futile"                                                                                          |
| 56  | `Your skillful {obj}smanship slices the {obj2} into innumerable slivers which blow away.` | ოსტატურად დააქუცმაცებ.                    | DN   | ⚠ **both slots dropped, incl. the `{obj}smanship` pun** → "you skillfully shred it" — biggest loss of flavour, please reword |
| 57  | `The "cutting edge" of a {obj} is hardly adequate.`                                       | ამის პირი საჭრელად არ ვარგა.              | DN   | "this thing's edge is no good for cutting"                                                                                   |
| 58  | `The water leaks out of the {obj} and evaporates immediately.`                            | წყალი გადმოიღვრება და მაშინვე აორთქლდება. | DN   | object dropped → "the water spills and instantly evaporates"                                                                 |
| 59  | `The {obj} is extinguished.`                                                              | {obj.indef} ჩაქრა.                        | NS   | all-language gap; "the X went out"                                                                                           |
| 60  | `The {obj} burns and is consumed.`                                                        | {obj.indef} იწვის და ნადგურდება.          | NS   | all-language gap; "the X burns and is destroyed"                                                                             |

---

## Group H — Parser implicit-object parenthetical (16)

Added UAT 2026-06-24, **named-instrument pins added 2026-06-24 (this branch).** When
the parser auto-supplies a uniquely-determined missing object it prints it on its own
line — bare `(<obj>)` or `(with the <obj>)`. fr/de/es generalize both; `ka` had only
the `(with the match)` → `(ასანთით)` pin, so e.g. `attack troll` → `(with the sword)`
leaked raw English.

**The open question (drop-noun vs. name-the-weapon) is now RESOLVED — Ovid chose to
name the weapon/tool in the instrumental.** So rows 63–76 below are **per-object named
INSTRUMENTAL string pins** in `zork1.ka.strings.ts` (each beats the `(with the {obj})`
template by specificity), modelled on the pre-existing `(ასანთით)` = "with the match".
The caseless drop-noun `(ამით)` (row 62) **stays as the leak-proof fallback** for any
auto-suppliable object not pinned. **What we need from you:** confirm the §4 case of
each pin — especially the ⚠ multi-word adj+noun / numeral / genitive-chain rows, where
we declined the head noun and left the attributive adjective in its `-ი` citation form
(our best guess at instrumental attributive agreement). The auto-supply fires only when
ONE instrument is eligible, so the caseless fallback is unambiguous.

| #   | EN source                       | Draft Georgian           | Rung | Note                                                                                                |
| --- | ------------------------------- | ------------------------ | ---- | --------------------------------------------------------------------------------------------------- |
| 61  | `({obj})`                       | `({obj.indef})`          | NS   | bare auto-supplied object, e.g. `(brass lantern)` → `(სპილენძის ფარანი)` — nominative citation      |
| 62  | `(with the {obj})`              | `(ამით)`                 | DN   | leak-proof **fallback** for any un-pinned auto-supply → "(with this)"; ONE-eligible, so unambiguous |
| 63  | `(with the sword)`              | `(მახვილით)`             | pin  | მახვილი → -ით                                                                                       |
| 64  | `(with the stiletto)`           | `(სტილეტით)`             | pin  | სტილეტი → -ით                                                                                       |
| 65  | `(with the sceptre)`            | `(სკიპტრით)`             | pin  | სკიპტრა → -ა truncates → -ით                                                                        |
| 66  | `(with the torch)`              | `(ჩირაღდნით)`            | pin  | ⚠ syncopated stem ჩირაღდანი → ჩირაღდნ- (corpus-attested via ჩირაღდნის) → -ით; confirm               |
| 67  | `(with the shovel)`             | `(ნიჩაბით)`              | pin  | ნიჩაბი → -ით (transparent; no oblique attested — confirm if syncope ნიჩბით is natural)              |
| 68  | `(with the screwdriver)`        | `(სახრახნისით)`          | pin  | სახრახნისი → -ით                                                                                    |
| 69  | `(with the nasty knife)`        | `(საზიზღარი დანით)`      | pin  | ⚠ adj+noun: დანა → დანით, adj kept `-ი`                                                             |
| 70  | `(with the rusty knife)`        | `(დაჟანგული დანით)`      | pin  | ⚠ adj+noun                                                                                          |
| 71  | `(with the bloody axe)`         | `(სისხლიანი ცულით)`      | pin  | ⚠ adj+noun: ცული → ცულით                                                                            |
| 72  | `(with the skeleton key)`       | `(ღია გასაღებით)`        | pin  | ⚠ adj+noun: გასაღები → გასაღებით, adj ღია (vowel-stem) unchanged                                    |
| 73  | `(with the viscous material)`   | `(ბლანტი მასალით)`       | pin  | ⚠ adj+noun: მასალა → მასალით                                                                        |
| 74  | `(with the wrench)`             | `(ქანჩის გასაღებით)`     | pin  | ⚠ genitive compound (RESOLVED 2026-06-25): head გასაღები → გასაღებით; modifier ქანჩის kept genitive |
| 75  | `(with the pair of candles)`    | `(ორი სანთლით)`          | pin  | ⚠ numeral + syncope: ორი + სანთელი → სანთლ- → -ით                                                   |
| 76  | `(with the hand-held air pump)` | `(ხელის ჰაერის ტუმბოთი)` | pin  | ⚠ genitive chain: head ტუმბო (stable -ო) → -თი; modifiers ხელის ჰაერის kept genitive                |

> `(with the match)` → `(ასანთით)` is the pre-existing pin this pattern was modelled on
> (it lives by the match strings in `zork1.ka.strings.ts`); not re-listed here.

> **Browser UAT 2026-06-24 (`notes/uat-6.md`) — MECHANISM confirmed in real play for
> rows 63, 69, 71.** `attack trophy case` / `attack troll` (incl. 6× live combat) →
> `(მახვილით)` (63 sword); `cut rope` → `(საზიზღარი დანით)` (69 nasty knife); post-kill
> `attack troll` → `(სისხლიანი ცულით)` (71 bloody axe). Each fired its **own** display
> line (`<p lang="ka">`, inside the `aria-live=polite` transcript), rendered the
> **named** form (never `(ამით)`, no Latin), and logged **zero** `loquorMisses()`. This
> confirms the **routing/rendering only** — the §4 case / naturalness of all rows
> (incl. these three; 69 & 71 are ⚠ adj+noun) **still awaits native review.** Rows
> 64–68, 70, 72–76 were not reached live (deep dungeon) and remain unit-test-pinned.

---

## Phase-2 follow-up: `{raw}`-echo templates (revisit when Georgian input lands)

Today `ka` is **output-only / type-English**, so a template that echoes the player's
own typed English noun (`{raw}`) is acceptable — the player typed that English word.
**Phase 2 (Georgian input) breaks that assumption**: the echoed token becomes _forced
English_ in an otherwise-Georgian line. Every `ka` `{raw}`-echo must be revisited
then:

- The **orphan prompts** above (Group A) — their `ka` drafts already **drop**
  `{verb}`/`{raw}`, so they're Phase-2-clean. Good.
- `You can't see any {raw} here!` (Task 8 parser noun-echo) — `ka` uses a `{raw}`-echo
  template. **Revisit.**
- The disambiguation templates `Which {raw} do you mean, the {obj} or the {obj2}?`
  (prior branch) — `ka` echoes `{raw}`. **Revisit.**

When Georgian input exists, these need a Georgian noun (with correct case) in place of
the echoed English — or the same drop-the-token reframe used in Group A.

## Reviewer priority

If time is short, fix the ⚠ rows first (rows 15, 21, 28, 37, 44, 52, 56) — they are
the heaviest reframes and the `{obj}smanship` pun (56) is the biggest flavour loss.
Then check the **Group H instrumental pins** (rows 63–76): the ⚠ multi-word ones —
adj+noun (69–74), numeral+syncope (75 candles), genitive-chain (76 pump) — plus the
two syncopated single words (66 torch, 67 shovel) need a native case/agreement check;
the clean `-ი`/`-ა` single words (63 sword, 64 stiletto, 65 sceptre, 68 screwdriver)
are lower risk. Then sweep the DN rows: for each, decide whether naming the object (in
the right §4 case) reads better than the caseless demonstrative. The NS rows mostly need
a tense / agreement check (e.g. is `იხურება` "closes" right for "is now closed"?).
