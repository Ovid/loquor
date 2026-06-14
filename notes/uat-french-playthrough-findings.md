# UAT — Zork I in French (output-translation v1) — playthrough findings

Session date: 2026-06-14. Branch: ovid/uat. Build: Version 119 / série 880429.
Language: Français. Mission: play Zork I to completion in French; note bugs,
especially English leaking into output. Also probing misspellings + compound
sentences (per Ovid's mid-session instruction).

Legend: 🟥 bug / 🟧 minor / 🟩 confirmed-good.

## SESSION 2 SUMMARY (2026-06-14, cont.) — 3 fixes, score 139→192

Fixes this session (all vibe/TDD, `make all` green at 795 tests, all
re-verified LIVE in-browser): (1) `tout/tous` ALL quantifier → drop all/take
all; (2) comma-separated object lists `A, B et C` now split (Ovid approved
overriding locked decision 1); (3) ENGLISH LEAK in the `take all` too-heavy
failure line → now French. Plus 2 minor findings noted-not-fixed (couteu→candles
misspelling; `« candles »` {raw} edge-leak). Nothing committed yet.

RESUME STATE (autosave holds it; language Français; DO NOT clear IndexedDB):

- Location: **Salon (Living Room)**. Score **192/350**, Coups ~215.
- Carrying: brass lantern (**OFF**), clove of garlic, ivory torch (**LIT** —
  current light source), nasty knife.
- Trophy case (8): sceptre, pot d'or, cercueil en or, tableau, diamant,
  figurine de jade, bracelet, crâne de cristal.
- Coal Mine fully done (diamond made + ferried out). Lamp is OFF to save
  battery; torch is the light. Turn the lamp back on if depositing the torch.
- REMAINING to 350: Reservoir treasures (trunk/pump/trident), Frigid River
  (emerald/scarab/shovel), platinum bar (Loud Room `"echo"`), maze/cyclops
  (`Ulysse`)/thief (give egg, then kill w/ nasty knife → egg/canary/chalice),
  egg→canary→bauble, then deposit all. Watch maze/thief (deaths block 350).

## Input NL layer — comma-separated object lists (NEW, Drafty Room)

- 🟥 COMPOUND (comma list): `prends le charbon, le tournevis et la torche`
  (take coal, screwdriver AND torch) in the Salle des courants d'air. Result:
  `you prends le charbon, le tournevis et la torche` → split on `et` into TWO
  clauses (comma did NOT split, by design): clause0 `"prends le charbon, le
tournevis"` → **stage llm** → `{"verb":"take","object":"coal","prep":"with",
"indirect":"torch"}` → `> take coal with torch` → "Cette phrase ne fait pas
  partie de celles que je reconnais." (rejected); clause1 `"prends la torche"`
  → stage lexicon → `> take torch` → "Pris." Net: only the TORCH was taken;
  coal + screwdriver were NOT. Console evidence captured ([5],[6]).
  Root cause: `splitClauses` does not split on commas — DELIBERATE locked
  decision 1 (compound-commands design §"Comma-separated object lists",
  lines 55-59: "comma is not a clause separator … left to the model/Zork as a
  single clause"). That premise HOLDS for English (the clause vocab-passthroughs
  verbatim to Zork, which natively parses `take the lamp, sword and key`), but
  FAILS for FR/DE/ES: the foreign words can't passthrough, so the comma-clause
  hits the LLM, and the single-command JSON grammar `{verb,object,prep,indirect}`
  _cannot express a 3-object take_ — it crams 2 objects into object+indirect.
  → ✅ FIXED (vibe, TDD — Ovid approved overriding locked decision 1). Rewrote
  `splitClauses` (src/llm/inputTranslate.ts): factored the conjunction list into
  CLAUSE_CONJ and a hoisted CLAUSE_SEP regex that now splits on `,` as well as
  `.`/`;`, and absorbs a conjunction immediately after any punctuation so an
  Oxford comma ("A, B, et C") leaves no dangling "et …" clause. So `A, B et C`
  → 3 clauses → verb-gapping fills the bare objects → 3 deterministic takes.
  EN side effect (accepted): a comma-list runs as N turns instead of 1 — the
  design already deems the no-comma `and` case "acceptable" as N turns. Updated
  the old "does NOT treat a comma as a separator" test to the new behavior;
  added French-list + Oxford-comma cases (inputTranslate.test.ts). `make all`
  green (793 tests). In-browser re-verify: ✅ DONE in the Salle des courants
  d'air — `prends le charbon, le tournevis` → `you prends le charbon, le
  tournevis` → `> take coal` / Pris. + `> take screwdriver` / Pris. (Coups
  172→174). Console: BOTH clauses stage:"lexicon" (clause0 "prends le charbon"
  → take coal; clause1 "prends le tournevis" → take screwdriver, gap-filled).
  Deterministic, no LLM.

## Output translation (PRIMARY mission)

- 🟥 ENGLISH LEAK (take-all failure line): in the Salle des poutres, `prends
tout` → `take all` took all 7 items in French ("Vous prenez la lampe en
  laiton." … ×7), then the final per-object failure line leaked ENGLISH:
  **`broken timber: Your load is too heavy.`** Two leaks in one line: (1) the
  object name `broken timber` (untranslated; should be "poutre brisée"), and
  (2) the message `Your load is too heavy.` (should be French, e.g. "Vous
  portez déjà trop de choses !" / "Votre chargement est trop lourd."). This is
  Zork's multi-object "take all" per-object report format `<object>: <reason>`
  — the output-translation corpus covers the simple "Vous prenez X." lines but
  NOT this `name: reason` failure template. First English leak of the run.
  Repro: carry a heavy load + `prends tout` (or `prends la poutre`) where an
  item can't be taken.
  → ✅ FIXED (vibe, TDD). Both halves were ALREADY in the corpus ('broken
  timber' in objects → "poutre brisée"; 'Your load is too heavy.' in strings →
  "Votre chargement est trop lourd."); the matcher just couldn't decompose the
  "<obj>: <reason>" take-all line — only the SUCCESS reasons "{obj}: Taken." /
  "{obj}: Dropped." were templated. Added the two failure-reason templates next
  to them in src/translate/corpus/zork1.fr.templates.ts:
  `{obj}: Your load is too heavy.` → `{obj.bare} : Votre chargement est trop
  lourd.` and the wounded-condition variant (…, surtout vu votre état.). Label
  form (the reason is about the whole load) with the corpus's space-before-colon
  convention. New match.test.ts cases pin both against the real corpus.
  `make all` green (795 tests). NOTE (known limitation): only these two failure
  reasons are templated — other take-all failure reasons would still leak; a
  generic `<known-object>: <reason>` recursive decomposition in matchLine is the
  broader follow-up (kept out of scope to stay minimal). In-browser re-verify:
  ✅ DONE — after reload the output layer re-translated the whole scrollback and
  the exact line that leaked now renders **"poutre brisée : Votre chargement est
  trop lourd."** (both halves French, French space-before-colon). No leak.
- 🟩 Boot screen, room names, descriptions, object names, "Pris./Posé./Done"
  responses all render in French from West of House onward. No English leaks
  observed through the house interior + gallery/studio loop (turns 1–22).
- 🟩 Coal Mine → diamond sequence all French: Salle de la machine description,
  "Le couvercle s'ouvre/se ferme.", "La machine s'anime …", "révélant un énorme
  diamant.", "Fait."/"Posé."/"Pris." No leaks. (Input two-object `tourne
l'interrupteur avec le tournevis` → turn switch with screwdriver, det.)

## Input NL layer — misspellings & compounds (Ovid's probe list)

- 🟧 MISSPELLING: `prends le couteu` (intended _couteau_ = nasty knife, in the
  Salon) → LLM fallback → `take candles` (a bizarre wrong object — expected
  "take knife"; "couteu" is far closer to couteau/knife than to bougies/candles).
  Soft miss, same class as `tablo`→table. The candles weren't in scope (dropped
  in the Timber Room), so the game answered "can't see any candles here".
- 🟧 MINOR OUTPUT LEAK (edge-triggered by the above): the resulting
  `You can't see any candles here!` rendered as **`Vous ne voyez aucun «
candles » ici !`** — the English dictionary word "candles" leaked via the
  `{raw}` template. Root cause: the {obj} template `You can't see any {obj}
here!` keys objects by their objects-corpus name, but the candles' corpus key
  is the DESC-name "pair of candles" while the Z-parser's "can't see any" line
  uses the DICTIONARY word "candles" — so {obj} misses and {raw} echoes the
  English word verbatim (in « »). Affects any object whose dictionary word ≠ its
  DESC-name corpus key. Low severity (one word in guillemets; needs an
  out-of-scope reference to that object). NOT fixed — broader corpus-coverage
  issue; noted for a holistic follow-up rather than a one-off patch.

- 🟩 COMPOUND (movement, "puis"): `va au sud puis va à l'est` → `> south` then
  `> east` (2 clauses, both deterministic, correct). Works.
- 🟧 MISSPELLING: `prends le tablo` (intended _tableau_ = painting) → LLM
  fallback → `{"verb":"take","object":"table"}` → `> take table` →
  "Vous ne voyez la table nulle part !". LLM picked nearer real word "table"
  over "tableau". Ambiguous input; output stayed French. Soft miss.
- 🟥 COMPOUND (verb-gapping, "et"): `prends le couteau et la corde`
  (take knife AND rope) → clause0 "prends le couteau" → lexicon → `take knife`
  ✅; clause1 "la corde" → **LLM** → `{"verb":"move","object":"rope"}` →
  `> move rope` ❌. The verbless 2nd conjunct does NOT inherit "prends/take"
  from clause0; it's handed to the LLM verbless and the LLM invents "move".
  Expected: `take rope`. Repro: any `VERB obj1 et obj2`. Console evidence
  captured (msgs [22],[23]). Output text itself stayed French (no leak).
  → ✅ FIXED (vibe, TDD). `fillElidedVerbs` (src/llm/inputTranslate.ts): an
  article-led bare-object conjunct ("la corde", "l'épée") inherits the previous
  clause's verb → "prends la corde" → deterministic "take rope". Article-led
  only, so a clause carrying its own (LLM-only) verb like "check inventory" is
  never corrupted. Wired into the clause loop in translatePipeline.ts. Surfaced
  - fixed a latent issue: an orphan prompt ("What do you want to put the coffin
    in?") now STOPS a compound (isOrphanPrompt) so a gapped clause can't
    auto-answer the parser's sub-question. `make all` green (788 tests).
    In-browser re-verify: ✅ DONE (take/drop, multiword objects, 4 scenes live).
- 🟩 COMPOUND (two full verb-clauses, "et"): `pose le couteau et prends l'épée`
  → `> drop knife` + `> take sword`, both correct. So `et` works when EACH
  conjunct carries its own verb; the bug above is specifically verb-gapping
  (bare-object 2nd conjunct). Narrows root cause precisely.
- 🟩 `mets le tableau dans la vitrine` → `> put painting in case` → "Fait." ✅
- 🟩 IN-GAME verb-gapping verified repeatedly (live): `prends l'épée et la hache`
  → take sword + take axe; `pose l'épée et la hache` → drop sword + drop axe;
  `prends l'or et le cercueil` → take pot + take coffin; `prends la clé à
molette et le tournevis` → take wrench + take screwdriver. All clause-2
  objects inherit the verb deterministically. Fix solid in production.
- 🟥 RITUAL BREAK (Hades): `allume les bougies avec l'allumette` (light candles
  WITH match) → stage **llm** → `{"verb":"light","object":"bottle"}` →
  `light bottle` → "Vous n'avez pas ça !". The two-object command was mangled
  (lost "with match", "bougies"→"bottle"), so the candles never lit and the
  exorcism failed. Root cause: fr.zork1 'matchbook' had only the PLURAL
  "allumettes"; the natural singular "une allumette" missed the deterministic
  lexicon → LLM fallback → garbage. (Recovered live via quoted passthrough:
  `"light candles with match"` + `"read book"` → exorcism completed, all French.)
  → ✅ FIXED (vibe, TDD). Added 'allumette' (singular) to the matchbook entry in
  src/llm/lexicon/fr.zork1.ts (mirrors 'pair of candles' which already had
  bougies/bougie). New parse.test.ts cases pin `allume une allumette`→light
  match and `allume les bougies avec l'allumette`→light candles with match,
  both deterministic. `make all` green (790 tests). In-browser re-verify: ✅ DONE
  (`allume une allumette` → `> light match` → "Une des allumettes s'enflamme.").
- 🟧 NOUN CANON: `prends le livre` (gapping fired → stage lexicon) → `take page`
  rather than `take book` (Altar black book). Game accepted ("Pris.") and the
  black book was the only book present, so functionally correct, but the
  canonical echo reads "page". ✅ Functionally verified: `lis le livre` →
  `read page` → printed the prayer and (with lit candles) completed the
  exorcism. Cosmetic only — the black book's emit canon is 'page'. No fix needed.
- 🟥 QUANTIFIER "ALL": `pose tout` (drop all) → stage **llm** →
  `{"verb":"drop","object":"advertisement"}` → `drop advertisement` →
  "Vous n'avez pas ça !". The "all" quantifier "tout" is NOT handled
  deterministically; it falls to the LLM, which hallucinates a stale noun
  (the leaflet/"advertisement"). Same class as `prends tout` (take all).
  Repro: `pose tout` / `prends tout` anywhere. Console evidence captured
  (clause "pose tout", stage llm, inScope huge). Workaround in play: quoted
  passthrough `"drop all"` / `"take all"`.
  → ✅ FIXED (vibe, TDD). Added an OPTIONAL `quantifiersAll` field to
  `CoreLexicon` (src/llm/lexicon/types.ts), populated
  `['tout','tous','toute','toutes','all']` in FR_CORE (src/llm/lexicon/
  fr.core.ts), and a bare-quantifier branch in parseLexicon
  (src/llm/lexicon/parse.ts): a one-token quantifier remainder emits
  `${verb} all`, arity-guarded by verbArity1or2 (a verb-only verb like
  `attends tout` misses → LLM, never emits nonsense). New parse.test.ts cases
  pin `pose tout`→drop all, `prends tout`→take all, the tous/toute/toutes
  variants, and the arity-miss. `make all` green (792 tests). Field is optional
  so de/es are untouched (follow-up: add alles/todo for DE/ES).
  In-browser re-verify: ✅ DONE in the Timber Room — `pose tout` →
  `you pose tout` / `> drop all` → dropped all 7 carried items, each with a
  French "Vous posez X." Console stage:"lexicon" (deterministic, no LLM).

## SESSION 3 (2026-06-14, cont.) — Reservoir → Dam Base → river launch

Resumed at Salon (192/350). Route: descends→Cave→nord Troll→est Passage est-ouest
→nord Gouffre→nord-est Sud du réservoir→nord Réservoir→nord Nord du réservoir→
nord Salle de l'Atlantide. Then S,S,S→Sud du réservoir→est Barrage→est Pied du
barrage. Treasures: `prends la malle`→take trunk (+15, 192→207), `prends la pompe`
→take pump, `prends le trident`→take trident (+4, 207→211). Score 211, Coups ~241.

### Output translation (PRIMARY) — all clean French this leg 🟩

- Room names: Cave (Cellar), La salle du troll, Passage est-ouest, Gouffre
  (Chasm), Sud/Nord du réservoir, Réservoir, Salle de l'Atlantide, Barrage (Dam),
  Pied du barrage (Dam Base). All French in title bar + transcript.
- Full descriptions French: Reservoir South/North ("le niveau de l'eau ayant
  baissé…"), Réservoir ("un grand tas de boue… des « rives »…"), Atlantide
  ("le trident de cristal de Poséidon lui-même"), Dam Base ("Barrage de
  régulation des crues n° 3… La rivière Frigid… les Falaises blanches… vers
  l'aval"). « rives » uses French guillemets.
- `allume la lampe`→`light light`→"Vous allumez la lampe en laiton." ✓
- `pose la torche`→`drop torch`→"Posé." ✓; `prends X`→"Pris." ✓
- Load-too-heavy renders FRENCH in the simple-take path too:
  `prends le trident` (overloaded) → "Votre chargement est trop lourd."
  (Confirms the Session-2 take-all leak fix's sibling path is clean.)
- BOAT LABEL fully French (`lis l'etiquette`→`read label`): "Salut, marin !
  Mode d'emploi : Pour mettre à l'eau, dites « Launch ». Pour regagner la rive,
  dites « Land »… Garantie : …76 millisecondes… Avertissement : Ce bateau est
  en plastique fin. Bonne chance !"
- `gonfle le plastique avec la pompe`→`inflate valve with pump`→"Le bateau se
  gonfle et semble en état de naviguer." (instrument compound, deterministic) ✓

### 🟧 OUTPUT (minor): boat label references English command words

- The otherwise-fully-French label says `dites « Launch »` and `dites « Land »`
  — English command keywords left untranslated inside French flavor text. A FR
  player would expect French (which the NL layer accepts). Cosmetic; corpus
  flavor-text gap. ("FROBOZZ MAGIC BOAT COMPANY" in English is fine — brand.)

### 🟧 OUTPUT (minor, edge): parser assumed-object parenthetical leaks English

- On the malformed `throw raft` below, Zork printed "(at the you)" as the
  auto-supplied indirect object — English fragment not translated. Only appears
  on malformed throw-style commands. Low severity.

### 🟥 INPUT (NL): `lance le bateau` → `throw raft` (should be LAUNCH)

- `you lance le bateau` → stage **lexicon** → `> throw raft` → "(at the you)
  Vous n'avez pas le bateau magique." No turn consumed. "Lancer un bateau" is
  the CORRECT, natural French for _launching_ a boat, but fr.core.ts maps
  `lance`→`throw` unconditionally (for "lance le couteau"=throw knife). So a
  French player CANNOT launch the boat with natural French — hard blocker for the
  Frigid River. Zork's LAUNCH verb (`LAUNCH OBJECT (FIND VEHBIT)`, gsyntax 279)
  accepts plain "launch". Sibling risk found in the lexicon: `quitte`→`quit`
  (fr.core.ts:280), so "quitte le bateau" (leave the boat) → `quit boat` =
  potential accidental GAME QUIT. Both are the same context-blind-verb pattern.
  → FIX IN PROGRESS (paad:vibe): add launch idioms (lance le bateau/radeau,
  mets à l'eau) → "launch". (Use `sors du bateau`=exit to leave the boat;
  `quitte le bateau` quit-risk noted.)

  → ✅ FIXED (vibe, TDD). fr.core.ts: added FR_LAUNCH_IDIOMS (cross-product of
  lance/lancez/mets/mettez × bateau/radeau/canot, + "mets/mettez à l'eau") as
  full-phrase verbIdioms → "launch" (full-phrase so "lance le couteau"=throw is
  untouched). parse.ts: FIND_DEFAULT_VERBS = {launch} lets the verb-only arity
  gate emit bare LAUNCH (launch is verbs1 via FIND VEHBIT; the Z-parser accepts
  ">launch" in the boat). New parse.test.ts block pins lance le bateau→launch,
  lancez le radeau→launch, mets le bateau à l'eau→launch, mets à l'eau→launch,
  and a regression guard (lance le couteau→throw nasty knives). make all green
  (800 tests). In-browser re-verify ✅: reloaded, resumed in the boat,
  `lance le bateau`→`> launch`→"(bateau magique)"→"Rivière Frigid, dans le
  bateau magique… Il y a un débarcadère sur la rive ouest." Boat launched.
  NOTE (scope): the `quitte le bateau`→quit risk is a NON-issue — metaAlias is
  bare-word-only (inputTranslate.ts:186), so "quitte le bateau" misses to the
  LLM (handles leave/exit), never quits. No fix needed.

## SESSION 4 (2026-06-14, cont.) — Salon deposit → egg → maze/cyclops/thief → endgame

Resumed at Salon, Score 221. Deposited 4 carried treasures (trident/malle/
émeraude/scarabée) → Score 252, case at 12. Got the egg above ground (Score 257),
grabbed coin bag in the maze (Score 267). All output flawless French through the
deposit, the tree (gorgeous "œuf… orné de lapis-lazuli et de nacre… fermoir"),
North-of-House/Forest-Path prose, and the maze rooms ("Labyrinthe… petits
passages tortueux, tous semblables"; "passe-partout" for skeleton key — idiomatic).

### 🟥 OUTPUT (PRIMARY): wandering-thief theft message leaks full ENGLISH

- Trigger: while in the maze (skeleton room → SW), the roaming thief passed
  through and robbed me. The message rendered ENTIRELY IN ENGLISH:
  > "A seedy-looking individual with a large bag just wandered through the room.
  > On the way through, he quietly abstracted some valuables from your possession,
  > mumbling something about \"Doing unto others before...\""
- This is the Zork I robber/thief "wandering rob" message (ROBBER daemon). The
  output-translation corpus is missing it → English leaks into the French game.
  HIGH visibility: the thief roams the whole dungeon, so this fires often. Player
  carrying treasures underground will see it repeatedly.
- ROOT CAUSE: assembled from 3 TELL fragments (1actions.zil:1814) with a
  conditional middle ("your possession" vs "the room"), so the full sentence is
  neither a full-line z-string (inventory gate) nor on the golden path (coverage
  gate) — both display gates skip it.
- → ✅ FIXED (paad:vibe, TDD). Added BOTH ROBBED? branches to zork1.fr.strings.ts
  and pinned them with a direct matcher test in match.test.ts. RED
  (matchLine→null) → GREEN; `make all` green (801 tests, +1). Cannot re-verify
  in-game (thief dead) — the unit test is the evidence. NOTE: this
  assembled-fragment class is a structural blind spot in BOTH display gates;
  other multi-piece TELL messages could leak the same way (follow-up: a
  fragment-aware audit if more surface).
- → `Ulysse`→look NL gap: ✅ FIXED (see the dedicated entry below). Note: the
  earlier hunch to add it to fr.zork1.ts (nouns) was wrong — `ulysses`/`odysseus`
  are vocab VERBS, so the fix went in fr.core.ts `verbs` (`ulysse: 'ulysses'`).

### ✅ GAME COMPLETED — 350/350, DEATHLESS, "Maître Aventurier"

Full playthrough finished in French. Route from Salon (221): deposited 4 carried
treasures (→252), egg from tree (→257), maze coin bag (→267), cyclops `"Ulysses"`
flee, killed the thief WITH THE SWORD (deathless, ~11 rounds) recovering torch +
opened egg/canary + chalice + coins (→302), bauble from canary at tree (→313),
egg/canary/bauble deposited (→329), platinum bar via Loud Room `"echo"` (→339),
final torch+bar deposit (→**350**). Whisper → map ("carte"→parchment) → read map
→ West-of-House SW secret path → Stone Barrow (Tumulus de pierre) → enter → WIN.

**Output translation was essentially FLAWLESS across the entire back half**, incl.
the rarely-seen endgame: the thief death + treasure-reappear list, all 11 combat
rounds (parry/wound/stun/KO/kill lines), the cyclops flee, the canary aria +
"babiole en laiton", the whisper "« Cherchez le dernier secret du côté de vos
trésors. »", the map text "« Vers le Tumulus de pierre »", the barrow room, and
the FULL victory screen ("Vous avez triomphé de la première partie de la trilogie
ZORK… Votre score est de 350 (sur un total de 350 points), en 392 tours. Cela vous
confère le rang de Maître Aventurier."). Only leaks below.

### 🟧 OUTPUT (minor): end-of-game prompt keywords stay English

- Victory screen ends: "(Tapez RESTART, RESTORE ou QUIT) :" — "Tapez"/"ou" are
  French but the three command KEYWORDS leak English. Same class as the S3
  boat-label "dites « Launch »" finding (English command words in French flavor).
  Debatable (they're literal commands the player types); low severity.

### ✅ FIXED — INPUT (NL): proper-noun magic word `Ulysse` → LLM picked `look`

- At the cyclops, `Ulysse` (natural French spelling of Ulysses/Odysseus) hit the
  LLM (`…thinking`) which returned `> look` — cyclops did NOT flee, a turn wasted.
  Worked only via quoted passthrough `"Ulysses"`. `ulysses`/`odysseus` are vocab
  VERBS (verbsOnly/verbSynonyms), not nouns — that's why the noun lexicon
  (fr.zork1.ts) and its full-coverage gate never touched them.
- → ✅ FIXED (paad:vibe, TDD). Mapped `ulysse: 'ulysses'` in fr.core.ts `verbs`.
  `ulysses` is a verbSynonym, so `verbArityOk` passes the bare command at arity 0
  (verbSynonyms branch) — no `FIND_DEFAULT_VERBS` entry needed. RED→GREEN in
  parse.test.ts (real ZORK1_VOCAB); also updated the existing `F-BB` pipeline-UAT
  row from its "still unmapped → notice, nothing sent" pin to assert deterministic
  `ulysses` with **no LLM call**. `make all` green (802 tests). NOT re-verified
  in-browser: the won autosave has the cyclops already defeated and the end-prompt
  only accepts RESTART/RESTORE/QUIT, so the pipeline-level test is the evidence.
  (Note: English `ulysses`/`odysseus` already worked via stage-4 vocab passthrough;
  only the French spelling was missing.)

### 🟧 INPUT (NL, minor): `prends le sac` disambiguated to the (gone) "large bag"

- In the Treasure Room after the thief died, `prends le sac` → `> take large bag`
  → "Vous ne voyez le grand sac nulle part !" (the thief's grand sac vanished on
  his death). It should have resolved to the present coin bag ("sac en cuir plein
  de pièces"). `prends les pieces` → `> take coins` → Pris. worked. Scope/recency
  disambiguation picked an absent antecedent over a present one. Low severity.
