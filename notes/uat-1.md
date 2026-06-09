# Ovid UAT — Zork I NL Layer (French black-box) — 2026-06-08

Goal: type French prose, observe WebLLM translation → canonical Zork command.
Document where NL logic works / fails. FIX NOTHING.

## Findings log

### Setup

- NL layer = status-bar toggle "English: off/on". Model was already "installed" (cached) → cold-download modal (test item 1) could NOT be freshly tested this run.
- UI shows per turn: italic `> <french source>`, then `> <canonical translation>`, then game output. Translation is visible verbatim — excellent observability.
- Inference latency ~8-11s/command on-device.

### PASS

1. « ouvre la boîte aux lettres » → `open small mailbox` ✅ (simple verb+noun)
2. « li le depliant » (misspelled) → `read leaflet` ✅ (typo + noun dépliant→leaflet)

### FAIL / ISSUES

F1. COMPOUND CLAUSE MISTRANSLATED: « pose le dépliant puis va au sud » → first clause rendered as `read leaflet` (should be `drop leaflet`). French verb "poser"(=put down/drop) not mapped; produced re-read of leaflet.
F2. COMPOUND TRUNCATION: same input emitted the literal line "Ran 1 of 2 actions." — splitter detected 2 actions but executed only 1. Second clause « va au sud »(go south) silently dropped. Confirmed: Turns +1 only; still at West of House (did not move). (recent work = compound-commands feature)

F2-followup: Clean compound « va au sud puis va à l'est » → ran BOTH `south` then `east` (Turns +2). So compound executor CAN run multiple actions. F2 truncation appears conditional — co-occurred with the mistranslated first clause. Needs isolation.

F1-CONFIRMED (generalized, NOT compound-only): Standalone « pose le dépliant » (drop leaflet) → `read white house`. Verb "poser"(drop)→read; noun "dépliant" mis-resolved to "white house" (the room's prominent object). Game: "How does one read a white house?". Contrast: « li le depliant » earlier resolved dépliant→leaflet correctly — so when the VERB mismaps, NOUN resolution degrades toward the scene's headline object (scene-resolution bias). French drop-verbs (poser/jeter/laisser/lâcher) are a vocab gap.

F3. SCENE-RESOLUTION WRONG QUALIFIER: At Behind House (has "small window which is slightly ajar"), « ouvre la fenêtre » → `open boarded window`. Game: "You can't see any boarded window here!". Resolver attached adjective "boarded" (windows are boarded only at South/North of House) instead of the ajar small window. Should be `open window`/`open small window`. (recent work = scene-resolution feature)

F3-strengthened: « ouvre la petite fenêtre » (explicit "small") ALSO → `open boarded window` (rejected again). The fenêtre→"boarded window" mapping is sticky regardless of French qualifier. This BLOCKS the canonical house-entry path (open window→enter house) in French. Switching to English to bypass.

F3-ESCALATED (SEVERITY: HIGH — corrupts valid English): Canonical English `open window` (already a valid game command) → rewritten to `open boarded window`, rejected. So F3 is NOT French-specific: the NL layer REWRITES a correct command into a broken one by injecting the "boarded" qualifier. The layer is net-harmful in this scene. Only fix to proceed: toggle "English: off" to bypass the layer.

F3-confirmed: With "English: off" (layer bypassed), canonical `open window` → succeeds ("...open the window far enough to allow entry"), `enter house` → Kitchen, Score 10. Definitively proves the NL layer alone caused the boarded-window corruption. Re-enabled French to continue.

F4. VERB MISMAP in compound: « prends la lampe et déplace le tapis » → action1 `turn on brass lantern` (should be `take lamp`; "prendre"=take rendered as turn on — lamp switched on, not taken), action2 `move carpet` ✅ (rug moved). NOTE: this compound DID run both actions (Turns +2) — reinforces F2 truncation is conditional, not universal. But core verb "prendre" mistranslated.

F4-confirmed (standalone): « prends la lampe » → `turn on brass lantern` ("It is already on."). NOT compound-specific. Verb prendre+lamp → turn on. Hypothesis: scene-resolution biases object to its salient action (lamp's primary verb = turn on). Testing prendre on sword next to see if object-action bias or general prendre breakage.

F4-refined: « prends l'épée » → `take sword` ✅ "Taken." So prendre works generally; the lamp failure is OBJECT-ACTION BIAS (lamp's salient action "turn on" overrides verb "take"). F3 (window→boarded window) and F4 (take lamp→turn on lamp) share ROOT CAUSE: scene-resolution over-biases toward a scene object's headline attribute/action. THEME: scene-resolution too aggressive.

F4-expanded: « ramasse la lampe » (pick up lamp) → `open brass lantern` ("You must tell me how to do that..."). So for the lamp object, multiple French take-synonyms mis-map: prendre→turn on, ramasser→open. The lamp strongly attracts non-take verbs. Reproducible cluster.

F4-workaround: « emporte la lanterne » → `take brass lantern` ✅ "Taken." Using "emporte"(carry) + "lanterne" (matches canonical noun "lantern") avoided the bias. So word choice matters; a French phrasing CAN take the lamp. Lamp now in inventory.

F5. META MISTRANSLATION: « inventaire »(inventory) → `look` (re-described room) instead of `inventory`/`i`. French "inventaire" not recognized as inventory meta-command; confused with look.

F6. $VERIFY NOT ROUTED AS META: With English on, `$verify`→ translated by LLM to`look` (room re-described), instead of running Z-machine verify ("game file has verified"). The $-prefixed meta command leaks into the NL pipeline rather than being routed as meta. (recent work = meta-command routing). Will retest with English off + test other meta cmds (score/version/diagnose/verbose/superbrief/restart).

PASS-meta: `score` → routed as META (single `> score` line, no italic source/no translation line, Turns NOT advanced). Response correct. So meta-routing works for recognized English meta words & bypasses LLM + consumes no turn. F5/F6 are: French meta words + $-prefixed cmds NOT in the meta set.

PASS-meta: `diagnose` → "perfect health..." ✅; `version` → "ZORK I ... Release 119 / Serial 880429" ✅. Both routed as meta. Now testing verbose/superbrief/super/brief (latest commit 0daa09b routed 'super' as meta).

PASS-meta: `verbose` → "Maximum verbosity." ✅; `super` → "Superbrief descriptions." ✅ (CONFIRMS latest commit 0daa09b: 'super' routes as meta, no leak). Meta routed-OK set: score, diagnose, version, verbose, super. Meta FAIL set: $verify, inventaire(fr).

F7. ROLE SWAP (instrument structure): « tue le troll avec l'épée »(kill troll WITH sword) → `attack sword with troll` — direct-object and instrument REVERSED. Game: "You don't have the troll." Should be `attack troll with sword`. Verb tuer→attack OK; but "X avec Y" mapped to "attack Y with X". Breaks combat + any "do X to Y with Z". Testing « attaque le troll avec l'épée » for determinism.

F7-followup (verb-dependent!): « attaque le troll avec l'épée » → `attack troll with sword` ✅ — troll dies. So the F7 role-swap is VERB-SPECIFIC: "tue X avec Y" swaps roles (attack Y with X), but "attaque X avec Y" maps correctly (attack X with Y). The "tuer" lemma triggers the swap; "attaquer" does not.

(Findings now logged to notes/uat.md going forward; /tmp copy preserved.)

F8. DIAGONAL DIRECTION DROPPED: From Round Room, « va au sud-est »(southeast) → `south` (lost "-est"). Sent player south to Narrow Passage instead of southeast to Engravings Cave. Off-route. Diagonal/compound directions (sud-est/nord-est/sud-ouest/nord-ouest) at risk of collapsing to a cardinal. Recovering via north + retry.

F8-confirmed: « va vers le sud-est » (alt phrasing) → `south` again (deterministic). "sud-est"→south regardless of phrasing. Will bypass via English diagonal.

F8-ESCALATED (SEVERITY: HIGH): Canonical English `southeast` → `move random object` (!!) — total hallucination, game: 'I don't know the word "random".' So diagonal handling is broken in BOTH languages: fr "sud-est"→south (silent wrong move), en "southeast"→"move random object" (nonsense). The word "random" suggests a prompt/grammar placeholder leaking. Must toggle layer off to walk the diagonal.

F9. "TIE X TO Y" COLLAPSE (snap-to-scene): At Dome Room, « attache la corde à la rampe »(tie rope to railing) → `climb wooden railing`. Verb attacher→climb; rope OBJECT DROPPED entirely; only scene-salient object (railing) kept. Game: "You can't do that!". CAVEAT: player didn't hold the rope (sequencing), which likely worsened the drop.

## ROOT-CAUSE THEME (unifies F3/F4/F9)

Scene-resolution snaps command nouns onto in-room/in-scene objects and DISCARDS nouns it can't locate, often dragging in the object's salient attribute/action. Symptoms: window→boarded window; take lamp→turn on lamp; tie rope to railing→climb railing. Net effect: the NL layer frequently REWRITES valid intent into a wrong but locally-plausible command — and this corrupts English input too (F3-escalated, F8-escalated), so it is not a French-only issue.

OBS-save: `save` → routed as meta (no translation line) but produced NO visible confirmation text (app uses IndexedDB autosave; explicit save gives no user feedback). Minor: consider a "Saved." acknowledgement.

## SPECIAL COMMANDS (user-requested)

F10. `restart` IS A SILENT NO-OP: typing `restart` (English-on) produced no command line, no confirmation prompt, no reset, no console nl-debug entry. Routed as meta (not sent to LLM) but the handler does nothing observable. Expected: Z-machine restart confirmation ("Do you wish to restart?") then reset. Will retest with layer off.

## CONSOLE [nl debug] INTERNALS (high-value root-cause evidence)

The NL layer logs per-turn: {english, antecedent, inScope:[...], raw:<LLM JSON>, result}. Source: src/llm/useNaturalLanguage.ts (~lines 259/306/354).

R1. PHANTOM SCOPE OBJECTS — every inScope array contains placeholder/pseudo nouns that should NOT be selectable: "random object" (omnipresent), "number", "cretin", "chute". These pollute scope. When the LLM can't map a word it snaps to one of these. Direct cause of F8-escalated: `southeast` → raw {verb:"move",object:"random object"} → `move random object`. THIS IS A VOCAB-EXTRACTION BUG (recent work): pseudo-objects (ZIL globals like CRETIN, the number parser, a "random object" placeholder) are leaking into the noun scope. Highest-leverage fix.

R2. F7 role-swap is LLM-level: «tue le troll avec l'épée» raw = {verb:attack, object:"sword", prep:with, indirect:"troll"} → "attack sword with troll" (object/indirect swapped by the MODEL). «attaque le troll avec l'épée» raw = {verb:attack, object:"troll", indirect:"sword"} → correct. So the verb lemma "tue" steers the model to swap roles; prompt/few-shot guidance for "kill X with Y" is the lever.

R3. F2 compound truncation = executor policy: log shows `sequence stop {stopReason:"in-game-failure", done:1, total:2}` after clause0 «pose le dépliant»→"read leaflet". The compound runner ABORTS remaining clauses when it detects an in-game failure; here detection misfired (read leaflet wasn't a real failure) OR the mistranslation produced a state it judged failed. Heuristic is brittle.

R4. F1/F3/F4/F9 confirmed at raw-JSON level (model + scope):

- «pose le dépliant» raw {verb:"read",object:"white house"} (model picked verb=read, snapped object to scene's white house)
- «ouvre la fenêtre» raw {verb:"open",object:"boarded window"} (only window in scope is "boarded window")
- «prends la lampe» raw {verb:"turn on",object:"brass lantern"} (model mapped prendre→turn on)
- «attache la corde à la rampe» raw {verb:"climb",object:"wooden railing"} (rope not in scope → dropped; verb attacher→climb)
  The "antecedent" field tracks the last-salient object for pronoun/it-resolution and frequently equals a phantom ("random object") — reinforcing R1.

F10-confirmed: With English OFF, `restart` STILL produces nothing (no echo, no confirm, no reset, no console error). So `restart` is non-functional independent of the NL layer — the app swallows it and never reaches the Z-machine restart. (Autosave itself works: console shows `[autosave] autosave_write ... save` every turn.)

OBS-autosave: autosave_write fires every turn (src/storage/dialog.ts). Resume-on-load works (preload HIT at boot).

## STATUS @ checkpoint

Reached: Dome Room, Score 40/350, Turns 35. Diverged from walkthrough (skipped attic → no rope/painting/knife; trap door barred behind). Full 349-pt completion from here needs a long backtrack OR a working restart (which is broken, F10). NL layer required English-bypass on ~5 distinct obstacles (window, lamp-take, diagonal, $verify, and would-be more) — i.e., it is not currently reliable enough to play through unaided.

================================================================

# EXECUTIVE SUMMARY (Ovid UAT — Zork I NL layer, French black-box)

================================================================
Method: typed French prose (with misspellings & compound sentences) through the
"English" NL toggle; read the on-screen italic source → canonical translation →
game output, plus the [nl debug] console (raw LLM JSON + inScope). Fixed nothing.

WHERE THE NL LOGIC WORKS (PASS):

- Simple verb+noun: «ouvre la boîte aux lettres» → open small mailbox
- Misspellings absorbed: «li le depliant» → read leaflet
- prendre on a normal object: «prends l'épée» → take sword
- Cardinal movement: va au sud/nord/est/ouest, «descends» → down
- A clean 2-step compound: «va au sud puis va à l'est» → south, east (both ran)
- Combat with attaquer: «attaque le troll avec l'épée» → attack troll with sword
- «ouvre la trappe» → open trap door; «emporte la lanterne» → take brass lantern
- Meta routing (bypass LLM, no turn used): score, diagnose, version, verbose, super
  (the latest commit's 'super'-as-meta fix is VERIFIED working)

WHERE IT FAILS (by severity):
HIGH — corrupts valid intent / blocks play:
R1 Phantom scope nouns ("random object","number","cretin","chute") leak into
inScope every turn; LLM snaps to them → e.g. southeast → "move random object".
VOCAB-EXTRACTION BUG, highest-leverage fix. (drives F8-escalated)
F3 Scene-resolution snaps "fenêtre/window" → "boarded window"; corrupts even the
valid English `open window`. Blocked house entry until layer toggled off.
F8 Diagonals broken in BOTH languages: «sud-est» → south (silent wrong move);
`southeast` → "move random object" (nonsense).
F10 `restart` is a silent no-op — even with the layer OFF (never reaches engine).
MEDIUM — wrong but sometimes recoverable:
F4 «prends la lampe» → turn on lamp; «ramasse la lampe» → open lamp (object-action
bias; lamp attracts non-take verbs). Workaround: «emporte la lanterne».
F7 «tue X avec Y» → "attack Y with X" (role swap, LLM-level, verb-specific to tuer).
F1 French drop-verbs: «pose le dépliant» → read white house (poser→read + noun snap).
F9 «attache la corde à la rampe» → climb wooden railing (tie→climb, object dropped).
F2 Compound truncation: aborts remaining clauses on mis-detected "in-game-failure".
F5 «inventaire» → look (French inventory not recognized).
F6 `$verify` leaks into the LLM → look (not in the meta set; $-prefix unhandled).
LOW / OBS:

- `save` routes as meta but gives no "Saved." feedback (autosave model).

UNIFYING ROOT CAUSE: the scene-resolver aggressively SNAPS command nouns onto
in-room/in-scope objects (and their salient attribute/action) and DISCARDS nouns it
can't locate — polluted further by phantom scope entries (R1). Because this rewrites
commands post-translation, it breaks correct ENGLISH input too, so it is not a
French-only problem. French-specific gaps on top: drop-verbs, diagonal directions,
French meta words (inventaire), and the tuer role-swap.

NOT TESTED (run wrapped early at user request; also blocked by sequencing): full
completion to 349 pts; puzzle verbs pray/echo/Ulysses/wind-up-canary/wave-sceptre/
give-to-thief/dig; save+restore round-trip; cold model-download opt-in modal (model
was already cached). Reached Score 40/350 at Dome Room.
