// src/ui/landingStrings.ts
// Localized landing-page chrome, one entry per play language. Static and
// hand-authored (mirrors landingExamples.ts): the landing renders before the
// engine boots and before any model download, so this must be offline and
// deterministic. Completeness is gated by landingStrings.test.ts so a language
// can never ship half-English. The `Loquor` wordmark and its tagline are NOT
// here — they stay untranslated by design (brand/identity).
//
// MULTILINGUAL RULE: a wording fix in one language is usually a fix in all four
// — when you touch one entry, check the other three for the same issue.
import type { ActiveLanguage } from '../llm/types'
import type { Game } from '../games/catalog'

export interface LandingCopy {
  howToTitle: string // bold lead-in of the how-to line
  howToBody: string // remainder of the how-to line
  progressNote: string // the dimmed "your progress is kept" line
  languageLabel: string // the inline picker label
  caveat: string // the adventure teaser paragraph under the how-to line
  descent: string // the radiogroup label
  enter: string // the primary "enter the game" button
  resume: string // the saved-game resume hint
  returnToGame: string // overlay dismiss button aria-label
  changeStory: string // overlay dialog aria-label
  commandExamples: string // aria-label for the command-examples region
  englishOnly: string // badge on volumes that have no corpus for the chosen language
  footer: {
    trademark: string // sentence before the two footer links
    licenseLinkText: string // visible text of the MIT-license link
    githubLinkText: string // visible text of the GitHub link
  }
  subtitles: Record<Game['slug'], string> // per-volume subtitle
}

export const LANDING_STRINGS: Record<ActiveLanguage, LandingCopy> = {
  en: {
    howToTitle: 'How to play.',
    howToBody: 'Type what you want to do in plain language.',
    progressNote:
      'Your progress is kept; close the tab and return whenever you like.',
    languageLabel: 'Language:',
    caveat:
      'Beneath you sleeps the Great Underground Empire — its treasures, its ' +
      'traps, its waiting dark. Your descent begins.',
    descent: '— choose your descent —',
    enter: 'Light the lamp →',
    resume: 'a saved descent awaits — you will resume where you left off',
    returnToGame: 'Return to game',
    changeStory: 'Change story',
    commandExamples: 'Command examples',
    englishOnly: 'English only',
    footer: {
      trademark:
        'Zork is a trademark of Activision Publishing, Inc., a Microsoft company.',
      licenseLinkText:
        'The Zork I–III game code was released by Microsoft under the MIT License in 2025.',
      githubLinkText: 'View on GitHub',
    },
    subtitles: {
      zork1: 'The Great Underground Empire',
      zork2: 'The Wizard of Frobozz',
      zork3: 'The Dungeon Master',
    },
  },
  fr: {
    howToTitle: 'Comment jouer.',
    howToBody: 'Tapez ce que vous voulez faire en langage courant.',
    progressNote:
      'Votre progression est conservée ; fermez l’onglet et revenez quand vous voulez.',
    languageLabel: 'Langue :',
    caveat:
      'Sous vos pieds sommeille le Grand Empire Souterrain — ses trésors, ses ' +
      'pièges, ses ténèbres patientes. Votre descente commence.',
    descent: '— choisissez votre descente —',
    enter: 'Allumez la lampe →',
    resume:
      'une descente sauvegardée vous attend — vous reprendrez là où vous en étiez',
    returnToGame: 'Retour au jeu',
    changeStory: 'Changer d’histoire',
    commandExamples: 'Exemples de commandes',
    englishOnly: 'en anglais',
    footer: {
      trademark:
        'Zork est une marque déposée d’Activision Publishing, Inc., une société Microsoft.',
      licenseLinkText:
        'Le code des jeux Zork I–III a été publié par Microsoft sous licence MIT en 2025.',
      githubLinkText: 'Voir sur GitHub',
    },
    subtitles: {
      zork1: 'Le Grand Empire Souterrain',
      zork2: 'Le Sorcier de Frobozz',
      zork3: 'Le Maître du Donjon',
    },
  },
  de: {
    howToTitle: 'Spielanleitung.',
    howToBody: 'Schreibe in normaler Sprache, was du tun möchtest.',
    progressNote:
      'Dein Fortschritt wird gespeichert; schließe den Tab und kehre zurück, wann immer du willst.',
    languageLabel: 'Sprache:',
    caveat:
      'Unter dir schläft das große unterirdische Reich — seine Schätze, seine ' +
      'Fallen, seine wartende Dunkelheit. Dein Abstieg beginnt.',
    descent: '— wähle deinen Abstieg —',
    enter: 'Entzünde die Lampe →',
    resume:
      'ein gespeicherter Abstieg wartet — du machst dort weiter, wo du aufgehört hast',
    returnToGame: 'Zurück zum Spiel',
    changeStory: 'Geschichte wechseln',
    commandExamples: 'Befehlsbeispiele',
    englishOnly: 'nur Englisch',
    footer: {
      trademark:
        'Zork ist eine Marke von Activision Publishing, Inc., einem Microsoft-Unternehmen.',
      licenseLinkText:
        'Der Spielcode von Zork I–III wurde 2025 von Microsoft unter der MIT-Lizenz veröffentlicht.',
      githubLinkText: 'Auf GitHub ansehen',
    },
    subtitles: {
      zork1: 'Das große unterirdische Reich',
      zork2: 'Der Zauberer von Frobozz',
      zork3: 'Der Dungeon-Meister',
    },
  },
  es: {
    howToTitle: 'Cómo jugar.',
    howToBody: 'Escribe lo que quieres hacer en lenguaje natural.',
    progressNote:
      'Tu progreso se guarda; cierra la pestaña y vuelve cuando quieras.',
    languageLabel: 'Idioma:',
    caveat:
      'Bajo tus pies duerme el Gran Imperio Subterráneo — sus tesoros, sus ' +
      'trampas, su oscuridad expectante. Tu descenso comienza.',
    descent: '— elige tu descenso —',
    enter: 'Enciende la lámpara →',
    resume: 'un descenso guardado te espera — continuarás donde lo dejaste',
    returnToGame: 'Volver al juego',
    changeStory: 'Cambiar de historia',
    commandExamples: 'Ejemplos de comandos',
    englishOnly: 'solo en inglés',
    footer: {
      trademark:
        'Zork es una marca registrada de Activision Publishing, Inc., una empresa de Microsoft.',
      licenseLinkText:
        'El código de los juegos Zork I–III fue publicado por Microsoft bajo la licencia MIT en 2025.',
      githubLinkText: 'Ver en GitHub',
    },
    subtitles: {
      zork1: 'El Gran Imperio Subterráneo',
      zork2: 'El Hechicero de Frobozz',
      zork3: 'El Maestro del Calabozo',
    },
  },
  // Georgian (ka) — Phase-1 read-Georgian / TYPE-ENGLISH copy (spec §1, §3a):
  // game text in Georgian, commands typed in English. RETAINED for Zork II/III,
  // which stay Phase 1 (no ka input lexicon). For Zork I, Georgian input IS
  // active (`kaInputActive`, spec §5.6) and Landing.tsx overlays KA_INPUT_COPY
  // (below) over `howToBody` only. The `caveat` is now the shared adventure
  // teaser (atmosphere, no model/beta wording) — the alpha-status disclosure
  // lives on the picker label (`languageOptions.ts`) and the in-game BottomBar
  // beta note, so the teaser stays pure flavor. Mkhedruli is unicameral — no
  // capitalization (§4). Draft pending native review (§8).
  ka: {
    howToTitle: 'როგორ ვითამაშოთ.',
    // No embedded English here (3.1.2 — review I2): an English command quoted
    // inside this lang="ka" string is voiced with Georgian phonemes by a screen
    // reader. The English examples live in the lang="en" examples region below
    // instead, so the how-to just points there.
    howToBody:
      'თამაშის ტექსტი ქართულად ჩანს, ბრძანებებს კი ინგლისურად აკრიფეთ — იხ. მაგალითები ქვემოთ.',
    progressNote:
      'თქვენი მონაცემები ინახება; დახურეთ ფანჯარა და დაბრუნდით, როცა მოგესურვებათ.',
    languageLabel: 'ენა:',
    // Adventure teaser, mirrored from en/fr/de/es (atmosphere, no model/beta
    // wording). The alpha-status disclosure is NOT here — it lives on the picker
    // label (`languageOptions.ts`) and the in-game BottomBar beta note. Draft
    // pending native review (§8).
    caveat:
      'თქვენს ფეხქვეშ მიძინებულია დიდი მიწისქვეშა იმპერია — მისი საგანძური, ' +
      'მისი ხაფანგები, მისი მომლოდინე სიბნელე. თქვენი ჩასვლა იწყება.',
    descent: '— აირჩიეთ თქვენი ჩასვლა —',
    enter: 'აანთეთ ლამპა →',
    resume: 'შენახული ჩასვლა გელოდებათ — გააგრძელებთ იქიდან, სადაც გაჩერდით',
    returnToGame: 'თამაშში დაბრუნება',
    changeStory: 'ისტორიის შეცვლა',
    commandExamples: 'ბრძანებების მაგალითები',
    englishOnly: 'ინგლისურად',
    footer: {
      trademark:
        'Zork არის Activision Publishing, Inc.-ის (Microsoft-ის კომპანია) სავაჭრო ნიშანი.',
      licenseLinkText:
        'Zork I–III-ის კოდი Microsoft-მა 2025 წელს გამოაქვეყნა MIT ლიცენზიით.',
      githubLinkText: 'ნახვა GitHub-ზე',
    },
    subtitles: {
      zork1: 'დიდი მიწისქვეშა იმპერია',
      zork2: 'ფრობოზის ჯადოქარი',
      zork3: 'დილეგის მბრძანებელი',
    },
  },
}

// Phase-2 Georgian-INPUT landing copy (spec §5.6), overlaid by Landing.tsx over
// the Phase-1 `ka` entry's `howToBody` ONLY when `kaInputActive` — i.e. Georgian
// is selected AND the chosen volume is Zork I (the one game with a ka input
// lexicon). Zork II/III keep the Phase-1 type-English `howToBody` above, so the
// landing never invites Georgian input where it would always abstain. The
// `caveat` is no longer overridden — both phases share the atmospheric teaser
// (the alpha-status disclosure lives on the picker label + in-game BottomBar).
//
// Mirrors the in-game placeholder/help: "type in Georgian (or English)". The
// Phase-2 examples are GEORGIAN (LANDING_EXAMPLES_KA_INPUT), so unlike the
// Phase-1 English examples they ARE voiced as ka — Landing.tsx keeps the
// command-examples region at lang="ka" (no lang="en" override) in this mode.
// NATIVE-REVIEW-DRAFT.
export const KA_INPUT_COPY: Pick<LandingCopy, 'howToBody'> = {
  howToBody:
    'თამაშის ტექსტი ქართულად ჩანს; ბრძანებები აკრიფეთ ქართულად (ან ინგლისურად) — იხ. მაგალითები ქვემოთ.',
}
