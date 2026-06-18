## Summary

Adds **Georgian (ქართული)** as a selectable language: picking it translates all **Zork I** on-screen text to Georgian via the existing `src/translate/` display overlay (corpus-only, **no LLM fallback**), behind a visible **(beta)** marker, while the player types commands in **English** (Phase 1 = read-Georgian / type-English; Georgian _input_ is Phase 2).

Implements `docs/superpowers/plans/2026-06-17-loquor-output-translation-georgian.md` (spec `…-georgian-design.md`).

### What changed

- **`ka` registered** (`NL_LANGUAGES`) + Georgian landing/prefs/modal chrome (read-Georgian/type-English semantics; the caveat offers no AI model). Input-only records (`FEWSHOTS`, NL notices) fall back to English by design — `ka` never reaches the input path in Phase 1.
- **Two single-purpose `{'ka'}` guard sets** in different layers: `OUTPUT_ONLY_LANGS` (input raw-sends English) and `CORPUS_ONLY_LANGS` (output degrades to English + logs, never the LLM). Phase 2 removes `ka` from these.
- **Option A wiring** (`Terminal`/picker): Georgian translates _output_ while the command field raw-sends English; the model-download modal and "✦ improve" affordance are suppressed; fr/de/es behaviour is byte-for-byte unchanged (regression-pinned).
- **Georgian display corpus** for Zork I: 1093 string pins + 76 objects (minimal `{indef}` form-key union) + 19 templates (only `{obj.indef}`). All three registry-driven gates — coverage, inventory, completeness — are green for `ka`, plus a no-English-passthrough gate and a UAT regression file pinning the runtime-composed Living Room variants.
- **Georgian status-bar labels**; **beta announcement** in the existing `role=status` live region (gated on the game actually having a Georgian corpus); **"English only" badge** on untranslated volumes (Zork II/III), driven by the live corpus registry so it self-corrects.
- A working **terminology glossary** (`notes/georgian-translation-glossary.md`) for the native-review loop.

## ⚠️ Player-experience decision (CLAUDE.md "talk to me first" — recorded per the plan)

- The **entire Georgian corpus is LLM-authored and machine-unvalidated.** The coverage/inventory/completeness gates prove **coverage**, not **linguistic correctness**. The only machine correctness check is the no-English-passthrough gate (no value byte-identical to its English key).
- This is accepted **only** because the feature ships behind the visible **(beta)** marker.
- **Native review (spec §8 Tbilisi loop) is a BLOCKING follow-up, not optional polish.** The **(beta)** marker MUST NOT be removed — and Georgian MUST NOT be described as supported (release notes, marketing, README) — until a Georgian speaker has reviewed the corpus and confirmed naturalness. See the follow-up checklist in `notes/georgian-native-review-followup.md`.

## Two judgment calls made beyond the plan (please review)

1. **`match.ts` Mkhedruli casing fix** (`32e15e6`) — deviates from spec §6 ("no `match.ts` edits"). The BUILTIN `cap:true` listing templates ran `toUpperCase()` on every inventory/contents initial; Unicode 11.0 maps Mkhedruli→Mtavruli (`'მ'.toUpperCase()` → `'Მ'`), so every Georgian listing line rendered a jarring titlecase-script initial. The spec's "harmless no-op" assumption predated that Unicode mapping. The fix is gated to `\p{Script=Georgian}` only — fr/de/es capitalization is provably unchanged. Per CLAUDE.md (player experience overrides a locked decision, especially one resting on a factual error), this was fixed rather than deferred.
2. **Beta notice gated on corpus presence** (`217aa2d`) — a player who selected Georgian then played Zork II/III (no corpus) saw 100% English yet a notice claiming a "Georgian beta translation." The notice now shows only when the current game is actually translated; the "English only" badge is the honest cue for untranslated volumes.

## Known, pre-existing, out of scope

- `make all`'s **lint** step has a pre-existing failure in `src/ui/Scrollback.tsx` (`react-hooks/refs`) that reproduces at the branch base and is unrelated to this work (zero commits to that file on this branch). All feature-touched files are lint/format/typecheck-clean.

## Test Plan

- [x] `npx vitest run` — **1111 passed (86 files)**
- [x] `npx tsc -b` — clean
- [x] `npx vite build` — production build succeeds (Mkhedruli survives bundling)
- [x] coverage/inventory/completeness/no-passthrough gates green for `ka`; fr/de/es unchanged
- [ ] **Interactive smoke (recommended before review):** pick **ქართული (beta)** on the landing → chrome in Georgian, how-to says read-Georgian/type-English, no AI-model offer, Zork II/III show "English only" badge (Zork I doesn't); in Zork I → output is Georgian, beta notice announced, no download modal, no "✦ improve", an English command (`open mailbox`) sends and the game responds in Georgian, status bar shows Georgian labels with Arabic numerals; switch to Français → unchanged.
- [ ] **Native review of the Georgian corpus (BLOCKING before removing `(beta)`).**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
