# Georgian Input (Phase 2) — Work Status

Derived from the UAT on 2026-06-24 (branch `ovid/georgian-input`). The game itself
is in great shape: a full **350/350 Zork I win was achieved typing only Georgian**.

**Update 2026-06-25 (this session):** most of the backlog below is now **done**.
What remains for you is **two decisions** — the `wrench` word (#2) and dropping
`(beta)` (#6) — both flagged below. Suite is green: `103 files / 1728 tests`.

---

## DONE this session

- **#1 Landing copy (P1)** — `landingStrings.ts` `KA_INPUT_COPY` + `landingExamples.ts`
  `LANDING_EXAMPLES_KA_INPUT`, gated in `Landing.tsx` on `kaInputActive(language,
selectedSig)`. Georgian-input copy + Georgian example commands show for **Zork I**;
  **Zork II/III keep the Phase-1 type-English copy** (they have no ka lexicon, so an
  invite would always abstain). Georgian examples are voiced as `lang="ka"` (the
  `lang="en"` override now applies only to the Phase-1 English examples). Tests pin the
  signature split + a no-English-leak guard on `KA_INPUT_COPY` (only `(beta)` Latin
  allowed).
- **#3 crawlway** — the off-reading `სავლები` → `ცოცვით გასავლელი` (crawl-root,
  reframed as a nominative clause distinct from the narrow passage north). Display-only.
- **#4 push / untie** — `წადე`→`უბიძგე` (push), `ახსენი`→`მოხსენი` (untie, distinct from
  `გახსენი`=open and `ახსენე`=mention). Off the winning path. All still NATIVE-REVIEW-DRAFT.
- **#5 `{raw}` parser-echo (P3)** — added the missing `"You can't see any {obj} here!"`
  variant ka lacked (fr/de/es had it): a known object is now **named in Georgian**
  (`ტროლი აქ არ ჩანს!`) via a §4-safe nominative reframe. The `{raw}` fallback remains
  **only** for a noun with no corpus object — i.e. a genuinely untranslatable token or
  the player's own raw-sent English, where verbatim echo is the honest behavior.
- **NEW — compound + go-verb wiring** — surfaced while building the landing example.
  Natural Georgian `აიღე ფარანი და წადი ჩრდილოეთით` ("take the lamp and go north") did
  **not** work in-game: `splitClauses` had no Georgian `და`, and `LEAD` had no `წადი`.
  Both wired (`inputTranslate.ts`, `directions.ts`) with tests. This is a real in-game
  gap, not just a landing concern — a Georgian player would naturally type both forms.

---

## DECISION NEEDED — #2 `wrench` word (`სასხლეტი`, literally "trigger")

`სასხლეტი` parses fine but reads oddly. The correct term is **`ქანჩის გასაღები`**
(nut-key; web-confirmed via the Nova hardware retailer's category). **But it is NOT a
safe string swap**, and that's why I stopped:

- The wrench is **on the 350 winning path**, including the instrumental
  `მოატრიალე ხრახნი სასხლეტით` ("turn bolt with wrench").
- `ქანჩის გასაღები` is a **two-word genitive**. `expandGeorgian("ქანჩის გასაღებით")`
  yields `ქანჩის · ით · გასაღებ` — the genitive `ქანჩის` is **stranded before the "with"**,
  and the instrument resolves to bare `გასაღებ` (= "key", which collides with the
  skeleton key). `ქანჩი` alone = "nut" = the **bolt** the wrench turns, so it can't be a
  wrench synonym either.
- This is exactly the **general-morphology case the spec deliberately deferred** (§8):
  the single nominative-citation form can't decline a genitive compound in the
  instrumental. `სასხლეტი` works only because it's a clean single token.

**Options (your call):**

1. **Keep `სასხლეტი`** for now; revisit with the native loop, which may suggest a clean
   single-token term or a parse-safe colloquial instrument form.
2. **Switch display to `ქანჩის გასაღები`** (player reads the correct word) and make input
   accept the nominative `ქანჩის გასაღები`, **but** the formal instrumental
   `ქანჩის გასაღებით` would still strand — needs the deferred morphology work or a native
   ruling on an acceptable parse-safe form.
3. **Do the morphology work** (handle a stranded genitive before a postposition) — larger,
   out of the Phase-2 scope as written.

**Your call: defer + write a spec.** The general problem (multi-word genitive objects in
case roles — not just wrench) is written up as design input in
**`notes/georgian-genitive-case-morphology.md`** to seed that spec. `სასხლეტი` stays for
now (it parses); touch points when you build it: `src/llm/lexicon/ka.zork1.ts`,
`src/translate/corpus/zork1.ka.objects.ts`, `…strings.ts` (`(with the wrench)`), plus the
walkthrough fixtures in `parse.ka-walkthrough.test.ts`.

---

## DECISION NEEDED — #6 Drop the `(beta)` marker

Per spec §9, `(beta)` drops only on **native sign-off** of the lexicon + corpus. My
web-dictionary research improved several words (#2-4) but is **not** a native review —
I'm not a Georgian speaker. **Recommend keeping `(beta)`** until a native reviewer
confirms naturalness; dropping it now would assert a finality the strings don't yet have.
One-line change in `src/llm/languageOptions.ts` when you're ready.

---

## Still open for the native (Tbilisi) loop

All ka lexicon/corpus strings remain `NATIVE-REVIEW-DRAFT`. The session's word choices
(`ცოცვით გასავლელი`, `უბიძგე`, `მოხსენი`, `KA_INPUT_COPY`, the new `can't-see-any {obj}`
reframe) are web-grounded drafts pending that review.
