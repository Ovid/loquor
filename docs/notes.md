# Naitfol — future work

These are deliberately **out of scope for the first pass** (which just gets Zork
I/II/III playable in the browser — see
[`docs/superpowers/specs/2026-06-06-naitfol-design.md`](superpowers/specs/2026-06-06-naitfol-design.md)).
They're recorded here so the first-pass architecture leaves the right seams.

The project's name points at the destination: *Nitfol* is the Enchanter spell for
understanding and conversing with creatures in their own tongue. Naitfol's
endgame is to let you talk to Zork in plain English.

## The natural-language layer (the headline future feature)

Let the player type plain English; an in-browser LLM (WebLLM, e.g.
`Llama-3-8B-Instruct-q4f32_1-MLC-1k`) maps it to a canonical command the Z-machine
understands, which is then fed into the game exactly as a typed command would be.

**The interception seam already exists:** the GlkOte React bridge (unit 2 in the
spec) is where raw player text becomes a Glk line-input event, and where
room/status text is observable. The LLM layer hooks that boundary — no changes to
the VM or the game files.

### Model-download modal

The first time the player tries to use natural language for *any* game, show a
modal explaining that `Llama-3-8B-Instruct-q4f32_1-MLC-1k` will be downloaded and
that it is large and slow.

- **Accept** → download (with progress), then English input is enabled.
- **Decline** → they keep playing, but are told they're restricted to the game's
  own grammar/parser (i.e. the first-pass behaviour).

### Grammar-constrained decoding (GBNF)

Constrain the model to emit a canonical command string (or a JSON command object)
using XGrammar/WebLLM's GBNF. A draft grammar lives in `scratch/grammar.txt`
(gitignored); confirm exact GBNF literal-vs-operator syntax against current
XGrammar docs before wiring it in.

### Derive the vocabulary, don't hand-write it

The ZIL source is MIT-licensed and present in `zork{1,2,3}/`. Objects declare
`SYNONYM` / `ADJECTIVE` properties; verbs live in the action/syntax tables. A
build step should parse those and emit the noun/adjective/verb terminals of the
grammar. Payoffs: every generated command is guaranteed to be in the game's own
parser dictionary, and the grammar stays in sync with the game by construction.
This is what makes the approach generalize to any ZIL game.

### Two hard problems the grammar alone doesn't solve

1. **Static vs. dynamic vocabulary.** A static grammar permits `take sword` even
   when no sword is present (the game just says "You can't see any sword here").
   The stronger design regenerates the noun production each turn from currently
   visible objects (room contents + inventory), so the model literally cannot
   reference absent things — but that needs reading game state out of the
   Z-machine, which it doesn't expose cleanly. **Start static, measure the
   misfire rate, go dynamic only if it justifies the cost.**

2. **The `__UNKNOWN__` abstain hatch is not optional.** Constrained decoding
   always yields a grammar-valid string, so unmappable input ("I'm bored") would
   be forced into a confidently-wrong command. An abstain production lets the
   model decline; the JS then passes the raw input through to the game's own
   parser (let its error message handle it) or asks the player to rephrase.

### Direct-string vs. JSON-intermediate

The PoC of this layer can emit command strings directly (simplest). A more robust
version constrains to a JSON command object (`{verb, object, prep, indirect}`)
and validates against current room contents before serializing — giving a seam
for pronoun resolution ("it"/"them"), disambiguation, and rejecting impossible
references. Use direct strings to prove it out; add the JSON seam for anything
shippable.

## Possible later polish

- Optional LLM rewriting of game output into richer prose (risky: can hallucinate
  state that contradicts the simulation — only with strong guardrails).
- Per-game theming flourishes.
- Export/import of saves.
