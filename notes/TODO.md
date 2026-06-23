---
Sound effects?
---

Map?

---

---

if a command fails in another language, there should be help text in that
language to explain the "quoted english" fallback that the user can try
instead.

---

"it" doesn't always work as expected:

ZORK I: The Great Underground Empire

Infocom interactive fiction - a fantasy story

Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.

ZORK is a registered trademark of Infocom, Inc.

Release 119 / Serial number 880429

West of House

You are standing in an open field west of a white house, with a boarded front door.

There is a small mailbox here.

you open it

> open mailbox

Opening the small mailbox reveals a leaflet.

you read it and drop it

> read advertisement

(Taken)

"WELCOME TO ZORK!

ZORK is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals. No computer should be without one!"

> drop advertisement

Dropped.

> east

The door is boarded and you can't remove the boards.

> west

Forest

This is a forest, with trees in all directions. To the east, there appears to be sunlight.

> east

Forest Path

This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the edge of the path.

> south

North of House

You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.

> south

The windows are all boarded.

> east

Behind House

You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.

you open it

> open advertisement

You can't see any advertisement here!

---

Another parsing issue

RK I: The Great Underground Empire

Infocom interactive fiction - a fantasy story

Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.

ZORK is a registered trademark of Infocom, Inc.

Release 119 / Serial number 880429

West of House

You are standing in an open field west of a white house, with a boarded front door.

There is a small mailbox here.

> open it, take the paper, and read it

Opening the small mailbox reveals a leaflet.

There seems to be a noun missing in that sentence!

>

---

## Zork II nested NPC commands (`tell robot …`) — grammar-only completion blocker

Surfaced by the walkthrough-reachability gate
(`src/llm/lexicon/walkthrough-coverage.test.ts`), where it's pinned as a
`KNOWN_GAPS` entry (`zork2: ['tell']`) for fr/de/es so it stays visible.

**The problem.** Zork II's robot puzzle is solved by _commanding an NPC_:

```
tell robot go east
tell robot push triangle
tell robot lift cage
```

This is a NESTED command: `TELL <actor> "<sub-command>"`. The deterministic
input lexicon maps a single foreign verb → a single canonical verb (plus
verb+prep idioms); it has **no way to compose** `tell <actor> <inner command>`,
where the inner command is itself a full verb-phrase that must ALSO be
translated. So:

- **English** players raw-send `tell robot go east` → works.
- **fr/de/es** players in **grammar-only mode** cannot produce it → the robot
  puzzle (and the treasures it gates) is **unwinnable** without switching to
  English quoted-fallback.
- **LLM-full mode** _may_ translate it, but we don't rely on that, and the
  whole point of grammar-only is that it shouldn't need the model.

**Why it's not a quick lexicon fix.** Every other verb gap found by the gate
(es `launch`, all-langs `spray`, all-langs `knock`) was a single verb (or
verb+prep) and was fixed with a lexicon entry/idiom. `tell` is structurally
different — it needs the parser to (a) recognise the command-an-actor frame in
each language, (b) split off the actor, and (c) recursively translate the
remaining clause. That's a parser feature, not data.

**Options to discuss (player-experience decision):**

1. Add nested-command support to `parse.ts`: detect `dis/dile/sag … <actor> …`,
   split the actor, recurse on the remainder. Correct but non-trivial; needs
   actor detection and per-language framing (FR "dis au robot d'aller…",
   DE "sag dem roboter, geh…", ES "dile al robot que vaya…").
2. Document the English quoted-fallback for this specific case in the in-game
   help (ties into the existing "help command" + "quoted english fallback"
   TODOs above) so a stuck player knows the escape hatch.
3. Accept it as a known limitation for grammar-only mode (LLM-full handles it).

Recommendation: at minimum (2) so no player is hard-stuck; (1) if we want
grammar-only to be genuinely complete for Zork II.

---

## Zork III noun completeness — `extract-vocab.mjs` drops most objects

Non-English players of Zork III cannot NAME most of the game's objects, because
those objects never reach `src/llm/grammar/zork3.vocab.ts`.

**Severity.** Zork III's vocab has **58 nouns** vs **129 (Zork I) / 142 (Zork
II)**. The missing set includes core required treasures/items the walkthrough
depends on: `amulet, torch, staff, vial, cloak, hood, chest, key, ring, book,
sword, lantern, can, table, machine, ...`. A fr/de/es player literally cannot
refer to the amulet, torch, staff, or vial through the NL layer — a hard
completion blocker (the input lexicons `FR/DE/ES_ZORK3` only cover the 58 that
ARE present, so nothing currently flags the gap).

**Root cause (confirmed).** `scripts/extract-vocab.mjs` reads objects from only
two ZIL files per game:

```
zork${N}/${N}dungeon.zil   (pinned — zork3 also ships a stale dungeon.zil)
zork${N}/gglobals.zil
```

Zork III defines most of its objects in **other** files — `zork3/shadow.zil`
and `zork3/3actions.zil` — which the extractor never scans. Verified: `AMULET`,
`TORCH`, `STAFF`, `VIAL`, `CLOAK`, `HOOD` all exist as `<OBJECT … (SYNONYM …)>`
in `shadow.zil`, but are absent from `zork3.vocab.ts`. (Zork I/II keep their
objects in `1dungeon.zil`/`2dungeon.zil`, which is why their vocabs look
complete.)

**Fix (its own pass — multilingual data work):**

1. **Extend `extract-vocab.mjs`** to also read the object-bearing files
   (`shadow.zil`, `${N}actions.zil`) — pinned filenames, never a glob (the
   existing comment warns zork3 ships a stale `dungeon.zil`). Confirm Zork I/II
   vocab don't change (or only gain legitimate objects) — the existing
   `validate`/`roundtrip`/`coverage`/walkthrough gates guard regressions.
2. **Regenerate**: `make extract-vocab`. Zork III's noun count should jump
   toward I/II parity.
3. **Author the new nouns** in `fr.zork3.ts` / `de.zork3.ts` / `es.zork3.ts`.
   `validate.test.ts`'s coverage block goes RED until every new vocab canonical
   has a per-language entry — that's the forcing function. ~50 nouns × 3
   languages. Use the walkthrough command list (`walkthrough-commands.ts`) to
   prioritise the required objects first.

**Worth adding once the data is in:** extend the walkthrough gate
(`walkthrough-coverage.test.ts`) with the NOUN dimension it currently omits —
every object a player must name to win must resolve per language — so this
class of gap can never silently return. (Left out now precisely because Zork III
would fail it; turn it on after the vocab is complete.)
