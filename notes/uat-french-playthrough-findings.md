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
