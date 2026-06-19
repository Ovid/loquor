// src/llm/lexicon/es.core.ts
// Spanish core lexicon. STORED FOLDED ('examina', no accents).
// Attached clitic imperatives (tómalo/ábrela) fold to single unsplittable
// tokens ('tomalo'), so they intentionally MISS here and fall to the LLM,
// whose ES few-shots cover them (spec §5.1 promises clitic handling only for
// French's hyphen-split forms). Detached pronouns ('toma lo'? nonstandard)
// are not listed either — keep this map to plain imperative forms.
// Conjugation is data, not stemming: list the tú-imperative plus the
// usted/infinitive forms players actually type (Spanish IF tradition accepts
// the infinitive as a command form: 'coger la lampara').
// NOTE on 'inflate': the v3 Z-machine truncates dictionary words to 6 chars,
// so the extracted vocab stores 'inflat'; 'inflate' is the in-game spelling
// players (and the spec'd tests) use, and the Z-parser accepts it.
// Regional decision: 'tira' → throw (not Peninsular pull); the contiguous
// idiom 'tira de' → pull covers the Spain usage and idioms match first.
import type { CoreLexicon } from './types'

export const ES_CORE: CoreLexicon = {
  verbs: {
    // take ('toma' also = drink in LatAm usage; take wins as the IF default)
    toma: 'take',
    tomad: 'take',
    tome: 'take',
    tomar: 'take',
    coge: 'take',
    coged: 'take',
    coja: 'take',
    coger: 'take',
    agarra: 'take',
    agarrar: 'take',
    recoge: 'take',
    recoger: 'take',
    // drop
    suelta: 'drop',
    soltad: 'drop',
    suelte: 'drop',
    soltar: 'drop',
    deja: 'drop',
    dejad: 'drop',
    deje: 'drop',
    dejar: 'drop',
    // throw ('tira de' idiom → pull wins first; see header)
    tira: 'throw',
    tirad: 'throw',
    tirar: 'throw',
    lanza: 'throw',
    lanzad: 'throw',
    lanzar: 'throw',
    arroja: 'throw',
    arrojar: 'throw',
    echa: 'throw', // 'echa un vistazo a' idiom → examine wins first
    // open/close
    abre: 'open',
    abrid: 'open',
    abra: 'open',
    abrir: 'open',
    cierra: 'close',
    cerrad: 'close',
    cierre: 'close',
    cerrar: 'close',
    // examine/read/look
    examina: 'examine',
    examinad: 'examine',
    examine: 'examine', // usted form; coincides with the English target, harmless
    examinar: 'examine',
    inspecciona: 'examine',
    inspeccionar: 'examine',
    observa: 'examine',
    observar: 'examine',
    revisa: 'examine',
    mira: 'look',
    mirad: 'look',
    mire: 'look',
    mirar: 'look',
    lee: 'read',
    leed: 'read',
    lea: 'read',
    leer: 'read',
    // search/find
    busca: 'search',
    buscad: 'search',
    buscar: 'search',
    registra: 'search',
    registrar: 'search',
    encuentra: 'find',
    encontrar: 'find',
    // movement-adjacent in-world verbs
    sube: 'climb',
    subid: 'climb',
    subir: 'climb',
    trepa: 'climb',
    trepar: 'climb',
    escala: 'climb',
    escalar: 'climb',
    cruza: 'cross',
    cruzad: 'cross',
    cruzar: 'cross',
    atraviesa: 'cross',
    atravesar: 'cross',
    entra: 'enter',
    entrad: 'enter',
    entrar: 'enter',
    sal: 'exit',
    salid: 'exit', // bare 'salir' is a meta alias (quit) — not duplicated here
    salta: 'jump',
    saltad: 'jump',
    saltar: 'jump',
    nada: 'swim', // also 'nothing', but unambiguous as a leading imperative
    nadar: 'swim',
    sigue: 'follow',
    seguid: 'follow',
    seguir: 'follow',
    aborda: 'board',
    abordar: 'board',
    embarca: 'board',
    embarcar: 'board',
    desembarca: 'disembark',
    desembarcar: 'disembark',
    // launch the boat (Frigid River) — mirrors de 'starte' and the fr launch
    // idioms. 'launch' is FIND VEHBIT, so a bare 'zarpa' emits 'launch' and the
    // Z-parser finds the vehicle. 'zarpar' (to set sail) is unambiguous — unlike
    // 'lanza' (= throw) — so no full-phrase idiom is needed.
    zarpa: 'launch',
    zarpad: 'launch',
    zarpar: 'launch',
    // spray (Zork III grue repellent: 'spray repellent on self'). 'rociar' /
    // 'vaporizar' / 'pulverizar' are spray-specific, no combat collision.
    rocia: 'spray', // rocía folded
    rociad: 'spray',
    rociar: 'spray',
    vaporiza: 'spray',
    vaporizar: 'spray',
    pulveriza: 'spray',
    pulverizar: 'spray',
    // light/extinguish
    enciende: 'light',
    encended: 'light',
    encienda: 'light',
    encender: 'light',
    prende: 'light', // LatAm 'prende la lampara'
    prender: 'light',
    apaga: 'extinguish',
    apagad: 'extinguish',
    apague: 'extinguish',
    apagar: 'extinguish',
    activa: 'activate',
    activar: 'activate',
    desactiva: 'turn off',
    desactivar: 'turn off',
    // UAT verb traps (mirrors fr.core.ts)
    agita: 'wave',
    agitad: 'wave',
    agitar: 'wave',
    sacude: 'wave', // shake≈wave per UAT F-N decision
    sacudir: 'wave',
    toca: 'ring', // seed decision: bell-ringing beats touch; 'palpa' is touch
    tocad: 'ring',
    tocar: 'ring',
    suena: 'ring', // seed; 'haz sonar' idiom is the proper causative
    cava: 'dig',
    cavad: 'dig',
    cavar: 'dig',
    excava: 'dig',
    excavar: 'dig',
    ata: 'tie',
    atad: 'tie',
    atar: 'tie',
    amarra: 'tie',
    amarrar: 'tie',
    desata: 'untie',
    desatar: 'untie',
    infla: 'inflate',
    inflar: 'inflate',
    hincha: 'inflate', // Spain 'hincha la balsa'
    hinchar: 'inflate',
    // combat & misc
    mata: 'attack', // mirrors fr tue→attack; 'asesina' carries kill
    matad: 'attack',
    matar: 'attack',
    ataca: 'attack',
    atacad: 'attack',
    atacar: 'attack',
    golpea: 'attack',
    golpear: 'attack',
    pega: 'attack',
    pegar: 'attack',
    pelea: 'attack',
    pelear: 'attack',
    lucha: 'attack',
    luchar: 'attack',
    asesina: 'kill',
    asesinar: 'kill',
    rompe: 'break',
    romped: 'break',
    romper: 'break',
    destroza: 'destroy',
    destrozar: 'destroy',
    destruye: 'destroy',
    destruir: 'destroy',
    corta: 'cut',
    cortad: 'cut',
    cortar: 'cut',
    blande: 'swing',
    blandir: 'swing',
    come: 'eat',
    comed: 'eat',
    coma: 'eat',
    comer: 'eat',
    devora: 'eat',
    devorar: 'eat',
    traga: 'eat',
    bebe: 'drink',
    bebed: 'drink',
    beba: 'drink',
    beber: 'drink',
    empuja: 'push',
    empujad: 'push',
    empujar: 'push',
    presiona: 'push',
    presionar: 'push',
    pulsa: 'push',
    pulsar: 'push',
    aprieta: 'push', // 'aprieta el boton'; squeeze is estruja/exprime
    apretar: 'push',
    jala: 'pull', // LatAm; Peninsular 'tira de' is the verbIdiom
    jalar: 'pull',
    arrastra: 'pull',
    arrastrar: 'pull',
    mueve: 'move',
    moved: 'move',
    mover: 'move',
    desplaza: 'move',
    da: 'give',
    dad: 'give',
    dar: 'give',
    dale: 'give', // attached clitic (da+le) kept from seed: 'dale X al troll'
    entrega: 'give',
    entregar: 'give',
    ofrece: 'give',
    ofrecer: 'give',
    pon: 'put',
    poned: 'put',
    ponga: 'put',
    poner: 'put',
    mete: 'put',
    meted: 'put',
    meter: 'put',
    coloca: 'put',
    colocar: 'put',
    introduce: 'put', // tú imperative of introducir; coincides with the English word, harmless
    espera: 'wait',
    esperad: 'wait',
    esperar: 'wait',
    reza: 'pray',
    rezad: 'pray',
    rezar: 'pray',
    ora: 'pray',
    desbloquea: 'unlock',
    desbloquear: 'unlock',
    bloquea: 'lock',
    bloquear: 'lock',
    quema: 'burn',
    quemad: 'burn',
    quemar: 'burn',
    incendia: 'burn',
    incendiar: 'burn',
    // manipulation & senses
    gira: 'turn',
    girad: 'turn',
    girar: 'turn',
    voltea: 'turn',
    voltear: 'turn',
    levanta: 'raise',
    levantad: 'raise',
    levantar: 'raise',
    alza: 'raise',
    alzar: 'raise',
    baja: 'lower',
    bajad: 'lower',
    bajar: 'lower',
    llena: 'fill',
    llenad: 'fill',
    llenar: 'fill',
    vierte: 'pour',
    verter: 'pour',
    palpa: 'touch', // unambiguous touch ('toca' is reserved for ring)
    palpar: 'touch',
    frota: 'rub',
    frotar: 'rub',
    estruja: 'squeeze',
    estrujar: 'squeeze',
    exprime: 'squeeze',
    exprimir: 'squeeze',
    huele: 'smell',
    oler: 'smell',
    olfatea: 'smell',
    olfatear: 'smell',
    cuenta: 'count',
    contar: 'count',
    juega: 'play',
    jugar: 'play',
    besa: 'kiss',
    besar: 'kiss',
    despierta: 'wake',
    despertar: 'wake',
    di: 'say', // imperative of decir
    grita: 'yell',
    gritad: 'yell',
    gritar: 'yell',
    chilla: 'yell',
    prueba: 'taste',
    probar: 'taste',
    saborea: 'taste',
    escucha: 'listen to', // bare 'listen' is not in extracted vocab
    escuchad: 'listen to',
    escuchar: 'listen to',
    oye: 'listen to',
    esconde: 'hide',
    esconder: 'hide',
    eco: 'echo', // Loud Room puzzle solution; 'echo' is a game verb (fr/de pass the English word through)
  },
  verbIdioms: [
    { phrase: 'echa un vistazo a', to: 'examine' },
    { phrase: 'pon en marcha', to: 'turn on' },
    { phrase: 'date la vuelta', to: 'turn' },
    { phrase: 'tira de', to: 'pull' }, // Peninsular; beats bare tira→throw
    { phrase: 'dale cuerda al', to: 'wind up' }, // fused a+el; players type 'al canario'
    { phrase: 'da cuerda al', to: 'wind up' },
    { phrase: 'dale cuerda a la', to: 'wind up' },
    { phrase: 'da cuerda a la', to: 'wind up' },
    { phrase: 'dale cuerda a', to: 'wind up' }, // F-CC parity (fr remonte)
    { phrase: 'da cuerda a', to: 'wind up' },
    { phrase: 'haz sonar', to: 'ring' },
    { phrase: 'cierra con llave', to: 'lock' },
    { phrase: 'abre con llave', to: 'unlock' },
    { phrase: 'sube a bordo', to: 'board' }, // mirrors fr 'monte a bord'
    { phrase: 'prende fuego a', to: 'burn' }, // mirrors fr 'mets le feu a'
    // knock (Zork III, "knock on door"). 'llamar a la puerta' is the idiomatic
    // Spanish knock; the prep distinguishes it from 'golpea'→attack. The idiom
    // consumes verb+prep so the door resolves as the object: 'llama a la
    // puerta' → 'knock on puerta'.
    { phrase: 'llama a', to: 'knock on' },
    { phrase: 'llamad a', to: 'knock on' },
  ],
  particleVerbs: [],
  // "all" quantifier — Spanish 'todo' family. fr ('tout'…) and de ('alles'…)
  // already have this; ES_CORE lacked it, so 'deja todo' missed (UAT-es-3).
  quantifiersAll: ['todo', 'todos', 'toda', 'todas', 'all'],
  // NOTE (personal-`a` hazard, for the deterministic parser — Task 13):
  // Spanish marks animate DIRECT objects with `a`/`al` ('ataca al troll',
  // 'sigue al ladron') — the same surface form as the indirect-object prep
  // ('da la espada al troll'). A naive prep-split on `a`/`al` would emit
  // wrong commands like 'attack to troll'. The parser MUST treat a prep
  // split that leaves NO direct object before the prep as a personal-`a`
  // direct object — i.e. `<verb> a/al <noun>` with nothing before the prep
  // → translate as `<verb> <noun>` — or fall through to the LLM. Documented
  // here only; the parser does not exist yet.
  preps: {
    con: 'with',
    en: 'in',
    a: 'to',
    // `al` = a+el contraction. `del` (de+el) is deliberately ABSENT: it falls
    // to the LLM. Any future `del` addition must consider the personal-`a`
    // interaction above ('huye del troll' vs prep-split misfires).
    al: 'to',
    sobre: 'on',
    bajo: 'under',
    hacia: 'to',
    de: 'from',
    // `dentro` is dual-role: listed here as a prep AND in pronounsContainer
    // ('ponlo dentro'). As a prep it surfaces as 'dentro de X' — two preps in
    // sequence ('dentro' + 'de') — which a naive single-prep split mishandles.
    dentro: 'in',
    desde: 'from',
  },
  articles: [
    'el',
    'la',
    'los',
    'las',
    'un',
    'una',
    'unos',
    'unas',
    'mi',
    'mis',
    'este',
    'esta',
    'esa',
    'ese',
    'esos',
    'esas',
    'estos',
    'estas',
  ],
  pronounsDirect: ['lo', 'la', 'los', 'las'],
  pronounsContainer: [
    { word: 'dentro', prep: 'in' },
    { word: 'encima', prep: 'on' },
    { word: 'adentro', prep: 'in' },
  ],
  pronounsSelf: ['me'],
  metaAliases: {
    inventario: 'inventory', // migrated from META_ALIASES
    diagnostico: 'diagnose',
    reinicia: 'restart',
    guarda: 'save',
    guardar: 'save',
    restaura: 'restore',
    salir: 'quit',
    puntos: 'score',
    puntuacion: 'score',
  },
}
