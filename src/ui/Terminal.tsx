import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { ViewState } from '../glkote-react/types'
import { StatusBar } from './StatusBar'
import { Scrollback } from './Scrollback'
import { CommandInput } from './CommandInput'
import { NlLanguagePicker } from './NlLanguagePicker'
import { ModelDownloadModal } from './ModelDownloadModal'
import { BottomBar } from './BottomBar'
import { PreferencesModal, prefsOpenLabel } from './PreferencesModal'
import { LANDING_STRINGS } from './landingStrings'
import { useDebug } from './useDebug'
import { useLlmFeature } from './useLlmFeature'
import {
  useGameEngine,
  useCapability,
  useSceneObservation,
} from './useGameEngine'
import { vocabForSignature } from '../llm/grammar/index'
import { viewToContext } from '../llm/prompt'
import {
  thinking,
  queuedChip,
  commandLabel,
  commandLabelTypeEnglish,
  commandPlaceholder,
  commandPlaceholderTypeEnglish,
  llmModeChange,
  llmHiddenMigrationNotice,
} from '../llm/notices'
import { readNlPref } from '../llm/nlpref'
import { LS_KEYS } from '../storageKeys'
import { useNaturalLanguage } from '../llm/useNaturalLanguage'
import { kaInputActive } from '../llm/lexicon/index'
import { isHelpTrigger } from '../llm/help'
import { useOutputTranslation } from '../translate/useOutputTranslation'
import { corpusFor } from '../translate/corpus/index'
import { loudEchoToken } from '../translate/loudEcho'
import { WebLlmEngine } from '../llm/engine.webllm'
import { selectedModelId } from '../llm/modelSelection'
import { EngineGate } from '../shared/engineGate'
import { GENERATE_WATCHDOG_MS, LLM_ANNOUNCE_CLEAR_MS } from '../llm/config'
import type { LoadProgress, ActiveLanguage, LlmEngine } from '../llm/types'
import { OUTPUT_ONLY_LANGS } from '../llm/types'
import { createLogger } from '../logger'

const log = createLogger('ui')

export function Terminal({
  storyBytes,
  storyTitle,
  onChangeStory,
  onBootFail,
  themeToggle,
  backgroundInert = false,
  announceClearMs = LLM_ANNOUNCE_CLEAR_MS,
  engine: injectedEngine,
  gate: injectedGate,
}: {
  storyBytes: Uint8Array
  /** The current game's title — the game screen's heading for screen readers. */
  storyTitle: string
  onChangeStory: () => void
  /** Called when the VM fails to boot the story (corrupt/unsupported file, glk
   *  init throw). Lets the host surface the failure to the player rather than
   *  leaving a blank, frozen terminal (F-l). */
  onBootFail?: (err: unknown) => void
  themeToggle: ReactNode
  /** True while the change-story overlay covers the game — makes the whole
   *  terminal inert so a screen-reader virtual cursor can't read it (M9). */
  backgroundInert?: boolean
  /** Delay (ms) before a transient LLM mode-change announcement auto-clears.
   *  Injectable (mirrors useOutputTranslation's watchdogMs) so tests don't wait
   *  the full production delay. The M2 migration notice is not transient. */
  announceClearMs?: number
  /** The LLM engine. Injectable (default-constructed when omitted) so tests can
   *  drive Terminal with a FakeLlmEngine instead of prototype-spying the real
   *  WebLlmEngine, and so the engine isn't hard-wired into the composition root
   *  (F-d). Shared by the NL input + output-translation hooks via `gate`. */
  engine?: LlmEngine
  /** The priority mutex arbitrating the single engine between the NL input layer
   *  and the output-translation fallback. Injected with `engine` (F-d); both
   *  hooks must receive the SAME gate or input/output arbitration is lost. */
  gate?: EngineGate
}) {
  // Game-loop coordination lives in extracted hooks (F-17): the ZMachine
  // boot/dispose lifecycle and device-capability detection.
  const { view, signature, engineRef } = useGameEngine(storyBytes, onBootFail)
  const capability = useCapability()
  const viewRef = useRef<ViewState>(view)
  const inputRef = useRef<HTMLInputElement>(null)
  // One stable LLM engine instance for this Terminal (created once, lazily), or
  // the injected one (tests / F-d). The model id honors a ?model=full /
  // VITE_LLM_MODEL override (else the default), so the 8B multilingual model can
  // be A/B tested without a rebuild.
  const [llmEngine] = useState(
    () => injectedEngine ?? new WebLlmEngine(selectedModelId()),
  )
  // One gate arbitrating the single engine between the NL input layer and the
  // output-translation fallback (input preempts; output-translation spec §6).
  // Injected alongside the engine (F-d) or default-constructed.
  const [gate] = useState(() => injectedGate ?? new EngineGate())
  // Canonical-word → player-word map, fed to the output overlay so the Loud Room
  // input-echo renders in the player's language (loudEcho / UAT F6). Each entry
  // is recorded as a clause is sent (recordEcho), so a compound's clauses each
  // re-voice from their own word.
  // Two clauses that share a canonical last word (e.g. "coge la barra" and
  // "agarra barra" both → "take bar") collide on the key "bar"; last writer wins
  // (review F2). That's harmless: the echo line carries ONLY the canonical word,
  // so no finer key exists, and the overlay FREEZES each echo line's decision
  // synchronously at emit (echoFreeze) — the map already holds the producing
  // clause's word when its echo first renders, before any later clause overwrites.
  const [echoMap, setEchoMap] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  )
  // A line a failed translation discarded, handed to CommandInput to restore so
  // the player can edit it instead of retyping (M8). `key` bumps per failure.
  const [restore, setRestore] = useState<{ text: string; key: number } | null>(
    null,
  )
  // One Terminal-owned, visible aria-live region for LLM-feature events: the M2
  // migration notice (actionable → visible) and the live mode-change
  // announcement. Carries its own lang so a screen reader voices it correctly.
  const [llmMsg, setLlmMsg] = useState<{
    text: string
    lang: ActiveLanguage
    /** Transient (mode-change) announcements auto-clear after announceClearMs so
     *  they don't linger; the M2 migration notice is persistent (actionable). */
    transient: boolean
  } | null>(null)
  const recordEcho = useCallback((canonical: string, source: string) => {
    const k = loudEchoToken(canonical)
    const v = loudEchoToken(source)
    if (k === '' || v === '') return
    setEchoMap(prev => (prev.get(k) === v ? prev : new Map(prev).set(k, v)))
  }, [])

  // Keep a ref to the latest view so the NL hook's getContext() can read it at
  // translate-time. Written in an effect (not during render) per react-hooks/refs.
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // Release the model's GPU/worker resources when the Terminal unmounts (leaving
  // the game, or a hot-reload). The instance is stable, so this fires on unmount
  // only — story changes reuse it (review S1).
  useEffect(() => {
    return () => {
      void llmEngine.unload()
    }
  }, [llmEngine])

  const vocab = useMemo(
    () => (signature ? vocabForSignature(signature) : null),
    [signature],
  )

  // Memoized so it doesn't defeat translate()'s useCallback identity each render
  // (review S9). Both refs are stable RefObjects, so the identity holds; engineRef
  // (from useGameEngine) is listed to satisfy react-hooks/exhaustive-deps, viewRef
  // is a local useRef the rule already treats as stable. Read the engine's
  // SYNCHRONOUS view (the bridge's live ViewState) rather than viewRef, which only
  // updates inside a React effect that lags the bridge: a command issued before
  // React flushes the prior echo must still see the settled view, or a stale
  // disambiguation/orphan prompt lingers in recentOutput (review S1). Falls back to
  // viewRef before the engine boots (engineRef.current is null).
  const getContext = useCallback(
    () => viewToContext(engineRef.current?.currentView ?? viewRef.current),
    [engineRef],
  )

  const [llmEnabled, toggleLlm] = useLlmFeature()
  // Live mirror of llmEnabled for async callbacks that capture a stale value at
  // their start (the M2 mount effect's isCached().then — [I2]). Written in an
  // effect (not render) so the callback always reads the latest committed value.
  const llmEnabledRef = useRef(llmEnabled)
  useEffect(() => {
    llmEnabledRef.current = llmEnabled
  }, [llmEnabled])

  const nl = useNaturalLanguage({
    engine: llmEngine,
    capability,
    vocab,
    getContext,
    echoLocal: t => engineRef.current?.echoLocal(t),
    sendLine: t => engineRef.current?.sendLine(t),
    sendCanonical: t => engineRef.current?.sendLineCanonical(t),
    recordEcho,
    awaitTurn: () =>
      engineRef.current?.awaitTurn() ??
      Promise.resolve({ view: viewRef.current, reason: 'line' as const }),
    watchdogMs: GENERATE_WATCHDOG_MS,
    signature, // Task 21 consumes it (per-game noun lexicons); '' until boot resolves
    gate,
    llmEnabled,
  })

  const [debug, toggleDebug] = useDebug()
  const [prefsOpen, setPrefsOpen] = useState(false)

  // Turn-boundary scene observation (extracted, F-17): feed each completed turn
  // to the NL scene tracker, deferring to the hook during a compound sequence.
  useSceneObservation(nl, view)

  // The active OUTPUT language drives the display overlay (incl. output-only
  // languages like Georgian). `outputOnly` languages (OUTPUT_ONLY_LANGS) have a
  // display corpus but no LLM upgrade — used below to suppress the upgrade
  // modal/button for ka on EVERY game (it never has a model). It is NOT the input
  // decision: ka's INPUT support is per-game (see `kaInputActive` below).
  const outLang = nl.state.phase === 'on' ? nl.state.language : 'off'
  const outputOnly = outLang !== 'off' && OUTPUT_ONLY_LANGS.has(outLang)
  // The NL layer is engaged at all (incl. ka on a no-lexicon game) — drives the
  // localized command-field copy. Distinct from nlInputOn, which gates translate.
  const nlOn = nl.state.phase === 'on'
  // ka graduates to INPUT only on a game that HAS a ka noun lexicon — Zork I
  // today (spec §5.6, issue-1). On Zork II/III (no ka lexicon) it stays Phase-1
  // output-only: the field raw-sends English and `help` is intercepted at this
  // boundary (the in-pipeline help intercept lives inside nl.translate, which the
  // raw-send path never calls). fr/de/es always route; en raw-sends.
  const kaActive = kaInputActive(outLang, signature)
  const kaRawSend = outLang === 'ka' && !kaActive // ka on a no-lexicon game
  const nlInputOn = nlOn && (outLang !== 'ka' || kaActive)

  // Output translation (display overlay — spec §3): the language the player
  // picked drives the overlay (including output-only languages); passthrough
  // for en/off.
  const xl = useOutputTranslation({
    view,
    language: outLang,
    signature,
    engine: llmEngine,
    gate,
    echoMap,
    llmEnabled,
  })

  // The active NL language: `activeLang` (incl. 'en') localizes copy; `nlLang`
  // is undefined for English so only non-English text carries a lang attribute,
  // letting a screen reader pronounce it right (3.1.2).
  const activeLang = nl.state.phase === 'on' ? nl.state.language : 'en'
  const nlLang = activeLang !== 'en' ? activeLang : undefined

  // First-class a11y (spec §5): a Georgian player is told, in their own language
  // and English, that the translation is beta and may show English. Rendered in
  // the existing role=status live region (no new live region). Gated on the
  // CURRENT game actually having a Georgian corpus — otherwise (e.g. Zork II/III,
  // which have no ka corpus and display fully in English) the "beta translation"
  // claim would be misleading; the Landing "English only" badge is the honest
  // cue there instead. The corpus appears once the story signature resolves at
  // boot, so the notice surfaces alongside the first translated output.
  const showBetaNotice = outLang === 'ka' && corpusFor(signature, 'ka') !== null

  // The inverse cue ([I4]): Georgian is active but THIS story has no Georgian
  // corpus (Zork II/III in Phase 1), so it shows fully in English. The honest
  // "English only" badge lives on the Landing plate, which a mid-session in-game
  // switcher never sees — so without this an in-game switch to ka on Zork II/III
  // silently yields all-English with no explanation. Gated on a resolved
  // signature so it can't flash before boot (corpusFor is null for every game
  // until the signature loads). Mutually exclusive with showBetaNotice.
  const showNoCorpusNotice =
    outLang === 'ka' && signature !== '' && corpusFor(signature, 'ka') === null

  // Live download progress for the modal — derived from NL state during render
  // (no separate state or effect needed).
  const dlProgress: LoadProgress | null =
    nl.state.phase === 'downloading'
      ? // text is unused by the localized modal (review I3); only loaded/total are.
        { loaded: nl.state.loaded, total: nl.state.total, text: '' }
      : null

  useEffect(() => {
    if (view.inputRequest === 'char') engineRef.current?.ackMore()
    // engineRef is a stable RefObject (from useGameEngine); listed to satisfy
    // exhaustive-deps now that it's a hook return rather than a local useRef.
  }, [view.inputRequest, engineRef])

  // Turn-off mid-download: a load in flight would otherwise resolve into on/full
  // AFTER the user hid the feature. cancelDownload aborts it and settles to
  // on/grammar. (downloads can't START while off — the modal is gated — so this
  // only fires for an in-flight load at the moment of toggle-off.)
  // Deps are deliberately specific (phase + cancelDownload, not the full `nl`
  // object) so the abort fires only on the relevant state changes, not on every
  // nl field update.
  useEffect(
    () => {
      if (!llmEnabled && nl.state.phase === 'downloading') nl.cancelDownload()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [llmEnabled, nl.state.phase, nl.cancelDownload],
  )

  // M2: a returning user whose model was cached before this feature shipped would
  // find it silently gone. Show a one-time notice (model weights stay on disk).
  // Trigger: feature off + a cached model + marker unset. Localized to the stored
  // language (read synchronously so the notice isn't English before the async
  // cache-restore resolves the active language). Mount-only.
  useEffect(() => {
    if (llmEnabled) return
    let seen = false
    try {
      seen = localStorage.getItem(LS_KEYS.llmHiddenNoticeSeen) === '1'
    } catch {
      // Storage blocked (e.g. Chrome "block all cookies", whose localStorage
      // getter itself throws): we can't confirm the notice was already shown, so
      // fall through and let it show. The marker is best-effort and a recurring
      // notice is benign (the write side below accepts the same). BAILING here
      // would instead silence the actionable "re-enable in Preferences" guidance
      // for exactly the blocked-storage user who can't persist the marker.
    }
    if (seen) return
    let cancelled = false
    void llmEngine
      .isCached()
      .then(cached => {
        // Re-check live intent ([I2]): isCached() is genuinely async (dynamic
        // import + cache probe). If the player toggled the model ON during that
        // window, this stale notice would clobber the fresh "model enabled"
        // announcement with a persistent, now-false "model hidden" one — and
        // spend the one-time marker. Bail without writing the marker so M2 can
        // still appear on a future genuinely-off boot.
        if (cancelled || !cached || llmEnabledRef.current) return
        const pref = readNlPref().language
        const lang: ActiveLanguage = pref === 'off' ? 'en' : pref
        setLlmMsg({
          text: llmHiddenMigrationNotice(lang),
          lang,
          transient: false,
        })
        try {
          localStorage.setItem(LS_KEYS.llmHiddenNoticeSeen, '1')
        } catch {
          // best-effort marker — if storage is blocked the notice may recur,
          // which is benign (it never blocks play).
        }
      })
      // isCached() degrades a probe FAULT to false internally; this only fires
      // on a post-probe rejection (a throw in the .then). Surface it rather than
      // swallow — worst case the one-time M2 notice doesn't show, but silently (F-o).
      .catch(err => log.warn('llm-hidden migration probe failed', err))
    return () => {
      cancelled = true
    }
    // Mount-only one-time migration check (llmEngine is stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A transient mode-change announcement should not linger — once it has been
  // announced/read it auto-clears after announceClearMs. The M2 migration notice
  // is persistent (transient:false), so this leaves it alone. Cleanup clears the
  // pending timer on unmount or when the message changes (e.g. a rapid re-toggle
  // re-arms it), so no stale timer fires on an unmounted Terminal.
  useEffect(() => {
    if (!llmMsg?.transient) return
    const id = setTimeout(() => setLlmMsg(null), announceClearMs)
    return () => clearTimeout(id)
  }, [llmMsg, announceClearMs])

  // The upgrade/download modal is suppressed for output-only languages (it does
  // nothing for them) AND whenever the LLM feature is hidden (no model to offer).
  // Single source so the modal's visibility and the background-inert/focus-trap
  // state can never drift apart.
  const upgradeModalOpen = nl.modalOpen && !outputOnly && llmEnabled
  const downloadingModalOpen = llmEnabled && nl.state.phase === 'downloading'
  // the model download/upgrade modal opens only with the LLM feature on
  const modelModalOpen = upgradeModalOpen || downloadingModalOpen

  // The download/upgrade modal is open — everything behind it must be inert so
  // a screen-reader virtual cursor stays inside the dialog (aria-modal alone is
  // unevenly honored). The modal is a sibling below, so it stays operable (M9).
  const modalOpen = modelModalOpen || prefsOpen
  const bgInert = backgroundInert || modalOpen

  return (
    <div className="screen term" inert={backgroundInert}>
      <h1 className="sr-only">{storyTitle}</h1>
      <StatusBar
        status={xl.status}
        onChangeStory={onChangeStory}
        changeStoryLabel={LANDING_STRINGS[activeLang].changeStory}
        labelLang={nlLang}
        themeToggle={themeToggle}
        inert={bgInert}
        nlToggle={
          <NlLanguagePicker
            state={nl.state}
            onSelect={nl.setLanguage}
            onUpgrade={nl.requestUpgrade}
            hideUpgrade={outputOnly}
            llmEnabled={llmEnabled}
          />
        }
        prefsToggle={
          <button
            className="sw"
            type="button"
            aria-label={prefsOpenLabel(activeLang)}
            onClick={() => setPrefsOpen(true)}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        }
      />
      <main className="term-main" inert={bgInert}>
        <Scrollback
          lines={xl.lines}
          debug={debug}
          // Out-of-band height signals (review I1): the thinking indicator,
          // notice, and queued lines below render inside Scrollback from nl
          // state, growing the transcript with no xl.lines change. Fold them
          // into pinKey so the bottom is re-pinned (input not clipped) when they
          // mount/change, not only on new game output.
          pinKey={`${nl.pending}|${nl.queued.length}|${nl.notice ?? ''}`}
          onActivate={() => inputRef.current?.focus()}
        >
          {/* Lines typed ahead while a translation runs (F-A): dimmed, chipped,
            drained FIFO by the hook. Keyed on the hook's monotonic id — the
            queue shifts from the FRONT, so index keys would re-point a node
            at a different line. */}
          {nl.queued.map(q => (
            <p key={q.id} className="nl-source" lang={nlLang}>
              {/* Match the marker Scrollback commits to, gated on debug, so a
                  line doesn't relabel (you-pill ↔ '>') as it drains (S1). */}
              {debug ? (
                <span className="you-pill" lang="en">
                  you
                </span>
              ) : (
                <span className="car">&gt;</span>
              )}{' '}
              {q.text}
              <span className="chip" lang={nlLang}>
                {queuedChip(activeLang)}
              </span>
            </p>
          ))}
          {/* Transient NL status — the thinking indicator and abstain/timeout
              notices — in a dedicated role=status region (S1), not the role=log
              transcript: a screen reader announces them as status updates so a
              silent abstain (common in FR/DE/ES) is heard. Always mounted so the
              live region is registered before a notice appears. */}
          <div role="status" aria-live="polite" className="nl-status">
            {nl.pending && (
              <p className="nl-thinking" lang={nlLang}>
                {thinking(activeLang)}
              </p>
            )}
            {nl.notice && (
              <p className="nl-notice" lang={nlLang}>
                {nl.notice}
              </p>
            )}
          </div>
          <CommandInput
            inputRef={inputRef}
            // When the NL layer is on, localize the field's name + placeholder so
            // the headline feature isn't hidden behind classic copy (S3): English
            // invites plain English; fr/de/es invite plain language. ka splits by
            // SIGNATURE (Task 20): on a no-lexicon game (Zork II/III, kaRawSend) it
            // raw-sends English, so its Phase-1 copy says "type in English"; on
            // Zork I (input-active) it invites Georgian via commandLabel/Placeholder.
            // kaRawSend ⟹ nlOn (outLang==='ka' implies phase 'on'), so testing it
            // first is safe. Only 'off' keeps the classic copy.
            label={
              kaRawSend
                ? commandLabelTypeEnglish() // Zork II/III ka raw-sends English → Phase-1 name
                : nlOn
                  ? commandLabel(activeLang) // Zork I ka (+ en/fr/de/es): input-language name
                  : 'Game command'
            }
            placeholder={
              kaRawSend
                ? commandPlaceholderTypeEnglish() // Zork II/III ka: Phase-1 "type in English"
                : nlOn
                  ? commandPlaceholder(activeLang)
                  : 'type a command…'
            }
            // The field's VALUE is what `lang` governs for a screen reader, and
            // the value is in the INPUT language — not the display language. ka
            // on Zork I now types GEORGIAN (nlInputOn is true there), so the
            // field correctly carries lang="ka" — a screen reader voices the
            // typed Georgian with Georgian phonemes (an a11y improvement). ka on
            // Zork II/III still raw-sends English (nlInputOn false → undefined),
            // so an English value isn't mis-voiced as Georgian. fr/de/es type
            // their own language, carrying nlLang. (The localized
            // placeholder/label copy is driven by activeLang above, unaffected.)
            lang={nlInputOn ? nlLang : undefined}
            restore={restore ?? undefined}
            onSubmit={text => {
              // The Loud Room echo is re-voiced per clause via recordEcho as the
              // pipeline sends each canonical command (loudEcho / F6). ka on
              // Zork I is nlInputOn (it types Georgian, routed through translate);
              // ka on a no-lexicon game (kaRawSend) raw-sends English instead.
              if (nlInputOn)
                void nl.translate(text).then(retained => {
                  // Non-EN abstain/timeout/failure sent nothing — restore the
                  // discarded line so it isn't lost (M8).
                  if (retained != null)
                    setRestore(r => ({
                      text: retained,
                      key: (r?.key ?? 0) + 1,
                    }))
                })
              // ka on a no-lexicon game (Zork II/III) raw-sends English and never
              // reaches the in-pipeline help intercept (it lives inside
              // nl.translate). But the activation notice tells a ka player to type
              // `help`, so it MUST be intercepted HERE to the localized Georgian
              // help block — otherwise it raw-sends to the parser and earns "I
              // don't know the word help". Every other raw-send ka command still
              // raw-sends below. (ka on Zork I is nlInputOn above, so `help` goes
              // through nl.translate's own help intercept, not this boundary.)
              else if (kaRawSend && isHelpTrigger(text, activeLang))
                nl.showHelp(activeLang)
              else if (engineRef.current) engineRef.current.sendLine(text)
              // Practically unreachable (engine is set synchronously and input is
              // disabled until a line request), but warn rather than silently
              // swallow the turn if it ever happens (review S11).
              else log.warn('submit ignored: engine not ready')
            }}
            // Never pending-disabled ([M]): while NL is on, typed-ahead lines
            // queue (F-A); when NL is off/left mid-drain, typing raw-sends —
            // pending could only become true under phase 'on', so disabling on
            // `pending && phase !== 'on'` locked the player out exactly when a
            // wedged or slow drain coincided with switching NL off.
            awaitingKey={view.inputRequest === 'char'}
            awaitingLine={view.inputRequest === 'line'}
            onKey={key => engineRef.current?.sendChar(key)}
          />
        </Scrollback>
      </main>
      {/* Georgian (ka) one-shot announce region (spec 2026-06-21). THIS region
          is ka-only — en/fr/de/es get no extra live region here. (The bottom bar
          below is NOT ka-only; it always renders — see its own comment.)
          The announce region is a DEDICATED polite live region (NOT role=status,
          to avoid a second status landmark colliding with the inline one, and
          NOT the static footer) for the one-shot "type in English" tip on ka
          entry — finding [6].
          MOUNT vs. CONTENT: the region is mounted whenever ka is active (so the
          live region is REGISTERED while still empty, before content fills on a
          later render — a region that mounts already populated may not announce).
          But its CONTENT is gated on `showBetaNotice` (corpus present): on a
          no-corpus ka game (Zork II/III) the display is ENGLISH, so announcing
          "type in English; text appears in Georgian" would be locally wrong — the
          same reason Decision 1 omits the VISIBLE tip there. The latch fires
          `nl.announce` on ka entry regardless of corpus (it can't see the
          corpus), so the corpus gate lives HERE, mirroring the visible-tip gate.
          lang="ka" voices it in Georgian. */}
      {outLang === 'ka' && (
        <div className="sr-only" aria-live="polite" lang="ka">
          {showBetaNotice ? nl.announce : null}
        </div>
      )}
      {/* The persistent bottom bar — ALWAYS present, in every language, showing
          the NL-mode + story readout (plus the save-slot signature under debug).
          The Georgian notice flags add the ka player content on top (they already
          imply outLang === 'ka'). */}
      <BottomBar
        debug={debug}
        nlState={nl.state}
        storyTitle={storyTitle}
        signature={signature}
        showBeta={showBetaNotice}
        showNoCorpus={showNoCorpusNotice}
        kaInput={kaActive}
        llmEnabled={llmEnabled}
      />
      {/* LLM-feature live region (M2 migration notice + mode-change). Always
          mounted so the live region is registered before content appears;
          visible so M2's "re-enable in Preferences" guidance is actionable.
          A BARE aria-live region — deliberately NOT role="status": Terminal
          already has one role="status" region, and existing tests rely on there
          being exactly ONE status landmark. aria-live="polite" alone still
          announces (same pattern as the ka announce region). */}
      <div aria-live="polite" className="nl-notice" lang={llmMsg?.lang}>
        {llmMsg?.text}
      </div>
      <ModelDownloadModal
        open={modelModalOpen}
        warn={
          (nl.state.phase === 'on' || nl.state.phase === 'off') &&
          !nl.state.canUpgrade
        }
        progress={dlProgress}
        etaSeconds={
          nl.state.phase === 'downloading' ? nl.state.etaSeconds : null
        }
        lang={
          nl.state.phase === 'on' || nl.state.phase === 'downloading'
            ? nl.state.language
            : 'en'
        }
        onAccept={nl.requestDownload}
        onDecline={nl.declineDownload}
        onCancel={nl.cancelDownload}
      />
      <PreferencesModal
        open={prefsOpen}
        debug={debug}
        llmEnabled={llmEnabled}
        lang={activeLang}
        modelInstalled={nl.installed}
        onToggleDebug={toggleDebug}
        onToggleLlm={() => {
          const next = !llmEnabled
          toggleLlm()
          setLlmMsg({
            text: llmModeChange(activeLang, next),
            lang: activeLang,
            transient: true,
          })
        }}
        onDeleteModel={nl.deleteModel}
        onClose={() => setPrefsOpen(false)}
      />
    </div>
  )
}
