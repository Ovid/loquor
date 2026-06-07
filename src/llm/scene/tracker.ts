// src/llm/scene/tracker.ts
import type { Vocab, NounEntry } from '../grammar/types'
import type { Scene, SceneEvent, SceneObject, SceneProvider, SceneState } from './types'
import { emptySceneState } from './types'

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Surface phrases (canonical, synonyms, adjective+canonical), longest first. */
function surfaceForms(nouns: NounEntry[]): { phrase: string; canonical: string }[] {
  const forms: { phrase: string; canonical: string }[] = []
  for (const n of nouns) {
    for (const base of [n.canonical, ...(n.synonyms ?? [])])
      forms.push({ phrase: base.toLowerCase(), canonical: n.canonical })
    for (const adj of n.adjectives ?? [])
      forms.push({ phrase: `${adj} ${n.canonical}`.toLowerCase(), canonical: n.canonical })
  }
  return forms.sort((a, b) => b.phrase.length - a.phrase.length)
}

/** Map every surface word → canonical (for absence lookup + acted-object). */
function surfaceToCanonical(vocab: Vocab): Map<string, string> {
  const m = new Map<string, string>()
  for (const n of vocab.nouns) {
    m.set(n.canonical.toLowerCase(), n.canonical)
    for (const s of n.synonyms ?? []) m.set(s.toLowerCase(), n.canonical)
  }
  return m
}

/** Canonicals named inside an absence/negation clause this turn. */
function suppressed(text: string, vocab: Vocab): Set<string> {
  const map = surfaceToCanonical(vocab)
  const out = new Set<string>()
  const re = new RegExp(vocab.absencePat.source, vocab.absencePat.flags)
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const word = (m.slice(1).find(g => g !== undefined) ?? '').toLowerCase()
    const canon = map.get(word)
    if (canon) out.add(canon)
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
    const re = new RegExp(`\\b${esc(phrase)}\\b`, 'g')
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
  let rest = command.trim().toLowerCase()
  for (const v of verbs) {
    if (rest === v) return null
    if (rest.startsWith(v + ' ')) {
      rest = rest.slice(v.length + 1)
      break
    }
  }
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
    if (!inScope.some(o => o.canonical === canonical)) inScope.push({ canonical })

  if (event.lastCommand) {
    const obj = directObject(event.lastCommand, vocab)
    if (obj && /^take\b/i.test(event.lastCommand) && vocab.takeAck.test(event.outputText)) {
      const found = inScope.find(o => o.canonical === obj)
      if (found) found.carried = true
      else inScope.push({ canonical: obj, carried: true })
    }
    if (obj && /^drop\b/i.test(event.lastCommand) && vocab.dropAck.test(event.outputText)) {
      const found = inScope.find(o => o.canonical === obj)
      if (found) found.carried = false
    }
  }

  // Antecedent precedence: (1) newest mention, else (2) acted object (if not
  // suppressed/failed), else (3) prior antecedent (already carried in `antecedent`).
  if (mentioned.length > 0) {
    antecedent = mentioned[mentioned.length - 1]
  } else if (event.lastCommand) {
    const obj = directObject(event.lastCommand, vocab)
    if (obj && !sup.has(obj) && inScope.some(o => o.canonical === obj)) antecedent = obj
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
