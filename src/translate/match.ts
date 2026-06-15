// Pure runtime matcher (spec §5): 1. exact string table → 2. templates in
// specificity order ({obj} before {raw} for equal literals; every slot must
// resolve) → 3. null (miss; the LLM fallback catches it). The built-in
// listing templates "A {obj}" / "An {obj}" → capitalized {obj.indef} are
// appended at compile time so each inventory/contents BufferLine composes.
import type { ObjectForms, Template, TranslationCorpus } from './types'

interface CompiledTemplate {
  re: RegExp
  out: string
  cap: boolean
  /** Count of {raw} slots — tie-breaker: obj-resolving beats raw (spec §5). */
  rawCount: number
  /** Literal (non-slot) character count — primary specificity. */
  literal: number
}

export interface CompiledCorpus {
  strings: Readonly<Record<string, string>>
  objects: Readonly<Record<string, ObjectForms>>
  templates: CompiledTemplate[]
}

const SLOT = /\{(obj2?|num2?|raw)\}/g

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Capitalize the first LETTER, skipping leading punctuation, so a cap:true
 * line that opens with «¡»/«¿» capitalizes the word and not the inverted mark
 * («¡El ladrón…», not «¡el ladrón…»). No letter → returned unchanged.
 * Code-point safe (review S3): an astral-plane initial letter would be split by
 * charAt, so slice by the matched code point's length. */
function capitalizeFirstLetter(s: string): string {
  const i = s.search(/\p{L}/u)
  if (i < 0) return s
  const ch = String.fromCodePoint(s.codePointAt(i)!)
  return s.slice(0, i) + ch.toUpperCase() + s.slice(i + ch.length)
}

/** Built-in listing templates (spec §5): every inventory/contents entry is
 * its own BufferLine shaped "A <name>" / "An <name>". */
const BUILTIN: Template[] = [
  { en: 'A {obj}', out: '{obj.indef}', cap: true },
  { en: 'An {obj}', out: '{obj.indef}', cap: true },
]

export function compileCorpus(corpus: TranslationCorpus): CompiledCorpus {
  // Longest-first alternation so 'glass bottle' wins over a hypothetical
  // 'glass'. The localeCompare tie-break makes the order TOTAL (review S6):
  // length alone leaves equal-length names in object-insertion order, a latent
  // non-determinism as corpora grow.
  const names = Object.keys(corpus.objects).sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  )
  const objAlt = names.length > 0 ? names.map(escapeRe).join('|') : '(?!)' // never-match when empty

  const compile = (t: Template): CompiledTemplate => {
    let literal = 0
    let rawCount = 0
    let src = '^'
    let last = 0
    // Each slot compiles to a named regex group, so a repeated slot produces
    // duplicate group names and new RegExp throws an opaque "Duplicate capture
    // group name". Enforce the documented "at most once per template" rule
    // (types.ts) up front with an actionable, template-naming error (review S9);
    // {obj2}/{num2} exist precisely for a second occurrence.
    const seen = new Set<string>()
    for (const m of t.en.matchAll(SLOT)) {
      const lit = t.en.slice(last, m.index)
      literal += lit.length
      src += escapeRe(lit)
      const slot = m[1]
      if (seen.has(slot))
        throw new Error(
          `Template "${t.en}" has a repeated slot {${slot}} — each slot may ` +
            `appear at most once (use {obj2}/{num2} for a second occurrence).`,
        )
      seen.add(slot)
      if (slot === 'obj' || slot === 'obj2') src += `(?<${slot}>${objAlt})`
      else if (slot === 'num' || slot === 'num2') src += `(?<${slot}>-?\\d+)`
      else {
        rawCount++
        src += '(?<raw>.+?)'
      }
      last = m.index! + m[0].length
    }
    const tail = t.en.slice(last)
    literal += tail.length
    src += escapeRe(tail) + '$'
    return {
      re: new RegExp(src),
      out: t.out,
      cap: t.cap === true,
      rawCount,
      literal,
    }
  }

  const templates = [...corpus.templates, ...BUILTIN].map(compile)
  // Specificity: most literal characters first; ties → {obj}-resolving before
  // {raw} (spec §5), so a known object gets its proper French form.
  templates.sort((a, b) => b.literal - a.literal || a.rawCount - b.rawCount)
  return { strings: corpus.strings, objects: corpus.objects, templates }
}

const OUT_REF = /\{(obj2?)\.([A-Za-z]+)\}|\{(num2?)\}|\{(raw)\}/g

/** Given a NORMALIZED English line, return its translation or null (miss). */
export function matchLine(c: CompiledCorpus, line: string): string | null {
  const direct = matchOnce(c, line)
  if (direct !== null) return direct
  // Glued input-prompt residue: a CR-less question (the restart/quit
  // Y-prompts) merges with the '>' line-input prompt into ONE BufferLine.
  // The residue is chrome, not identity — retry without it and re-append it
  // verbatim. Shares splitPromptResidue with the fallback so the two paths
  // can't drift (review I4). One level only; the bare '>' line itself never
  // gets here (untranslatable() guards it upstream).
  const { core, suffix } = splitPromptResidue(line)
  if (suffix !== '') {
    const hit = matchOnce(c, core)
    if (hit !== null) return hit + suffix
  }
  return null
}

/** Split the glued input-prompt residue (' >') off a line the same way
 * matchLine does (review I4): a CR-less Y/N prompt merges with the bare '>'
 * line-input prompt into one BufferLine. The residue is chrome, not identity —
 * the LLM fallback translates/caches `core` and re-appends `suffix`, so a cache
 * key never carries the residue. One level only; the bare '>' is guarded
 * upstream by untranslatable(). */
export function splitPromptResidue(line: string): {
  core: string
  suffix: string
} {
  if (line.endsWith(' >')) return { core: line.slice(0, -2), suffix: ' >' }
  return { core: line, suffix: '' }
}

function matchOnce(c: CompiledCorpus, line: string): string | null {
  const exact = c.strings[line]
  if (exact !== undefined) return exact

  for (const t of c.templates) {
    const m = t.re.exec(line)
    if (!m) continue
    const g = m.groups ?? {}
    let ok = true
    const out = t.out.replace(
      OUT_REF,
      (
        _all,
        objSlot?: string,
        formKey?: string,
        numSlot?: string,
        raw?: string,
      ) => {
        if (objSlot) {
          const name = g[objSlot]
          const form =
            name !== undefined ? c.objects[name]?.[formKey!] : undefined
          if (form === undefined) {
            ok = false // unresolved slot/form key → this template MISSES (spec §4/§5)
            return ''
          }
          return form
        }
        if (numSlot) {
          const v = g[numSlot]
          if (v === undefined) {
            ok = false
            return ''
          }
          return v
        }
        const r = g[raw!]
        if (r === undefined) {
          ok = false
          return ''
        }
        return r
      },
    )
    if (!ok) continue
    return t.cap ? capitalizeFirstLetter(out) : out
  }
  return null
}
