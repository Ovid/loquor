// src/llm/lexicon/es.zork3.ts
// Spanish → Zork III noun lexicon. KEYS are extracted-vocab canonicals
// (src/llm/grammar/zork3.vocab.ts); VALUES are folded Spanish words/phrases
// (pértiga → pertiga, túnel → tunel, pequeña → pequena).
// Validated by lexicon/validate.test.ts (key validity, fold idempotence,
// collision gate, FULL coverage). Entries follow the vocab's canonical order.
// Where Spanish genuinely merges objects (puerta, panel, pared, barra, palo,
// escalera…) the same word appears under several canonicals — ambiguity is
// first-class.
import type { NounLexicon } from './types'

export const ES_ZORK3: NounLexicon = {
  // ES panel = EN panel (its own canonical here) — same word, same objects;
  // reviewed collision. 'tablero' as the alternative.
  'black panel': ['panel negro', 'panel'],
  'blast of air': ['aire', 'soplo', 'pulmones'],
  blessings: ['bendiciones'],
  'broken lantern': ['lampara rota', 'linterna rota'],
  'bronze door': ['puerta de bronce', 'puerta'],
  'cell door': ['puerta de la celda', 'puerta'],
  chasm: ['abismo', 'sima'],
  'compass arrow': ['aguja', 'flecha', 'aguja de la brujula'],
  'compass rose': ['rosa de los vientos'],
  'dungeon master': ['amo del calabozo', 'maestro del calabozo'],
  'dust and debris': ['polvo', 'escombros'],
  'eastern wall': ['pared este', 'muro este', 'pared', 'muro'],
  'flaming pit': ['fosa en llamas', 'hoguera', 'fosa'],
  ground: ['suelo', 'tierra'],
  // NOT 'guardian' bare: EN vocab has 'guardian' for these very objects, but
  // singular ES 'guardian' would also be the folded guardián — keep the
  // plural + statue words instead (no exact-token overlap).
  'guardians of zork': ['guardianes', 'estatuas', 'estatua'],
  hole: ['agujero', 'hoyo'],
  // 'escalera' is deliberately shared with 'stairs' — Spanish uses the same
  // word for stairs and ladders; ambiguity is first-class.
  ladder: ['escalera', 'escalera de mano'],
  lamp: ['lampara', 'linterna'],
  'large button': ['boton grande', 'boton'],
  // 'pertiga'/'palo' are deliberately shared with 'short pole'.
  'long pole': ['pertiga', 'palo largo', 'palo'],
  'lurking grue': ['grue'], // untranslatable proper noun — kept as-is by policy
  'mahogany panel': ['panel de caoba', 'panel'],
  mirror: ['espejo'],
  'northern wall': ['pared norte', 'muro norte', 'pared', 'muro'],
  'old man': ['viejo', 'anciano'],
  'pair of hands': ['manos', 'mano'],
  panel: ['panel', 'tablero'],
  parapet: ['parapeto'],
  passage: ['sendero', 'camino'], // the forest trail (cf. 'tunnel')
  'pine panel': ['panel de pino', 'panel'],
  'quantity of water': ['agua'],
  'red beam of light': ['rayo', 'haz de luz', 'rayo rojo'],
  'red button': ['boton rojo', 'boton'],
  'red panel': ['panel rojo', 'panel'],
  rubble: ['escombros', 'rocas', 'piedras'],
  runes: ['runas'],
  sailor: ['marinero', 'marino'],
  'secret door': ['puerta secreta', 'puerta'],
  'short pole': ['pertiga corta', 'palo corto', 'pertiga', 'palo'],
  'small slot': ['ranura', 'ranura pequena'],
  'southern wall': ['pared sur', 'muro sur', 'pared', 'muro'],
  stairs: ['escaleras', 'escalera'],
  'steel door': ['puerta de acero', 'puerta'],
  'stone channel': ['canal', 'canal de piedra', 'acequia'],
  sundial: ['reloj de sol'],
  sword: ['espada'],
  't-bar': ['barra en t', 'barra'],
  tunnel: ['tunel', 'pasadizo', 'galeria'], // the dark smoky passage
  'very ancient book': ['libro', 'libro antiguo'],
  'warning note': ['nota', 'aviso'],
  water: ['agua'],
  'western wall': ['pared oeste', 'muro oeste', 'pared', 'muro'],
  'white panel': ['panel blanco', 'panel'],
  'wooden bar': ['barra de madera', 'barra', 'madero'],
  'wooden door': ['puerta de madera', 'puerta'],
  'wooden wall': ['pared de madera', 'pared', 'muro'],
  'yellow panel': ['panel amarillo', 'panel'],
  zorkmid: ['zorkmid'], // untranslatable currency proper noun
}
