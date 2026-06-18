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
  caveat: string // the optional-model caveat paragraph
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
      'Basic commands work now in all four languages. To understand more of ' +
      'what you type, you can add an optional, experimental model — a ' +
      'one-time download whose richer understanding may be uneven across ' +
      'languages.',
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
      'Les commandes de base fonctionnent dès maintenant dans les quatre ' +
      'langues. Pour mieux comprendre ce que vous tapez, vous pouvez ajouter ' +
      'un modèle optionnel et expérimental — un téléchargement unique dont la ' +
      'compréhension plus riche peut être inégale selon les langues.',
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
      'Grundbefehle funktionieren schon jetzt in allen vier Sprachen. Um mehr ' +
      'von dem zu verstehen, was du schreibst, kannst du ein optionales, ' +
      'experimentelles Modell hinzufügen — ein einmaliger Download, dessen ' +
      'umfassenderes Verständnis je nach Sprache unterschiedlich ausfallen kann.',
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
      'Los comandos básicos ya funcionan en los cuatro idiomas. Para entender ' +
      'mejor lo que escribes, puedes añadir un modelo opcional y experimental ' +
      '— una descarga única cuya comprensión más rica puede ser desigual ' +
      'según el idioma.',
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
  // Georgian (ka) — Phase 1 is read-Georgian / TYPE-ENGLISH (spec §1, §3a): the
  // game text is shown in Georgian, but the player types commands in English.
  // The how-to says exactly that; it must NEVER imply Georgian input. The caveat
  // carries the beta note (corpus-only — NO optional AI model is offered) instead
  // of the model-upgrade copy the other languages use. Mkhedruli is unicameral —
  // no capitalization (§4). Draft pending native review (§8).
  ka: {
    howToTitle: 'როგორ ვითამაშოთ.',
    howToBody:
      'თამაშის ტექსტი ქართულად ჩანს, ბრძანებებს კი ინგლისურად აკრიფეთ — მაგალითად „open the mailbox“.',
    progressNote:
      'თქვენი მონაცემები ინახება; დახურეთ ფანჯარა და დაბრუნდით, როცა მოგესურვებათ.',
    languageLabel: 'ენა:',
    // SIBLING COPY: Terminal.tsx renders the in-game variant of this same beta
    // note. Both are drafts pending native review (§8) — apply any wording fix
    // to BOTH so they don't drift (review S4).
    caveat:
      'ქართული თარგმანი ჯერ სატესტოა (beta) — ზოგი ტექსტი შეიძლება ჯერ კიდევ ' +
      'ინგლისურად გამოჩნდეს. ამ ეტაპზე ბრძანებები ინგლისურად აკრიფეთ.',
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
