import { describe, it, expect } from 'vitest'
import { compileCorpus, matchLine } from './match'
import { ZORK1_FR } from './corpus/zork1.fr'
import { ZORK1_DE } from './corpus/zork1.de'
import { ZORK1_ES } from './corpus/zork1.es'
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

describe('matchLine: cap leaves unicameral Georgian (Mkhedruli) unchanged', () => {
  // Georgian Mkhedruli (U+10D0–U+10FF) is unicameral in practice, but Unicode
  // 11.0 added a Mtavruli uppercase mapping (U+1C90–U+1CBF), so 'მ'.toUpperCase()
  // → 'Მ'. The BUILTIN cap:true listing templates ('A {obj}' → '{obj.indef}')
  // must NOT apply it — every inventory/contents line would otherwise render a
  // jarring titlecase-script initial. Mkhedruli must round-trip unchanged.
  const ka = compileCorpus({
    strings: {},
    objects: { sword: { indef: 'მახვილი' } },
    templates: [],
  })
  it('"A {obj}" → indef with its Mkhedruli initial unchanged (no Mtavruli)', () => {
    const out = matchLine(ka, 'A sword')
    expect(out).toBe('მახვილი')
    // Belt-and-braces: assert no Mtavruli (U+1C90–U+1CBF) char leaked in.
    expect(out).not.toBeNull()
    expect([...out!].some(ch => /\p{Script=Georgian}/u.test(ch))).toBe(true)
    expect(
      [...out!].some(
        ch => ch.codePointAt(0)! >= 0x1c90 && ch.codePointAt(0)! <= 0x1cbf,
      ),
    ).toBe(false)
  })
})

describe('matchLine: cap is code-point safe (review S3)', () => {
  // An astral-plane initial letter (Deseret 𐐨 → 𐐀) must not be split by charAt:
  // capitalize the whole code point. Latent for es/fr (BMP-only) but pins the fix.
  const astral = compileCorpus({
    strings: {},
    objects: { widget: { def: '𐐨deseret' } },
    templates: [
      { en: 'The {obj} contains:', out: '{obj.def} y más', cap: true },
    ],
  })
  it('capitalizes an astral-plane initial letter without splitting the surrogate', () => {
    expect(matchLine(astral, 'The widget contains:')).toBe('𐐀deseret y más')
  })
})

describe('compileCorpus: repeated-slot contract (review S9)', () => {
  // The "each slot name appears AT MOST ONCE" rule (types.ts) was documented but
  // unenforced: a repeated {obj}/{raw} compiled to duplicate named groups and
  // new RegExp threw an opaque "Duplicate capture group name". Detect it in
  // compile and throw an actionable, template-naming error instead.
  const corpusWith = (en: string): TranslationCorpus => ({
    strings: {},
    objects: {},
    templates: [{ en, out: '{raw}' }],
  })
  it('throws a named error on a repeated {obj} slot', () => {
    expect(() => compileCorpus(corpusWith('{obj} and {obj}'))).toThrow(
      /repeated slot \{obj\}/i,
    )
  })
  it('throws a named error on a repeated {raw} slot', () => {
    expect(() => compileCorpus(corpusWith('{raw} then {raw}'))).toThrow(
      /repeated slot \{raw\}/i,
    )
  })
  it('still allows distinct {obj} and {obj2} in one template', () => {
    expect(() => compileCorpus(corpusWith('{obj} and {obj2}'))).not.toThrow()
  })
  it('resolves up to four distinct object slots (3+/4-candidate disambiguation)', () => {
    // WHICH-PRINT renders "the A, the B, the C, or the D?" for 4 candidates
    // (the 4 dam buttons), so the matcher must carry obj/obj2/obj3/obj4.
    const c4 = compileCorpus({
      strings: {},
      objects: {
        'glass bottle': { indef: 'une bouteille' },
        'brass lantern': { indef: 'une lampe' },
        lunch: { indef: 'un casse-croûte' },
        garlic: { indef: 'une gousse d’ail' },
      },
      templates: [
        {
          en: 'the {obj}, the {obj2}, the {obj3}, or the {obj4}?',
          out: '{obj.indef}, {obj2.indef}, {obj3.indef} ou {obj4.indef} ?',
        },
      ],
    })
    expect(
      matchLine(
        c4,
        'the glass bottle, the brass lantern, the lunch, or the garlic?',
      ),
    ).toBe('une bouteille, une lampe, un casse-croûte ou une gousse d’ail ?')
  })
})

describe('compileCorpus: out-side token contract (review I2)', () => {
  // OUT_REF only consumes {obj[234]?.key}, {num2?}, {raw}. An UNHANDLED token on
  // the `out` side — a {verb} (newly a valid en-side slot, but match-only — never
  // rendered), a bare {obj} (missing .key), or a typo {foo} — was invisible to
  // .replace(): it passed through VERBATIM into displayed output AND the template
  // still counted as a successful match, suppressing the LLM fallback (and ka has
  // none). One mistyped out token would ship an undetected literal-brace English
  // leak. Catch it at compile time with a named, actionable error.
  const out = (s: string): TranslationCorpus => ({
    strings: {},
    objects: { foo: { indef: 'le foo' } },
    templates: [{ en: 'x {raw}', out: s }],
  })
  it('throws on a match-only {verb} reaching the out side', () => {
    expect(() => compileCorpus(out('fais {verb} ça'))).toThrow(/\{verb\}/)
  })
  it('throws on a bare {obj} (missing .form) on the out side', () => {
    expect(() => compileCorpus(out('{obj} ici'))).toThrow(/\{obj\}/)
  })
  it('throws on a typo token on the out side', () => {
    expect(() => compileCorpus(out('{objj.indef} ici'))).toThrow(/out/i)
  })
  it('accepts the legitimate out tokens ({obj.key}/{num}/{raw})', () => {
    expect(() =>
      compileCorpus({
        strings: {},
        objects: { foo: { indef: 'le foo' } },
        templates: [
          { en: 'a {obj} {num} {raw}', out: '{obj.indef} {num} {raw}' },
        ],
      }),
    ).not.toThrow()
  })
})

describe('matchLine: glued input-prompt residue (UAT-4)', () => {
  // A CR-less question merges with the '>' line-input prompt into ONE
  // BufferLine ("… (Y is affirmative): >"). The residue is chrome, not
  // identity: strip it for lookup, re-append it verbatim to the hit.
  it('an exact pin still hits when the prompt is glued on, and keeps the residue', () => {
    expect(matchLine(c, 'Taken. >')).toBe('Pris. >')
  })
  it('a template still hits through the residue', () => {
    expect(matchLine(c, 'There is a glass bottle here. >')).toBe(
      'Il y a une bouteille en verre ici. >',
    )
  })
  it('a miss stays a miss with the residue attached', () => {
    expect(matchLine(c, 'Some line nobody wrote. >')).toBeNull()
  })
})

describe('real Zork I French corpus smoke (Task 15)', () => {
  const real = compileCorpus(ZORK1_FR)
  it('quoted-unknown-word parser reply composes', () => {
    expect(matchLine(real, 'I don\'t know the word "xyzzy".')).toBe(
      'Je ne connais pas le mot « xyzzy ».',
    )
  })
  it('quoted misused-word parser reply composes', () => {
    expect(
      matchLine(
        real,
        'You used the word "and" in a way that I don\'t understand.',
      ),
    ).toBe(
      "Vous avez employé le mot « and » d'une manière que je ne comprends pas.",
    )
  })
  it('cannot-see-object reply resolves a known object', () => {
    expect(matchLine(real, "You can't see any brass lantern here!")).toBe(
      'Vous ne voyez la lampe en laiton nulle part !',
    )
  })
  it('cannot-see reply DROPS the typed token instead of echoing English ({raw})', () => {
    // Zork emits this only for a dictionary noun with no in-scope object, so the
    // token is always English (an input synonym that missed the display-name
    // {obj} keys). The template pre-empts the LLM, so echoing would leak English
    // in every mode — drop it for a generic French line.
    expect(matchLine(real, "You can't see any frobnitz here!")).toBe(
      'Vous ne voyez rien de tel ici !',
    )
  })
  it('presence line composes with the indefinite form', () => {
    expect(matchLine(real, 'There is a small mailbox here.')).toBe(
      'Il y a une petite boîte aux lettres ici.',
    )
  })
  it('listing light suffix beats the builtin bare listing', () => {
    expect(matchLine(real, 'A torch (providing light)')).toBe(
      'Une torche (allumée)',
    )
  })
  it('real walkthrough score line composes both numbers', () => {
    expect(
      matchLine(real, 'Your score is 350 (total of 350 points), in 365 moves.'),
    ).toBe('Votre score est de 350 (sur un total de 350 points), en 365 tours.')
  })
  it('the restart Y-prompt hits through its glued input prompt (UAT-4)', () => {
    expect(
      matchLine(real, 'Do you wish to restart? (Y is affirmative): >'),
    ).toBe('Voulez-vous recommencer ? (O pour oui) : >')
  })
  it('implicit-take parenthetical is pinned (UAT-4: "read leaflet" while not holding it)', () => {
    expect(matchLine(real, '(Taken)')).toBe('(Pris)')
  })
  it('implicit-noun parenthetical composes for any object (UAT-4: bare "take" → "(sword)")', () => {
    expect(matchLine(real, '(sword)')).toBe("(l'épée)")
  })
  it('implicit-tool parenthetical composes ("(with the shovel)" — GWIM)', () => {
    expect(matchLine(real, '(with the shovel)')).toBe('(avec la pelle)')
  })
  it('multi-object command prefix line composes ({obj}: Dropped.)', () => {
    expect(matchLine(real, 'brass lantern: Dropped.')).toBe(
      'Vous posez la lampe en laiton.',
    )
  })
  it('contents header composes agreement-free («il y a» dodges contient/contiennent)', () => {
    expect(matchLine(real, 'The magic boat contains:')).toBe(
      'Dans le bateau magique, il y a :',
    )
  })
  it('examine default composes agreement-free for a PLURAL object', () => {
    expect(
      matchLine(real, "There's nothing special about the white cliffs."),
    ).toBe('Rien de particulier concernant les falaises blanches.')
  })
  it('is-empty composes agreement-free for a PLURAL object («est vide» would be wrong)', () => {
    expect(matchLine(real, 'The matchbook is empty.')).toBe(
      "Il n'y a rien dans les allumettes.",
    )
  })
  it('thief-death treasure listing with contents composes both objects', () => {
    expect(
      matchLine(real, 'A jewel-encrusted egg, with a golden clockwork canary'),
    ).toBe('Un œuf incrusté de joyaux, avec un canari mécanique doré')
  })

  it('wandering-thief rob message translates (UAT S4 — assembled-fragment leak)', () => {
    // 1actions.zil:1814 ROBBER-FUNCTION: assembled from 3 TELL pieces, so the
    // full sentence is neither a full-line z-string (inventory gate) nor on the
    // golden path (coverage gate) — it leaked English in UAT S4. Pin BOTH
    // ROBBED? branches (the player vs. the room).
    expect(
      matchLine(
        real,
        'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from your possession, mumbling something about "Doing unto others before..."',
      ),
    ).toBe(
      "Un individu à l'air louche, tenant un grand sac, vient de traverser la salle. Au passage, il vous a discrètement subtilisé quelques objets de valeur, marmonnant quelque chose à propos de « faire aux autres avant... ».",
    )
    expect(
      matchLine(
        real,
        'A seedy-looking individual with a large bag just wandered through the room. On the way through, he quietly abstracted some valuables from the room, mumbling something about "Doing unto others before..."',
      ),
    ).toBe(
      "Un individu à l'air louche, tenant un grand sac, vient de traverser la salle. Au passage, il a discrètement subtilisé quelques objets de valeur qui s'y trouvaient, marmonnant quelque chose à propos de « faire aux autres avant... ».",
    )
  })

  // ── Composed melee/diagnose/state shapes (review fix) — each EN side is
  //    byte-exact against the ZIL composition it pins down. ────────────────
  it('villain-disarm composes the player weapon agreement-free («votre arme» dodges it/Elle)', () => {
    // 1actions.zil TROLL-MELEE LOSE-WEAPON row.
    expect(
      matchLine(
        real,
        'The axe knocks your sword out of your hand. It falls to the floor.',
      ),
    ).toBe(
      'La hache fait sauter votre épée de votre main. Votre arme tombe au sol.',
    )
  })
  it('hero-melee knockout composes for any villain (masculine set: troll/voleur)', () => {
    // 1actions.zil HERO-MELEE UNCONSCIOUS row, "The " F-DEF " is knocked out!".
    expect(matchLine(real, 'The thief is knocked out!')).toBe(
      'Le voleur est assommé !',
    )
  })
  it('HACK-HACK verb-gerund × HO-HUM suffix composes (gverbs.zil V-KICK)', () => {
    expect(matchLine(real, 'Kicking the brass lantern has no effect.')).toBe(
      "Donner des coups de pied dans la lampe en laiton n'a aucun effet.",
    )
  })
  it('V-DIAGNOSE wound line composes the {num} cure counter', () => {
    expect(
      matchLine(
        real,
        'You have a light wound, which will be cured after 28 moves.',
      ),
    ).toBe(
      'Vous avez une blessure légère, qui sera guérie au bout de 28 tours.',
    )
  })
  it('lamp state pin (examine composes "The lamp " + state)', () => {
    expect(matchLine(real, 'The lamp is turned off.')).toBe(
      'La lampe est éteinte.',
    )
  })
  it('throw-at-self death composes {obj} (gverbs.zil V-THROW + JIGS-UP)', () => {
    expect(
      matchLine(
        real,
        "A terrific throw! The nasty knife hits you squarely in the head. Normally, this wouldn't do much damage, but by incredible mischance, you fall over backwards trying to duck, and break your neck, justice being swift and merciful in the Great Underground Empire.",
      ),
    ).toBe(
      "Un lancer formidable ! Vous recevez le vilain couteau en pleine tête. Normalement, cela ne ferait pas grand mal, mais par une malchance incroyable, vous basculez en arrière en essayant d'esquiver et vous vous brisez la nuque, la justice étant prompte et clémente dans le Grand Empire Souterrain.",
    )
  })
  it('mid-word splice composes: "Your skillful {obj}smanship…" (gverbs.zil cut family)', () => {
    expect(
      matchLine(
        real,
        'Your skillful swordsmanship slices the painting into innumerable slivers which blow away.',
      ),
    ).toBe(
      "Vous maniez votre épée en virtuose, taillant le tableau en innombrables copeaux qui s'envolent.",
    )
  })
  it('remaining-weapon line composes (VILLAIN-BLOW after LOSE-WEAPON)', () => {
    expect(matchLine(real, 'Fortunately, you still have a nasty knife.')).toBe(
      'Heureusement, il vous reste un vilain couteau.',
    )
  })
  // UAT (Salle des poutres): `take all` leaked English on the per-object
  // failure line "broken timber: Your load is too heavy." — the success
  // analogs "{obj}: Taken." / "{obj}: Dropped." were templated but the
  // too-heavy failure reason was not, so the whole line missed and leaked.
  it('take-all per-object too-heavy failure composes {obj} (UAT — no English leak)', () => {
    expect(matchLine(real, 'broken timber: Your load is too heavy.')).toBe(
      'poutre brisée : Votre chargement est trop lourd.',
    )
  })
  it('take-all too-heavy failure, wounded-condition variant composes {obj}', () => {
    expect(
      matchLine(
        real,
        'broken timber: Your load is too heavy, especially in light of your condition.',
      ),
    ).toBe(
      'poutre brisée : Votre chargement est trop lourd, surtout vu votre état.',
    )
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

describe('{verb} match-only slot', () => {
  const mkCorpus = (
    templates: TranslationCorpus['templates'],
  ): TranslationCorpus => ({
    strings: {},
    objects: {},
    templates,
  })

  it('matches a verb wildcard and coexists with {raw}; {verb} is dropped from out', () => {
    const c = compileCorpus(
      mkCorpus([
        { en: 'What do you want to {verb} the {raw} with?', out: 'N={raw}' },
      ]),
    )
    // {verb} is consumed by the regex (so the line resolves) but not rendered.
    expect(matchLine(c, 'What do you want to attack the troll with?')).toBe(
      'N=troll',
    )
  })

  it('keeps a MULTI-WORD {raw} anchored by the literal prep', () => {
    const c = compileCorpus(
      mkCorpus([
        { en: 'What do you want to {verb} the {raw} with?', out: 'N={raw}' },
      ]),
    )
    // The hazard the literal prep prevents: raw must be "brass lantern", not "brass".
    expect(
      matchLine(c, 'What do you want to attack the brass lantern with?'),
    ).toBe('N=brass lantern')
  })

  it('renders a fixed, verb-less out for the no-noun orphan', () => {
    const c = compileCorpus(
      mkCorpus([{ en: 'What do you want to {verb}?', out: 'FIXED' }]),
    )
    expect(matchLine(c, 'What do you want to take?')).toBe('FIXED')
  })

  it('still throws on a duplicated slot (rule preserved)', () => {
    expect(() =>
      compileCorpus(mkCorpus([{ en: '{verb} and {verb}', out: 'x' }])),
    ).toThrow(/repeated slot/)
  })
})

// UAT run 3 (ka) found "You can't see any lamp here!" echoing the English token
// "lamp" inside a Georgian frame — a SILENT leak (loquorMisses doesn't catch a
// {raw} corpus template). The fix (drop the token) is cross-language: every
// corpus' {raw} not-found fallback pre-empts the LLM, so echoing leaks English in
// EVERY mode. "lamp" is an INPUT synonym (→ brass lantern), so it never matches
// the display-name {obj} keys and always lands on this fallback.
describe('not-found message drops the English token in every language', () => {
  // ka is asserted in zork1.ka.uat.test.ts (no-Latin check); fr above. Pin de/es.
  for (const [lang, corpus] of [
    ['de', ZORK1_DE],
    ['es', ZORK1_ES],
  ] as const) {
    it(`${lang}: "You can't see any lamp here!" never echoes "lamp"`, () => {
      const out = matchLine(
        compileCorpus(corpus),
        "You can't see any lamp here!",
      )
      expect(out).not.toBeNull()
      expect(out).not.toContain('lamp')
    })
  }
})
