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
    losche: 'extinguish', // lösche folded; 'losche … aus' particle also maps here (F7)
    // launch the boat (UAT F25): the river is otherwise un-launchable in real
    // German without the English 'launch' keyword. 'launch' is FIND-default, so
    // a bare 'starte' emits 'launch' and the Z-parser finds the vehicle.
    starte: 'launch',
    start: 'launch',
    // spray (Zork III grue repellent: 'spray repellent on self'). 'sprühe' /
    // 'spritze' / 'besprühe' are spray-specific, no combat collision.
    spruhe: 'spray', // sprühe folded
    spritze: 'spray',
    bespruhe: 'spray', // besprühe folded
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
    // bare 'hebe'/'heb' → raise, symmetric with senke→lower (UAT F27: the shaft
    // basket). 'hebe … auf'=take and 'hebe … hoch'=raise are particle verbs
    // matched first, so only the bare lift form lands here.
    hebe: 'raise',
    heb: 'raise',
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
    { phrase: 'fahr los', to: 'launch' }, // losfahren — launch the boat (F25)
    { phrase: 'fahre los', to: 'launch' },
    // 'steig aus dem Boot' — 'aus' is the source preposition here, not a
    // clause-final separable particle, so the particle verb above can't fire;
    // the idiom consumes the verb and the vehicle resolves as the object (F26).
    { phrase: 'steig aus', to: 'exit' },
    { phrase: 'steige aus', to: 'exit' },
    { phrase: 'setz dich', to: 'sit' },
    { phrase: 'setze dich', to: 'sit' },
    // knock (Zork III, "knock on door"). 'klopfen an' is knock-specific (hit =
    // schlagen), and the idiom consumes verb+prep so the door resolves as the
    // object: 'klopfe an die tur' → 'knock on tur'.
    { phrase: 'klopfe an', to: 'knock on' },
    { phrase: 'klopf an', to: 'knock on' },
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
    // aussteigen → 'exit' (not 'disembark'): 'exit' is BOTH verb-only and
    // verbs1, so it works bare ('steig aus') AND with the vehicle as object
    // ('steig aus dem Boot' via the idiom below). 'disembark' is verbs1-only,
    // so bare 'steig aus' missed the arity gate (UAT F26).
    { verb: 'steige', particle: 'aus', to: 'exit' },
    { verb: 'steig', particle: 'aus', to: 'exit' },
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
    // 'fallen lassen' (to drop): a verb cluster, not a separable prefix, but
    // mechanically identical here — leading verb + clause-final 'fallen', object
    // between. UAT I3/I4/I5: without this the bare 'lass' matched and the LLM
    // mis-guessed the noun (drop bottle/painting). 'leg X ab' already worked.
    { verb: 'lass', particle: 'fallen', to: 'drop' },
    { verb: 'lasse', particle: 'fallen', to: 'drop' },
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
    // Extinguish with a clause-final 'aus' particle (UAT F7, DEATH-TRAP): the
    // natural 'lösche/puste/blase … aus' otherwise left a trailing 'aus' that
    // broke the bare-verb parse and the LLM mis-mapped it to 'burn' (the
    // OPPOSITE action) near open flames. blase+auf=inflate is unaffected.
    { verb: 'losche', particle: 'aus', to: 'extinguish' }, // auslöschen
    { verb: 'puste', particle: 'aus', to: 'extinguish' }, // auspusten
    { verb: 'blase', particle: 'aus', to: 'extinguish' }, // ausblasen
    { verb: 'blas', particle: 'aus', to: 'extinguish' },
    // Climb DOWN with a clause-final directional particle (UAT F5): there is no
    // object, but 'climb down' is verbs1 (needs one), so map to the bare
    // movement direction the game accepts verb-only. 'klettere auf den Baum'
    // (climb up, WITH an object) is unaffected — the particle must be last.
    { verb: 'klettere', particle: 'hinunter', to: 'down' },
    { verb: 'klettere', particle: 'hinab', to: 'down' },
    { verb: 'klettere', particle: 'runter', to: 'down' },
    { verb: 'kletter', particle: 'hinunter', to: 'down' },
    { verb: 'kletter', particle: 'runter', to: 'down' },
    { verb: 'steige', particle: 'hinunter', to: 'down' },
    { verb: 'steige', particle: 'hinab', to: 'down' },
    { verb: 'steige', particle: 'runter', to: 'down' },
    { verb: 'steig', particle: 'hinunter', to: 'down' },
    { verb: 'steig', particle: 'hinab', to: 'down' },
    { verb: 'steig', particle: 'runter', to: 'down' },
    { verb: 'klettere', particle: 'hinauf', to: 'up' },
    { verb: 'klettere', particle: 'hoch', to: 'up' },
    { verb: 'klettere', particle: 'rauf', to: 'up' },
    { verb: 'steige', particle: 'hinauf', to: 'up' },
    { verb: 'steige', particle: 'hoch', to: 'up' },
    { verb: 'steig', particle: 'hinauf', to: 'up' },
    { verb: 'steig', particle: 'hoch', to: 'up' },
  ],
  preps: {
    mit: 'with',
    in: 'in',
    // `an` → TO, not ON ([F]): in two-object commands the attach sense
    // dominates (`binde X an Y` = tie X TO Y — Zork's only tie syntax), and
    // mapping it to 'on' made the Dome Room rope puzzle fail. `auf` covers
    // genuine ON; surface placement also has `darauf`/`drauf`.
    an: 'to',
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
  pronounsContainer: [
    { word: 'hinein', prep: 'in' },
    { word: 'darauf', prep: 'on' },
    { word: 'darin', prep: 'in' },
    { word: 'rein', prep: 'in' },
    { word: 'drin', prep: 'in' },
    { word: 'drauf', prep: 'on' },
  ],
  pronounsSelf: ['mich', 'mir'],
  // 'alles'/'alle' → the Z-parser's ALL object (UAT F15): 'nimm alles' →
  // 'take all'. Without this the bare quantifier fell to the LLM, which
  // mis-mapped it to 'large bag'.
  quantifiersAll: ['alles', 'alle'],
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
