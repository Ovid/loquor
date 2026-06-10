/** Pre-composed display forms for one object/room name. The KEY SET IS OPEN
 * and per-language (spec §4 "Open form keys"): French ships {indef, def,
 * bare}; German will ship case forms (nomIndef, akkIndef, …). The matcher
 * never interprets key names — a template references {obj.<key>} and the
 * data supplies it. A missing key on a matched object is a MISS, not a crash. */
export type ObjectForms = Readonly<Record<string, string>>

/** EN printed name (exactly as it appears in game output) → forms. */
export type ObjectsTable = Readonly<Record<string, ObjectForms>>

/** A composing pattern. EN slots: {obj} {obj2} {num} {num2} {raw}. The out
 * side references {obj.<key>} / {obj2.<key>} / {num} / {num2} / {raw}.
 * cap: capitalize the first character of the composed result (used by the
 * built-in listing template "A {obj}" → "{obj.indef}"). */
export interface Template {
  readonly en: string
  readonly out: string
  readonly cap?: boolean
}

export interface TranslationCorpus {
  /** normalized English full line → translation (checked FIRST, spec §5). */
  readonly strings: Readonly<Record<string, string>>
  readonly objects: ObjectsTable
  readonly templates: readonly Template[]
}
