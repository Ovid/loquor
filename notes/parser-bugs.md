# Parser / NL-layer bug review — English walkthrough UAT (2026-06-22)

Black-box browser UAT on branch `ovid/fix-the-it-bug`, driving the Zork I
walkthrough (`docs/walkthrough-zork-i.txt`) in **plain English**, focused on the
just-shipped English-pronoun work (commits f503ab9 / 09cdb29 / d698ef2:
`resolveEnglishPronoun`, the `(pronoun-raw)` fallback, de-poisoned pronoun
few-shots) and hunting for _similar_ NL mis-mapping bugs.

Method: type real English at the live app, read the authoritative console
`[nl] clause` log (`stage` / `antecedent` / `raw` / `result.text`) plus
screenshots, and use quoted-passthrough (`"…"`) to compare against raw Zork.
Mode: **`full`** (WebLLM warm), English, Zork I, resumed save (West-of-House →
Troll Room, score 35). **No code changed; nothing committed.**

> Status legend: ✅ verified working · ❌ confirmed bug · ◻︎ non-bug (matches
> original Zork / safety-net worked)

---

## ✅ The "it bug" fix itself works (headline result)

The reported failure — `open it` → an LLM hallucination like `open chests` /
`open advertisement` — is **genuinely fixed**. I caught the _old_ behavior frozen
in the resumed save's transcript (`> open it` / "You can't see any chests here!")
and the **live** re-run at the same spot produced the correct result:

```
> open it
With great effort, you open the window far enough to allow entry.
[nl] clause {clause:"open it", stage:"lexicon", antecedent:"window",
             raw:"(pronoun)", result:{text:"open window"}}
```

Verified working across many positions/stages:

| Probe                                                          | → resolved                                                                    | Path        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------- |
| `open it` (ambiguous synonym "window")                         | `open window`                                                                 | `(pronoun)` |
| `take it` after `open sack` reveals garlic+lunch               | `take food` (last-mentioned)                                                  | `(pronoun)` |
| `turn it on` (3-token particle)                                | `turn on light`                                                               | `llm`       |
| `put it down` / `pick it up` (particles)                       | `drop food` / `take food`                                                     | `llm`       |
| `take bottle and open it` (inter-clause)                       | clause 2 antecedent→"glass bottle" → `open bottle`                            | `(pronoun)` |
| `put it in the case` (pronoun = direct obj in prep phrase)     | `put sword in case`                                                           | `llm`       |
| `attack it with the sword` / `kill it with the sword` (combat) | `attack/kill troll with sword` (antecedent = troll, not the sword instrument) | `llm`       |
| `drop it` / `grab it` ("grab" synonym)                         | `drop/grab sword`                                                             | `(pronoun)` |
| `examine it` (scenery antecedent "wall")                       | `examine surrounding wall`                                                    | `(pronoun)` |

Inter-clause antecedent propagation within one multi-clause input works
(`take bottle and open it` → "open bottle"). Conjoined commands work
(`drop the bottle and the lunch` → two clauses, both dropped; `take the lunch and
the bottle` → both taken).

---

## ❌ BUG A — English `take all` / `take everything` (and `drop …`) mis-map via the LLM

**Severity: high — a core, constantly-used command is corrupted, and only in
`full` (LLM-warm) mode.**

`take all` typed verbatim never reaches Zork as "take all". It goes to the LLM,
which binds "all"/"everything" to the tracked antecedent or hallucinates. **5/5
failures:**

| Input             | antecedent | LLM `raw`             | sent to Zork   | player sees                                             |
| ----------------- | ---------- | --------------------- | -------------- | ------------------------------------------------------- |
| `take everything` | wall       | `take axe with sword` | (invalid)      | "That sentence isn't one I recognize."                  |
| `take everything` | large bag  | `take large bag`      | take large bag | "The bag will be taken over his dead body."             |
| `take all`        | body       | `take large bag`      | take large bag | "You can't see any large bag here!"                     |
| `take all`        | walls      | `take large bag`      | take large bag | "You can't see any large bag here!"                     |
| `take all`        | lunch      | `take food`           | take food      | "Taken." (took **only** the lunch, left the bloody axe) |
| `drop all`        | lunch      | `drop food`           | drop food      | "Dropped." (one item, not all)                          |
| `drop everything` | lunch      | `drop axe with sword` | (invalid)      | "That sentence isn't one I recognize."                  |

Every one logged `stage:"llm"` — i.e. `take all` is **never** handled
deterministically in English.

### Root cause

The bare-quantifier → "take all" mapping lives in `parseLexicon`
(`src/llm/lexicon/parse.ts:293-298`, the `quantifiersAll` branch), and
`quantifiersAll` in `fr.core.ts:316` and `es.core.ts:348` even lists the bare
English word `'all'`. **But `parseLexicon` only runs for fr/de/es** (languages
_with_ a lexicon). **English has no lexicon**, so the English branch of
`runClause` (`translatePipeline.ts`) only does `resolveEnglishPronoun` /
`isEnglishPronounClause` and then falls straight through to the LLM. `take all`
has no deterministic English path. `de.core.ts:374` literally documents this
exact failure mode ("the bare quantifier fell to the LLM, which …") — fr/de/es
were fixed and **English was left out**.

### Why it's especially bad

- It violates CLAUDE.md's "deterministic behavior must work for EVERY applicable
  language." English is the _default_ language.
- **Irony / the warm-LLM trap:** in _grammar-only_ mode (no LLM) English
  raw-sends, so `take all` would reach Zork verbatim and **work**. It is the
  **warm LLM that breaks it** — exactly the anti-pattern the output-translation
  notes warn about (relying on the LLM for an uncovered case, which fails
  precisely when the deterministic path is absent).

### Suggested fix (NOT applied)

Add a small deterministic English quantifier handler in `runClause`'s English
branch, mirroring `resolveEnglishPronoun`: a bare `<verb> all|everything` (verb a
known arity-1/2 vocab verb) → emit `<verb> all` and raw-send it (Zork supports
`take all`/`drop all`/`put all` natively). Cross-language lens: also add bare
`'all'` to `de.core.ts` `quantifiersAll` (a German player typing English "take
all" hits the same gap; fr/es already cover it).

---

## ❌ BUG B — Cross-turn antecedent goes stale after an article-led `take`/`drop`

**Severity: medium-high — directly undermines the new pronoun fix for the very
common "take the X → do Y to it" pattern, and is WORSE than original Zork. The
app's own placeholder text promotes article usage ("open the mailbox", "take the
lamp and go north").**

When the player's previous command **includes an article** ("the"/"a"/"an") AND
its output is **nounless** ("Taken." / "Dropped."), the antecedent is not updated
to the object the player just acted on, so the next pronoun resolves to a **stale
older** object.

### Live repro (deterministic 2-token pronoun)

```
> examine the sword     → There's nothing special about the sword.
> take the lunch        → Taken.
> examine it            → There's nothing special about the sword.   ❌ (expected the lunch)
[nl] clause {clause:"examine it", antecedent:"sword", raw:"(pronoun)",
             result:{text:"examine sword"}}
```

Same with `eat it` → `eat sword` ("I don't think that the sword would agree with
you.").

### Raw Zork gets it right (quoted passthrough bypasses the NL layer)

```
> examine sword   → nothing special about the sword.
> take lunch      → Taken.
> examine it      → There's nothing special about the lunch.   ✅ Zork: "it" = lunch
```

So Loquor is **strictly worse than original Zork** for this pattern.

### It is specifically the ARTICLE

```
> examine the sword
> take lunch            (NO article)
> examine it            → There's nothing special about the lunch.   ✅ antecedent updated
```

`take lunch` updates the antecedent; `take the lunch` does not. Confirmed in the
log (`take lunch` → next `examine it` antecedent:"lunch"; `take the lunch` → next
`examine it` antecedent:"sword").

### Root cause

`directObject()` in the scene tracker (`src/llm/scene/tracker.ts:111-127`) strips
the **verb**, then matches the remainder against noun surface forms — but it does
**not strip a leading article**. So `directObject("take the lunch")` → remainder
`"the lunch"` matches no surface form (those are "lunch"/"food", not "the lunch")
→ returns `null`. That makes the acted-object antecedent fallback
(`tracker.ts:177-198`, precedence rule #2 "else acted object") never fire, so the
antecedent stays stale. The same `null` also skips the `carried` bookkeeping at
`tracker.ts:156-159` (the just-taken object isn't marked carried in `inScope`).

### Why it's English-specific

For fr/de/es the command reaching the scene tracker is the **translated
canonical** (the lexicon strips articles during translation, e.g.
`prends le déjeuner` → `take food`), so `directObject` sees an article-free
command and works. English goes through **vocab passthrough**, which keeps the
article intact (`take the lunch` is sent verbatim), so only English feeds
`directObject` an article it can't parse. (This is the inverse of the usual
"English-first" trap: the shared tracker assumes article-free canonical commands,
which holds for the translated languages but not for passthrough English.)

### Interaction with the branch's fix

The new `resolveEnglishPronoun` faithfully trusts `scene.antecedent` and (for
2-token forms) never consults the LLM — so when the antecedent is stale it returns
a **confidently wrong** object instead of a hallucination. The fix is only as good
as the antecedent feeding it; Bug B is the antecedent-tracking half. (3-token
particle forms like `turn it on` route to the LLM, which has fuller recent-input
context and may still recover — not separately confirmed.)

### Suggested fix (NOT applied)

In `directObject` (and anywhere it parses the remainder), strip a leading English
article/determiner ("the"/"a"/"an"; consider "my"/"all of") after removing the
verb, before matching surface forms. Small and low-risk; add a tracker unit test
for `take the lunch` → antecedent updates to the acted object.

---

## ◻︎ Non-bugs (verified, no action needed)

- **`take them` collapses to the singular antecedent** (`take food`, garlic in the
  sack skipped → "You already have that!"). Quoted `"take them"` shows **original
  Zork does the same here** — `'them'` is treated like `'it'` (one antecedent), a
  shared engine limitation, not a Loquor regression. (A genuinely-plural
  antecedent divergence — e.g. candles — was not reached; low priority.)
- **`put sword in it`** (intended "it" = case, but the antecedent is the sword):
  LLM hallucinated `indirect:"ancient prayet"` → validator **abstained** →
  pipeline **raw-sent** "put sword in it" → "You can't do that." Same as raw Zork
  ("it" = the sword too); the abstain safety-net did its job. Shows the LLM is
  unreliable for pronoun-as-indirect-object, but the outcome is not player-harming
  here.

## Not reached / not verified (deferred)

- The new **`(pronoun-raw)`** fallback (commit d698ef2) never fired live — every
  antecedent in scope was mappable to a vocab object, so `resolveEnglishPronoun`
  always hit before the raw-send. Triggering it cleanly needs a null antecedent
  (fresh game, first command `take it`) or a non-vocab antecedent; left to the
  unit tests. (Avoided a destructive restart of the save.)
- Deep puzzle verbs along the rest of the walkthrough (tie rope, wave sceptre,
  ring bell, wind canary, dig sand, turn bolt with wrench) — not reached this
  session; worth a deep-gameplay English pass.
- Whether Bug B's staleness reaches the **LLM particle path** (`turn it on` after
  `take the lamp`) — couldn't test safely (turning the lamp off underground =
  grue death).

---

## Quick repro recipe (for whoever fixes these)

1. New English game, `full` mode. Living Room.
2. **Bug B:** `examine the sword` → `take the lunch` → `examine it` → describes the
   **sword** (should be the lunch). `take lunch` (no article) makes it work.
3. **Bug A:** anywhere with a floor item, `take all` → mis-maps (logs `stage:"llm"`,
   never "take all").

---

# Follow-up UAT (2026-06-22, branch `ovid/fix-the-it-bug` @ 404e1f4) — verify shipped fixes + hunt for similar bugs

Resumed save at **The Troll Room** (score 35→40, mode **`full`** / WebLLM warm,
English, Zork I). Method: drive plain English, read the authoritative `[nl] clause`
console log (captured via an in-page `console.log` hook into `window.__nlClauses`),
quoted-passthrough (`"…"`) to compare against raw Zork. **No code changed.**

## ✅ Bugs A & B and the "it" bug are FIXED (regression-verified live)

- **Bug A** — `take all` / `take everything` / `drop all` / `drop everything` all now
  go through `stage:"lexicon"`, `raw:"(quantifier)"`, emitting `take all` / `drop all`.
  Never the LLM. `take everything`→`take all`, `drop everything`→`drop all` (normalized).
  Confirmed in-game: `take all` → "bloody axe: Taken."; `drop all` → all items dropped.
- **Bug B** — `drop the lunch` → `examine the sword` → `take the lunch` → `examine it`
  now correctly describes the **lunch** (`antecedent:"lunch"`, `raw:"(pronoun)"`,
  `result:"examine food"`). The leading article is stripped; the acted object updates
  the antecedent even with `the`.
- **"it" bug** core path re-confirmed (`open it`→`open bottle`, `drink it`→`drink
liquid` with antecedent propagated from the prior clause, etc.).

## ◻︎ TODO.md "it"/compound bugs appear FIXED (could not reproduce)

- **Compound "noun missing"** (`open it, take the paper, and read it`): no longer
  reproduces. Compounds now split cleanly into indexed clauses (`i:0/1/2`) and **abort
  on the first not-in-scope clause** with a visible **"Ran N of M actions."** notice
  (e.g. `open it`→`open window` "You can't see any window here!" → "Ran 1 of 3 actions",
  clauses 2-3 not run). The old clause-mashing that produced Zork's "noun missing" is
  gone. Inter-clause pronoun propagation works (`…take the water, and drink it` →
  clause 3 antecedent="quantity of water").
- **Cross-room stale "it"** (`open it` → "can't see any advertisement here" after
  leaving the room): no longer reproduces. Leaving a room re-scopes; an out-of-scope
  antecedent is dropped and `it` re-binds to an in-scope object (e.g. after leaving the
  axe behind, `examine it` → the new room's `stairs`, not the stale axe). Re-binding a
  referent-less `it` to room scenery is a defensible heuristic, not clearly a bug.

## ❌→✅ BUG C (RESOLVED) — English verb **`inflate` was missing from the vocab** → boat puzzle broke in `full` mode

**Severity: high — a REQUIRED puzzle verb is corrupted; same class as Bug A.**

Every `inflate …` typed in English routes to the LLM and is mangled, inconsistently:

| Input                               | `stage` | LLM `raw`                                   | sent to Zork          |
| ----------------------------------- | ------- | ------------------------------------------- | --------------------- |
| `inflate plastic with pump` (canon) | `llm`   | `{"verb":"turn on","object":"pump"}`        | `turn on pump`        |
| `inflate the plastic with the pump` | `llm`   | `{"verb":"turn on","object":"pump"}`        | `turn on pump`        |
| `inflate the boat with the pump`    | `llm`   | `{"verb":"move","object":"pump"}`           | `move pump`           |
| `inflate the boat`                  | `llm`   | `{"verb":"move","object":"boarded window"}` | `move boarded window` |

The game's "You can't see any pump here!" **looks** like a clean parse but is actually
the LLM's `turn on pump`. The canonical walkthrough command (`inflate plastic with
pump`, line 1787) therefore never reaches Zork — the **magic-boat inflation puzzle is
unsolvable via natural English** in warm-LLM mode, blocking the whole Frigid River
branch (Sandy Beach, the scarab, the buoy/emerald, Aragain Falls).

### Root cause (confirmed in source)

`src/llm/grammar/zork1.vocab.ts` `verbs2` stores the verb as the **6-char-truncated
`'inflat'`** (line ~212) — the _only_ truncated entry in the list; every sibling
(`'deflate'`, `'extinguish'`, `'launch'`, `'blow up'`, `'pump up'`, …) is full-spelled.
The English vocab-passthrough gate exact-matches the typed token `inflate` against
`verbs2`, finds only `inflat`, **misses**, and falls to the LLM. (`deflate` is full →
`deflate the boat` raw-sends fine; that asymmetry is the tell.)

The fr/de/es **lexicon** path already bridges this: `fr.core.ts`/`es.core.ts` map
`gonfle`/`infla`→`inflate` and the parser validates the full `inflate` against the
truncated `inflat` (pinned in `parse.test.ts:483`, with the NOTE warning "or every
inflate clause silently falls to the LLM"). **English passthrough was left without
that bridge** — the exact Bug-A pattern ("fixed for fr/de/es, English left out").
Same vocab line exists in `zork2.vocab.ts:215` / `zork3.vocab.ts:213`.

### Warm-LLM trap / workaround

In **grammar-only** mode English raw-sends, so `inflate plastic with pump` would reach
Zork and **work** — it is the **warm LLM that breaks it**. Workaround verified:
quoted passthrough **`"inflate plastic with pump"`** bypasses the gate and raw-sends ✓.

### RESOLVED 2026-06-22 (Ovid go-ahead → /paad:vibe, TDD)

The **true** source is the ZIL itself: `zork1/gsyntax.zil:246` is
`<SYNTAX INFLAT OBJECT WITH OBJECT … = V-INFLATE>` — the verb head was authored in the
6-char-truncated form (the lone such case; DEFLATE/EXTINGUISH/LAUNCH are full). The
extractor (`scripts/lib/zil.mjs extractVerbsAndPreps`) copied the head verbatim, so
`verbs2` held `inflat`. Fix (chosen approach (a), data/extractor): a documented
de-truncation map `VERB_HEAD_DETRUNCATIONS = { inflat: 'inflate' }` applied to the
SYNTAX verb head, then `make extract-vocab` regenerated all three games — a 3-line diff
(`verbs2: 'inflat' → 'inflate'` in zork1/2/3; the boat's `inflat` ADJECTIVE untouched).
RED→GREEN test: `inputTranslate.test.ts` "inflate verb passes the vocab gate (Zork I) —
BUG C" pins `isVocabPassthrough('inflate plastic with pump' / 'inflate the boat with the
pump', ZORK1_VOCAB, null) === true`. The lexicon path stays green (its `hasVerbForm`
now exact-matches `inflate` instead of truncation-matching `inflat`). `make all` green
(1273). Live-verified in a fresh tab: English `inflate plastic with pump` → `[vocab]`
`inflate plastic with pump` (was LLM `turn on pump`); Spanish `infla el plástico con la
bomba` → `[lexicon]` `inflate valve with pump` (unchanged). Commits pending.

## Verb sweep — all other required puzzle verbs PASS (English, `stage:"vocab"` raw-send)

`tie rope to railing`, `wave the sceptre`, `ring the bell`, `turn bolt with wrench`,
`wind up the canary`, `dig in the sand with the shovel`, `give the egg to the thief`,
`pray`, `launch the boat`, `raise/lower the basket`, `extinguish the candles`,
`move the rug`, `unlock the grating with the skeleton key`, `cross the rainbow`,
`pour water on the troll`, `light the candles with the match`, `read the book`,
`climb the tree`, `echo`, `blow up the boat`, `deflate the boat` — all raw-send the
verb+noun(+instrument) intact (Zork replies "those things aren't here" / "you don't
have that", confirming the parse). **`inflate` is the lone failure.**

## Not reached / deferred (same constraints as prior session)

- The **`(pronoun-raw)`** fallback still needs a fresh game (null antecedent) to fire.
- The compound **abort-on-failure** ("Ran N of M") silently drops later clauses if an
  early clause mis-resolves to a not-in-scope object — flip side of the fix; mitigated
  by the visible notice. Worth a deliberate look but not obviously a bug.

---

# Walkthrough English UAT (2026-06-22, branch `ovid/fix-the-it-bug`) — hunt for more A/B/C-class bugs

Drove the full Zork I walkthrough command set in plain English, `full`/warm-LLM mode
(resumed save, East-West Passage, score 40). Method: in-page `console.log` hook into
`window.__nlClauses`, read the authoritative `[nl] clause` `stage`/`result.text` per
probe. A token-coverage sweep (`grep` walkthrough tokens vs `zork1.vocab.ts`) showed
only `all` (handled by the Bug-A quantifier path) and `inside` absent — so the literal
walkthrough is clean except `inside`. The richer-English probes found the real bug.

## ❌→✅ BUG D (RESOLVED) — preposition SYNONYMS dropped from the vocab → warm LLM mangles `put X into Y` etc.

**Severity: high — same class as BUG A/C. A core, natural phrasing of a constant
command (`put X into/inside Y`, `look under`/`underneath`/`beneath`/`below`) routes to
the warm LLM and is non-deterministically mangled to a WRONG command.**

Browser-confirmed mangles (`stage:"llm"`, reproduced 2× each):

| Input (warm LLM)            | LLM `result.text` | player sees / harm                                  |
| --------------------------- | ----------------- | --------------------------------------------------- |
| `put painting into case`    | `take painting`   | verb FLIPPED + destination dropped — opposite action |
| `look underneath rug`       | `look`            | object lost — would miss the trap door under the rug |
| `attack troll using sword`  | `attack troll with sword` | correct THIS run (LLM luck)                  |
| `put coal onto machine`     | `put coal on machine`     | correct THIS run (LLM luck)                  |
| `put painting inside case`  | `put painting in case`    | correct 3× (LLM luck)                        |

The grammar-only path is fine (English raw-sends; Zork maps the synonym itself); it is
the **warm LLM** that breaks it — the A/B/C trap exactly.

### Root cause (confirmed; identical in Zork I/II/III — shared generic SYNTAX file)

`gsyntax.zil` declares each canonical prep WITH its synonyms:
`<SYNONYM IN INSIDE INTO>` · `<SYNONYM ON ONTO>` ·
`<SYNONYM UNDER UNDERNEATH BENEATH BELOW>` · `<SYNONYM WITH USING THROUGH THRU>`.
The extractor (`scripts/lib/zil.mjs`) kept only the canonical **head** (`in/on/under/with`)
and `continue`d, **dropping all 9 synonym members** — they never reached `vocab.preps`,
so `vocabWordSet`/`isVocabPassthrough` missed the literal word the player typed and
routed the command to the LLM. (Verb/direction/magic-word synonym blocks are NOT
affected — their members ARE retained as `verbSynonyms`; verified `Ulysses`→vocab,
`ne`→`northeast` via a dedicated `direction` stage. Prepositions were the lone gap.)

Complete dropped set (all 9, all three games, all `MISSING` from each vocab pre-fix):
`inside, into` (IN) · `onto` (ON) · `underneath, beneath, below` (UNDER) ·
`using, through, thru` (WITH).

### RESOLVED 2026-06-22 (Ovid go-ahead → /paad:vibe, TDD)

Mirrors the BUG C extractor fix. `zil.mjs` now retains the prep-block synonym members
in `preps` (they are real prep dictionary words the Z-parser accepts wherever the head
is; raw-sending `into`/`underneath` is correct — Zork maps them to `in`/`under`).
`make extract-vocab` regenerated all three games — a +9-preps-per-game diff, nothing
else changed. The fr/de/es lexicon is unaffected (it maps foreign preps to the CANONICAL
head, never emits a synonym). RED→GREEN: `inputTranslate.test.ts` "preposition synonyms
pass the vocab gate (Zork I)" (all 9 via `isVocabPassthrough`) + "...present in every
game vocab (parity)" (zork1/2/3 `preps` contain all 9). `make all` green (1287).
Live-verified in a fresh tab: `put painting into case` → `[vocab]` verbatim (was LLM
`take painting`) → game gives the correct PUT error "You don't have that!"; `look
underneath rug` → `[vocab]` verbatim (was LLM `look`) → "You can't see any rug here!"
(object preserved). Not yet committed.

## Lower-severity / non-bugs this run

- Single-word + magic-word + adj+noun probes all raw-send (`stage:"vocab"`): `Ulysses`,
  `sand` (the `dig` disambiguation answer), `wait`, `inventory`, `push yellow button`,
  `take canary from egg`, `go up chimney`. Direction abbreviations (`u`/`ne`/`nw`) resolve
  deterministically (`u` vocab; `ne`→`northeast` via the `direction` stage). No LLM, no harm.
