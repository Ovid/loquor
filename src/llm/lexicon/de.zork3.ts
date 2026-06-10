// src/llm/lexicon/de.zork3.ts
// German → Zork III noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork3.vocab.ts); VALUES are folded German words/phrases
// (Tür → tur, Brüstung → brustung, weiß → weiss).
// Validated by lexicon/validate.test.ts (key validity, fold idempotence,
// collision gate, FULL coverage). Entries follow the vocab's canonical order.
// Where German genuinely merges objects (tur, paneel, wand, stange…)
// the same word appears under several canonicals — ambiguity is first-class.
// Compounds AND their bare heads both appear where players type either
// (kompassnadel/nadel, geheimtur/tur).
import type { NounLexicon } from './types'

export const DE_ZORK3: NounLexicon = {
  'black panel': ['schwarzes paneel', 'paneel'],
  'blast of air': ['luft', 'luftstoss', 'atem'],
  blessings: ['segen', 'segnungen'],
  'broken lantern': ['kaputte lampe', 'kaputte laterne'],
  'bronze door': ['bronzetur', 'tur'],
  'cell door': ['zellentur', 'tur'],
  chasm: ['abgrund', 'kluft', 'schlucht'],
  'compass arrow': ['nadel', 'kompassnadel', 'pfeil'],
  'compass rose': ['kompassrose', 'windrose'],
  'dungeon master': ['kerkermeister'],
  'dust and debris': ['staub', 'schutt', 'trummer'],
  'eastern wall': ['ostwand', 'wand'],
  'flaming pit': ['feuergrube', 'grube', 'flammen'],
  ground: ['boden', 'erde'],
  'guardians of zork': ['wachter', 'statuen', 'statue'],
  hole: ['loch'],
  ladder: ['leiter'],
  lamp: ['lampe', 'laterne'],
  'large button': ['grosser knopf', 'knopf'],
  // 'stange' is deliberately shared with 'short pole' and 't-bar'.
  'long pole': ['stange', 'lange stange'],
  'lurking grue': ['grue'], // untranslatable proper noun — kept as-is by policy
  'mahogany panel': ['mahagonipaneel', 'paneel'],
  mirror: ['spiegel'],
  'northern wall': ['nordwand', 'wand'],
  'old man': ['alter mann', 'greis'],
  'pair of hands': ['hande', 'hand'],
  panel: ['paneel', 'platte'],
  parapet: ['brustung', 'brustwehr'],
  passage: ['pfad', 'weg'], // the forest trail (cf. 'tunnel')
  'pine panel': ['kiefernpaneel', 'paneel'],
  'quantity of water': ['wasser'],
  'red beam of light': ['strahl', 'lichtstrahl', 'roter strahl'],
  'red button': ['roter knopf', 'knopf'],
  'red panel': ['rotes paneel', 'paneel'],
  rubble: ['geroll', 'schutt', 'felsen'],
  runes: ['runen'],
  sailor: ['seemann', 'matrose'],
  'secret door': ['geheimtur', 'tur'],
  'short pole': ['kurze stange', 'stange'],
  'small slot': ['schlitz', 'kleiner schlitz'],
  'southern wall': ['sudwand', 'wand'],
  stairs: ['treppe', 'stufen'],
  'steel door': ['stahltur', 'tur'],
  'stone channel': ['rinne', 'kanal', 'steinrinne'],
  sundial: ['sonnenuhr'],
  sword: ['schwert'],
  't-bar': ['t stange', 'stange'],
  tunnel: ['tunnel', 'gang', 'stollen'], // the dark smoky passage
  'very ancient book': ['buch', 'altes buch'],
  'warning note': ['warnung', 'notiz', 'zettel'],
  water: ['wasser'],
  'western wall': ['westwand', 'wand'],
  'white panel': ['weisses paneel', 'paneel'],
  'wooden bar': ['holzstange', 'stange', 'balken'],
  'wooden door': ['holztur', 'tur'],
  'wooden wall': ['holzwand', 'wand'],
  'yellow panel': ['gelbes paneel', 'paneel'],
  zorkmid: ['zorkmid'], // untranslatable currency proper noun
}
