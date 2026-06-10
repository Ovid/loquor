# UAT working notes — things that slow sessions down (and what to do instead)

Living document referenced by the `ovid-uat` skill. Add to it whenever a
session loses time to something avoidable.

## Browser automation (Claude-in-Chrome)

- **Click the transcript input line before typing after ANY interruption** —
  language-picker changes (`form_input`), permission prompts, or a malformed
  tool-call retry all steal focus. Symptom: a whole batch of typed commands
  produces no `you` lines and the Turns counter doesn't move. One
  `left_click` on the `> type a command…` line fixes it. Verify the turn
  counter moved before assuming commands landed.
- The language picker is a CUSTOM combobox (since 2026-06-10), not a native
  `<select>` — `form_input` no longer applies. Click the trigger (the
  `Language:` control), then click the option (`Français`, `Deutsch`,
  `Español`) in the themed popup; the popup DOES render in screenshots now.
  It also closes on any outside mousedown, so don't click elsewhere between
  the two clicks.
- Console debugging: `read_console_messages` with pattern `nl debug` shows
  per-clause `{stage, antecedent, inScope, raw, result}` — the fastest way to
  tell deterministic-lexicon hits from LLM fallbacks and to find root causes.
  `clear: true` after big reads keeps later reads small.
- Batch moves 4–6 per `browser_batch` with 1s waits; screenshot only at the
  end. Deterministic translations are instant; only wait 4–8s when
  `…thinking` (LLM fallback) appears.

## Zork I gameplay traps (cost real time in UAT-2/UAT-3)

- **Never go underground with the lantern off.** Both UAT sessions lost a
  death to this exact mistake while ferrying treasure. After `pray`-revival,
  the lamp is teleported to the Living Room; matches/screwdriver scatter to
  above-ground rooms (check the canyon-path Clearing and Canyon View).
- Dying costs 10 points each and makes the **perfect ending unreachable**
  (the whisper/map needs a deathless 340); plan combat (troll, thief) early
  and carefully. Give the thief the egg, then attack while he admires it.
- The trap door re-bars until the thief dies; the cyclops hole
  (Living Room ⇄ Strange Passage) is the post-cyclops shortcut.
- The Machine Room is DARK — take the torch out of the basket in the Drafty
  Room before going south, then put it back for the basket ferry.
- Carry the garlic for the Bat Room; carry nothing through the
  Timber→Drafty crawl.
- Wounds shrink carrying capacity ("especially in light of your condition");
  `diagnostic`/`diagnose` reports moves-to-heal. Plan heavy hauls (coffin,
  trunk) for when healed.
- Above-ground "Clearing" confusion: Behind House → east is the canyon-path
  Clearing; Canyon View is one MORE east. The grating Clearing is north of
  Forest Path.

## NL-layer testing technique

- The fastest realism check is the UAT-2/UAT-3 probe list: replay each old
  finding's exact input at its original game location, then log new findings
  with the console `stage` evidence attached.
- When a deterministic-looking phrase unexpectedly hits the LLM
  (`stage:"llm"`), suspect (in order): a missing noun word, a leading
  preposition other than 'to', verb-arity validation (6-char truncated
  dictionary forms like `inflat`), or an idiom that needs to consume a
  particle/prep.
- Quoted commands (`"open mailbox"`) are the reliable escape hatch and each
  use doubles as a passthrough test; prefer them over toggling the picker to
  English so the session stays in-language end to end.
