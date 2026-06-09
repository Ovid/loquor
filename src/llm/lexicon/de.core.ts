// src/llm/lexicon/de.core.ts
// German core lexicon. STORED FOLDED (umlauts stripped: 'offne', 'schliess').
// German imperatives split separable prefixes to the clause end
// ('schalte die Laterne EIN') — those are particleVerbs, matched as leading
// verb + clause-final particle (spec §5.1); the bare stem is NOT listed in
// `verbs` so it can never match without its particle.
// Conjugation is data, not stemming: list the du-imperative plus the
// Sie/infinitive form players actually type. Stems may appear in BOTH `verbs`
// and `particleVerbs` — the invariant is that any such stem has a legitimate
// bare meaning of its own, and particle patterns are matched first
// (e.g. lege/greife/zieh): 'leg den hut ab' → drop while 'leg den hut' → put.
// NOTE on 'inflate': the v3 Z-machine truncates dictionary words to 6 chars,
// so the extracted vocab stores 'inflat'; 'inflate' is the in-game spelling
// players (and the spec'd tests) use, and the Z-parser accepts it.
import type { CoreLexicon } from './types'

export const DE_CORE: CoreLexicon = {
  verbs: {
    // take
    nimm: 'take',
    nehmen: 'take',
    nehmt: 'take',
    greif: 'take',
    hole: 'take',
    hol: 'take',
    // drop / throw
    lass: 'drop',
    wirf: 'throw',
    werft: 'throw',
    werfen: 'throw',
    schmeisse: 'throw', // schmeiße folded
    schmeiss: 'throw',
    // open/close
    offne: 'open', // öffne folded
    offnet: 'open',
    offnen: 'open',
    oeffne: 'open', // common ue/oe transliteration spelling (cf. druecke)
    schliesse: 'close', // schließe folded
    schliesst: 'close',
    schliessen: 'close',
    schliess: 'close',
    // examine/read/look
    untersuche: 'examine',
    untersuch: 'examine',
    untersuchen: 'examine',
    betrachte: 'examine',
    inspiziere: 'examine',
    lies: 'read',
    lest: 'read',
    lese: 'read',
    lesen: 'read',
    schau: 'look',
    schaut: 'look',
    schaue: 'look',
    sieh: 'look',
    guck: 'look',
    gucke: 'look',
    blicke: 'look',
    // search/find
    suche: 'search',
    such: 'search',
    durchsuche: 'search',
    durchsuch: 'search',
    finde: 'find',
    // movement-adjacent in-world verbs
    klettere: 'climb',
    kletter: 'climb',
    steige: 'climb',
    uberquere: 'cross', // überquere folded
    betrete: 'enter',
    verlasse: 'exit',
    spring: 'jump',
    springe: 'jump',
    hupfe: 'jump', // hüpfe folded
    schwimm: 'swim',
    schwimme: 'swim',
    folge: 'follow',
    besteige: 'board',
    // light/extinguish
    zunde: 'light', // zünde folded; 'zunde … an' particle also maps here
    losche: 'extinguish', // lösche folded
    aktiviere: 'activate',
    // UAT verb traps (mirrors fr.core.ts)
    schwenke: 'wave',
    schuttle: 'wave', // schüttle folded; shake≈wave per UAT F-N decision
    winke: 'wave',
    lauste: 'listen to', // seed typo variant, kept harmless; see lausche
    lausche: 'listen to', // bare 'listen' is not in extracted vocab (only 'listen to'/'listen for')
    klingle: 'ring',
    laute: 'ring', // läute folded
    grabe: 'dig',
    grab: 'dig',
    binde: 'tie',
    knote: 'tie',
    pumpe: 'inflate',
    // combat & misc
    tote: 'attack', // töte folded
    greife: 'take', // greifen = grasp/seize; attack only via 'greife … an' (angreifen) particle
    kampfe: 'attack', // kämpfe folded
    schlage: 'attack',
    haue: 'attack',
    bekampfe: 'attack', // bekämpfe folded
    ermorde: 'kill',
    erschlage: 'kill',
    zerbrich: 'break',
    zerbreche: 'break',
    brich: 'break',
    zerschlage: 'break',
    schneide: 'cut',
    schneid: 'cut',
    zerschneide: 'cut',
    zerstore: 'destroy', // zerstöre folded
    schwinge: 'swing',
    schwing: 'swing',
    iss: 'eat',
    esst: 'eat',
    essen: 'eat',
    trink: 'drink',
    trinkt: 'drink',
    trinken: 'drink',
    druecke: 'push', // ue-transliteration of drücke
    drucke: 'push', // drücke folded
    druck: 'push',
    schiebe: 'push',
    stosse: 'push', // stoße folded
    stoss: 'push',
    zieh: 'pull',
    ziehe: 'pull',
    zerre: 'pull',
    bewege: 'move',
    gib: 'give',
    gebt: 'give',
    geben: 'give',
    reiche: 'give',
    lege: 'put',
    leg: 'put',
    legen: 'put',
    stelle: 'put',
    setze: 'put',
    setz: 'put',
    warte: 'wait',
    wartet: 'wait',
    warten: 'wait',
    bete: 'pray',
    entriegle: 'unlock',
    entriegele: 'unlock',
    verriegle: 'lock',
    verriegele: 'lock',
    verbrenne: 'burn',
    verbrenn: 'burn',
    // manipulation & senses
    drehe: 'turn',
    dreh: 'turn',
    senke: 'lower',
    fulle: 'fill', // fülle folded
    full: 'fill',
    giesse: 'pour', // gieße folded
    giess: 'pour',
    schutte: 'pour', // schütte folded
    beruhre: 'touch', // berühre folded
    reibe: 'rub',
    reib: 'rub',
    quetsche: 'squeeze',
    rieche: 'smell',
    riech: 'smell',
    schnuppere: 'smell',
    zahle: 'count', // zähle folded
    spiele: 'play',
    spiel: 'play',
    kusse: 'kiss', // küsse folded
    wecke: 'wake',
    weck: 'wake',
    sag: 'say',
    sage: 'say',
    schrei: 'yell',
    schreie: 'yell',
    brulle: 'yell', // brülle folded
    rufe: 'shout',
    ruf: 'shout',
    probiere: 'taste',
    koste: 'taste',
    schmecke: 'taste',
    verstecke: 'hide',
  },
  verbIdioms: [
    { phrase: 'lass fallen', to: 'drop' }, // contiguous variant
    { phrase: 'leg ab', to: 'drop' },
    { phrase: 'lasse fallen', to: 'drop' },
    { phrase: 'lassen sie fallen', to: 'drop' },
    { phrase: 'geh an bord', to: 'board' }, // mirrors fr 'monte a bord'
    { phrase: 'gehe an bord', to: 'board' },
    { phrase: 'setz dich', to: 'sit' },
    { phrase: 'setze dich', to: 'sit' },
  ],
  particleVerbs: [
    // seed (plan baseline)
    { verb: 'schalte', particle: 'ein', to: 'turn on' },
    { verb: 'schalte', particle: 'an', to: 'turn on' },
    { verb: 'schalte', particle: 'aus', to: 'turn off' },
    { verb: 'mach', particle: 'an', to: 'turn on' },
    { verb: 'mach', particle: 'aus', to: 'turn off' },
    { verb: 'mach', particle: 'auf', to: 'open' },
    { verb: 'mach', particle: 'zu', to: 'close' },
    { verb: 'hebe', particle: 'auf', to: 'take' },
    { verb: 'heb', particle: 'auf', to: 'take' },
    { verb: 'lege', particle: 'ab', to: 'drop' },
    { verb: 'leg', particle: 'ab', to: 'drop' },
    { verb: 'zieh', particle: 'hoch', to: 'pull' },
    { verb: 'binde', particle: 'an', to: 'tie' },
    // extensions
    { verb: 'mache', particle: 'an', to: 'turn on' },
    { verb: 'mache', particle: 'aus', to: 'turn off' },
    { verb: 'mache', particle: 'auf', to: 'open' },
    { verb: 'mache', particle: 'zu', to: 'close' },
    { verb: 'ziehe', particle: 'hoch', to: 'pull' },
    { verb: 'schliesse', particle: 'ab', to: 'lock' }, // abschließen
    { verb: 'schliess', particle: 'ab', to: 'lock' },
    { verb: 'sperre', particle: 'ab', to: 'lock' }, // absperren
    { verb: 'schliesse', particle: 'auf', to: 'unlock' }, // aufschließen
    { verb: 'schliess', particle: 'auf', to: 'unlock' },
    { verb: 'sperre', particle: 'auf', to: 'unlock' }, // aufsperren
    { verb: 'zunde', particle: 'an', to: 'light' }, // anzünden
    { verb: 'zund', particle: 'an', to: 'light' },
    { verb: 'bringe', particle: 'um', to: 'kill' }, // umbringen
    { verb: 'bring', particle: 'um', to: 'kill' },
    { verb: 'greife', particle: 'an', to: 'attack' }, // angreifen
    { verb: 'greif', particle: 'an', to: 'attack' },
    { verb: 'steige', particle: 'ein', to: 'board' }, // einsteigen
    { verb: 'steig', particle: 'ein', to: 'board' },
    { verb: 'steige', particle: 'aus', to: 'disembark' }, // aussteigen
    { verb: 'steig', particle: 'aus', to: 'disembark' },
    { verb: 'stehe', particle: 'auf', to: 'stand' }, // aufstehen (fr 'leve toi')
    { verb: 'steh', particle: 'auf', to: 'stand' },
    { verb: 'ziehe', particle: 'auf', to: 'wind up' }, // aufziehen (F-CC)
    { verb: 'zieh', particle: 'auf', to: 'wind up' },
    { verb: 'blase', particle: 'auf', to: 'inflate' }, // aufblasen (F-R)
    { verb: 'blas', particle: 'auf', to: 'inflate' },
    { verb: 'pumpe', particle: 'auf', to: 'inflate' }, // aufpumpen
    { verb: 'hebe', particle: 'hoch', to: 'raise' }, // hochheben
    { verb: 'heb', particle: 'hoch', to: 'raise' },
    { verb: 'lass', particle: 'runter', to: 'lower' }, // runterlassen
    { verb: 'fasse', particle: 'an', to: 'touch' }, // anfassen
    { verb: 'fass', particle: 'an', to: 'touch' },
    { verb: 'ziehe', particle: 'an', to: 'wear' }, // anziehen
    { verb: 'zieh', particle: 'an', to: 'wear' },
    { verb: 'ziehe', particle: 'aus', to: 'remove' }, // ausziehen
    { verb: 'zieh', particle: 'aus', to: 'remove' },
    { verb: 'setze', particle: 'auf', to: 'wear' }, // aufsetzen (hat/crown)
    { verb: 'setz', particle: 'auf', to: 'wear' },
    { verb: 'drehe', particle: 'um', to: 'turn' }, // umdrehen
    { verb: 'dreh', particle: 'um', to: 'turn' },
    { verb: 'binde', particle: 'auf', to: 'untie' }, // aufbinden
    { verb: 'wache', particle: 'auf', to: 'wake' }, // aufwachen
    { verb: 'wach', particle: 'auf', to: 'wake' },
  ],
  preps: {
    mit: 'with',
    in: 'in',
    an: 'on',
    auf: 'on',
    unter: 'under',
    zu: 'to',
    nach: 'to',
    aus: 'from',
    von: 'from',
    uber: 'over', // über folded
    hinter: 'behind',
    fur: 'for', // für folded
  },
  articles: [
    'der',
    'die',
    'das',
    'den',
    'dem',
    'des',
    'ein',
    'eine',
    'einen',
    'einem',
    'einer',
    'mein',
    'meine',
    'meinen',
    'meinem',
    'dieser',
    'diese',
    'dieses',
    'diesen',
    'diesem',
  ],
  pronounsDirect: ['ihn', 'sie', 'es'],
  pronounsContainer: ['hinein', 'darauf', 'darin', 'rein', 'drin', 'drauf'],
  pronounsSelf: ['mich', 'mir'],
  metaAliases: {
    inventar: 'inventory', // migrated from META_ALIASES
    diagnose: 'diagnose',
    neustart: 'restart',
    speichern: 'save',
    speichere: 'save',
    laden: 'restore',
    lade: 'restore',
    beenden: 'quit',
    beende: 'quit',
    punkte: 'score',
    punktestand: 'score',
  },
}
