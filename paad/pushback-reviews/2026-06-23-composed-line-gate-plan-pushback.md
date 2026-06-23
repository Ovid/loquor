# Pushback Review: Composed-Line Inventory Gate — Implementation Plan

**Date:** 2026-06-23
**Plan:** `docs/superpowers/plans/2026-06-23-loquor-composed-line-gate.md`
**Spec:** `docs/superpowers/specs/2026-06-23-loquor-composed-line-gate-design.md`
**Commit (HEAD):** 7181d64 (`docs(spec): composed-line inventory gate design (P2.1)`)

## Verdict

**Needs fixes before execution.** The design is sound and the central runtime change
(`{verb}` slot) is correct and verified. But the plan's own TDD checkpoints are
wrong about two of the six seed families: the gate it specifies in Task 2 goes
**RED on the seed, not GREEN**, because the fidelity check false-FAILs the
slotless C-seed and E-seed lines. An executor following the plan literally will
hit an "expected PASS → actual FAIL" wall at Task 2 Step 2 and Task 4. Plus a real
coverage gap with the existing `ka-native-review-draft.test.ts` marker gate that
the plan never reconciles. All fixable; none invalidate the architecture.

## Source Control Conflicts

**None.** The branch `ovid/composed-line-gate` is current; HEAD is the spec
commit this plan executes. Every file the plan reads/modifies exists at the cited
state:

- `src/translate/match.ts` line 28 (`SLOT`) and lines 94–97 (the `else` raw
  branch) match the plan's diff targets exactly.
- `src/translate/match.test.ts` exists (the plan's "append if the file exists" is
  correct).
- `corporaFor(ZORK1_SIG)` yields `fr, es, de, ka` in that order — the plan's inline
  comment `// for fr/es/de/ka` is accurate.
- `composed-lines.uat.test.ts` exists with the 7 pins the plan absorbs.
- The `{obj}…{obj4}/{num}/{num2}/{raw}` slot set, the `seen` duplicate-slot guard,
  the specificity sort, and `OUT_REF` are all as the plan describes.

No recent commit has moved or renamed anything the plan depends on.

---

## Findings (severity-ordered)

### [1] CRITICAL — The C-seed and E-seed FALSE-FAIL fidelity; Task 2 is RED, not GREEN

- **Category:** code correctness / TDD integrity
- **Where:** Task 2 Step 2 (claims "Expected: PASS … every distinctive span … is
  real game text"), seed families C and E in Task 1 Step 1.
- **Problem (verified against the real `zork1.z3` + the plan's own `literalSpans`):**
  - **C-seed** `'Opening the small mailbox reveals a leaflet.'` is modeled as a
    slotless literal (`instances: [{}]`). With no `{slot}` to split on, its single
    literal span is the **entire sentence**. That sentence is **not** a contiguous
    decoded fragment — the game composes it at runtime as `"Opening the "` + obj +
    `" reveals "` + contents. I ran the plan's `literalSpans` against
    `displayLines(extractStrings(zork1.z3))`:
    `[FAIL] span="Opening the small mailbox reveals a leaflet"`. The strings
    `"reveals a"`, `"the small mailbox"`, `"small mailbox reveals"` return **zero**
    haystack hits.
  - **E-seed** `'What do you want to put the {raw} in?'` → span
    `"What do you want to put the"` → `[FAIL]`. The only real decoded fragment is
    `"What do you want to"` (the verb `put` is runtime-spliced).
  - The plan's Task 2 Step 2 explicitly lists _both_ of these as passing spans
    (`"Opening the small mailbox reveals a leaflet."` and `"What do you want to"` —
    note it silently swaps the E span to the shorter real one but leaves the C span
    as the full sentence). So the plan's stated GREEN is self-contradictory: by its
    own fidelity rule the seed is RED.
- **Why it matters:** Task 2's entire purpose is to prove the gate end-to-end on a
  known-good seed _before_ any new content. If the seed is red for a spurious
  reason, the executor can't tell a real transcription bug from the model-shape
  bug, and the "fix the `en`" instruction in Task 2 Step 2 is actively
  misleading — the C-seed `en` is _correct game wording_; it's the slotless
  literal modeling that breaks fidelity, not a mis-transcription.
- **Root cause (structural, not a typo):** the fidelity check assumes every
  family's `en` decomposes (via slot/join split + edge-strip) into spans that are
  each contiguous decoded fragments. That holds for slot-bearing skeletons
  (`"You can't wear the"`, `"is closed"`, `"What do you want to"` all PASS) but
  **fails for any family expressed as a fully-resolved literal of a composed
  line**, because the resolved object/contents are spliced in at runtime and the
  whole-sentence span never appears in the string table.
- **Recommended fix:** Re-model C and E so fidelity sees only real fragments.
  - C: express it as the listing-engine reveal family with a slot —
    `'Opening the {obj} reveals {raw}'` (or move it into the Task-6 listing group)
    so the spans become `"Opening the"` (PASS) + `"reveals"` (PASS). If a literal
    2-object instance is genuinely wanted, drive it via `instances:[{obj:'small
mailbox', raw:'a leaflet'}]` on a slotted `en` so the spans decompose.
  - E: it is already superseded in Task 4 by `'What do you want to {verb} the {raw}
in?'` (span → `"What do you want to"`, PASS). Either seed Task 1 directly with
    the `{verb}` form (requires Task 3's slot first — reorder), or have Task 1 seed
    the E family with an `en` whose only ≥4-char non-slot span is `"What do you want
to"` and explicitly note in Task 2 that the C/E spans reduce to fragments.
  - Whichever path: **correct the "Expected: PASS" span list in Task 2 Step 2** to
    the spans that actually exist (`"Opening the"`, `"reveals"`, `"What do you want
to"`), and add a one-line rule to `composed-families.ts`'s header: _"never
    model a composed line as a slotless literal — fidelity requires the variable
    parts to be slots."_

### [2] SERIOUS — New `ka` drafts escape the existing NATIVE-REVIEW-DRAFT marker gate

- **Category:** omission / CLAUDE.md compliance
- **Where:** Tasks 4–8 author many new `ka` Georgian `out` lines in
  `zork1.ka.templates.ts` and per-object pins in `zork1.ka.strings.ts`. The plan's
  File Structure table and tasks never touch
  `src/translate/corpus/ka-native-review-draft.test.ts`.
- **Problem:** That existing test enforces a `NATIVE-REVIEW-DRAFT` marker comment
  above each _new_ ka Georgian line — but it is **narrowly scoped** to two specific
  template entries (the disambiguation template, located by `{raw}`+`{obj.indef}`;
  and the incomplete-put line, located by the exact string `'რაში გსურთ მისი
ჩადება'`). It does **not** scan every Georgian line in `zork1.ka.templates.ts`
  (the comment says the file is "PRE-EXISTING reviewed … Only ONE entry was
  added/flagged this branch"). So the plan's new orphan drafts
  (`რით გსურთ მისი გაკეთება?`, `რისი გაკეთება გსურს?`) and every Tasks 5–8 ka draft
  get **no marker enforcement at all**. The spec and CLAUDE.md require _everything
  authored_ to be `NATIVE-REVIEW-DRAFT`; there is a test that guards exactly this,
  and the plan leaves it stale.
- **Secondary hazard:** the incomplete-put assertion pins the line by the literal
  Georgian `'რაში გსურთ მისი ჩადება'`. Task 4 Step 4 reuses that exact wording for
  the generalized `{verb}…in?` template, so the `findIndex` still hits — but only by
  luck. If the executor rewords the ka draft (the plan invites "NATIVE-REVIEW-DRAFT
  … native reviewer decides final wording"), that assertion silently fails to find
  its target and the test breaks.
- **Why it matters:** `make all` is the Task-11 gate and is claimed to pass; but
  the marker test either (a) goes stale and lets unmarked drafts ship, defeating
  its purpose, or (b) breaks on rewording. Both are CLAUDE.md violations the plan
  doesn't surface.
- **Recommended fix:** Add an explicit step (Task 4 and the Task-5 loop) to extend
  `ka-native-review-draft.test.ts` so it covers each newly-authored ka draft —
  ideally generalize it to scan **all** new Georgian lines added on this branch
  against a committed allow-list of pre-reviewed entries, rather than per-entry
  `findIndex`es that rot. List this file in the File Structure table as **Modify**.

### [3] MODERATE — fr/de/es disambiguation instances may go unexpectedly RED

- **Category:** ambiguity / coverage
- **Where:** Task 5 worked example (2-/3-candidate WHICH-PRINT families), Task 5
  Step 5.
- **Problem:** fr/de/es each ship exactly **one** `do you mean` template (the
  2-candidate "book" pin, per the ka file's own comment "they keep only the
  2-candidate book pin"); ka ships all four arities. The worked example drives a
  **dam-buttons** instance (`blue/red/yellow button` — all confirmed present in
  every object table). Whether the fr/de/es 2-candidate template _matches the
  buttons instance_ depends on whether that pin is a generic `{obj}/{obj2}` template
  or a fixed-object string. If fixed/book-specific, the buttons instance MISSES →
  the gate goes RED for fr/de/es on the 2-candidate, and the 3-candidate is RED for
  fr/de/es regardless (no template). The plan says "add EXEMPTIONS … if fr/de/es
  deliberately LLM-route disambiguation" but states this as optional ("if"),
  leaving the executor to discover the RED and decide.
- **Why it matters:** A confusing RED that the plan frames as a maybe. The spec's
  decision 3 says disambiguation is the documented fr/de/es exemption — the plan
  should make adding those EXEMPTIONS entries (with the `why` the spec mandates) a
  definite step, not conditional.
- **Recommended fix:** In the worked example, make the EXEMPTIONS entries for the
  3-/4-candidate (and the 2-candidate if it doesn't match the buttons instance)
  fr/de/es **mandatory**, citing the spec's "disambiguation prompt — deliberately
  LLM-routed" `why`. Keep ka asserted (it has the templates and no LLM net).

### [4] MODERATE — REACHABLE_FLOOR arithmetic at Task 4 is off-by-one / under-specified

- **Category:** counts/consistency
- **Where:** Task 4 Step 2 ("was 6; replace put-in with `{verb}…in?` then +2 → set
  to 8").
- **Problem:** The seed is described as "6 families (the two E-pins are one put-in
  family)". But Task 1 seeds **six `Family` objects** where one is the C literal,
  two are D pins, **one** is the E put-in, one F, one G — that _is_ 6 reachable.
  Task 4 then "replaces the put-in family" (net 0) and "appends" the `…with?` and
  `…?` orphan families (+2) → 8. The arithmetic (6→8) is internally consistent
  **only if** the C-seed remains a counted reachable family. But finding [1] forces
  C to be re-modeled or folded into Task 6's listing group; if C moves out of the
  seed, the floor at Task 4 should be 7, not 8. The plan never states whether C
  stays in the seed count after the fidelity fix.
- **Why it matters:** REACHABLE_FLOOR + the completeness meta-test are the
  anti-vacuous-pass guards; an off-by-one makes the floor either trivially loose or
  spuriously red.
- **Recommended fix:** After fixing [1], restate the seed count explicitly and make
  every floor bump in Tasks 4/5/6/7/8 read "set to `REACHABLE.length` as printed by
  the gate's `reachable inventory ≥ floor` line" rather than hand-arithmetic.
  Better: derive the floor message from `REACHABLE.length` and only assert
  `>= REACHABLE_FLOOR`, so the executor copies the observed number.

### [5] MINOR — `displayLines` truncation can split distinctive spans (false-FAIL risk in later groups)

- **Category:** feasibility / fidelity-check robustness
- **Where:** the `HAYSTACK` construction (Task 2) and every later group's recon.
- **Problem:** `extractStrings` is _anchored_, not exhaustive, and the decoded
  inventory contains truncated/garbled fragments (e.g. I observed
  `"ug is extremely heavy and cannot be carried."` and
  `"cyclops … qa8,The trophy case is securely fastened to the wall."` alongside the
  clean lines). The clean full fragments _do_ exist for the seed (verified: D, F, G
  all PASS), so the seed is fine. But for **later** groups (Tasks 6/7), a
  distinctive response span that happens to live only inside a longer composed
  TELL may appear only as a mid-string substring — which `HAYSTACK.includes()` still
  catches (good) — OR a span that the game emits but `extractStrings` never anchored
  could **false-FAIL** a genuinely-correct skeleton. The plan's "if a span MISSES,
  fix the `en`" instruction would then send the executor to "fix" correct wording.
- **Why it matters:** Low frequency, but the failure mode is the same trap as [1]:
  a fidelity RED that isn't a transcription bug. The spec's own `ponytail` note
  ("the floor lets trivial glue through … tighten only if a glue-level bug is
  found") acknowledges the check is heuristic.
- **Recommended fix:** Add a sentence to Task 5 Step 1: _"If a span MISSES but the
  recon snippet shows the fragment IS in the decoded output, the miss is an
  extraction-anchoring gap, not a transcription bug — split the span on a
  finer boundary or drop it below the floor; do not reword correct game text."_
  This complements the existing "do not loosen the check" guidance with the
  opposite failure mode.

### [6] MINOR — Placeholder risk in Tasks 6/7 ("apply the Task-5 loop")

- **Category:** ambiguity (fresh-engineer readiness)
- **Where:** Task 6 (listing engine) and Task 7 (single-line splices, "largest
  group"), each one paragraph that says "Follow Task 5 Steps 1–7."
- **Assessment:** This is a **legitimate recipe, not a hidden hand-wave** — the
  judgment is defensible. The gate _generates_ the per-cell worklist (RED output),
  Task 5 defines the exact red→green→commit loop and works one group end-to-end
  (disambiguation), and the decision ladder for ka (rung 1/2/3) is concrete. Not
  inlining ~40 families of Georgian is correct: fabricating authoritative Georgian
  would defeat the "gift to native reviewers" intent the spec and CLAUDE.md stress.
  **However**, Task 7 bundles the single largest, most heterogeneous group
  ("already open/closed", "now on/off", multi-`<obj>:` labels, the deferred
  joke-insult tail) behind one paragraph with only "split into 2–3 commits if the
  diff grows unwieldy." A fresh engineer has no list of _which_ splices are
  reachable vs deferred — the spec says 124 distinct single-line families exist.
- **Why it matters:** The risk isn't fabrication; it's _scoping drift / fatigue_ on
  the 124-family tail, where the executor must repeatedly judge reach and pick ka
  rungs. The "bias to reachable" rule mitigates leak risk but not effort estimation.
- **Recommended fix:** In Task 7, commit to a concrete sub-grouping up front (e.g.
  "state-toggle splices", "container/destination splices", "take/drop labels",
  "deferred exotic tail") with a rough family count each from the recon, so the
  executor knows the shape of the work rather than discovering it. List the
  deferred exotic verbs the recon already found in `EXPECTED_DEFERRED` seed notes.

### [7] MINOR — Completeness meta-test's ordering dependency is real but acceptable

- **Category:** TDD integrity
- **Where:** Task 2 gate, test (6) "every reachable family was asserted".
- **Assessment (verified):** The `asserted` Set accumulator + the final
  completeness `it` rely on Vitest running in-file tests sequentially in
  registration order. I confirmed the repo's `vitest.config.ts` uses defaults (no
  `sequence.shuffle`, no `test.concurrent` anywhere in `src/translate/`), so the
  assumption **holds today**. The plan flags it in a code comment ("relies on
  Vitest's in-file sequential default"). This is sound but fragile: a future
  `--sequence.shuffle` or a `describe.concurrent` would silently break it (could
  false-PASS if the completeness `it` runs before some family `it`s, or false-FAIL).
- **Recommended fix (optional):** Compute `asserted` size from the _same_ iteration
  that drives the assertions, or assert completeness structurally
  (`REACHABLE.length === COMPOSED_FAMILIES.filter(isReachable).length` is vacuous;
  instead assert each family's translate-`it` exists by name). Low priority — the
  comment is honest and the default is stable. Keep as-is if churn isn't warranted.

### [8] MINOR — Player-experience: verb-neutral orphan prompt drops the player's verb

- **Category:** player experience (CLAUDE.md "talk to me first")
- **Where:** Task 4 Step 4 — all four languages render
  `What do you want to {verb} the {raw} with?` as a **generic verb-neutral**
  question (`Avec quoi voulez-vous le faire ?` / `რით გსურთ მისი გაკეთება?`),
  dropping both the player's verb and noun.
- **Assessment:** This is a _documented, reasoned_ product decision (spec
  decision 7: a verb-neutral phrasing "bakes no verb's meaning, so one per-prep
  template serves every orphaning verb … no English verb is mixed into Georgian").
  The harm is mild — the player's verb and noun are still on-screen in the echoed
  command line, and the alternative (per-verb templates) reintroduces the very
  leak surface this work closes for `ka` (no LLM net). I judge the player-harm
  **negligible and well-justified**, so it does not need a stop-and-ask under
  CLAUDE.md's rule. **Flagging it only for visibility:** the orphan prompt becomes
  noticeably more generic than original Zork's "What do you want to attack the
  troll with?". If natural fr/de/es phrasing later wants the verb back, that's an
  LLM-routed exemption, never a per-verb ka template.
- **Recommended fix:** None required. Note it in the native-review worklist (Task 10) so the Georgian reviewers can judge whether the verb-neutral reframe reads
  naturally, since they're the ones who lose the most context (no LLM net).

---

## What's solid (do not churn)

- **The `{verb}` slot runtime change (Task 3) is correct.** I simulated the exact
  `SLOT`/compile-branch diff against the real matcher logic: all four unit-test
  cases pass — verb wildcard consumed and dropped from `out`, multi-word `{raw}`
  stays anchored by the literal prep (`brass lantern`, not `brass`), no-noun form
  resolves, and `{verb} and {verb}` throws `repeated slot {verb}` (the plan's
  `/repeated slot/` assertion matches the real message). `OUT_REF` correctly stays
  untouched. The line targets (28, 94–97) are exact.
- **Task 4's no-regression claim holds.** The generalized `{verb} the {raw} in?`
  template still matches both old E-pins (`advertisement` synonym + `leaflet`
  object), so the UAT test survives until its planned Task-9 deletion.
- **The fidelity check is fundamentally well-designed** for slot-bearing
  skeletons: I verified D/F/G seeds and the orphan + listing + splice families all
  decompose to real decoded fragments (`"You can't wear the"`, `"is closed"`,
  `"What do you want to"`, `"Opening the"`, `"reveals"`, `"is now on"`, etc. all
  PASS). The slot/join split + edge-strip + ≥4 floor is the right shape — finding
  [1] is about _literal-modeled_ families, not the check's core logic.
- **The honesty architecture is genuinely stronger than the spec's literal
  `log()`.** Asserting the deferred set against `EXPECTED_DEFERRED` (CLAUDE.md
  pristine-output compliant), the floor + completeness meta-tests, the
  per-exemption `why` assertion, and the named-gating-verb discipline together
  close all three vacuous-pass paths the spec identified. Correct call.
- **The union-object drive for `ka`** (union of all corpora's keys, not ka's own)
  correctly turns a ka-missing object into a MISS rather than a silent skip — the
  spec's central anti-false-pass insight, faithfully implemented.
- **The decision to keep ka drafts as a red-gate-driven recipe** (not ~40 inlined
  fabricated translations) is the right, respectful call and is not a hidden
  placeholder — the gate generates the worklist and the ladder is concrete.
- **No vendored-dir edits.** The gate reads `public/games/zork1.z3` (a committed
  copy, not the gitignored `zork1/`) via the same `zstrings.mjs` decoder the
  inventory gate uses — no ZIL, VM, or network, exactly as claimed.

## Bottom line

Fix [1] (re-model C/E so fidelity sees real fragments and correct the Task-2
GREEN claim) and [2] (extend the marker test for new ka drafts) before executing;
make [3] and [4] definite rather than conditional. [5]–[8] are notes/robustness.
The architecture, the `{verb}` change, and the honesty design are sound and should
not be reworked.
