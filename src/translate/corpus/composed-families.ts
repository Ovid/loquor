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
    bindings: {
      obj: { objects: ['small mailbox'] },
      raw: { sample: 'a leaflet' },
    },
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
      {
        raw: 'button',
        obj: 'blue button',
        obj2: 'red button',
        obj3: 'yellow button',
      },
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

  // ── Parser implicit-object parenthetical (gparser.zil GWIM :907-925, UAT
  //    2026-06-24). When the parser auto-supplies a uniquely-determined missing
  //    object it ANNOUNCES it on its own line, two shapes: bare "({obj})" (no
  //    prep — the `<TELL D .OBJ ")">` ELSE branch) and "(with the {obj})" (the
  //    prep branch — `FIND WEAPONBIT/TOOLBIT/FLAMEBIT`: attack/cut/dig/burn/
  //    inflate). Reachable on the GOLDEN PATH — `attack troll` with one weapon
  //    held prints "(with the sword)". A RECON MISS in the original P2.1
  //    inventory: fr/de/es already template both shapes ((avec/con/mit {obj.def})
  //    + ({obj.def})), but `ka` had ONLY the `(with the match)` string pin, so
  //    every other auto-supply leaked raw English for Georgian. ka now: bare →
  //    nominative citation ({obj.indef}, rung 1); "with the" → drop-noun "(ამით)"
  //    ("with this") — instrumental "X-ით" is the §4 case problem (per-object
  //    stem + multi-word adjective agreement), and auto-supply fires only when ONE
  //    instrument is eligible so the demonstrative is unambiguous; the pre-existing
  //    "(with the match)" → "(ასანთით)" named-instrumental pin stays (specificity
  //    wins). All NATIVE-REVIEW-DRAFT. all-objects = safe over-approximation (only
  //    weapon/tool/flame objects actually auto-supply; ka's out is object-agnostic
  //    so driving the union is free and leak-proof).
  {
    en: '({obj})',
    reach: 'reachable',
    note: 'gparser.zil GWIM :924 bare auto-supplied DOBJ "(<obj>)" (no prep). ka rung-1 nominative {obj.indef}; fr/de/es ({obj.def}). UAT 2026-06-24.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: '(with the {obj})',
    reach: 'reachable',
    note: 'gparser.zil GWIM :918-921 instrument auto-supply "(with the <obj>)". ka drop-noun "(ამით)" (rung 3 — instrumental is §4; "(with the match)" keeps its "(ასანთით)" pin); fr/de/es (avec/con/mit {obj.def}). UAT 2026-06-24 recon-miss. "with the" straddles GWIM TELLs (PRINTB prep + " " + "the ") → FIDELITY_ALLOW.',
    bindings: { obj: 'all-objects' },
  },

  // ── Listing engine (gverbs.zil DESCRIBE-OBJECT :1692-1725 / PRINT-CONT
  //    :1833-1835; thief treasure listing 1actions.zil). Every line is glued at
  //    runtime from a fixed header/tail + spliced object name(s), so none is a
  //    full decoded fragment — invisible to both existing gates. fr/de/es already
  //    GENERALIZE the whole engine (templates); ka shipped only per-object pins,
  //    so the lit BRASS LANTERN ("(providing light)"), the vehicle tail, the
  //    surface header, and the actor "is holding:" leaked raw English for Georgian
  //    players. This group registers the engine + the ka general templates it was
  //    missing (NATIVE-REVIEW-DRAFT, sectioned in zork1.ka.templates.ts).
  {
    en: 'There is a {obj} here.',
    reach: 'reachable',
    note: 'gverbs.zil:1707 DESCRIBE-OBJECT level-0 generic. All langs ship it (ka :105).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'There is a {obj} here (providing light).',
    reach: 'reachable',
    note: 'gverbs.zil:1705-1707. Lit (ONBIT) object in a room — brass lantern once touched, torch. ka general template authored this group (was: candles/matchbook string pins only → the lantern leaked).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'A {obj} (providing light)',
    reach: 'reachable',
    note: 'gverbs.zil:1711-1712. Lit object nested/in inventory (lit lantern in `inventory`). ka general template authored this group.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'A {obj} (being worn)',
    reach: 'reachable',
    note: 'gverbs.zil:1714-1715. Worn object in inventory. All langs ship it (ka :110).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'There is a {obj} here. (outside the {obj2})',
    reach: 'reachable',
    note: 'gverbs.zil:1725 vehicle tail (the magic boat is the only VEHBIT object). ka colon-sidestep template authored (caseless). The span "here. (outside the" straddles two runtime TELLs (:1707 + :1725) → FIDELITY_ALLOW.',
    instances: [{ obj: 'leaflet', obj2: 'magic boat' }],
  },
  {
    en: 'A {obj}, with a {obj2}',
    reach: 'reachable',
    note: '1actions.zil thief-death treasure listing, one-content case. Only the jeweled egg (holding the canary) reaches it. ka pins that ONE instance as a full string (zork1.ka.strings.ts) — the general form needs the INSTRUMENTAL case (§4); fr/de/es generalize.',
    instances: [
      { obj: 'jewel-encrusted egg', obj2: 'golden clockwork canary' },
    ],
  },
  {
    en: 'The {obj} contains:',
    reach: 'reachable',
    note: 'gverbs.zil:1835 PRINT-CONT container header. All langs ship it (ka :140).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Sitting on the {obj} is:',
    reach: 'reachable',
    note: 'PRINT-CONT surface header (table/pedestal). ka drop-noun "ზედ დევს:" authored — the surface would need the -ზე postposition case (§4) and is on-screen anyway.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} is holding:',
    reach: 'reachable',
    note: 'gverbs.zil:1833 actor-contents header (thief/cyclops). ka reuses the reviewed "შეიცავს" predicate (de/es also collapse "is holding" → "contains"); {obj} stays the nominative subject.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'You are carrying:',
    reach: 'reachable',
    note: 'V-INVENTORY header. Full-line string pin in every corpus (ka :1381); also inventory-gate covered. No slot.',
  },
  {
    en: 'Your collection of treasures consists of:',
    reach: 'reachable',
    note: 'Treasure/score listing header. Full-line string pin in every corpus (ka :28). No slot.',
  },

  // ── 7a State / idempotent splices (gverbs.zil). Object-agnostic state lines
  //    from the standard open/close/turn-on/turn-off verbs. NOTE the "already"
  //    refusals say "It is already open/closed." (no splice → plain strings, not
  //    families); only the egg/book have per-object "already open" pins.
  {
    en: 'The {obj} is now closed.',
    reach: 'reachable',
    note: 'gverbs.zil:353 V-CLOSE success. ka "{obj.indef} იხურება." authored (mirrors the open-success "იღება" verb, caseless).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} is now on.',
    reach: 'reachable',
    note: 'gverbs.zil:792 V-LAMP-ON. ka ships it (:159). Caseless nominative subject.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} is now off.',
    reach: 'reachable',
    note: 'gverbs.zil:779 V-LAMP-OFF. ka ships it (:160).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} opens.',
    reach: 'reachable',
    note: 'gverbs.zil:980/990 V-OPEN success. ka ships it (:167).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} is closed.',
    reach: 'reachable',
    note: 'gverbs.zil:888/1973 closed-container state (open/look-in a shut container). ka ships it (:169).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} is empty.',
    reach: 'reachable',
    note: 'gverbs.zil:886 V-LOOK-INSIDE empty container. ka "{obj.indef} ცარიელია." authored (nominative subject, caseless).',
    bindings: { obj: 'all-objects' },
  },

  // ── 7b Container / placement failures (gverbs.zil V-PUT :1093-1106, V-PUT-ON
  //    :1126, take-from :1375). "There's no room." / "How can you do that?" carry
  //    no object splice (plain strings). "The {obj} isn't open." is seed G. The
  //    two-object families DROP the container for ka (it is on-screen from the
  //    player's command, and a Georgian "-ში" case would shift a multi-word
  //    container's adjective, §4).
  {
    en: 'The {obj} is already in the {obj2}.',
    reach: 'reachable',
    note: 'gverbs.zil:1098 V-PUT idempotent. ka drops the container: "{obj.indef} უკვე შიგ დევს." (already inside).',
    instances: [{ obj: 'leaflet', obj2: 'small mailbox' }],
  },
  {
    en: "The {obj} isn't in the {obj2}.",
    reach: 'reachable',
    note: 'gverbs.zil:1375 take-from failure. ka drops the container: "{obj.indef} შიგ არ არის." (isn\'t inside).',
    instances: [{ obj: 'sword', obj2: 'trophy case' }],
  },
  {
    en: "You don't have the {obj}.",
    reach: 'reachable',
    note: 'gverbs.zil:1105 V-PUT (put what you aren\'t holding). ka "{obj.indef} არ გაქვს." — Georgian "have" takes the possessed in the NOMINATIVE, so caseless and clean.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "The {obj} isn't here!",
    reach: 'reachable',
    note: 'gverbs.zil:2027 referenced-object-absent. ka "{obj.indef} აქ არ არის!" (nominative subject, mirrors "There is a {obj} here.").',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "There's no good surface on the {obj}.",
    reach: 'reachable',
    note: 'gverbs.zil:1126 V-PUT-ON onto a non-surface. ka drop-noun "ამაზე ვერაფერს დადებ." (you can\'t put anything on this) — the surface would need the -ზე case (§4) and is on-screen.',
    bindings: { obj: 'all-objects' },
  },

  // ── 7c Multi-command labels ("<obj>: <outcome>" from `take all`/`drop all`).
  //    The success labels are object-agnostic (the {obj}: prefix is a caseless
  //    nominative label). The per-object FAILURE reasons are seed D (rug + trophy
  //    case) — the only objects in `take all` scope with a custom take message;
  //    every other untakeable object gives a GENERIC yuk / "load is too heavy"
  //    (no object splice → plain strings, not families).
  {
    en: '{obj}: Taken.',
    reach: 'reachable',
    note: 'gverbs.zil:1387 multi-take success. All langs ship it (ka :150). Caseless nominative label.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: '{obj}: Dropped.',
    reach: 'reachable',
    note: 'gverbs.zil:481 multi-drop success. All langs ship it (ka :146). Caseless nominative label.',
    bindings: { obj: 'all-objects' },
  },

  // ── 7d-i Standard-verb object-splice refusals/statuses (gverbs.zil). These are
  //    gated by verbs IN the standard set (move/enter/wear/drop/read/attack/
  //    examine), so a normal player reaches them. fr/de/es generalize; ka drafts
  //    added (NS = nominative subject kept; DN = dropped to a demonstrative, §4).
  {
    en: 'Moving the {obj} reveals nothing.',
    reach: 'reachable',
    note: 'gverbs.zil:916 V-MOVE. ka DN "გადაადგილებამ არაფერი გამოაჩინა.".',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "You can't move the {obj}.",
    reach: 'reachable',
    note: 'gverbs.zil:918 V-MOVE refusal. ka NS "{obj.indef} ადგილიდან არ იძვრება.".',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'You are now in the {obj}.',
    reach: 'reachable',
    note: 'gverbs.zil:225 V-BOARD/enter success. ka DN "ახლა შიგ ხარ." (the vehicle is on-screen; -ში would shift a multi-word adjective, §4).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'You are now wearing the {obj}.',
    reach: 'reachable',
    note: 'gverbs.zil:1385 wear success. ka NS "ახლა {obj.indef} გაცვია." (Georgian "wear" takes the worn item in the nominative).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "You're not carrying the {obj}.",
    reach: 'reachable',
    note: 'gverbs.zil IDROP refusal. ka NS "{obj.indef} თან არ გაქვს." ("have" → nominative).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'How does one read a {obj}?',
    reach: 'reachable',
    note: 'gverbs.zil:1145 V-READ refusal. ka DN "ეს როგორ უნდა წაიკითხო?".',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "You aren't even holding the {obj}.",
    reach: 'reachable',
    note: 'gverbs.zil:185 V-ATTACK (weapon not held). ka NS "{obj.indef} ხელშიც კი არ გიჭირავს.".',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "There's nothing special about the {obj}.",
    reach: 'reachable',
    note: 'gverbs.zil:630 V-EXAMINE default. ka already ships its drop-noun examine template (no echo of the object, §4).',
    bindings: { obj: 'all-objects' },
  },

  // ── 7d-ii Exotic-verb single-object refusals (gverbs.zil). Author-all (Ovid):
  //    a curious player CAN type these, so ka must not leak. fr/de/es generalize;
  //    ka drafts keep {obj} nominative-subject (NS) or drop to a demonstrative
  //    (DN, §4). All NATIVE-REVIEW-DRAFT, sectioned.
  {
    en: 'The {obj} is rudely awakened.',
    reach: 'reachable',
    note: 'V-ALARM (wake). ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "The {obj} isn't sleeping.",
    reach: 'reachable',
    note: 'V-ALARM (wake). ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'With a {obj}??!?',
    reach: 'reachable',
    note: 'PRE-BURN (burn with non-flame). ka DN "ამით??!?".',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "You can't burn a {obj}.",
    reach: 'reachable',
    note: 'V-BURN. ka NS "{obj.indef} არ იწვის.".',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "You can't climb onto the {obj}.",
    reach: 'reachable',
    note: 'V-CLIMB-ON. ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'You must tell me how to do that to a {obj}.',
    reach: 'reachable',
    note: 'V-CLOSE syntax fallback. ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} pays no attention.',
    reach: 'reachable',
    note: 'V-COMMAND. ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Strange concept, cutting the {obj}....',
    reach: 'reachable',
    note: 'V-CUT (non-weapon target). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Digging with the {obj} is slow and tedious.',
    reach: 'reachable',
    note: 'V-DIG (with shovel). ka DN (tool dropped).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Digging with a {obj} is silly.',
    reach: 'reachable',
    note: 'V-DIG (wrong tool). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  // (V-ENCHANT "filch"/"puff of smoke" are Zork II/III only — gverbs.zil
  //  ZORK-NUMBER-gated, absent from the Zork I decode — so NOT registered.)
  {
    en: 'The {obj} refuses it politely.',
    reach: 'reachable',
    note: 'V-GIVE (recipient refuses). ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Why knock on a {obj}?',
    reach: 'reachable',
    note: 'V-KNOCK. ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} makes no sound.',
    reach: 'reachable',
    note: 'V-LISTEN. ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'There is nothing behind the {obj}.',
    reach: 'reachable',
    note: 'V-LOOK-BEHIND. ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Look on a {obj}???',
    reach: 'reachable',
    note: 'V-LOOK-ON. ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "It's not clear that a {obj} can be melted.",
    reach: 'reachable',
    note: 'V-MELT. ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Ahoy -- {obj} overboard!',
    reach: 'reachable',
    note: 'V-OVERBOARD (throw from boat). ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Pump it up with a {obj}?',
    reach: 'reachable',
    note: 'V-PUMP (wrong tool). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'How does one look through a {obj}?',
    reach: 'reachable',
    note: 'PRE-READ (look through). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'It is hardly likely that the {obj} is interested.',
    reach: 'reachable',
    note: 'V-REPLY/answer. ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Why would you send for the {obj}?',
    reach: 'reachable',
    note: 'V-SEND. ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'It smells like a {obj}.',
    reach: 'reachable',
    note: 'V-SMELL. ka DN (object would need a case).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} does not understand this.',
    reach: 'reachable',
    note: 'V-SQUEEZE. ka NS.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "You can't talk to the {obj}!",
    reach: 'reachable',
    note: 'V-TELL/talk. ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "You can't tie the {obj} to that.",
    reach: 'reachable',
    note: 'V-TIE. ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'You cannot wind up a {obj}.',
    reach: 'reachable',
    note: 'V-WIND (non-canary). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'A nice idea, but with a {obj}?',
    reach: 'reachable',
    note: 'TEETH-F (brush teeth, wrong tool). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: "It seems that a {obj} won't do.",
    reach: 'reachable',
    note: 'MSWITCH-FUNCTION (wrong tool for the machine). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Why would you tie up a {obj}?',
    reach: 'reachable',
    note: 'ROPE-FUNCTION (tie up). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'It looks pretty much like a {obj}.',
    reach: 'reachable',
    note: 'DUMB-CONTAINER examine. ka DN.',
    bindings: { obj: 'all-objects' },
  },

  // ── 7d-iii Exotic multi-slot + the two all-language gaps (author-all). give/
  //    destroy/cut/water are templated in fr/de/es (ka DN drafts); "is
  //    extinguished" (V-POUR-ON) and "burns and is consumed" (HOT-BELL-F, the
  //    Hades exorcism) were uncovered in ALL FOUR — authored fresh as nominative-
  //    subject lines ({obj.def}/{obj.indef}).
  {
    en: "You can't give a {obj} to a {obj2}!",
    reach: 'reachable',
    note: 'gverbs.zil:715 V-GIVE. ka DN "ამის მიცემა ვერ მოახერხებ!".',
    instances: [{ obj: 'leaflet', obj2: 'sword' }],
  },
  {
    en: 'Trying to destroy the {obj} with a {obj2} is futile.',
    reach: 'reachable',
    note: 'PRE-MUNG (destroy/mung with a tool). ka DN.',
    instances: [{ obj: 'leaflet', obj2: 'sword' }],
  },
  {
    en: 'Trying to destroy the {obj} with your bare hands is futile.',
    reach: 'reachable',
    note: 'PRE-MUNG (destroy bare-handed). ka DN. Span "with your bare hands is futile" straddles TELLs → FIDELITY_ALLOW.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'Your skillful {obj}smanship slices the {obj2} into innumerable slivers which blow away.',
    reach: 'reachable',
    note: 'gverbs.zil:394 V-CUT success (with a weapon). The "{obj}smanship" pun is untranslatable — ka DN "ოსტატურად დააქუცმაცებ." (both slots dropped).',
    instances: [{ obj: 'sword', obj2: 'leaflet' }],
  },
  {
    en: 'The "cutting edge" of a {obj} is hardly adequate.',
    reach: 'reachable',
    note: 'gverbs.zil V-CUT (non-weapon tool). ka DN.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The water leaks out of the {obj} and evaporates immediately.',
    reach: 'reachable',
    note: '1actions.zil:192 WATER-F (pour from a non-bottle). ka DN (the container is dropped).',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} is extinguished.',
    reach: 'reachable',
    note: 'gverbs.zil:1028 V-POUR-ON (douse a flame). Authored fresh in all 4 (was uncovered everywhere). Nominative subject.',
    bindings: { obj: 'all-objects' },
  },
  {
    en: 'The {obj} burns and is consumed.',
    reach: 'reachable',
    note: '1actions.zil:356 HOT-BELL-F (the Hades exorcism). Authored fresh in all 4. Nominative subject.',
    bindings: { obj: 'all-objects' },
  },

  // ── Task 8 sweep: the one composed family the walkthrough audit surfaced that
  //    was covered but unregistered. The parser echoes the player's TYPED noun
  //    ({raw}, not necessarily a known object — e.g. `attack troll` after the
  //    troll is gone). ka echoes the quoted English noun (accepted {raw}-echo,
  //    like disambiguation; Phase-2 Georgian input must revisit it); fr/de/es use
  //    their {obj} templates (golden-path "thief"/"troll" are known objects).
  {
    en: "You can't see any {raw} here!",
    reach: 'reachable',
    note: "gparser.zil referenced-object-absent. Golden path: `You can't see any thief/troll here!`. ka {raw}-echo template ships (:40). Phase-2 ka revisit.",
    bindings: { raw: { sample: 'thief' } },
  },

  // ── COMBAT / MELEE (1actions.zil "SUBTITLE MELEE", UAT-2026-06-24 follow-up;
  //    inventory in notes/georgian-combat-coverage-worklist.md). Zork I's combat
  //    messages are runtime-spliced from `<REMARK>` over four <GLOBAL …-MELEE>
  //    tables: F-DEF=defender name (the villain object) and F-WEP=the player's
  //    weapon are spliced in via PRINTD. They are GOLDEN PATH (everyone fights the
  //    troll; killing the thief is required to win) yet INVISIBLE to both gates:
  //    the walkthrough gate only rolled a few of the probabilistic variants, and
  //    the spliced names mean no full line is a contiguous decoded fragment. fr/
  //    de/es already TEMPLATE these (F-DEF→{obj.def}; F-WEP→agreement-free «votre
  //    {obj.bare}»/{obj2}); ka had only the handful of incidental full-string pins
  //    the one recorded run happened to roll, so the rest leaked raw English for a
  //    Georgian player (NO LLM net). This block registers every reachable combat
  //    line so the gate drives it in all four languages.
  //
  //    HERO-MELEE (the PLAYER's attacks) is VILLAIN-AGNOSTIC — the same template
  //    renders for whichever villain you hit — so each F-DEF family drives BOTH
  //    troll and thief (the two killable-by-melee villains; HERO×Cyclops is off
  //    the golden path — you scare him with "Ulysses" — so the worklist excludes
  //    it). ka renders these as per-villain full-string pins (zork1.ka.strings.ts
  //    COMBAT-DRAFTS block: Georgian carries one nominative citation form, so a
  //    villain in object/oblique case must be a hand-authored full line, not a
  //    {obj.indef} template — the file-header §4 rule). All NATIVE-REVIEW-DRAFT.

  // HERO-MELEE — MISSED (1actions.zil:3614-:3619). F-DEF only (the by-an-inch
  // F-WEP variant is Shape B, below).
  {
    en: 'A good slash, but it misses the {obj} by a mile.',
    reach: 'reachable',
    note: 'HERO-MELEE MISSED #2. Player-attack, villain-agnostic. fr/de/es template; ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'You charge, but the {obj} jumps nimbly aside.',
    reach: 'reachable',
    note: 'HERO-MELEE MISSED #3. ka troll pin pre-existed; thief pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'Clang! Crash! The {obj} parries.',
    reach: 'reachable',
    note: 'HERO-MELEE MISSED #4. ka troll pin pre-existed; thief pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'A quick stroke, but the {obj} is on guard.',
    reach: 'reachable',
    note: 'HERO-MELEE MISSED #5. ka thief pin pre-existed; troll pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: "A good stroke, but it's too slow; the {obj} dodges.",
    reach: 'reachable',
    note: 'HERO-MELEE MISSED #6. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  // HERO-MELEE — UNCONSCIOUS (:3622-:3625). F-DEF only.
  {
    en: 'The {obj} is battered into unconsciousness.',
    reach: 'reachable',
    note: 'HERO-MELEE UNCONSCIOUS #8. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'A furious exchange, and the {obj} is knocked out!',
    reach: 'reachable',
    note: 'HERO-MELEE UNCONSCIOUS #9. ka thief pin pre-existed; troll pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'The {obj} is knocked out!',
    reach: 'reachable',
    note: 'HERO-MELEE UNCONSCIOUS #11. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  // HERO-MELEE — KILLED (:3628-:3629). F-DEF only.
  {
    en: 'The fatal blow strikes the {obj} square in the heart: He dies.',
    reach: 'reachable',
    note: 'HERO-MELEE KILLED #13. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'The {obj} takes a fatal blow and slumps to the floor dead.',
    reach: 'reachable',
    note: 'HERO-MELEE KILLED #14. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  // HERO-MELEE — LIGHT-WOUND (:3631-:3634). F-DEF lines + one weapon-less plain.
  {
    en: 'The {obj} is struck on the arm; blood begins to trickle down.',
    reach: 'reachable',
    note: 'HERO-MELEE LIGHT-WOUND #15. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: "The blow lands, making a shallow gash in the {obj}'s arm!",
    reach: 'reachable',
    note: 'HERO-MELEE LIGHT-WOUND #18. F-DEF possessive ("the troll\'s arm"). ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  // HERO-MELEE — SERIOUS-WOUND (:3636-:3639). Two F-DEF + two weapon-less plain.
  {
    en: 'The {obj} receives a deep gash in his side.',
    reach: 'reachable',
    note: 'HERO-MELEE SERIOUS-WOUND #19. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'A savage blow on the thigh! The {obj} is stunned but can still fight!',
    reach: 'reachable',
    note: 'HERO-MELEE SERIOUS-WOUND #20. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  // HERO-MELEE — STAGGER (:3641-:3645). F-DEF only.
  {
    en: 'The {obj} is staggered, and drops to his knees.',
    reach: 'reachable',
    note: 'HERO-MELEE STAGGER #23. ka thief pin pre-existed; troll pin added. The UAT-6 headline leak.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: "The {obj} is momentarily disoriented and can't fight back.",
    reach: 'reachable',
    note: 'HERO-MELEE STAGGER #24. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'The force of your blow knocks the {obj} back, stunned.',
    reach: 'reachable',
    note: 'HERO-MELEE STAGGER #25. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: "The {obj} is confused and can't fight back.",
    reach: 'reachable',
    note: 'HERO-MELEE STAGGER #26. ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'The quickness of your thrust knocks the {obj} back, stunned.',
    reach: 'reachable',
    note: 'HERO-MELEE STAGGER #27. ka thief pin pre-existed; troll pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  // HERO-MELEE — LOSE-WEAPON (:3647-:3648). F-DEF only.
  {
    en: "The {obj}'s weapon is knocked to the floor, leaving him unarmed.",
    reach: 'reachable',
    note: 'HERO-MELEE LOSE-WEAPON #28. ka troll pin pre-existed; thief pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'The {obj} is disarmed by a subtle feint past his guard.',
    reach: 'reachable',
    note: 'HERO-MELEE LOSE-WEAPON #29. ka thief pin pre-existed; troll pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  // HERO-MELEE — weapon-less PLAIN lines (no F-DEF, no F-WEP): villain-agnostic
  // single strings the probabilistic walkthrough gate happened never to roll.
  {
    en: 'Your stroke lands, but it was only the flat of the blade.',
    reach: 'reachable',
    note: 'HERO-MELEE LIGHT-WOUND #17 (plain). No slot; ka single pin.',
  },
  {
    en: 'Slash! Your blow lands! That one hit an artery, it could be serious!',
    reach: 'reachable',
    note: 'HERO-MELEE SERIOUS-WOUND #21 (plain). No slot; ka single pin.',
  },
  {
    en: 'Slash! Your stroke connects! This could be serious!',
    reach: 'reachable',
    note: 'HERO-MELEE SERIOUS-WOUND #22 (plain). No slot; ka single pin.',
  },

  // FRAME lines (engine recovery / finishing blows, not in a -MELEE table):
  // VILLAIN-BLOW :3419 (staggered-recovery) and HERO-BLOW :3499-:3507
  // (pointless / cannot-defend). F-DEF = troll/thief on the golden path (the
  // unconscious-vs-unarmed wording is chosen by the villain's strength, so each
  // villain reaches both forms). HERO×Cyclops is off-path (you scare him, not
  // kill him), so Cyclops is excluded — same scope as HERO-MELEE above.
  {
    en: 'The {obj} slowly regains his feet.',
    reach: 'reachable',
    note: 'FRAME VILLAIN-BLOW :3419 (staggered recovers). ka thief pin pre-existed; troll pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'Attacking the {obj} is pointless.',
    reach: 'reachable',
    note: 'FRAME HERO-BLOW :3499 (villain already at 0 strength). ka per-villain pins.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'The unconscious {obj} cannot defend himself: He dies.',
    reach: 'reachable',
    note: 'FRAME HERO-BLOW :3503-:3507 (finish an unconscious villain). ka thief pin pre-existed; troll pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
  },
  {
    en: 'The unarmed {obj} cannot defend himself: He dies.',
    reach: 'reachable',
    note: 'FRAME HERO-BLOW :3503-:3507 (finish a disarmed villain). ka troll pin pre-existed; thief pin added.',
    bindings: { obj: { objects: ['troll', 'thief'] } },
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
 *  arities (2/3/4-candidate, Task 5) → 11; +11 listing-engine families (Task 6:
 *  there-is ×2-light, A×providing/worn, vehicle tail, thief with-a, contains,
 *  sitting-on, is-holding, carrying, treasures) → 22; +6 state/idempotent (Task
 *  7a: is-now-closed/on/off, opens, is-closed, is-empty) → 28; +5 container/
 *  placement failures (Task 7b: already-in, isn't-in, don't-have, isn't-here,
 *  no-surface) → 33; +2 multi-command labels (Task 7c: Taken/Dropped; rug+trophy
 *  failures are seed D) → 35; +8 standard-verb refusals (Task 7d-i: move ×2,
 *  board, wear, not-carrying, read, attack-hold, examine) → 43; +30 exotic-verb
 *  single-object refusals (Task 7d-ii: burn/dig/cut/knock/listen/smell/tie/wind/
 *  …; V-ENCHANT filch/puff dropped — Zork II/III only) → 73; +8 exotic multi-slot
 *  + all-language gaps (Task 7d-iii: give, destroy ×2, cut-success, cut-edge,
 *  water-leak, extinguished, burns-consumed) → 81; +1 walkthrough-sweep family
 *  (Task 8: can't-see-any {raw}) → 82; +2 parser implicit-object parentheticals
 *  (UAT 2026-06-24: bare "({obj})" + "(with the {obj})") → 84; +24 combat Shape A
 *  (UAT-2026-06-24 follow-up: 21 HERO-MELEE F-DEF families + 3 weapon-less plain
 *  HERO lines) → 108; +4 combat FRAME families (regains-feet, attacking-
 *  pointless, unconscious/unarmed cannot-defend) → 112. */
export const REACHABLE_FLOOR = 112

/** Skeleton-fidelity escape hatch for `extractStrings` ANCHORING MISSES only:
 *  a distinctive span that is verified-correct game text (read in the local ZIL /
 *  seen in play) but absent from the anchored decode. NOT for transcription bugs
 *  (re-model spliced parts as slots) — each entry needs an inline `// why:` ZIL
 *  citation. Empty by default; adding one is a deliberate, reviewed exception. */
export const FIDELITY_ALLOW: readonly string[] = [
  // Both spans straddle a runtime TELL boundary in DESCRIBE-OBJECT (gverbs.zil),
  // so they are absent from the anchored decode even though every half is verified
  // real game text — exactly the splice case this allow-list exists for.
  // why: the level-0 " here" literal (end of `<TELL "There is a " D .OBJ " here">`
  // gverbs.zil:1705) and the ONBIT tail (`<TELL " (providing light)">` :1707) are
  // SEPARATE TELLs; "(providing light)" alone IS in the decode.
  'here (providing light',
  // why: the level-0 period (`<TELL ".">` :1708) and the vehicle tail
  // (`<TELL " (outside the " D .AV ")">` :1725) are SEPARATE TELLs; both halves
  // ("here", "(outside the") are independently verified real game text.
  'here. (outside the',
  // why: PRE-MUNG composes "…with " + "your bare hands" + " is futile." across
  // separate TELLs, so this span isn't contiguous in the decode; "Trying to
  // destroy the" and each half are independently real game text.
  'with your bare hands is futile',
  // why: HERO-BLOW (1actions.zil:3503-:3507) composes "The " + ["unconscious" /
  // "unarmed"] + " " + villain + " cannot defend himself: He dies." across
  // SEPARATE TELLs, so "The unconscious"/"The unarmed" aren't contiguous in the
  // decode; "unconscious"/"unarmed" and "cannot defend himself: He dies" are each
  // independently real game text.
  'The unconscious',
  'The unarmed',
]
