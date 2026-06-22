# Loquor — always-present bottom bar with a localized NL-mode readout (design)

**Date:** 2026-06-22
**Status:** Approved (Ovid, in-review decision)
**Scope:** Display-layer only. Promotes the Georgian-only bottom bar
(`GeorgianStatusBar`, spec `2026-06-21`) to an **always-present** `BottomBar`
rendered in every language, carrying a **localized** NL-mode + story readout for
all players. No engine, pipeline, or input-path changes. **Supersedes Decision 5
of `2026-06-21-loquor-georgian-mode-bottom-bar-design.md`** (the `ka`-only
rendering) and amends that spec's "Out of scope" line about a per-language mode
line.

## Why this exists (and why it's recorded here)

The `2026-06-21` spec locked the bar as `ka`-only (Decision 5) and listed "a
per-language 'basic mode' line in the bar … not built now" as out of scope. The
implemented branch (`ovid/status-bar`, commit `dfa583a`) instead renders the bar
**unconditionally** with an NL-mode readout in every language. Code review flagged
the deviation: the readout shipped **untranslated English diagnostic tokens**
(`fr · full · input — Zork I`, `off`, `downloading…`) to every non-English player
— reintroducing exactly the "untranslated English clutter" the `2026-06-21` work
removed, and contradicting an approved decision without a companion doc.

Per CLAUDE.md's "player experience / talk to me first" rule, this was raised with
Ovid rather than left as a silent deviation. **Decision (Ovid): keep the bar
always-present AND keep the readout player-facing, but localize it** via the
existing `notices.ts` by-language pattern, and record the design change here.

## Decisions

1. **The bar is always present, in every language.** It is a sibling of `<main>`
   in the `.screen.term` flex column; `<main>` (flex:1) now shares the column
   height with it permanently (it no longer reclaims that row for en/fr/de/es).
   This supersedes `2026-06-21` Decision 5. Trade-off accepted: a permanent ~1
   row of quiet chrome in exchange for an always-visible play-mode + story
   indicator. The bar's height must stay minimal — re-run the responsive
   checklist (320/375/520px + short landscape, both themes) whenever its content
   grows, since there is no automated layout guard (responsive spec §4).

2. **The readout is localized, player-facing copy — not English diagnostics.**
   It is read by every player, so it obeys the CLAUDE.md EN/FR/DE/ES multilingual
   mandate. Localization is confined to the only phase with a non-English display
   (`on`): `outLang = phase==='on' ? language : 'off'`, so `off`/`disabled`/
   `downloading` display in English (the game text is English in those phases
   too) and their terse tokens stay English, correctly tagged `lang="en"`.
   - `on`, input language (en/fr/de/es): the chip is `{mode} · {input}` in that
     language — e.g. `complet · saisie` (fr), `voll · Eingabe` (de),
     `completo · entrada` (es), `full · input` / `basic · input` (en). The
     language code is **dropped** (redundant — the whole display is in that
     language). The `grammar` tier reuses `basicChip` (`notices.ts`) so the
     readout and the status-bar chip can't drift on the word for "basic mode."

3. **`ka` shows no mode chip — story title only.** Georgian is output-only, and
   authoring new/compact Georgian wording is out of scope (`2026-06-21`
   Decision 6 / output-translation spec §8: `ka` has no native review and no
   LLM). A localized `ka` mode chip would require inventing Georgian, so the `ka`
   readout is just the (English, `lang="en"`) story title. The read-Georgian /
   type-English mode is already conveyed by the bar's Georgian beta + activation
   notices sitting right beside it, so nothing is lost. **Open follow-up:** if a
   Georgian mode chip is wanted later, it needs native-review wording (a Phase-2
   item), not invented text.

4. **Each readout fragment carries its own `lang` (WCAG 3.1.2).** The localized
   chip is tagged with the active language (`readoutLang(state)`); the English
   story title and the debug signature are tagged `lang="en"`. This matches the
   existing discipline on the Georgian notice spans. Without it a screen reader
   voices the English title with the active language's phonemes (for `ka`,
   Latin-script English as Georgian).

5. **The debug signature is unchanged** — appended (`· 03000077`, first 8 hex)
   only under `debug`, kept off the default readout where it reads as noise.

## Unchanged from `2026-06-21`

Decisions 1–4 and 6 stand: the beta notice is Georgian-only, the no-corpus notice
stays bilingual, the activation tip is permanent `ka` bar content driven by the
existing once-per-language latch for its one-shot announcement, transient
messages stay inline, and no new Georgian wording is authored.

## Out of scope

- Georgian *input* (Phase 2) — the type-English constraint and its tip remain.
- A localized `ka` mode chip (needs native-review Georgian wording — see
  Decision 3).
- Localizing the `off`/`disabled`/`downloading` tokens beyond English: those
  phases display in English, so English is correct there.
