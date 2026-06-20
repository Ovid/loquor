# UAT run — zork1-input-parity review fixes (2026-06-20)

Manual test plan for the fixes that landed addressing the agentic code review
(`paad/code-reviews/ovid-zork1-input-parity-2026-06-20-…md`). Each fix below has
a **Setup**, **Steps**, **Expect (fixed)**, and **Was (bug)**. Tick as you go and
record anything off in a new `uat-<n>.md` findings file.

Read the process tips in `uat.md` first (focus-steal, fresh-tab-after-HMR, picker
is a custom combobox, quoted-passthrough reads all-English). Use a **fresh tab**
after any source edit.

**Languages.** `ka` (Georgian) is the critical target for I1 and I2: it is
OUTPUT-ONLY with **no LLM fallback**, so a missing template is a *guaranteed* raw-
English leak. `fr/de/es` have the LLM net, so they degrade gracefully — test them
to confirm no regression, but `ka` is where a leak actually ships.

**Georgian wording caveat.** The new `ka` strings are `NATIVE-REVIEW-DRAFT`
(provisional wording pending a native pass). For this UAT, the pass/fail bar is
**"is it Georgian, with no raw-English fragment?"** — NOT "is the Georgian
idiomatically perfect?". Flag awkward phrasing separately for the native-review
track (`georgian-native-review-followup.md`), don't fail the run on it.

---

## I1 — `put X on/under/behind` with no destination (incomplete-put prompt)

The parser reprints whatever preposition the `put` syntax carried, so
`put lamp on` (no destination) asks `What do you want to put the lamp on?`. Only
the `in` variant was templated before; `on`/`under`/`behind` leaked.

- **Setup:** Pick a language (test `ka` first, then `fr`/`de`/`es`). Be holding /
  near any object (e.g. the brass lantern from the Living Room).
- **Steps:** Type each, one per turn:
  - `put lamp on`
  - `put lamp under`
  - `put lamp behind`
- **Expect (fixed):**
  - `ka`: `სად გსურთ მისი მოთავსება?` (a generic "where do you want to place it?"
    — the prep is dropped; this is the same generic placement verb for all three).
  - `fr`: `Où voulez-vous le mettre ?` · `de`: `Wohin möchtest du es legen?` ·
    `es`: `¿Dónde quieres ponerlo?` (all three preps → the same prep-agnostic line).
  - The `in` variant still works too (`ka`: `რაში გსურთ მისი ჩადება?`).
- **Was (bug):** raw English `What do you want to put the lamp on?` (guaranteed for
  `ka`; LLM-dependent for the others).

---

## I2 — multi-candidate disambiguation (`Which X do you mean…`)

When several in-scope objects share a noun, the parser lists them all:
`the A or the B?` (2), `the A, the B, or the C?` (3), `the A, the B, the C, or
the D?` (4). Only the 2-candidate form was templated; **3+ leaked**. The real-game
case is the **4 dam-control buttons**.

### I2a — the 4 dam buttons (the golden-path case)

- **Setup:** Reach the **Maintenance Room** in the dam area (the room with the
  blue / yellow / brown / red buttons). It's deep in the underground — use a saved
  game if you have one, or navigate there (Dam → Dam Lobby → Maintenance Room).
  Test in `ka`.
- **Steps:** `push button`  (the four buttons all answer to `button`/`switch`)
- **Expect (fixed):** a Georgian prompt of the form
  `რომელ button-ს გულისხმობ — ყვითელი ღილაკი, ყავისფერი ღილაკი, წითელი ღილაკი თუ ლურჯი ღილაკი?`
  — i.e. all four buttons rendered in Georgian, the typed noun `button` kept in
  English (by design — `ka` types English), joined by `თუ` ("or"), **no** raw
  `Which … do you mean, the … or the …?` frame.
- **Was (bug):** the entire prompt leaked as raw English for `ka`.
- **Cross-check `fr/de/es`:** `push button` there should still produce a clean
  localized prompt **via the LLM** (these keep only the 2-candidate corpus pin on
  purpose — a corpus 4-button template would bake the English noun into their
  output). Confirm no raw-English leak and no `"button"` embedded in the French.

### I2b — a 2-candidate prompt still works (regression guard)

- **Setup:** Any spot with two same-noun objects in scope (e.g. late-game two
  lanterns, or two knives).
- **Steps:** `examine lantern` / `take knife` (whatever yields the ambiguity)
- **Expect:** the 2-candidate localized prompt still renders (unchanged behavior).

---

## I3 — command-field `lang` for Georgian (a11y; needs a screen reader)

For output-only `ka`, the command field's typed value is **English**, so it must
not be tagged `lang="ka"` (which voices typed English with Georgian phonemes).

- **Setup:** Pick `ka`. Turn on a screen reader (VoiceOver / NVDA / Orca).
- **Steps:** Focus the command field and type an English command (`open mailbox`);
  listen to how the typed text and the field are announced.
- **Expect (fixed):** the typed English is voiced as **English**, not with Georgian
  phonemes. (The field's localized *name/placeholder* — "type in English",
  `აკრიფეთ ინგლისურად…` — is separate and still announced in Georgian.)
- **Was (bug):** the whole input was tagged `ka`, so a screen reader pronounced the
  English value as Georgian.
- **No screen reader?** Spot-check in DevTools: the `<input class="cmd">` should
  have **no** `lang="ka"` attribute under `ka` (it carries `lang` only for
  fr/de/es input). The aria-label stays Georgian.

---

## I4 — activation nudge survives the upgrade-accept path

Picking a non-cached language activates grammar-only **and** opens the upgrade
modal. The one-time escape-hatch nudge must survive accepting the upgrade.

- **Setup:** Start with **no model cached** for the language (fresh profile, or
  clear the WebLLM cache). Pick `de` (or `fr`/`es`).
- **Steps:** The upgrade modal appears → **accept** the download → wait for it to
  finish (the `…thinking` / downloading chrome settles to the active language).
- **Expect (fixed):** once the model is on, the escape-hatch nudge appears in the
  notice region:
  - `de`: starts `Tipp: …` · `fr`: `Astuce : …` · `es`: `Consejo: …`
  (the `"wind up canary"` quoted-escape hint + "type `hilfe`/`aide`/`ayuda`").
- **Was (bug):** accepting the download wiped the nudge (`setNotice(null)`) and the
  per-language latch never re-fired — a first-time upgrading player never saw the
  P3 hint. (Players who *declined* the modal always kept it.)
- **Cross-check:** **decline** the modal instead → the nudge should still appear
  (grammar-only path, unchanged). Re-picking the same language later shows it only
  once (latch).

---

## help intercept (regression spot-check — landed earlier this branch)

Not a review fix, but exercise it while you're in here.

- **Steps:** type `help` in `en`, then the localized word per language
  (`aide` fr, `hilfe` de, `ayuda` es, `help` for `ka`).
- **Expect:** a localized cheat-sheet in the notice region (meta-verbs +, for
  fr/de/es, the quoted-English escape hint). English `help` also intercepts now
  (no native Zork help to fall through to). No game turn is burned.

---

## Quick reference — what changed in code

| Fix | Files | Net |
|-----|-------|-----|
| I1  | `src/translate/corpus/zork1.{fr,de,es,ka}.templates.ts` | `put on/under/behind` prompt keys |
| I2  | `src/translate/match.ts` (+`{obj3}`/`{obj4}`), `zork1.ka.templates.ts` | 3-/4-candidate disambiguation for `ka` |
| I3  | `src/ui/Terminal.tsx` | input `lang` follows input language (untag `ka`) |
| I4  | `src/llm/useNaturalLanguage.ts` | defer activation nudge while upgrade modal open |
| S2  | `src/llm/help.ts`, `notices.ts` | one canonical escape example |

All pinned by automated tests (`make test`, 1220 green) — this UAT is to confirm
the **player-visible** behavior in the real app, especially the `ka` no-LLM paths
and the I3 screen-reader pronunciation that tests can't see.
