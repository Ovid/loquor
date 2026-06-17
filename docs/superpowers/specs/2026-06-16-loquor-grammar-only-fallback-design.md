# Loquor — Grammar-only NL fallback (design)

**Date:** 2026-06-16
**Status:** approved (brainstorming), pending implementation plan
**Supersedes (in part):** the NL v2 design's *pick-then-forced-download* activation
flow and its `unavailable` state (see
`2026-06-09-loquor-nl-multilingual-design.md`). The deterministic pipeline and
abstain policy are unchanged; only *when* NL activates and *whether the model is
required* change.

## Motivation

The natural-language input pipeline is **deterministic-first**: `runClause`
(`src/llm/translatePipeline.ts:258`) tries stages 3–6 — meta-verbs, the localized
alias map, vocab passthrough, the direction fast-path, and the per-(language,game)
lexicon parse — entirely in code, with **no engine and no GPU**. Only stage 7
(`llm`) calls the model, and stage 8's abstain policy already handles a stage-7
miss (English raw-sends to the Z-parser; non-English shows a notice).

Today, NL only activates *after* a successful model download. Consequences:

- A failed/stalled download drops a non-English player to phase `off` → raw
  **English** Z-parser commands they can't type (a11y finding M12).
- Devices that can't run the model (capability `none`) get `unavailable` — no NL
  at all, even though the deterministic stages would work.
- Every non-English player must accept a large (~800 MB) one-time download before
  any NL works.

The deterministic stages already work without the model. This design exposes that
as a first-class **grammar-only** mode.

## Goals

- Picking a language activates NL **immediately** in grammar-only — no forced
  download — on any device that has a vocab for the running game.
- The AI model becomes an **optional upgrade** ("better understanding of complex
  sentences"), not a precondition.
- A failed/stalled download, and a no-capability device, both **stay in
  grammar-only** instead of falling to raw English / `unavailable`.
- The picked **language persists across reloads** (localStorage, language only —
  not model state), so a non-English player isn't silently reset to English-parser
  Off every session. On load, a persisted language re-activates NL in grammar-only
  **only for a game that has a vocab** (otherwise the `disabled`/`hasVocab` gate
  wins and it stays silent).

## Non-goals

- No change to the deterministic stages (3–6), the abstain policy (stage 8), the
  lexicons, or output translation.
- No new languages or lexicon coverage. Grammar-only coverage equals the existing
  lexicon coverage; complex phrasings still abstain (the model is what handles
  them). This is the accepted limitation.
- No offline/self-hosting change to the model download itself.

## Behavior

Mode is **per active language**: grammar-only means "NL on, no loaded model".

| Player action | Result |
| --- | --- |
| Pick **Off** | NL disabled, raw send (unchanged). |
| Pick a language, **model not loaded** | NL active **grammar-only**, immediately. The upgrade modal appears **once ever** for discoverability (suppressed thereafter via the persisted `declined` flag); **"Not now" keeps grammar-only active** (today it reverts to Off). |
| Pick a language, **model already loaded** this session | NL active **full** (deterministic + LLM-on-miss), no modal. |
| Use the **upgrade** affordance → accept | Download → on success **full**; on failure/stall **stays grammar-only**. |
| `full`, **model fails to load** on first stage-7 miss | Demote `full` → **grammar** for the session; shared "basic mode" notice; stage 7 skipped after. Covers the `none`-override case where the download succeeded but the device can't run the model. (See State / phase below.) |
| Device capability `none` | NL active **grammar-only**; the upgrade affordance is hidden, but a **"try the model anyway" override** remains (today's force-enable), now **gated behind an honest warning** that the device may not support the model and the download is large and may fail. If the player proceeds and it fails, the **shared "staying in basic mode" notice** applies (same as any failed upgrade) — they never land worse than they started. |
| Game has **no vocab** | `disabled` (unchanged — silent, no picker). |
| **Reload** with a persisted language | NL re-activates **grammar-only** for that language if the running game has a vocab; otherwise `disabled`. Model state is never persisted, so it's always grammar-only on load until the player upgrades again. |

Abstain in grammar-only is the **existing** stage-8 policy: English misses
raw-send to the Z-parser; non-English misses show the "couldn't translate"
notice. Basic play (common verbs/nouns, directions, meta-verbs) works in every
supported language; sentences beyond the lexicon abstain.

## State / phase representation

Internal phase machine (`useModelDownload.ts`) — the active phase gains a mode:

```
{ phase: 'off' }
{ phase: 'downloading', loaded, total, etaSeconds }
{ phase: 'on', language, model: 'full' | 'grammar' }
```

**`full` vs `grammar` is "is the model permitted?", not "is it in VRAM right
now?":** `full` means the model is permitted and **loads lazily on the first
stage-7 miss** (the existing `createGenerateRaw` lazy-load + watchdog path
already handles the cold load). `grammar` means no model is permitted — stage 7
is skipped entirely. So a player whose model is **cached on disk** picks a
language and goes straight to `on/full` (matching today's "cached → enabled"
behavior at `useModelDownload.ts:229`) with **no silent GPU spin-up on pick** —
the weights load only when a clause actually reaches the model. Both the
state-machine and pipeline tests are written against this definition.

**Clause-time load failure demotes `full` → `grammar`.** The download/upgrade
path isn't the only way the model can fail: a model that is *cached on disk* (so
the player is in `on/full`) can still fail to load into VRAM — or run — on the
**first stage-7 miss**, when `createGenerateRaw` (`translatePipeline.ts:186-220`)
throws `WatchdogTimeout` or the underlying load error. This is the *exact* fate
of the capability-`none` "try the model anyway" override when the download
**succeeds** but the device can't actually run the model at inference time. Left
unhandled, the state stays `on/full` and **every subsequent clause re-attempts
the cold load and stalls again** — strictly worse than grammar-only's clean
abstain, and a violation of the "never land worse than they started" promise.

So a clause-time load failure (load watchdog fire, or a load error surfaced by
the wrapper) **demotes the active language `full` → `grammar`** for the rest of
the session: it routes through the **shared "staying in basic mode" notice**
(same string as a failed upgrade), and stage 7 is skipped thereafter (the player
re-upgrades via the affordance to retry). The demotion is the player's first
**entry into grammar-only this session**, so it also resets the educational
first-abstain notice (below). A *generate*-time watchdog (model loaded, inference
stalls) keeps its existing per-clause behavior and does **not** demote — only a
**load** failure does, because only a load failure means the model can't run at
all. Tested in the state machine and pipeline.

Derived `NlState` (`useNaturalLanguage`):

- `disabled` — no vocab for this game (unchanged).
- `downloading` — model fetch in progress (unchanged).
- `on` — carries `language` and `model: 'full' | 'grammar'`, plus `canUpgrade`
  (capability allows attempting the model) for the picker.
- `off` — carries `installed` and `canUpgrade`.

The **`unavailable` phase is removed.** Capability (`tier !== 'none'`) no longer
gates NL; it gates only whether the model upgrade is offered. `hasVocab` is the
sole prerequisite for NL.

## Pipeline change

`runClause` takes a `grammarOnly: boolean`. It is **derived from the existing
`LiveState.internal`** the drain already re-reads at every line boundary (the
`on` phase now carries `model`), so no new `LiveState` field is needed and an
upgrade mid-session takes effect on the next line. At stage 7:

```
// 7. LLM fallback — skipped in grammar-only: abstain so stage 8 applies the
//    existing policy (EN raw-send / non-EN notice). The engine is never touched.
if (grammarOnly) return { result: { kind: 'abstain' }, raw: '(grammar-only)', stage: 'llm' }
```

`{ kind: 'abstain' }` is the existing `TranslateResult` abstain variant
(`inputTranslate.ts:579`). No other stage changes; stages 3–6 and 8 are untouched.

A **clause-time load failure** (above) is caught at the stage-7 call site: it
flips the active phase's `model` to `grammar` (so the next line's re-read of
`LiveState.internal` derives `grammarOnly: true`) and then abstains *this* clause
through the same path — EN raw-send, non-EN notice — with the shared "basic mode"
notice surfaced once. No separate code path: demotion is just "set `model:
'grammar'`, then abstain."

## UI / notices

**Picker (`NlLanguagePicker`):**
- `on` + `full`: "Language: Français".
- `on` + `grammar`: "Language: Français" + an upgrade affordance
  ("✦ improve") that opens the upgrade modal — **unless** capability is `none`,
  where the upgrade is hidden and the "try the model anyway" override is shown
  instead.
- The current "· installed / not installed" chip is replaced by a "· basic" marker
  in grammar-only (and nothing in full).

**Modal (`ModelDownloadModal`):** reframed as an *upgrade*, not a gate — heading
and body explain it improves understanding of complex sentences; **"Not now"**
keeps grammar-only active rather than reverting to Off. The modal is offered
**once ever** on a pick: "Not now" sets the persisted `declined` flag, which
suppresses the *auto-modal-on-pick* on every future pick/reload (re-discovery
then lives entirely in the picker's "✦ improve" affordance, which always opens
the modal on demand). The existing `declined` field is **repurposed**: it no
longer forces the language to Off (its old job — preventing cache-driven
auto-restore — is obsolete now that grammar-only *is* the desired persisted
state); it only gates the unsolicited modal.

- On `none`, before the "try the model anyway" override fires, an **honest
  warning** explains the device may not support the model and the download is
  large and may fail (so the player isn't surprised by a long fetch that lands
  them back in grammar-only).

**Notices (`notices.ts`):** the M12 failure/stall notices are re-reframed once
more, now accurately: a failed upgrade **stays in basic mode** (common commands
still understood) — e.g. EN "AI model download failed — staying in basic mode.
Common commands still work; pick the upgrade again to retry." Applied across
EN/FR/DE/ES. The **`none`-device override failure routes through this same
notice** — never a worse-off message.

A new **one-time educational first-abstain notice** fires on the *first* clause
that abstains while in grammar-only, then reverts to the plain "couldn't
translate" notice on subsequent misses. It is **once per grammar-only stint**: a
single in-memory ref that **resets on each fresh entry into grammar-only** — a
new pick of a non-loaded language, *or* the `full` → `grammar` demotion above —
so a player demoted mid-session still gets the explanation at their first
post-demotion abstain (when it matters most), and a player who switches into a
genuinely new basic-mode language is re-educated, while repeated misses within
one stint stay quiet. It connects the miss to
the declined upgrade at the moment of confusion (the picker's "· basic" marker is
not where the player is looking). E.g. EN "Didn't catch that — basic mode
understands common commands; add the AI upgrade for full sentences." Applied
across EN/FR/DE/ES. (English grammar-only raw-sends rather than abstaining, so in
practice this surfaces for non-English players — exactly the audience it serves.)

## Testing (TDD)

- **Pipeline** (`translatePipeline` / `runClause`): with `grammarOnly`, a clause
  that would reach stage 7 abstains (EN → raw-send path, non-EN → notice) and the
  engine's `generate` is never called.
- **State machine** (`useModelDownload` / `useNaturalLanguage`): pick a language
  with no model → `on/grammar`, no download started; upgrade → `downloading` →
  `on/full`; download failure → `on/grammar` (not `off`); capability `none` →
  `on/grammar` with upgrade hidden + override present; pick with model **cached**
  → `on/full` and **no eager engine load** (the load happens only on the first
  stage-7 miss).
- **Clause-time load-failure demotion**: in `on/full`, a stage-7 miss whose
  lazy load throws (load watchdog / load error) demotes to `on/grammar`, surfaces
  the shared "basic mode" notice once, and **skips stage 7 on the next clause**
  (engine `generate` no longer called); a *generate*-time watchdog does **not**
  demote. The `none`-override "download succeeds, model can't run" case routes
  through this same demotion.
- **Modal cadence**: the auto-modal fires **once ever** — a second pick of a
  non-loaded language after "Not now" does **not** reopen it (persisted
  `declined`); the picker's "✦ improve" affordance still opens it on demand; and
  `declined` no longer forces the language to Off.
- **Persistence**: picking a language writes the language (only) to localStorage;
  on a fresh mount with a persisted language, NL re-activates `on/grammar` when the
  game has a vocab, and stays `disabled` when it doesn't; model state is never
  persisted (always grammar-only on load).
- **Picker UI** (`NlLanguagePicker`): grammar-only shows the basic marker +
  upgrade affordance; `none` shows the override (gated behind its warning), not the
  upgrade; full shows neither.
- **Notices**: the reframed failure/stall strings, per language; the `none`-override
  failure routes through the shared "staying in basic mode" notice; the one-time
  educational first-abstain notice fires once per grammar-only **stint** then
  reverts to the plain notice, per language — and **fires again after a fresh
  entry into grammar-only** (new non-loaded-language pick, or a `full` → `grammar`
  demotion), confirming the reset.
- **Regression**: existing NL/UAT and output-translation suites stay green.

## Risks / notes

- **Notice volume** in non-English grammar-only: anything beyond lexicon coverage
  abstains with a notice; on a sentence-heavy game this could feel chatty. The
  upgrade is the answer; the basic marker sets the expectation. Acceptable, and
  strictly better than the current drop-to-raw-English.
- **English grammar-only** has marginal value over Off (the Z-parser already
  understands canonical English), but keeping the picker uniform is simpler than a
  special case; misses raw-send exactly as Off would.
- This changes documented NL v2 behavior; the supersession is noted at the top and
  will be cross-linked from the NL v2 spec.
