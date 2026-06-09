# Loquor NL Layer v2 — Deterministic-First Multilingual Translation

**Date:** 2026-06-09
**Status:** Approved design (brainstormed with Ovid; approach C of three).
Revised 2026-06-09 after `paad:pushback` review (root-cause correction, ambiguity
rule, stage-4 collision guard, DE separable verbs, emit-form algorithm, pref
migration).
**Supersedes/revises:** parts of `2026-06-07-loquor-nl-layer-design.md` (locked
decision 4, grammar scope), `2026-06-07-loquor-nl-scene-resolution-design.md`
(scope's role), `2026-06-07-loquor-nl-compound-commands-design.md` (one stop
condition). Builds on `2026-06-08-loquor-nl-vocab-extraction-design.md`.
**Evidence base:** `notes/uat-1.md`, `notes/uat-2.md` (two black-box UAT runs of
Zork I in French/German/Spanish on `?model=full`,
`Llama-3.1-8B-Instruct-q4f16_1-MLC-1k`).

---

## 1. Problem

Two UAT runs established that the NL layer is excellent on plain verb+noun and
directions across FR/DE/ES, but unreliable for unaided play. The failures
cluster into classes, and most are **caused by our own code constraining the
model**, not by raw model ability:

| Class | UAT findings | Root cause |
| --- | --- | --- |
| Wrong-object snap | F-F, F-S, F-T, F-V, F-W, F-AA, F3 | GBNF grammar builds noun terminals from `scene.inScope` ONLY. When the real object isn't in scope (carried items never are; closed/unmentioned objects aren't; stale items linger), the model **cannot emit the right noun** and constrained decoding forces a wrong-but-in-scope one. |
| Verb-only collapse | F-Q (`drop coffin` → `down`) | Same grammar: empty `inScope` leaves only verb-only productions. |
| Re-planning over literal intent | F-H, F-Q, F3-escalated, F8-escalated | **Not** raw game output in the prompt — that was already removed pre-UAT-2 (`b14fea1`); the re-planning survived it. F-Q's debug capture shows the real mechanism: the scope-only grammar (often `inScope:[]`) forbids the literal translation, and with only location/antecedent hints to go on, the model's own world-model priors fill the gap — it emits "what the player must want next" instead of translating. Corrupts valid **English** input too. |
| Verb mis-maps | F-M (`pose`→take), F-N (`agite`/`secoue`→take), F-X (`sonne`→turn on), F-CC (`remonte`→climb), F1 (`poser`→read) | 8B-at-q4 multilingual verb knowledge has real limits (the model card itself is modest about 8B multilingual quality). The model has hit its ceiling; code must carry this. |
| Foreign-text leak on abstain | F-R | Locked decision 4 (abstain → raw passthrough) was designed for English input; raw French reaches the Z-parser as gibberish ("I don't know the word 'gonfle'"). |
| Magic words mangled | F-BB (`Ulysse`→look), F-DD (`écho`→examine bell) | Bare puzzle words are forced through translation. |
| Localized meta gaps | F5, F-U (`inventaire`, `diagnostic`, `examine-moi`) | `META_ALIASES` is a 3-entry seed. |
| Parser-rejected emit | F-Z (`take hand-held air pump`) | Extracted `canonical` is the ZIL long DESC; the Z-parser accepts only its dictionary words (`pump`). |
| Silent input drop | F-A | No input queue; lines typed during `…thinking` vanish. |
| Prefix illegibility | (user report) | `>` (player's text) vs `›` (canonical command) are visually near-identical. |
| Compound over-abort | F-G | Soft no-ops ("It is already open.") abort the rest of a sequence. |

**Design conclusion** (matches the semantic-parsing literature — canonical
utterances, Rewrite-then-Parse, grammar-constrained decoding for parsers): the
LLM should **translate**; deterministic code should **ground**. Today we do the
reverse. v2 inverts it and, further, makes deterministic translation the
*primary* path, with the LLM as fallback for the long tail.

## 2. Locked decisions (this design)

1. **Supported languages: English, French, German, Spanish.** All within
   Llama 3.1's 8 officially supported languages. Lexicons, few-shots, and
   meta-aliases are built and tested for exactly these.
2. **Model stays `Llama-3.1-8B-Instruct-q4f16_1-MLC-1k`** for `?model=full`.
   Fix the code handcuffs first; revisit (Qwen2.5-7B / Qwen3-8B are drop-in
   WebLLM peers with broader official language lists) only if the model is
   still the bottleneck after v2.
3. **Sticky language picker** replaces the on/off toggle:
   `Off · English · Français · Deutsch · Español`. One language at a time.
   The stored pref becomes a single source of truth:
   `{ language: 'off' | 'en' | 'fr' | 'de' | 'es', declined: boolean }`
   (no separate `enabled`). Migration from the legacy
   `{ enabled, declined }`: `enabled: true → 'en'`, `enabled: false → 'off'`,
   `declined` preserved, unknown/corrupt → defaults (`'off'`,
   `declined: false`). Covered by a migration test.
4. **Deterministic-first pipeline** (§4): quoted passthrough, meta/aliases,
   bare-vocab-word passthrough, direction fast-path, lexicon parse — all
   before any LLM call.
5. **Per-language lexicons** as committed, reviewable data files validated
   against the extracted vocab at build time (§5).
6. **LLM fallback grammar uses the full game vocab**, not `inScope`; scope is
   demoted to a prompt hint (§7).
7. **Abstain policy revised** (supersedes v1 locked decision 4): non-English
   abstain shows a graceful notice; English abstain keeps raw passthrough.
8. **Both escape hatches:** quoted strings (`"open mailbox"` → verbatim) and
   bare-vocab-word passthrough (covers magic words: `echo`, `ulysses`,
   `xyzzy`, `pray` — extracted, not hand-listed).
9. **Transcript prefixes:** the player's source line loses `>` and gets a
   worded `you` label; only the real command keeps `>`. The `›` glyph is
   removed.
10. **Input queue** for lines typed mid-translation (FIFO, cap 4, flushed on
    interactive prompts).
11. **Soft no-ops do not abort compound sequences** (revises compound-commands
    stop conditions).

## 3. Non-goals

- Free language-mixing mid-game (UAT mixed FR/DE/ES per line). An
  other-language line falls through to the LLM and may still work, but it is
  not engineered for or tested.
- Languages beyond EN/FR/DE/ES (Italian/Portuguese/Hindi/Thai are
  model-supported but have no lexicons; adding one later = adding data files).
- Model swap, output (game-text) translation, voice input, grammar for Zork
  II/III beyond what extraction already provides.
- Fixing `restart` no-op (UAT-1 F10) — already addressed on this branch
  (UAT-2 F-K verified it).

## 4. Architecture: the translation pipeline

Per input line. Compound inputs are split first by the existing deterministic
`splitClauses` (`and/then/et/puis/ensuite/y/und` + `.;`), and **each clause
runs the whole pipeline independently**.

```
input line (NL language ≠ Off)
 1. interactive prompt active (confirmation/disambiguation)? → raw passthrough   [exists]
 2. quoted string: entire line is "…", «…», „…“ or “…”       → unquote, raw send [NEW]
 3. meta command or per-language meta alias                  → raw send          [extend]
 4. all words already in game vocab (incl. verb synonyms;
    English articles the/a/an allowed)                       → raw send          [NEW]
 5. direction fast-path (multilingual, vocab-gated)          → canonical         [exists]
 6. deterministic lexicon parse                              → canonical         [NEW — centerpiece]
 7. LLM fallback (full-vocab grammar, hardened prompt)       → canonical         [rebuilt]
 8. abstain → graceful notice (EN: raw passthrough)          → no foreign leak   [revised]
```

Stages 1–6 are instant (no inference). The common case —
`prends la lampe et déplace le tapis` — is two deterministic parses and zero
LLM calls; latency drops from ~10 s/clause to ~0.

Stage 4 detail: if every token of the line is a word the game's parser already
knows (vocab nouns' dictionary words, verbs, verb synonyms like
`ulysses`/`odysseus`, prepositions — plus the English articles `the/a/an`,
which the Z-parser accepts), send the line verbatim. This is what makes magic words,
and most literal English, immune to translation — killing the F-H
"poisoned context rewrites correct English" class outright.

**Collision guard:** when the picker is not English, a token that appears
(diacritic-folded) in the **active language's lexicon** does NOT count as "in
game vocab" for this stage — the line falls through to the lexicon parse
instead. Otherwise a foreign word that happens to double as an English
dictionary word would be passed through raw and silently misparsed. Magic
words stay covered (`echo`, `ulysses`, `xyzzy` are not lexicon source words),
and §5's build-time collision report makes every such overlap a visible
authoring decision.

## 5. Per-language lexicons (`src/llm/lexicon/`)

Two tiers, all committed TypeScript data files.

### 5.1 Core lexicon per language (game-independent)

`fr.core.ts`, `de.core.ts`, `es.core.ts`:

- **Verb map** → canonical English verb from the extracted verb set:
  `poser/jeter/lâcher → drop`, `sonner → ring`, `agiter/secouer → wave`,
  `remonter → wind up`, `creuser → dig`, `gonfler → inflate`,
  `attacher → tie`, `traverser → cross`, …
- **Multiword verb idioms**, matched longest-first: `laisse tomber → drop`,
  `appuie sur → push`, `mets en marche → turn on`, …
- **Discontiguous verb+particle patterns** (German separable verbs): German
  imperatives split the particle to the clause end — `schalte die Laterne
  **ein**`, `mach das Licht **an**`, `hebe den Sack **auf**` — so a contiguous
  idiom can never match them. Entries pair a leading verb with a clause-final
  particle: `{verb: 'schalte', particle: 'ein'} → turn on`,
  `{mach, an} → turn on`, `{mach, aus} → turn off`, `{mach, auf} → open`,
  `{mach, zu} → close`, `{hebe, auf} → take`, … The particle set is closed
  (`ein/aus/an/auf/zu/ab/um/hoch/runter`). Without this, the most
  game-critical DE commands (lantern on/off) would fall to the LLM every
  time; with it, the bare stem (`mach` ≈ make) is never matched without its
  particle.
- **Prepositions:** `avec → with`, `dans → in`, `à/au/à la/aux → to`,
  `sur → on`, …
- **Articles/determiners to strip:** `le/la/les/l'/un/une/du/de la/des`, …
- **Pronouns** (`le/la/les`, clitic `-le/-la`, `dedans`, `dessus`, `moi`)
  flagged for antecedent resolution, not direct mapping.
- **Meta aliases** (migrates and grows `META_ALIASES`): `inventaire/i`,
  `diagnostic → diagnose`, `recommence → restart`, `sauvegarde → save`,
  `score`, etc., per language.

Verb conjugation is handled by listing the imperative/2nd-person forms players
actually type (`prends`, `prenez`, `ouvre`, `ouvrez`, `nimm`, `öffne`,
`abre`, `toma`, …) — a data problem, not a stemming algorithm. Entries are
stored diacritic-folded; matching is diacritic-insensitive (§6).

### 5.2 Per-game noun lexicon per language (9 files)

`fr.zork1.ts` … `es.zork3.ts`, keyed by the extracted vocab's **canonical**
names:

```ts
export const FR_ZORK1_NOUNS: Readonly<Record<string, string[]>> = {
  'brass lantern': ['lampe', 'lanterne'],
  'trap door': ['trappe'],
  mailbox: ['boite aux lettres', 'boite'],
  wrench: ['cle', 'cle a molette', 'cle anglaise'],
  // …
}
```

**Build-time validation** (extends `scripts/extract-vocab.mjs` or a sibling
check script): every key must be a vocab canonical (unknown key = build
error); a coverage report lists vocab nouns with no entry per language; a
**collision report** lists every lexicon source word (core or noun,
diacritic-folded) that is also a game-vocab dictionary word, so the stage-4
guard's overlaps are reviewed in the data diff rather than discovered in play.
Authoring: generated against the full extracted vocab (seeded with every
UAT-discovered trap: `clé`, `lampe`, `pose`, `trappe`, `vitrine`, `or`, …),
reviewed as plain diffs.

**Ambiguity is first-class:** a foreign word may map to multiple canonicals
(`cle → wrench | skeleton key`). Resolution order: (1) prefer a candidate in
room+inventory scope (scene tracker, §8); (2) else, **if** the candidates share
an English dictionary word (several doors all answer to `door`), emit that
shared word and let the Z-parser disambiguate ("Which door do you mean?");
(3) else the clause **falls through to the LLM** — per §6's strictness rule,
the deterministic layer never guesses. (Step 2 does not apply to
`cle`: wrench and skeleton key share no dictionary word — `key` names only the
skeleton key, so emitting it would silently pick one candidate, the exact
failure class this design exists to kill.)

## 6. The deterministic parser (`src/llm/lexicon/parse.ts`)

1. **Normalize:** lowercase, NFC, diacritic-fold (so the UAT typo `decends`
   and `descends` both match), strip terminal punctuation.
2. **Tokenize**, match **multiword phrases longest-first** (idioms, multiword
   nouns like `boite aux lettres`), strip articles.
3. **Map:** leading verb via core lexicon — including the discontiguous
   verb+particle patterns (§5.1): a leading verb whose entry names a particle
   matches only when that particle closes the clause, and consumes both
   tokens; nouns via game lexicon **or directly via the English vocab's
   dictionary words** (which makes English input deterministic too —
   `open trap door` matches vocab and passes through untouched); preposition
   via core lexicon.
4. **Assemble** `verb [object] [prep indirect]` using each noun's **emit
   form** (§9).
5. **Strictness rule:** every content token must be consumed by some mapping.
   One unrecognized content word → the whole clause falls through to the LLM.
   The deterministic layer never guesses.

Pronouns resolve against the scene tracker's antecedent; no confident
antecedent → fall through to the LLM rather than guess. Direct-object
pronouns (`prends-le`) substitute the antecedent's emit form; container
anaphora (`dedans` → `in <antecedent container>`) substitutes only when the
antecedent is distinct from the direct object (UAT F-E guard).

## 7. The LLM fallback, unshackled

For clauses the lexicon cannot fully resolve:

- **Grammar noun terminals = the full game vocab's emit forms**, not
  `inScope`. The model can always say `trap door`; if it's absent, the
  Z-machine's own "You can't see any trap door here!" is the correct, honest
  failure. (`buildGrammar` signature changes from scene-driven to
  vocab-driven.)
- **Scope becomes a prompt hint only** — "Objects present or carried: …" —
  never a constraint.
- **Prompt rewrite:** "Translate the player's literal imperative into one
  canonical command. Never substitute a different action. Never infer what the
  player 'should' do next." Raw game output is **already excluded** from the
  prompt (`b14fea1`) and must stay out; keep location + scope hint +
  antecedent. (`viewToContext.recentOutput` itself stays — it feeds the
  deterministic confirmation/disambiguation and compound-failure checks, never
  the LLM.)
- **Few-shots in the selected language:** 3–4 per language, covering a
  drop-verb, a two-object command (`X avec Y` ordering — UAT F7), and a
  pronoun.
- **Abstain (revises v1 locked decision 4):** non-English abstain renders a
  styled, non-VM notice — *"Couldn't translate — try simpler wording, or
  quote a command: "open mailbox""* — and consumes no turn. English abstain
  keeps raw passthrough (the Z-parser's error is genuinely useful there).
  Language is whatever the picker says; no detection.

## 8. Scene tracker: demoted and fixed

The tracker (`src/llm/scene/tracker.ts`) no longer gates the grammar. Its
three remaining jobs: pronoun antecedent, the prompt's scope hint, and
ambiguity preference in §5.2. Fixes, driven by UAT F-AA/F-T:

- **Inventory is in scope:** carried items (existing take/drop ACK tracking)
  are always part of the hint.
- **Eviction:** on room change, non-carried items are dropped (the existing
  carry-over logic is kept but verified against F-AA's stale-window evidence —
  items dropped turns ago must not linger).
- The reducer stays idempotent (v1 invariant preserved).

## 9. Vocab extraction additions (`scripts/extract-vocab.mjs`)

- **Emit form per noun** (fixes F-Z): the shortest parser-accepted name —
  prefer the head dictionary synonym, plus one adjective only when needed for
  uniqueness within the game (`pump`, `brass lantern`, `trap door`). The
  search is **deterministic**: try each dictionary synonym bare (head synonym
  first, then declaration order), then each synonym × each adjective (both in
  declaration order); take the first combination unique within the game. If
  no synonym + one adjective is unique, extraction **fails the build** with a
  report naming the colliding objects — the resolution is a manual override
  entry, not a silent pick. Grammar, prompt, lexicon resolution, and pronoun
  substitution all emit this form. Stored as a new `emit` field on
  `NounEntry`; `canonical` remains the stable lexicon key.
- **Verb synonyms retained** in the vocab output so stage 4 catches `ulysses`
  as well as `odysseus`.

## 10. Compound executor tweak

Stop conditions stay, with one change: a **soft no-op** ("It is already
open.", "You already have that!") no longer aborts the sequence (F-G) — only
absence, refusal, abstain, timeout, or an interactive prompt do. The
"Ran N of M actions." notice is unchanged. (UAT-2 F-D's silent middle-clause
drop is structurally gone: splitting is deterministic and clauses no longer
share one LLM call.)

## 11. Input queue (F-A)

Lines typed while a translation or sequence is in flight are queued (FIFO,
cap 4; overflow drops the newest with a visible notice). Queued lines render
dimmed with a `queued` chip until they run; the queue drains one line at a
time through the full pipeline. The queue is **flushed** (with a notice) if
the game raises a confirmation/disambiguation prompt — the player must answer
it, not have queued moves eaten by it. An **abstain notice does not flush the
queue** (it consumes no turn, §7): one untranslatable line must not strand the
queued lines behind it.

## 12. Transcript prefixes

`nl-source` lines lose the `>` and render with a small worded `you` label;
only real commands keep `>`. The `›` glyph is removed everywhere. Queued
lines reuse the `you` style plus the `queued` chip. (Approved mock:)

```
you   ouvre la boîte aux lettres
> open small mailbox

Opening the small mailbox reveals a leaflet.
```

## 13. Error handling summary

| Condition | Behaviour |
| --- | --- |
| Deterministic parse incomplete | Fall through to LLM (never guess) |
| LLM abstain, language ≠ English | Styled notice, no VM send, no turn |
| LLM abstain, language = English | Raw passthrough (Z-parser error) |
| Ambiguous foreign noun | Scope-preferred candidate, else English dictionary word → Z-parser disambiguation |
| Pronoun with no antecedent | LLM; if it abstains, see above |
| Queue overflow | Newest line dropped with visible notice |
| Interactive prompt mid-queue/sequence | Stop + flush queue with notice |
| Lexicon key not in vocab | Build-time error (`make extract-vocab` / check script) |

## 14. Testing

- **Generated lexicon round-trip tests:** every core-verb and game-noun entry
  must parse through the deterministic parser to a vocab-valid canonical
  command (table-driven, hundreds of cases, fast).
- **UAT regression suite:** every UAT-1/UAT-2 failure (F1–F10, R1–R4,
  F-A–F-DD) encoded as a pipeline-level test with the fake engine, each
  asserting the *stage* that now handles it (most must never reach the LLM).
- **Stage-order tests:** quoted strings beat meta, meta beats vocab-word
  passthrough, etc. — including the stage-4 collision guard (a lexicon word
  that is also a vocab word goes to the lexicon parse, not raw passthrough;
  magic words still pass through).
- **DE separable-verb round-trips:** `schalte die laterne ein → turn on brass
  lantern` and friends, with a noun phrase between verb and particle, plus a
  negative case (bare `mach` without a particle never matches).
- **Queue tests:** FIFO order, cap, flush-on-prompt.
- **UI tests:** prefix rendering (`you` label vs `>`), queued chip.
- Existing suites (tracker, grammar, directions, prompt) updated to the new
  contracts; TDD red→green→refactor per project convention.

## 15. File map (planned)

```
src/llm/lexicon/
  types.ts            CoreLexicon / NounLexicon types
  fr.core.ts de.core.ts es.core.ts
  fr.zork{1,2,3}.ts de.zork{1,2,3}.ts es.zork{1,2,3}.ts
  index.ts            lookup by (language, story signature)
  parse.ts            deterministic parser (normalize/tokenize/map/assemble)
src/llm/
  pipeline change in useNaturalLanguage.ts (stage order, queue, abstain notice)
  prompt.ts           rewritten prompt + per-language few-shots
  grammar/buildGrammar.ts   vocab-driven noun terminals
  grammar/types.ts    NounEntry.emit
  meta.ts             aliases migrate into core lexicons
  nlpref.ts           language field
src/ui/
  NlToggle.tsx → language picker; Scrollback.tsx prefix rendering; queue chip
scripts/
  extract-vocab.mjs   emit form + verb synonyms; lexicon validation/coverage
```
