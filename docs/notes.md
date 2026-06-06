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

### Device-capability gating (don't offer the LLM where it can't run)

WebLLM runs the model in-browser on **WebGPU**, and a 8B-ish q4 model needs
multiple GB of VRAM/unified memory. That's fine on a modern laptop — an M1 Mac
handles it, surprisingly well — but a phone or a low-spec/old machine will either
have no WebGPU at all or not enough memory, and trying to load the model there
means a long download followed by an out-of-memory crash or an unusably slow
session. So **capability detection gates the natural-language feature before we
ever offer the download.**

Detect, cheaply and up front:

- **WebGPU present?** `if (!('gpu' in navigator)) → unsupported`. Then
  `await navigator.gpu.requestAdapter()`; a `null` adapter (or a software/fallback
  adapter) also means unsupported. Inspect `adapter.limits`
  (`maxBufferSize`, `maxStorageBufferBindingSize`) and, where available,
  `adapter.info` to reject clearly underpowered GPUs.
- **Mobile / small device?** `navigator.userAgentData?.mobile === true`, or a UA
  fallback for iOS/Android. iPhones are the canonical "won't run it" case — even
  recent Safari WebGPU support doesn't give them the memory headroom for an 8B
  model. Treat mobile as unsupported by default for the large model.
- **Memory headroom?** `navigator.deviceMemory` (desktop heuristic, coarse — caps
  at 8) as a soft signal; pair it with the adapter limits above rather than
  trusting it alone.

Behavior when a device is judged incapable:

- The natural-language **toggle is shown in an `unavailable` state** (or hidden),
  not silently broken — extends the toggle-state model already noted below
  (*unavailable* alongside *off · not installed* / *off · installed* / *on*). The
  player still gets the full first-pass grammar-only experience; nothing degrades.
- Hovering/clicking the unavailable toggle explains *why* ("needs WebGPU and a few
  GB of memory; your device can't run the language model — the game still works").
- **Keep a manual override** for false negatives. Detection is heuristic and WebGPU
  support is moving fast; a power user on a capable-but-misdetected machine should
  be able to force-enable and attempt the download at their own risk (it remains
  cancellable — see below).
- **Lighter-model fallback (later).** Rather than a hard no on borderline devices,
  a smaller quantized model (e.g. a 1–3B variant) could be offered where the 8B is
  out of reach. Out of scope for the first NL pass; note the seam so the
  capability check returns a *tier* (`none` / `small` / `full`), not just a bool.

This check is also the right gate for the model-download modal: only devices that
pass it ever see the download offer.

### Model-download modal

The first time the player tries to use natural language for *any* game, show a
modal explaining that `Llama-3-8B-Instruct-q4f32_1-MLC-1k` will be downloaded and
that it is large and slow.

- **Accept** → download (with progress), then English input is enabled.
- **Decline** → they keep playing, but are told they're restricted to the game's
  own grammar/parser (i.e. the first-pass behaviour).

**The download is cancellable.** If it's taking too long, the player can cancel
the in-progress download and keep playing in grammar-only mode; any partial
download should be discarded (or resumable if the cache supports it) and the modal
returns to its pre-download state so they can try again later.

### Toggling natural language on and off mid-game

The LLM is never a one-way door. While playing, the player can **always**:

- **Toggle it off** — if the model is installed and active, switch back to
  grammar-only input at any time (e.g. it's misreading their intent, or they want
  the raw parser). No re-download; the model stays cached.
- **Toggle it back on** — re-enable English input at any time. If the model is
  already installed, it switches on immediately. If it is **not** installed (they
  declined earlier, or cancelled the download), toggling on **re-shows the
  download-warning modal** first, with the same accept/decline/cancel flow.

The toggle's state and the "model installed?" status are independent: the control
reflects both (e.g. *off · not installed*, *off · installed*, *on*, plus the
*unavailable* state from device-capability gating above). This lives naturally
next to the existing theme toggle in the status bar.

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
