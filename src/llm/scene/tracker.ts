// src/llm/scene/tracker.ts
import type { Vocab, NounEntry } from '../grammar/types'
import type {
  Scene,
  SceneEvent,
  SceneObject,
  SceneProvider,
  SceneState,
} from './types'
import { emptySceneState } from './types'
import { refusalApplies } from '../outputClassify'
import { escapeRegExp } from '../../shared/regex'

/** Synonyms shared by 2+ distinct objects (e.g. "window" owned by both
 * KITCHEN-WINDOW and BOARDED-WINDOW). Too generic to pin to one canonical:
 * resolving the bare word to an arbitrary owner over-specifies and corrupts the
 * command (UAT F3: `open window` -> `open boarded window`, rejected). Such a
 * synonym instead resolves to ITSELF, so we emit "window" and let the Z-machine
 * parser disambiguate by room. An explicit adjective ("boarded window") still
 * resolves to the specific canonical via the canonical/adjective surface forms. */
function ambiguousSynonyms(nouns: NounEntry[]): Set<string> {
  const owners = new Map<string, number>()
  for (const n of nouns)
    for (const s of n.synonyms ?? []) {
      const k = s.toLowerCase()
      owners.set(k, (owners.get(k) ?? 0) + 1)
    }
  const out = new Set<string>()
  for (const [k, c] of owners) if (c >= 2) out.add(k)
  return out
}

/** Surface phrases (canonical, synonyms, adjective+canonical), longest first. A
 * synonym shared across objects maps to itself (generic) rather than an owner. */
function surfaceForms(
  nouns: NounEntry[],
): { phrase: string; canonical: string }[] {
  const ambiguous = ambiguousSynonyms(nouns)
  const forms: { phrase: string; canonical: string }[] = []
  for (const n of nouns) {
    forms.push({ phrase: n.canonical.toLowerCase(), canonical: n.canonical })
    for (const s of n.synonyms ?? []) {
      const phrase = s.toLowerCase()
      forms.push({
        phrase,
        canonical: ambiguous.has(phrase) ? phrase : n.canonical,
      })
    }
    for (const adj of n.adjectives ?? [])
      forms.push({
        phrase: `${adj} ${n.canonical}`.toLowerCase(),
        canonical: n.canonical,
      })
  }
  return forms.sort((a, b) => b.phrase.length - a.phrase.length)
}

/** Canonicals named inside an absence/negation clause this turn. */
function suppressed(text: string, vocab: Vocab): Set<string> {
  const forms = surfaceForms(vocab.nouns) // longest first
  const out = new Set<string>()
  const re = new RegExp(vocab.absencePat.source, vocab.absencePat.flags)
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const phrase = (m.slice(1).find(g => g !== undefined) ?? '').toLowerCase()
    // The capture is a short phrase ("small mailbox here"); take the LONGEST
    // surface form at its start, so an adjective-prefixed absent object resolves
    // to its canonical instead of leaking back into scope via mentions() (C6).
    const hit = forms.find(
      f => phrase === f.phrase || phrase.startsWith(f.phrase + ' '),
    )
    if (hit) out.add(hit.canonical)
    if (m.index === re.lastIndex) re.lastIndex++ // guard against zero-width
  }
  return out
}

/** Ordered, non-overlapping, suppressed-free canonical mentions (appearance order). */
function mentions(text: string, vocab: Vocab, sup: Set<string>): string[] {
  const lower = text.toLowerCase()
  type Hit = { start: number; end: number; canonical: string }
  const hits: Hit[] = []
  for (const { phrase, canonical } of surfaceForms(vocab.nouns)) {
    const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(lower)) !== null)
      hits.push({ start: m.index, end: m.index + phrase.length, canonical })
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end) // earliest, longest first
  const taken: Hit[] = []
  for (const h of hits) {
    if (taken.some(t => h.start < t.end && t.start < h.end)) continue // overlap
    if (sup.has(h.canonical)) continue
    taken.push(h)
  }
  // de-dup canonicals but keep first appearance order
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const h of taken)
    if (!seen.has(h.canonical)) {
      seen.add(h.canonical)
      ordered.push(h.canonical)
    }
  return ordered
}

/** Direct object canonical of a canonical command we sent (verb may be multiword). */
function directObject(command: string, vocab: Vocab): string | null {
  const verbs = [
    ...vocab.verbs2,
    ...vocab.verbs1,
    ...vocab.verbsOnly,
    ...vocab.movement,
  ].sort((a, b) => b.length - a.length)
  // Collapse internal whitespace too: a double space ("take  the lamp") left the
  // article-strip head empty and lost the acted object → stale "it" (I3).
  let rest = command.trim().toLowerCase().replace(/\s+/g, ' ')
  for (const v of verbs) {
    if (rest === v) return null
    if (rest.startsWith(v + ' ')) {
      rest = rest.slice(v.length + 1)
      break
    }
  }
  // Strip a leading English article. fr/de/es feed this tracker the article-free
  // canonical (the lexicon strips articles during translation: 'prends le
  // déjeuner' → 'take food'), but English vocab-passthrough keeps the article
  // ('take the lunch'), so without this the remainder ('the lunch') matches no
  // surface form → null → the acted object is lost and 'it' resolves to a stale
  // older object (UAT Bug B). No-op for the article-free languages.
  const head = rest.split(' ', 1)[0]
  if (head !== rest && (head === 'the' || head === 'a' || head === 'an'))
    rest = rest.slice(head.length + 1)
  for (const { phrase, canonical } of surfaceForms(vocab.nouns))
    if (rest === phrase || rest.startsWith(phrase + ' ')) return canonical
  return null
}

function keyOf(e: SceneEvent): string {
  return `${e.location} ${e.outputText} ${e.lastCommand ?? ''}`
}

export function reduceScene(
  prev: SceneState,
  event: SceneEvent,
  vocab: Vocab,
): SceneState {
  const key = keyOf(event)
  if (key === prev.lastKey) return prev // idempotent: duplicate turn observed twice

  const roomChanged = prev.location !== null && event.location !== prev.location
  const inScope: SceneObject[] = roomChanged
    ? prev.inScope.filter(o => o.carried).map(o => ({ ...o }))
    : prev.inScope.map(o => ({ ...o }))
  let antecedent = roomChanged ? null : prev.antecedent

  const sup = suppressed(event.outputText, vocab)
  const mentioned = mentions(event.outputText, vocab, sup)
  for (const canonical of mentioned)
    if (!inScope.some(o => o.canonical === canonical))
      inScope.push({ canonical })

  if (event.lastCommand) {
    const obj = directObject(event.lastCommand, vocab)
    if (
      obj &&
      /^take\b/i.test(event.lastCommand) &&
      vocab.takeAck.test(event.outputText)
    ) {
      const found = inScope.find(o => o.canonical === obj)
      if (found) found.carried = true
      else inScope.push({ canonical: obj, carried: true })
    }
    if (
      obj &&
      /^drop\b/i.test(event.lastCommand) &&
      vocab.dropAck.test(event.outputText)
    ) {
      const found = inScope.find(o => o.canonical === obj)
      if (found) found.carried = false
    }
  }

  // Antecedent precedence: (1) newest mention, else (2) acted object (if not
  // suppressed/failed), else (3) prior antecedent (already carried in `antecedent`).
  if (mentioned.length > 0) {
    antecedent = mentioned[mentioned.length - 1]
  } else if (event.lastCommand) {
    // A command that no-opped/was refused ("It is already open.") names no new
    // object and must not promote its acted object to "it" — otherwise one
    // mistranslated pronoun self-reinforces every following turn. This is the
    // "failed" half of the precedence rule above (previously only "suppressed"
    // was enforced; the no-op case leaked through). Scoped to the acted object
    // (review C8) so a refusal aimed at an unrelated object doesn't count —
    // shared with clauseFailed so both sites agree on "this command failed".
    const failed = refusalApplies(event.outputText, vocab, event.lastCommand)
    const obj = directObject(event.lastCommand, vocab)
    if (
      obj &&
      !failed &&
      !sup.has(obj) &&
      inScope.some(o => o.canonical === obj)
    )
      antecedent = obj
  }

  return { location: event.location, inScope, antecedent, lastKey: key }
}

export class TextSceneTracker implements SceneProvider {
  private state: SceneState = emptySceneState
  private vocab: Vocab
  constructor(vocab: Vocab) {
    this.vocab = vocab
  }

  observe(event: SceneEvent): void {
    this.state = reduceScene(this.state, event, this.vocab)
  }

  scene(): Scene {
    return {
      inScope: this.state.inScope.map(o => ({ ...o })),
      antecedent: this.state.antecedent,
    }
  }

  reset(): void {
    this.state = emptySceneState
  }
}
