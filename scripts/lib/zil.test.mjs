import { describe, it, expect } from 'vitest'
import { readForms, headAtom } from './zil.mjs'
import { activeForms } from './zil.mjs'

describe('readForms', () => {
  it('parses nested angle/paren forms and string literals', () => {
    const [obj] = readForms('<OBJECT TREE (DESC "tree") (FLAGS NDESCBIT)>')
    expect(obj.t).toBe('list')
    expect(headAtom(obj)).toBe('OBJECT')
    const desc = obj.items.find(i => i.t === 'list' && headAtom(i) === 'DESC')
    expect(desc.items[1]).toEqual({ t: 'str', v: 'tree' })
  })

  it('drops the single datum after a ";" comment', () => {
    const [adj] = readForms('(ADJECTIVE LARGE STORM ;"-TOSSED")')
    const atoms = adj.items.filter(i => i.t === 'atom').map(i => i.v)
    expect(atoms).toEqual(['ADJECTIVE', 'LARGE', 'STORM'])
  })

  it('drops a commented-out bracketed form without breaking nesting', () => {
    const forms = readForms('<A> ;<DEAD <CODE>> <B>')
    expect(forms.map(headAtom)).toEqual(['A', 'B'])
  })

  it('treats ,ZORK-NUMBER and form-feeds as ordinary atoms/whitespace', () => {
    const [cond] = readForms('\f<COND (<==? ,ZORK-NUMBER 2> <X>)>')
    expect(headAtom(cond)).toBe('COND')
  })
})

describe('activeForms (ZORK-NUMBER gating)', () => {
  const src = `
    <SYNTAX BACK = V-BACK>
    <COND (<==? ,ZORK-NUMBER 2> <SYNTAX KILL OBJECT = V-ATTACK>)>
    <COND (<N==? ,ZORK-NUMBER 3> <SYNTAX GIVE OBJECT TO OBJECT = V-GIVE>)>
  `
  const heads = (n) => activeForms(readForms(src), n).map(headAtom)

  it('always includes ungated forms', () => {
    expect(heads(1)).toContain('SYNTAX') // BACK
  })
  it('includes ==?-gated forms only for the matching game', () => {
    const kill1 = activeForms(readForms(src), 1).filter(
      f => f.items.some(i => i.t === 'atom' && i.v === 'KILL'),
    )
    const kill2 = activeForms(readForms(src), 2).filter(
      f => f.items.some(i => i.t === 'atom' && i.v === 'KILL'),
    )
    expect(kill1).toHaveLength(0)
    expect(kill2).toHaveLength(1)
  })
  it('includes N==?-gated forms for every game except the excluded one', () => {
    const has = (n) =>
      activeForms(readForms(src), n).some(f =>
        f.items.some(i => i.t === 'atom' && i.v === 'GIVE'),
      )
    expect(has(1)).toBe(true)
    expect(has(2)).toBe(true)
    expect(has(3)).toBe(false)
  })
})
