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
| Pick a language, **model not loaded** | NL active **grammar-only**, immediately. The upgrade modal appears **once** for discoverability; **"Not now" keeps grammar-only active** (today it reverts to Off). |
| Pick a language, **model already loaded** this session | NL active **full** (deterministic + LLM-on-miss), no modal. |
| Use the **upgrade** affordance → accept | Download → on success **full**; on failure/stall **stays grammar-only**. |
| Device capability `none` | NL active **grammar-only**; the upgrade affordance is hidden, but a **"try the model anyway" override** remains (today's force-enable). |
| Game has **no vocab** | `disabled` (unchanged — silent, no picker). |

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
keeps grammar-only active rather than reverting to Off.

**Notices (`notices.ts`):** the M12 failure/stall notices are re-reframed once
more, now accurately: a failed upgrade **stays in basic mode** (common commands
still understood) — e.g. EN "AI model download failed — staying in basic mode.
Common commands still work; pick the upgrade again to retry." Applied across
EN/FR/DE/ES.

## Testing (TDD)

- **Pipeline** (`translatePipeline` / `runClause`): with `grammarOnly`, a clause
  that would reach stage 7 abstains (EN → raw-send path, non-EN → notice) and the
  engine's `generate` is never called.
- **State machine** (`useModelDownload` / `useNaturalLanguage`): pick a language
  with no model → `on/grammar`, no download started; upgrade → `downloading` →
  `on/full`; download failure → `on/grammar` (not `off`); capability `none` →
  `on/grammar` with upgrade hidden + override present; pick with model loaded →
  `on/full`.
- **Picker UI** (`NlLanguagePicker`): grammar-only shows the basic marker +
  upgrade affordance; `none` shows the override not the upgrade; full shows
  neither.
- **Notices**: the reframed strings, per language.
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
