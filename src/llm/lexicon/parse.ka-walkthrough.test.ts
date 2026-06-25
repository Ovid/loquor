// src/llm/lexicon/parse.ka-walkthrough.test.ts
// Georgian walkthrough-parse gate (spec §6): a Georgian fixture maps EVERY
// non-movement Zork I winning command to its Georgian typed form; each must
// resolve via the DETERMINISTIC (grammar-only, no-LLM) path to a canonical the
// Z-parser accepts. ZERO gaps, ZERO misses. This is the forcing function that
// keeps Zork I fully winnable in Georgian — ka has NO LLM net, so every command
// MUST land on a deterministic path or the player is stuck.
//
// Pure movement is owned by directions.ts (gated in directions.test.ts), so it is
// elided here (parseDirection === null filter), mirroring walkthrough-coverage.
//
// The resolver mirrors the ka DETERMINISTIC front-door of translatePipeline
// (runClause stages 3,4,6) exactly — meta-alias → grammar lexicon → English-ASCII
// vocab passthrough (the §5.5 abstain raw-send) — because that is the chain a
// Georgian player's input actually traverses with NO model. (Stage 5, the
// direction fast-path, is the movement that this gate elides.) A few commands
// resolve OFF the lexicon by design and are noted at their fixture entries:
//   - 'inventory'  → metaAlias (ინვენტარი → inventory)
//   - 'echo'/'ulysses' → magic words / proper nouns: language-independent WORDPLAY,
//     raw-sent verbatim via vocab passthrough (a Georgian player types them too).
//   - bare 'dig'/'sand' → NON-solving exploratory transcript keystrokes (the real
//     solving command is 'dig sand' = 'თხარე ქვიშა', fully Georgian); the bare
//     forms have no 0-arity grammar emit, so they take the §5.5 English-ASCII
//     raw-send (consistent with the ka abstain contract). ← review: see report.
//
// FIXTURE is NATIVE-REVIEW-DRAFT (model-seeded): internal consistency (gate green)
// is the bar, not idiomatic perfection — doubts are logged as `← review:`.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parseLexicon } from './parse'
import { parseDirection } from '../directions'
import { metaAlias, isVocabPassthrough } from '../inputTranslate'
import { KA_CORE } from './ka.core'
import { KA_ZORK1 } from './ka.zork1'
import { ZORK1_VOCAB } from '../grammar/zork1.vocab'
import type { Scene } from '../scene/types'

const scene: Scene = { inScope: [], antecedent: null }

/** The ka deterministic resolution chain (no LLM), mirroring translatePipeline's
 * runClause for a Georgian Zork I picker: meta-alias, then the grammar lexicon,
 * then the §5.5 English-ASCII vocab-passthrough abstain. (runClause runs the
 * passthrough BEFORE the lexicon; reordering it after is inert here because
 * Georgian script never appears in the English vocab set, so the only inputs that
 * reach the passthrough are pure-English ones the lexicon already missed.) Returns
 * the canonical the pipeline would SEND, or null on a deterministic miss (which,
 * live, would abstain with no English to send). */
function resolveKa(input: string): string | null {
  const stripped = input.replace(/[!.?,;:]+$/, '').trim()
  const alias = metaAlias(stripped, KA_CORE)
  if (alias) return alias
  const r = parseLexicon(input, KA_CORE, KA_ZORK1, ZORK1_VOCAB, scene)
  if (r.kind === 'command') return r.text
  // §5.5 abstain: a clause made entirely of words the Z-parser knows (and none of
  // them an active-ka-lexicon word — Georgian script never collides) raw-sends
  // verbatim. ka passes null for activeLexiconWords here: the only inputs that
  // reach this branch are pure-English magic words / proper nouns / bare meta.
  if (isVocabPassthrough(stripped, ZORK1_VOCAB, null))
    return stripped.toLowerCase()
  return null
}

// English winning commands, parsed from the clean ">..." walkthrough, with pure
// movement elided (directions.ts owns it). Same extraction as
// walkthrough-coverage.test.ts.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
function zork1Commands(): string[] {
  const txt = readFileSync(
    resolve(repoRoot, 'docs/walkthrough-zork-i.txt'),
    'utf8',
  )
  const cmds = txt
    .split('\n')
    .filter(l => l.startsWith('>'))
    .map(l => l.slice(1).trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(cmds)].filter(
    c => parseDirection(c, ZORK1_VOCAB.movement) === null,
  )
}

// FIXTURE (NATIVE-REVIEW-DRAFT): english winning command → { ka, expect }.
// `ka` is the Georgian a player types; `expect` is the canonical the ka
// deterministic chain produces — a Z-parser-accepted command (an emit form, e.g.
// 'lamp' → 'light', 'leaflet' → 'advertisement', 'trap door' → 'trapdoor', cross-
// checked against grammar/zork1.vocab.ts).
const FIXTURE: Record<string, { ka: string; expect: string }> = {
  // West of House / house entry
  'open mailbox': { ka: 'გააღე ყუთი', expect: 'open mailbox' },
  'read leaflet': { ka: 'წაიკითხე ფურცელი', expect: 'read advertisement' },
  'drop leaflet': { ka: 'დადე ფურცელი', expect: 'drop advertisement' },
  'open window': { ka: 'გააღე ფანჯარა', expect: 'open window' },
  'enter house': { ka: 'შედი სახლი', expect: 'enter house' },
  // Living room
  // 'ფარან' is shared by brass / broken / burned-out lantern → shared dictionary
  // word 'lamp' (the parser picks the lit brass lantern by scope at runtime).
  'take lamp': { ka: 'აიღე ფარანი', expect: 'take lamp' },
  'move rug': { ka: 'გადააადგილე ხალიჩა', expect: 'move rug' },
  'open trap door': { ka: 'გააღე ხაფანგი', expect: 'open trapdoor' },
  'turn on lamp': { ka: 'ჩართე ფარანი', expect: 'turn on lamp' },
  // Gallery / Studio / Attic
  'take painting': { ka: 'აიღე ნახატი', expect: 'take painting' },
  'go up chimney': { ka: 'აძვერი საკვამური', expect: 'climb chimney' }, // ← review: ascend the chimney
  // 'დანა' is shared by nasty + rusty knife → ambiguity resolves to the shared
  // Z-parser dictionary word 'knife' (the parser disambiguates by scope at runtime).
  'take knife': { ka: 'აიღე დანა', expect: 'take knife' },
  'take rope': { ka: 'აიღე თოკი', expect: 'take rope' },
  // Trophy case + troll
  'open case': { ka: 'გააღე ვიტრინა', expect: 'open case' },
  'put painting inside case': {
    ka: 'ჩადე ნახატი ვიტრინაში',
    expect: 'put painting in case',
  },
  'drop knife': { ka: 'დადე დანა', expect: 'drop knife' }, // shared 'knife' (see take knife)
  'take sword': { ka: 'აიღე მახვილი', expect: 'take sword' },
  'kill troll with sword': {
    ka: 'მოკალი ტროლი მახვილით',
    expect: 'kill troll with sword',
  },
  'drop sword': { ka: 'დადე მახვილი', expect: 'drop sword' },
  // Cellar → up a tree → loud room (treasure run)
  'tie rope to railing': {
    ka: 'მიაბი თოკი მოაჯირს',
    expect: 'tie rope to railing',
  },
  'take coffin': { ka: 'აიღე კუბო', expect: 'take coffin' },
  pray: { ka: 'ილოცე', expect: 'pray' },
  'turn off lamp': { ka: 'გამორთე ფარანი', expect: 'turn off lamp' },
  'drop coffin': { ka: 'დადე კუბო', expect: 'drop coffin' },
  'open coffin': { ka: 'გააღე კუბო', expect: 'open coffin' },
  'take sceptre': { ka: 'აიღე სკიპტრა', expect: 'take sceptre' },
  'wave sceptre': { ka: 'დაიქნიე სკიპტრა', expect: 'wave sceptre' },
  'take gold': { ka: 'აიღე ოქრო', expect: 'take pot' }, // pot of gold → emit 'pot'
  // 'ტომარა' is shared by large bag + brown sack → shared dictionary word 'bag'.
  'open bag': { ka: 'გააღე ტომარა', expect: 'open bag' },
  'take garlic': { ka: 'აიღე ნიორი', expect: 'take garlic' },
  'put coffin in case': {
    ka: 'ჩადე კუბო ვიტრინაში',
    expect: 'put coffin in case',
  },
  'put gold in case': {
    ka: 'ჩადე ოქრო ვიტრინაში',
    expect: 'put pot in case',
  },
  'put sceptre in case': {
    ka: 'ჩადე სკიპტრა ვიტრინაში',
    expect: 'put sceptre in case',
  },
  // Dam / maintenance room
  'take matches': { ka: 'აიღე ასანთი', expect: 'take match' },
  'take wrench': { ka: 'აიღე ქანჩის გასაღები', expect: 'take wrench' },
  'take screwdriver': { ka: 'აიღე სახრახნისი', expect: 'take screwdriver' },
  'push yellow button': {
    ka: 'დააჭირე ყვითელი ღილაკი',
    expect: 'push yellow button',
  },
  'turn bolt with wrench': {
    ka: 'მოატრიალე ხრახნი ქანჩის გასაღებით',
    expect: 'turn bolt with wrench',
  },
  'drop wrench': { ka: 'დადე ქანჩის გასაღები', expect: 'drop wrench' },
  // Temple / candles / book / bell
  'take torch': { ka: 'აიღე ჩირაღდანი', expect: 'take torch' },
  'take bell': { ka: 'აიღე ზარი', expect: 'take bell' },
  'take candles': { ka: 'აიღე სანთელი', expect: 'take candles' },
  'take book': { ka: 'აიღე წიგნი', expect: 'take page' }, // black book → emit 'page'
  'ring bell': { ka: 'დარეკე ზარი', expect: 'ring bell' },
  'light match': { ka: 'აანთე ასანთი', expect: 'light match' },
  'light candles with match': {
    ka: 'აანთე სანთელი ასანთით',
    expect: 'light candles with match',
  },
  'read book': { ka: 'წაიკითხე წიგნი', expect: 'read page' },
  'drop book': { ka: 'დადე წიგნი', expect: 'drop page' },
  'take skull': { ka: 'აიღე ქალა', expect: 'take skull' },
  'rub mirror': { ka: 'მოისვი სარკე', expect: 'rub reflection' }, // mirror → emit 'reflection'
  // inventory: a metaAlias, resolved BEFORE the lexicon (ინვენტარი → inventory).
  inventory: { ka: 'ინვენტარი', expect: 'inventory' },
  // Coal mine / machine / basket (basket emit is 'cage'; machine emit is 'machine')
  'put torch in basket': {
    ka: 'ჩადე ჩირაღდანი კალათაში',
    expect: 'put torch in cage',
  },
  'put screwdriver in basket': {
    ka: 'ჩადე სახრახნისი კალათაში',
    expect: 'put screwdriver in cage',
  },
  'take coal': { ka: 'აიღე ნახშირი', expect: 'take coal' },
  'put coal in basket': {
    ka: 'ჩადე ნახშირი კალათაში',
    expect: 'put coal in cage',
  },
  'lower basket': { ka: 'ჩაუშვი კალათა', expect: 'lower cage' },
  // 'drop all': the bare quantifier ('ყველა', vowel-final so the -ი strip is a
  // no-op; 'ყველაფერი' would strip to 'ყველაფერ' and miss the quantifier set).
  'drop all': { ka: 'დადე ყველა', expect: 'drop all' },
  'open lid': { ka: 'გააღე მანქანა', expect: 'open machine' }, // lid is a machine synonym → 'machine'
  'put coal in machine': {
    ka: 'ჩადე ნახშირი მანქანაში',
    expect: 'put coal in machine',
  },
  'close lid': { ka: 'დახურე მანქანა', expect: 'close machine' },
  'turn switch with screwdriver': {
    ka: 'მოატრიალე ჩამრთველი სახრახნისით',
    expect: 'turn switch with screwdriver',
  },
  'drop screwdriver': { ka: 'დადე სახრახნისი', expect: 'drop screwdriver' },
  'take diamond': { ka: 'აიღე ბრილიანტი', expect: 'take diamond' },
  'put diamond in basket': {
    ka: 'ჩადე ბრილიანტი კალათაში',
    expect: 'put diamond in cage',
  },
  'take bracelet': { ka: 'აიღე სამაჯური', expect: 'take bracelet' },
  'raise basket': { ka: 'ასწიე კალათა', expect: 'raise cage' },
  // look in basket: 'ჩახედე' = the 'look in' verb phrase; object is bare cage.
  'look in basket': { ka: 'ჩახედე კალათა', expect: 'look in cage' },
  'take jade': { ka: 'აიღე ნეფრიტი', expect: 'take figurine' }, // jade figurine → emit 'figurine'
  'put jade in case': {
    ka: 'ჩადე ნეფრიტი ვიტრინაში',
    expect: 'put figurine in case',
  },
  'put diamond in case': {
    ka: 'ჩადე ბრილიანტი ვიტრინაში',
    expect: 'put diamond in case',
  },
  'take trunk': { ka: 'აიღე ზანდუკი', expect: 'take trunk' },
  // Reservoir / pump / boat
  'take pump': { ka: 'აიღე ტუმბო', expect: 'take pump' },
  'take trident': { ka: 'აიღე სამკაპა', expect: 'take trident' },
  'drop torch': { ka: 'დადე ჩირაღდანი', expect: 'drop torch' },
  // pump is vowel-final; the SPLIT-SAFE instrumental 'ტუმბოით' → [ით, ტუმბო].
  'inflate plastic with pump': {
    ka: 'გაბერე პლასტმასი ტუმბოით',
    expect: 'inflate valve with pump',
  }, // plastic → emit 'valve'
  'drop pump': { ka: 'დადე ტუმბო', expect: 'drop pump' },
  'go inside boat': { ka: 'ჩაჯექი ნავი', expect: 'board boat' }, // board the boat → 'board boat'
  launch: { ka: 'გაუშვი', expect: 'launch' },
  wait: { ka: 'დაიცადე', expect: 'wait' },
  'take buoy': { ka: 'აიღე ბაკანი', expect: 'take buoy' },
  'leave boat': { ka: 'გადი ნავი', expect: 'exit boat' }, // V-EXIT ≡ V-LEAVE disembark
  // Sandy beach / scarab
  'take shovel': { ka: 'აიღე ნიჩაბი', expect: 'take shovel' },
  'drop garlic': { ka: 'დადე ნიორი', expect: 'drop garlic' },
  'drop buoy': { ka: 'დადე ბაკანი', expect: 'drop buoy' },
  // bare 'dig'/'sand' are NON-solving exploratory keystrokes (the solving command
  // is 'dig sand'); they have no 0-arity grammar emit, so they take the §5.5
  // English-ASCII raw-send. ← review (see report): forced-English here is benign
  // because the Georgian SOLVING form 'თხარე ქვიშა' exists and these do nothing.
  dig: { ka: 'dig', expect: 'dig' },
  sand: { ka: 'sand', expect: 'sand' },
  'dig sand': { ka: 'თხარე ქვიშა', expect: 'dig sand' },
  'take scarab': { ka: 'აიღე სკარაბეუსი', expect: 'take scarab' },
  'drop shovel': { ka: 'დადე ნიჩაბი', expect: 'drop shovel' },
  'open buoy': { ka: 'გააღე ბაკანი', expect: 'open buoy' },
  'take emerald': { ka: 'აიღე ზურმუხტი', expect: 'take emerald' },
  // Aragain Falls / rainbow
  'cross rainbow': { ka: 'გადაკვეთე ცისარტყელა', expect: 'cross rainbow' },
  'put emerald in case': {
    ka: 'ჩადე ზურმუხტი ვიტრინაში',
    expect: 'put emerald in case',
  },
  'put scarab in case': {
    ka: 'ჩადე სკარაბეუსი ვიტრინაში',
    expect: 'put scarab in case',
  },
  'put trident in case': {
    ka: 'ჩადე სამკაპა ვიტრინაში',
    expect: 'put trident in case',
  },
  'put jewels in case': {
    ka: 'ჩადე ზანდუკი ვიტრინაში',
    expect: 'put trunk in case',
  }, // 'jewels' here is the trunk of jewels → emit 'trunk'
  // Tree / egg / thief
  'climb tree': { ka: 'აძვერი ხე', expect: 'climb tree' },
  'take egg': { ka: 'აიღე კვერცხი', expect: 'take egg' },
  // climb down: descend the tree he climbed ('climb down' verb phrase, verbs1).
  // Georgian prefers an explicit object (ხე = tree); bare 'climb down' also works live.
  'climb down': { ka: 'ჩამოძვერი ხე', expect: 'climb down tree' },
  'take coins': { ka: 'აიღე მონეტები', expect: 'take coins' },
  'take key': { ka: 'აიღე გასაღები', expect: 'take key' },
  // Ulysses: Cyclops magic name — language-independent WORDPLAY, raw-sent.
  ulysses: { ka: 'ulysses', expect: 'ulysses' },
  'give egg to thief': {
    ka: 'მიეცი კვერცხი ქურდს',
    expect: 'give egg to thief',
  },
  'put coins in case': {
    ka: 'ჩადე მონეტები ვიტრინაში',
    expect: 'put coins in case',
  },
  // knife is vowel-final (დანა); its instrumental 'დანით' reduces to 'დან' (listed
  // as a knife residue synonym), which resolves to the nasty knife (emit 'nasty
  // knives'). The Z-parser orphan-prompts for ambiguity; either knife wins the kill.
  'kill thief with knife': {
    ka: 'მოკალი ქურდი დანით',
    expect: 'kill thief with nasty knives',
  },
  'take all': { ka: 'აიღე ყველა', expect: 'take all' },
  'drop stiletto': { ka: 'დადე სტილეტი', expect: 'drop stiletto' },
  'take chalice': { ka: 'აიღე თასი', expect: 'take chalice' },
  // unlock = open-with-key idiom ('გასაღებით გააღე' consumes verb + instrument).
  'unlock grate': { ka: 'გასაღებით გააღე ცხაური', expect: 'unlock grate' },
  'open grate': { ka: 'გააღე ცხაური', expect: 'open grate' },
  'wind up canary': { ka: 'დააქოქე კანარა', expect: 'wind up canary' },
  'take bauble': { ka: 'აიღე ბურთულა', expect: 'take bauble' },
  'put bauble in case': {
    ka: 'ჩადე ბურთულა ვიტრინაში',
    expect: 'put bauble in case',
  },
  'put chalice in case': {
    ka: 'ჩადე თასი ვიტრინაში',
    expect: 'put chalice in case',
  },
  // take canary from egg: ablative '-დან' splits ('კვერცხიდან' → [დან, კვერცხი]);
  // canary (golden/broken) and egg (jeweled/broken) are each ambiguous, resolving
  // to the shared dictionary words 'canary' / 'egg' (parser disambiguates by state).
  'take canary from egg': {
    ka: 'აიღე კანარა კვერცხიდან',
    expect: 'take canary from egg',
  },
  'put canary in case': {
    ka: 'ჩადე კანარა ვიტრინაში',
    expect: 'put canary in case',
  },
  'put egg in case': {
    ka: 'ჩადე კვერცხი ვიტრინაში',
    expect: 'put egg in case',
  },
  'put bracelet in case': {
    ka: 'ჩადე სამაჯური ვიტრინაში',
    expect: 'put bracelet in case',
  },
  'put skull in case': {
    ka: 'ჩადე ქალა ვიტრინაში',
    expect: 'put skull in case',
  },
  // echo: Loud Room magic word — like fr/de, ka does NOT idiom-map it (it would
  // poison the ka word set); the plain-ASCII 'echo' raw-sends via §5.5 passthrough.
  echo: { ka: 'echo', expect: 'echo' },
  'take bar': { ka: 'აიღე ზოდი', expect: 'take bar' },
  'put bar in case': {
    ka: 'ჩადე ზოდი ვიტრინაში',
    expect: 'put bar in case',
  },
}

describe('Georgian walkthrough-parse gate (spec §6)', () => {
  const commands = zork1Commands()

  it('every winning command has a Georgian fixture entry (zero gaps)', () => {
    const missing = commands.filter(c => !(c in FIXTURE))
    expect(missing).toEqual([])
  })

  it('the fixture has no entry that is not a winning command (no dead keys)', () => {
    const set = new Set(commands)
    const dead = Object.keys(FIXTURE).filter(k => !set.has(k))
    expect(dead).toEqual([])
  })

  it('every Georgian fixture form resolves (deterministically) to its expected canonical', () => {
    const failures: string[] = []
    for (const [en, { ka, expect: want }] of Object.entries(FIXTURE)) {
      const got = resolveKa(ka)
      if (got === null)
        failures.push(`${en}: "${ka}" → miss (deterministic abstain)`)
      else if (got !== want)
        failures.push(`${en}: "${ka}" → "${got}" (want "${want}")`)
    }
    expect(failures).toEqual([])
  })
})
