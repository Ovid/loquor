// src/translate/corpus/composed-families.ts
//
// Committed inventory of Zork I runtime-COMPOSED display lines (spec
// 2026-06-23-loquor-composed-line-gate-design). Each line is glued at runtime
// from separate string fragments, so it is invisible to BOTH existing gates:
// the walkthrough gate (off the one captured path) and the inventory gate (no
// fragment is a full line). Extraction method: mechanical scan of the
// (gitignored, local-only) zork1/*.zil — <TELL "..." D ,PRSO "..."> single-line
// splices in gverbs.zil/1actions.zil, the DESCRIBE-OBJECT/PRINT-CONT listing
// engine, and the gparser.zil WHICH-PRINT + orphan prompts (recon 2026-06-23).
//
// A reviewer audits every tag by reading THIS file. The gate
// (composed-lines.test.ts) re-verifies each `en` against the committed story
// file in CI (skeleton fidelity), so a mis-transcribed skeleton fails the suite
// rather than green-lighting a leak.

/** How the gate generates fills for one slot. */
export type Binding =
  | 'all-objects' // generic response; drive the language-independent UNION object set
  | { readonly objects: readonly string[] } // line names fixed object(s); drive those
  | { readonly sample: string } // {raw}/{verb} passthrough: one representative token

export interface Family {
  /** Normalized EN skeleton, EXACTLY as the game renders it (slot tokens:
   *  {obj} {obj2} {obj3} {obj4} {num} {num2} {raw} {verb}). INVARIANT: never
   *  model a composed line as a fully-resolved literal — the runtime-spliced
   *  parts (object names, verbs, contents) are NOT contiguous in the decoded
   *  story file, so a literal `en` would false-FAIL skeleton fidelity. Model
   *  every spliced part as a slot; the gate substitutes a concrete fill before
   *  calling matchLine, while fidelity checks only the real literal fragments. */
  readonly en: string
  /** `'reachable'` = asserted by the gate. `{ deferred: '<gating verb>' }` =
   *  listed only; the string NAMES the exotic verb that gates it so the
   *  deferral is auditable, not a vibe (spec Finding 3). Bias to `'reachable'`
   *  when unsure — driving a rarely-reached family is harmless; missing a
   *  reachable one is the leak. */
  readonly reach: 'reachable' | { readonly deferred: string }
  /** Provenance: ZIL site, retired-UAT id, ka rung used, any case compromise. */
  readonly note: string
  /** ≤1 object slot (bound `all-objects` or `{objects}`) + fixed {raw}/{verb}
   *  `{sample}` slots. The gate drives the object axis: `ka` over the union set,
   *  `fr/de/es` over one representative (decision 2). Mutually exclusive with
   *  `instances`. */
  readonly bindings?: Readonly<Record<string, Binding>>
  /** Multi-slot families that aren't independent: explicit {token: fill} tuples
   *  (representative instances, not a cross-product — decision: arity). */
  readonly instances?: ReadonlyArray<Readonly<Record<string, string>>>
}

export const COMPOSED_FAMILIES: readonly Family[] = [
  // ── Seed: the 7 cross-language pins absorbed from composed-lines.uat.test.ts
  //    (UAT 2026-06-19/20). Their templates already ship, so they gate GREEN.

  // C: open-mailbox reveal — the first command most players type. Modeled with
  //    SLOTS (not a resolved literal — see the en INVARIANT): the game composes
  //    "Opening the "+obj+" reveals "+contents, so a literal `en` would
  //    false-FAIL fidelity. {raw} stands in for the composed contents pending the
  //    listing-engine group (Task 6).
  {
    en: 'Opening the {obj} reveals {raw}.',
    reach: 'reachable',
    note: 'UAT-C 2026-06-19. gverbs.zil V-OPEN reveal. obj=small mailbox, contents sample "a leaflet". Fill = the exact UAT line (matches today\'s corpus pin) while fidelity sees the real "Opening the"/"reveals" fragments.',
    bindings: { obj: { objects: ['small mailbox'] }, raw: { sample: 'a leaflet' } },
  },
  // D: per-object FAILURE reasons in `take all` (gverbs.zil ITAKE).
  {
    en: '{obj}: The rug is extremely heavy and cannot be carried.',
    reach: 'reachable',
    note: 'UAT-D 2026-06-19. Multi-take failure label; names the carpet only.',
    bindings: { obj: { objects: ['carpet'] } },
  },
  {
    en: '{obj}: The trophy case is securely fastened to the wall.',
    reach: 'reachable',
    note: 'UAT-D 2026-06-19. Multi-take failure label; names the trophy case only.',
    bindings: { obj: { objects: ['trophy case'] } },
  },
  // E: incomplete-`put` orphan prompt (gparser.zil). Modeled with the {verb}
  //    slot from the START (not the literal "put the", which would false-FAIL
  //    fidelity — "put" is runtime-spliced). The gate substitutes {verb}->put
  //    before matchLine, so this still hits the literal put-in template that
  //    ships TODAY (no {verb} slot needed yet); Task 4 generalizes that template.
  //    {raw} is the player's ECHOED noun — a lexicon-emit synonym, NOT an object
  //    key — to exercise the path that bit the E-pin.
  {
    en: 'What do you want to {verb} the {raw} in?',
    reach: 'reachable',
    note: 'UAT-E 2026-06-20. {verb} sample "put"; {raw} sample is the emit synonym "advertisement" (not an object key). This IS the with-prep in-family (Task 4 adds with + no-noun, not this one).',
    bindings: { verb: { sample: 'put' }, raw: { sample: 'advertisement' } },
  },
  // F: WEAR-verb failure (`put X on` resolves to wear).
  {
    en: "You can't wear the {obj}.",
    reach: 'reachable',
    note: 'UAT-F 2026-06-20. gverbs.zil V-WEAR. Object-agnostic; ka drops the noun (rung 3). Drives the union object set.',
    bindings: { obj: 'all-objects' },
  },
  // G: closed-container (`put X in <closed container>`).
  {
    en: "The {obj} isn't open.",
    reach: 'reachable',
    note: 'UAT-G 2026-06-20. gverbs.zil. ka reuses the reviewed "დახურულია" predicate. Drives the union object set.',
    bindings: { obj: 'all-objects' },
  },

  // ── Orphan parser prompt (gparser.zil:760-774, decision 7). The GAME builds it
  //    as "What do you want to " + verb + [" the " + typed-noun] + [" " + prep] +
  //    "?". {verb}/{raw} capture the player's echoed tokens for MATCHING; the
  //    translated `out` is verb-neutral generic (drops both). One template PER
  //    confirmed prep covers every orphaning verb (leak-safe for ka). The in-prep
  //    family is the seed E entry above.
  {
    en: 'What do you want to {verb} the {raw} with?',
    reach: 'reachable',
    note: 'Orphan, prep=with (cut/strike — gsyntax CUT/STRIKE OBJECT WITH OBJECT, no one-object form). Confirmed reachable recon 2026-06-23. Verb-neutral out → no ka case problem (drops the noun), NATIVE-REVIEW-DRAFT.',
    bindings: { verb: { sample: 'attack' }, raw: { sample: 'troll' } },
  },
  {
    en: 'What do you want to {verb}?',
    reach: 'reachable',
    note: 'Orphan no-noun variant. Generic verb-less out in every language (player verb is on-screen). {verb} matched but not rendered.',
    bindings: { verb: { sample: 'take' } },
  },

  // ── WHICH-PRINT object disambiguation (gparser.zil, looped 2-4 candidates).
  //    The game echoes the player's queried noun ({raw}) then lists candidates.
  //    Instance-driven by the dam buttons (a real same-noun set; `push button` in
  //    the Maintenance Room is a guaranteed golden-path 4-candidate prompt). ka
  //    echoes {raw} (the player's own typed word — English input today; revisit at
  //    Phase-2 Georgian input); fr/de/es DROP the noun (drop-the-noun reframe —
  //    translated candidates disambiguate on their own), so no English token is
  //    forced on a non-English reader in basic mode (deterministic-no-english
  //    goal). The shipped literal-"book" pins stay (specificity sorts them first →
  //    natural noun mention for the book case).
  {
    en: 'Which {raw} do you mean, the {obj} or the {obj2}?',
    reach: 'reachable',
    note: 'gparser.zil WHICH-PRINT, 2-candidate. Dam buttons (blue/red). ka template ships; fr/de/es drop-noun generic added.',
    instances: [{ raw: 'button', obj: 'blue button', obj2: 'red button' }],
  },
  {
    en: 'Which {raw} do you mean, the {obj}, the {obj2}, or the {obj3}?',
    reach: 'reachable',
    note: 'gparser.zil WHICH-PRINT, 3-candidate. Dam buttons (blue/red/yellow).',
    instances: [
      { raw: 'button', obj: 'blue button', obj2: 'red button', obj3: 'yellow button' },
    ],
  },
  {
    en: 'Which {raw} do you mean, the {obj}, the {obj2}, the {obj3}, or the {obj4}?',
    reach: 'reachable',
    note: 'gparser.zil WHICH-PRINT, 4-candidate. The 4 dam buttons — `push button` golden-path prompt on the dam puzzle. ka template ships; fr/de/es drop-noun generic added (was LLM-routed → basic-mode EN leak).',
    instances: [
      {
        raw: 'button',
        obj: 'yellow button',
        obj2: 'brown button',
        obj3: 'red button',
        obj4: 'blue button',
      },
    ],
  },
]

/** fr/de/es families deliberately routed to the LLM instead of a shared
 *  template. EACH entry REQUIRES a non-empty `why` (the gate asserts it). `ka`
 *  is never exempt — it has no LLM net. Empty at seed. */
export const EXEMPTIONS: Readonly<
  Record<'fr' | 'de' | 'es', ReadonlyArray<{ en: string; why: string }>>
> = {
  fr: [],
  de: [],
  es: [],
}

/** Deferred families (exotic-verb tail), by `en`. The gate asserts the deferred
 *  set equals this list, so adding/removing a deferral updates a VISIBLE,
 *  reviewed list (honesty) without printing to stdout (CLAUDE.md: tests stay
 *  pristine). Empty at seed. */
export const EXPECTED_DEFERRED: readonly string[] = []

/** Floor on the reachable-family count. RAISE when you add families; NEVER
 *  lower. Guards against a refactor silently emptying the inventory (spec
 *  honesty). Seed = 6 families (the two E-pins are one put-in family); +2 orphan
 *  families (with-prep + no-noun, Task 4) → 8; +3 WHICH-PRINT disambiguation
 *  arities (2/3/4-candidate, Task 5) → 11. */
export const REACHABLE_FLOOR = 11

/** Skeleton-fidelity escape hatch for `extractStrings` ANCHORING MISSES only:
 *  a distinctive span that is verified-correct game text (read in the local ZIL /
 *  seen in play) but absent from the anchored decode. NOT for transcription bugs
 *  (re-model spliced parts as slots) — each entry needs an inline `// why:` ZIL
 *  citation. Empty by default; adding one is a deliberate, reviewed exception. */
export const FIDELITY_ALLOW: readonly string[] = []
