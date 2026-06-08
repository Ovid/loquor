import { describe, it, expect } from 'vitest'
import { readForms, headAtom } from './zil.mjs'

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
