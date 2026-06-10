import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from './match'
import type { TranslationCorpus } from './types'

const corpus: TranslationCorpus = {
  strings: {
    'Taken.': 'Pris.',
    'A quantity of water': "De l'eau",
    'West of House': "À l'ouest de la maison",
  },
  objects: {
    'glass bottle': {
      indef: 'une bouteille en verre',
      def: 'la bouteille en verre',
      bare: 'bouteille en verre',
    },
    'brass lantern': {
      indef: 'une lampe en laiton',
      def: 'la lampe en laiton',
      bare: 'lampe en laiton',
    },
    // Deliberately MISSING 'def' to pin missing-form-key-is-a-miss:
    lunch: { indef: 'un casse-croûte' },
  },
  templates: [
    { en: 'There is a {obj} here.', out: 'Il y a {obj.indef} ici.' },
    {
      en: 'The {obj} is now open.',
      out: '{obj.def} est maintenant {obj.bare}…',
    },
    {
      en: "You can't see any {obj} here!",
      out: 'Vous ne voyez pas de {obj.bare} ici !',
    },
    {
      en: "You can't see any {raw} here!",
      out: 'Vous ne voyez pas de {raw} ici !',
    },
    {
      en: 'I don\'t know the word "{raw}".',
      out: 'Je ne connais pas le mot "{raw}".',
    },
    {
      en: 'Your score is {num} (total of 350 points), in {num2} moves.',
      out: 'Votre score est de {num} (sur un total de 350 points), en {num2} déplacements.',
    },
    // cap: true added because def = 'la bouteille…' (lowercase) and the
    // test asserts 'La bouteille…' — sentence-initial capitalization required.
    { en: 'The {obj} contains:', out: '{obj.def} contient :', cap: true },
  ],
}
const c = compileCorpus(corpus)

describe('matchLine: exact table (spec §5.1)', () => {
  it('hits a full-line entry', () => {
    expect(matchLine(c, 'Taken.')).toBe('Pris.')
  })
  it('exact runs FIRST: an irregular composition pinned as a full line never reaches templates', () => {
    expect(matchLine(c, 'A quantity of water')).toBe("De l'eau")
  })
  it('misses an unknown line', () => {
    expect(matchLine(c, 'Some line nobody wrote.')).toBeNull()
  })
})

describe('matchLine: templates (spec §5.2)', () => {
  it('resolves an {obj} slot through the objects table', () => {
    expect(matchLine(c, 'There is a glass bottle here.')).toBe(
      'Il y a une bouteille en verre ici.',
    )
  })
  it('an unknown object inside a known {obj} pattern is a MISS (every slot must resolve)', () => {
    expect(matchLine(c, 'There is a chartreuse zeppelin here.')).toBeNull()
  })
  it('a matched object MISSING the referenced form key is a miss, not a crash (open form keys)', () => {
    expect(matchLine(c, 'The lunch is now open.')).toBeNull()
  })
  it('{num} slots match SIGNED integers (scores go negative — spec §4.3)', () => {
    expect(
      matchLine(c, 'Your score is -10 (total of 350 points), in 3 moves.'),
    ).toBe(
      'Votre score est de -10 (sur un total de 350 points), en 3 déplacements.',
    )
  })
  it('{obj} templates beat {raw} templates of the same shape (known object → proper French)', () => {
    expect(matchLine(c, "You can't see any brass lantern here!")).toBe(
      'Vous ne voyez pas de lampe en laiton ici !',
    )
  })
  it('{raw} captures verbatim when no object resolves — quoted-unknown-word lines are HITS', () => {
    expect(matchLine(c, "You can't see any frobnitz here!")).toBe(
      'Vous ne voyez pas de frobnitz ici !',
    )
    expect(matchLine(c, 'I don\'t know the word "xyzzy".')).toBe(
      'Je ne connais pas le mot "xyzzy".',
    )
  })
  it('specificity: more literal characters win over looser patterns', () => {
    // "The {obj} contains:" must not be shadowed by anything looser; and a
    // longer-literal template wins regardless of authoring order.
    expect(matchLine(c, 'The glass bottle contains:')).toBe(
      'La bouteille en verre contient :',
    )
  })
})

describe('matchLine: builtin listing template (spec §5)', () => {
  it('"A {obj}" → capitalized indef (inventory/contents listings)', () => {
    expect(matchLine(c, 'A glass bottle')).toBe('Une bouteille en verre')
  })
  it('listing miss for an unknown object', () => {
    expect(matchLine(c, 'A chartreuse zeppelin')).toBeNull()
  })
})

describe('open form keys contract (spec §4, §7.1 — fake declined language)', () => {
  it('templates resolve arbitrary form-key names; nothing hard-codes French', () => {
    const fake: TranslationCorpus = {
      strings: {},
      objects: { sword: { nomIndef: 'ein Schwert', datDef: 'dem Schwert' } },
      templates: [
        { en: 'There is a {obj} here.', out: 'Hier ist {obj.nomIndef}.' },
        {
          en: 'You swing at the {obj}.',
          out: 'Du schlägst nach {obj.datDef}.',
        },
      ],
    }
    const fc = compileCorpus(fake)
    expect(matchLine(fc, 'There is a sword here.')).toBe(
      'Hier ist ein Schwert.',
    )
    expect(matchLine(fc, 'You swing at the sword.')).toBe(
      'Du schlägst nach dem Schwert.',
    )
  })
})
