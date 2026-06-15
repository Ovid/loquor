import { describe, it, expect } from 'vitest'
import { withContractions } from './zork1.es.objects'
import type { ObjectsTable } from '../types'

// withContractions derives {alDef, delDef} (a+el→al, de+el→del) from `def`.
// The masculine "el X" branch must be reached even if a future entry is authored
// with a capitalized "El " or a stray leading space — otherwise it silently falls
// to the ungrammatical "a el …"/"de el …" branch (review F4).
describe('withContractions (review F4)', () => {
  const forms = (def: string) => ({ indef: 'x', def, bare: 'x' })
  const run = (def: string) =>
    withContractions({ obj: forms(def) } as ObjectsTable).obj

  it('contracts masculine "el X" → al/del', () => {
    expect(run('el altar')).toMatchObject({ alDef: 'al altar', delDef: 'del altar' })
  })

  it('still contracts despite a capitalized "El " or leading whitespace', () => {
    expect(run('El altar')).toMatchObject({ alDef: 'al altar', delDef: 'del altar' })
    expect(run('  el altar')).toMatchObject({ alDef: 'al altar', delDef: 'del altar' })
  })

  it('feminine/plural just prepend a/de (no contraction)', () => {
    expect(run('la botella')).toMatchObject({
      alDef: 'a la botella',
      delDef: 'de la botella',
    })
  })
})
