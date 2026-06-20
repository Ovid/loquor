/** Pre-composed display forms for one object/room name. The KEY SET IS OPEN
 * and per-language (spec §4 "Open form keys"): French ships {indef, def,
 * bare}; German will ship case forms (nomIndef, akkIndef, …). The matcher
 * never interprets key names — a template references {obj.<key>} and the
 * data supplies it. A missing key on a matched object is a MISS, not a crash. */
export type ObjectForms = Readonly<Record<string, string>>

/** EN printed name (exactly as it appears in game output) → forms. */
export type ObjectsTable = Readonly<Record<string, ObjectForms>>

/** A composing pattern. EN slots: {obj} {obj2} {obj3} {obj4} {num} {num2} {raw}.
 * The out side references {obj.<key>} / {obj2.<key>} / {obj3.<key>} /
 * {obj4.<key>} / {num} / {num2} / {raw}. ({obj2}–{obj4} cover the 2nd–4th
 * candidates in a WHICH-PRINT disambiguation list, max being the 4 dam buttons.)
 * Each slot name may appear AT MOST ONCE per template — slots compile to
 * named regex groups, and a duplicate name throws at corpus compile time
 * ({obj2}/{num2} exist precisely for a second occurrence). Form keys are
 * ASCII letters only ([A-Za-z]+).
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
