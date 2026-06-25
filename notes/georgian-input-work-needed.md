# Georgian Input (Phase 2) — Work Needing To Be Done

Derived from the UAT on 2026-06-24 (branch `ovid/georgian-input`). The game itself
is in great shape: a full **350/350 Zork I win was achieved typing only Georgian**,
all spec §6 gates are green (`103 files / 1717 tests`), and every Phase-2 grammar
feature (postpositions, dative recipient, directions, abstain, English raw-send,
disambiguation drop-the-noun reframe) was verified live in the browser.

These items are what's left — none of them block play. Priority order.

---

## P1 — Player-facing Phase-2 gap (worth deciding/doing before drop-the-beta)

### 1. Landing/title-screen copy still says "type English" for Georgian, and isn't game-aware
- **What the player sees:** On the title screen with **Georgian + Zork I selected**, the
  "how to play" block, the caveat line, and the example commands all tell the player
  to type commands in **English** with **English** examples (`take the lamp and go north …`).
- **Why it matters:** It's the first impression and it *contradicts* the (correct)
  in-game placeholder/tip (`აკრიფეთ ქართულად ან ინგლისურად`) and the entire Phase-2
  premise. A Georgian speaker is told "type English" exactly where you'd want to invite
  Georgian. Not a hard blocker (the in-game placeholder reveals Georgian on command 1),
  but it undersells the headline feature of the gift.
- **Where:**
  - `src/ui/landingStrings.ts` → `ka.howToBody` and `ka.caveat` (Phase-1 type-English copy)
  - `src/ui/landingExamples.ts` → `LANDING_EXAMPLES.ka` (currently the English examples verbatim)
- **Why it's more than a quick string swap (i.e. why I left it for you):** a *correct*
  fix must mirror the spec's §5.6 `kaInputActive` signature-split — Georgian-input copy
  for **Zork I**, but **type-English** copy retained for **Zork II/III** (which stay
  Phase-1). That requires:
  1. Wiring the **selected-game signature** into the landing copy selection (today the
     `ka` arm is keyed by language only).
  2. **Authoring Georgian-input copy** + **Georgian example commands** (e.g.
     `აიღე ფარანი და წადი ჩრდილოეთით`, `წადი სამხრეთით`, `მიმოიხედე`) — `NATIVE-REVIEW-DRAFT`.
  3. An **a11y change**: today the English examples sit in a `lang="en"` region (so a
     screen reader pronounces them in English); Georgian examples need a `lang="ka"` region.
  4. **Reworking `src/ui/landingExamples.test.ts`** — its invariant requires every example
     to parse in BASIC mode for **all three** games, but Georgian input is **Zork-I-only**,
     so that invariant conflicts with Zork-I-specific Georgian examples.
- **Decision you need to make:** the landing default. Zork I is the default selection, so
  should the landing show Georgian-input copy by default and switch to type-English when
  the user picks II/III? (Recommended: yes — mirror `kaInputActive`.)
- **Suggested approach:** brainstorm/spec the landing signature-split first (it's small but
  has a UX + a11y + test-invariant decision baked in), then implement TDD.

---

## P2 — Native-speaker review items (the Tbilisi loop, spec §9; data edits, not bugs)

All entries below are already marked `NATIVE-REVIEW-DRAFT` in code — these are just the
specific ones the UAT surfaced, so your reviewers can prioritize them.

### 2. `სასხლეტი` for "wrench" reads oddly (literally "trigger")
- In-game it renders as `სასხლეტი გასაღები`. A native term like `ქანჩის გასაღები` /
  `გასაღები` may read better. It *parses* fine.
- **Where:** input noun in `src/llm/lexicon/ka.zork1.ts`; display form in the
  `src/translate/corpus/zork1.ka.*` corpus.

### 3. `სავლები` for "crawlway" (Cellar description) reads slightly off
- Output corpus only. `სავალი` / a "crawl" phrasing may be more natural.
- **Where:** `src/translate/corpus/zork1.ka.strings.ts` (Cellar room description).

### 4. Off-winning-path lexicon verbs worth a glance
- `წადე` → "push" (unusual; "push" is normally `დააჭირე` / a `ბიძგ-` form). `დააჭირე` is
  already present and worked in-game, so `წადე` is a secondary alias.
- `ახსენი` → "untie" (can read as "mention/remind"; untie isn't on the Zork I winning path).
- **Where:** `src/llm/lexicon/ka.core.ts`.

---

## P3 — Known / deferred (decide later)

### 5. Parser-error `{raw}` still echoes the English canonical noun
- Template `You can't see any {raw} here!` → `აქ ვერანაირ „{raw}"-ს ვერ ვხედავ!` echoes the
  **English** noun (e.g. „troll", „button") for a Georgian player who typed Georgian.
- Confined to **off-path error cases** (referencing an object that isn't there) and it
  **predates Phase 2** (Phase-1 `{raw}` passthrough). The disambiguation reframe closed the
  WHICH-PRINT echo but not these `{raw}` parser-feedback templates.
- **Decision:** whether the "no forced English" north star wants these closed too (they're
  harder — the noun comes from the canonical command, not a corpus object, so there's no
  `{obj}` to substitute). Out of Phase-2 scope as written.
- **Where:** `src/translate/corpus/zork1.ka.templates.ts` (the `{raw}` parser-feedback group, ~lines 31–49).

### 6. Drop the `(beta)` marker
- Per spec §9, only after native sign-off on the lexicon + corpus. Not yet — one-line change
  in `src/llm/languageOptions.ts` when the Tbilisi loop confirms naturalness.

---

## Not needed (verified solid — for your peace of mind)
- The full Zork I winning path parses deterministically in Georgian (no LLM) — confirmed by
  a real 350/350 browser playthrough **and** the `parse.ka-walkthrough` gate.
- Abstain (Georgian notice, no leak, nothing sent), English-ASCII raw-send, and the
  disambiguation drop-the-noun reframe all work in the browser.
- `ka` never reaches an LLM; Zork II/III correctly stay Phase-1 type-English.
- `make`-level suite is green (1717 tests). No regressions introduced by this UAT (no code changed).
