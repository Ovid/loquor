// Zork I × German object forms (spec §2.3, §4). Keys are EN printed names —
// byte-identical to zork1.fr.objects.ts. German case forms: every object ships
// `indef` (= nominative-indefinite citation form, REQUIRED by the matcher's
// built-in "A {obj}" listing), plus the case keys its templates reference.
//
// Round-trip rule (roundtrip.test.ts, spec §4): every form here, fold()ed with
// LEADING articles + fused contraction tokens stripped, MUST be an element of
// DE_ZORK1[canonical] (canonical = ZORK1_DE_CANONICAL[en] ?? en). stripHead only
// strips LEADING tokens, so a MEDIAL declined adjective survives:
// 'der blaue Knopf' → 'blaue knopf'. For every adjective-bearing object either
// make `bare` a lexicon token AND/OR append the folded declined phrase(s) to
// DE_ZORK1[canonical] (Task 1 Step 5). Compound nouns (the majority) are exempt —
// only the leading article strips.
//
// Case-form scheme (spec §2.3):
//   bare    — head noun alone (lists/labels), a single lexicon token where it can be.
//   indef   — nominative indefinite, MANDATORY on every object (= nomIndef);
//             the matcher's built-in "A {obj}"/"An {obj}" listing hardcodes it.
//   def     — nominative definite (subject/citation; reads as nomDef for compounds).
//   nomDef  — nominative definite, supplied ONLY where the adjective ending
//             differs from akkDef (i.e. masculine-singular der/den objects).
//   akkDef  — accusative definite, THE default object case ("Du öffnest {obj.akkDef}.").
//   datDef / contractions — supplied only where a bounded template set needs them.
// Gender drives the article/ending; German capitalizes ALL nouns. No grammar code —
// every form is hand-authored. Compounds are invariant; only adjectives decline.
//
// Entries follow ZORK1_FR_OBJECTS' (vocab-canonical) order for side-by-side nav.
import type { ObjectsTable } from '../types'

export const ZORK1_DE_OBJECTS: ObjectsTable = {
  // der Altar (m): nom der/ein, akk den/einen.
  altar: {
    indef: 'ein Altar',
    def: 'der Altar',
    nomDef: 'der Altar',
    akkDef: 'den Altar',
    bare: 'Altar',
  },
  // die Landkarte (f): article invariant nom=akk. bare 'karte' is a lexicon token.
  'ancient map': {
    indef: 'eine alte Karte',
    def: 'die alte Karte',
    akkDef: 'die alte Karte',
    bare: 'Karte',
  },
  // der Korb (m).
  basket: {
    indef: 'ein Korb',
    def: 'der Korb',
    nomDef: 'der Korb',
    akkDef: 'den Korb',
    bare: 'Korb',
  },
  // die Fledermaus (f).
  bat: {
    indef: 'eine Fledermaus',
    def: 'die Fledermaus',
    akkDef: 'die Fledermaus',
    bare: 'Fledermaus',
  },
  // das Schmuckstück (n): nom=akk das/ein.
  'beautiful brass bauble': {
    indef: 'ein Schmuckstück',
    def: 'das Schmuckstück',
    akkDef: 'das Schmuckstück',
    bare: 'Schmuckstück',
  },
  // der Skarabäus (m).
  'beautiful jeweled scarab': {
    indef: 'ein Skarabäus',
    def: 'der Skarabäus',
    nomDef: 'der Skarabäus',
    akkDef: 'den Skarabäus',
    bare: 'Skarabäus',
  },
  // das Vogelnest (n).
  "bird's nest": {
    indef: 'ein Vogelnest',
    def: 'das Vogelnest',
    akkDef: 'das Vogelnest',
    bare: 'Vogelnest',
  },
  // das Buch (n) + adjective 'schwarz' — declines. bare 'buch' is a lexicon token.
  'black book': {
    indef: 'ein schwarzes Buch',
    def: 'das schwarze Buch',
    akkDef: 'das schwarze Buch',
    bare: 'Buch',
  },
  // der Luftstoß (m).
  'blast of air': {
    indef: 'ein Luftstoß',
    def: 'der Luftstoß',
    nomDef: 'der Luftstoß',
    akkDef: 'den Luftstoß',
    bare: 'Luftstoß',
  },
  // plural die Segnungen.
  blessings: {
    indef: 'Segnungen',
    def: 'die Segnungen',
    akkDef: 'die Segnungen',
    bare: 'Segnungen',
  },
  // die Axt (f) + adjective 'blutig' — declines. bare 'axt' is a lexicon token.
  'bloody axe': {
    indef: 'eine blutige Axt',
    def: 'die blutige Axt',
    akkDef: 'die blutige Axt',
    bare: 'Axt',
  },
  // der Knopf (m) + adjective 'blau' — declines nom 'blaue'/akk 'blauen'.
  // bare 'knopf' is a lexicon token; medial declined forms appended in Step 5.
  'blue button': {
    indef: 'ein blauer Knopf',
    def: 'der blaue Knopf',
    nomDef: 'der blaue Knopf',
    akkDef: 'den blauen Knopf',
    bare: 'Knopf',
  },
  // das Brett (n).
  board: {
    indef: 'ein Brett',
    def: 'das Brett',
    akkDef: 'das Brett',
    bare: 'Brett',
  },
  // das Fenster (n) + adjective 'vernagelt'. bare 'fenster' is a lexicon token.
  'boarded window': {
    indef: 'ein vernageltes Fenster',
    def: 'das vernagelte Fenster',
    akkDef: 'das vernagelte Fenster',
    bare: 'Fenster',
  },
  // der Riegel (m).
  bolt: {
    indef: 'ein Riegel',
    def: 'der Riegel',
    nomDef: 'der Riegel',
    akkDef: 'den Riegel',
    bare: 'Riegel',
  },
  // die Messingglocke (f).
  'brass bell': {
    indef: 'eine Messingglocke',
    def: 'die Messingglocke',
    akkDef: 'die Messingglocke',
    bare: 'Messingglocke',
  },
  // die Messinglaterne (f) — compound, invariant. bare 'laterne' is a lexicon token.
  'brass lantern': {
    indef: 'eine Messinglaterne',
    def: 'die Messinglaterne',
    akkDef: 'die Messinglaterne',
    bare: 'Laterne',
  },
  // der Kanarienvogel (m) + adjective 'kaputt'. bare 'kanarienvogel' is a lexicon token.
  'broken clockwork canary': {
    indef: 'ein kaputter Kanarienvogel',
    def: 'der kaputte Kanarienvogel',
    nomDef: 'der kaputte Kanarienvogel',
    akkDef: 'den kaputten Kanarienvogel',
    bare: 'Kanarienvogel',
  },
  // das Ei (n) + adjective 'kaputt'. bare 'ei' is a lexicon token.
  'broken jewel-encrusted egg': {
    indef: 'ein kaputtes Ei',
    def: 'das kaputte Ei',
    akkDef: 'das kaputte Ei',
    bare: 'Ei',
  },
  // die Laterne (f) + adjective 'kaputt'. bare 'kaputte laterne' (the lexicon form).
  'broken lantern': {
    indef: 'eine kaputte Laterne',
    def: 'die kaputte Laterne',
    akkDef: 'die kaputte Laterne',
    bare: 'kaputte Laterne',
  },
  // der Holzbalken (m).
  'broken timber': {
    indef: 'ein Holzbalken',
    def: 'der Holzbalken',
    nomDef: 'der Holzbalken',
    akkDef: 'den Holzbalken',
    bare: 'Holzbalken',
  },
  // der Knopf (m) + adjective 'braun'. bare 'knopf' is a lexicon token.
  'brown button': {
    indef: 'ein brauner Knopf',
    def: 'der braune Knopf',
    nomDef: 'der braune Knopf',
    akkDef: 'den braunen Knopf',
    bare: 'Knopf',
  },
  // der Sack (m).
  'brown sack': {
    indef: 'ein Sack',
    def: 'der Sack',
    nomDef: 'der Sack',
    akkDef: 'den Sack',
    bare: 'Sack',
  },
  // die Lampe (f) + adjective 'ausgebrannt'. bare 'ausgebrannte lampe' (lexicon form).
  'burned-out lantern': {
    indef: 'eine ausgebrannte Lampe',
    def: 'die ausgebrannte Lampe',
    akkDef: 'die ausgebrannte Lampe',
    bare: 'ausgebrannte Lampe',
  },
  // der Teppich (m).
  carpet: {
    indef: 'ein Teppich',
    def: 'der Teppich',
    nomDef: 'der Teppich',
    akkDef: 'den Teppich',
    bare: 'Teppich',
  },
  // der Kelch (m).
  chalice: {
    indef: 'ein Kelch',
    def: 'der Kelch',
    nomDef: 'der Kelch',
    akkDef: 'den Kelch',
    bare: 'Kelch',
  },
  // der Kamin (m).
  chimney: {
    indef: 'ein Kamin',
    def: 'der Kamin',
    nomDef: 'der Kamin',
    akkDef: 'den Kamin',
    bare: 'Kamin',
  },
  // die Rutsche (f).
  chute: {
    indef: 'eine Rutsche',
    def: 'die Rutsche',
    akkDef: 'die Rutsche',
    bare: 'Rutsche',
  },
  // die Klippe (f).
  cliff: {
    indef: 'eine Klippe',
    def: 'die Klippe',
    akkDef: 'die Klippe',
    bare: 'Klippe',
  },
  // die Knoblauchzehe (f).
  'clove of garlic': {
    indef: 'eine Knoblauchzehe',
    def: 'die Knoblauchzehe',
    akkDef: 'die Knoblauchzehe',
    bare: 'Knoblauchzehe',
  },
  // die Schalttafel (f).
  'control panel': {
    indef: 'eine Schalttafel',
    def: 'die Schalttafel',
    akkDef: 'die Schalttafel',
    bare: 'Schalttafel',
  },
  // der Riss (m).
  crack: {
    indef: 'ein Riss',
    def: 'der Riss',
    nomDef: 'der Riss',
    akkDef: 'den Riss',
    bare: 'Riss',
  },
  // der Kristallschädel (m).
  'crystal skull': {
    indef: 'ein Kristallschädel',
    def: 'der Kristallschädel',
    nomDef: 'der Kristallschädel',
    akkDef: 'den Kristallschädel',
    bare: 'Kristallschädel',
  },
  // der Dreizack (m).
  'crystal trident': {
    indef: 'ein Dreizack',
    def: 'der Dreizack',
    nomDef: 'der Dreizack',
    akkDef: 'den Dreizack',
    bare: 'Dreizack',
  },
  // der Zyklop (m).
  cyclops: {
    indef: 'ein Zyklop',
    def: 'der Zyklop',
    nomDef: 'der Zyklop',
    akkDef: 'den Zyklop',
    bare: 'Zyklop',
  },
  // der Damm (m).
  dam: {
    indef: 'ein Damm',
    def: 'der Damm',
    nomDef: 'der Damm',
    akkDef: 'den Damm',
    bare: 'Damm',
  },
  // die Tür (f).
  door: {
    indef: 'eine Tür',
    def: 'die Tür',
    akkDef: 'die Tür',
    bare: 'Tür',
  },
  // der Wald (m).
  forest: {
    indef: 'ein Wald',
    def: 'der Wald',
    nomDef: 'der Wald',
    akkDef: 'den Wald',
    bare: 'Wald',
  },
  // die Flasche (f).
  'glass bottle': {
    indef: 'eine Flasche',
    def: 'die Flasche',
    akkDef: 'die Flasche',
    bare: 'Flasche',
  },
  // der Goldsarg (m).
  'gold coffin': {
    indef: 'ein Goldsarg',
    def: 'der Goldsarg',
    nomDef: 'der Goldsarg',
    akkDef: 'den Goldsarg',
    bare: 'Goldsarg',
  },
  // der Kanarienvogel (m) + adjective 'golden'. bare 'kanarienvogel' is a lexicon token.
  'golden clockwork canary': {
    indef: 'ein goldener Kanarienvogel',
    def: 'der goldene Kanarienvogel',
    nomDef: 'der goldene Kanarienvogel',
    akkDef: 'den goldenen Kanarienvogel',
    bare: 'Kanarienvogel',
  },
  // die Granitwand (f).
  'granite wall': {
    indef: 'eine Granitwand',
    def: 'die Granitwand',
    akkDef: 'die Granitwand',
    bare: 'Granitwand',
  },
  // das Gitter (n).
  grating: {
    indef: 'ein Gitter',
    def: 'das Gitter',
    akkDef: 'das Gitter',
    bare: 'Gitter',
  },
  // die Blase (f) + adjective 'grün'. bare 'blase' is a lexicon token.
  'green bubble': {
    indef: 'eine grüne Blase',
    def: 'die grüne Blase',
    akkDef: 'die grüne Blase',
    bare: 'Blase',
  },
  // der Boden (m).
  ground: {
    indef: 'ein Boden',
    def: 'der Boden',
    nomDef: 'der Boden',
    akkDef: 'den Boden',
    bare: 'Boden',
  },
  // Listing template "Hier ist {obj.indef}." is singular, so a plural indef
  // ("Werkzeugkisten") read as "Hier ist Werkzeugkisten." (number/article
  // disagreement). Singular throughout fixes it (UAT O5).
  'group of tool chests': {
    indef: 'eine Werkzeugkiste',
    def: 'die Werkzeugkiste',
    akkDef: 'die Werkzeugkiste',
    bare: 'Werkzeugkiste',
  },
  // die Luftpumpe (f).
  'hand-held air pump': {
    indef: 'eine Luftpumpe',
    def: 'die Luftpumpe',
    akkDef: 'die Luftpumpe',
    bare: 'Luftpumpe',
  },
  // der Diamant (m).
  'huge diamond': {
    indef: 'ein Diamant',
    def: 'der Diamant',
    nomDef: 'der Diamant',
    akkDef: 'den Diamant',
    bare: 'Diamant',
  },
  // die Jadefigur (f).
  'jade figurine': {
    indef: 'eine Jadefigur',
    def: 'die Jadefigur',
    akkDef: 'die Jadefigur',
    bare: 'Jadefigur',
  },
  // das Ei (n) — 'juwelenbesetzt' too long to decline cleanly; use compound bare.
  'jewel-encrusted egg': {
    indef: 'ein Ei',
    def: 'das Ei',
    akkDef: 'das Ei',
    bare: 'Ei',
  },
  // der Küchentisch (m).
  'kitchen table': {
    indef: 'ein Küchentisch',
    def: 'der Küchentisch',
    nomDef: 'der Küchentisch',
    akkDef: 'den Küchentisch',
    bare: 'Küchentisch',
  },
  // das Küchenfenster (n).
  'kitchen window': {
    indef: 'ein Küchenfenster',
    def: 'das Küchenfenster',
    akkDef: 'das Küchenfenster',
    bare: 'Küchenfenster',
  },
  // der Sack (m) + adjective 'groß'. bare 'sack' is a lexicon token.
  'large bag': {
    indef: 'ein großer Sack',
    def: 'der große Sack',
    nomDef: 'der große Sack',
    akkDef: 'den großen Sack',
    bare: 'Sack',
  },
  // der Smaragd (m).
  'large emerald': {
    indef: 'ein Smaragd',
    def: 'der Smaragd',
    nomDef: 'der Smaragd',
    akkDef: 'den Smaragd',
    bare: 'Smaragd',
  },
  // der Prospekt (m).
  leaflet: {
    indef: 'ein Prospekt',
    def: 'der Prospekt',
    nomDef: 'der Prospekt',
    akkDef: 'den Prospekt',
    bare: 'Prospekt',
  },
  // das Leck (n).
  leak: {
    indef: 'ein Leck',
    def: 'das Leck',
    akkDef: 'das Leck',
    bare: 'Leck',
  },
  // der Münzbeutel (m).
  'leather bag of coins': {
    indef: 'ein Münzbeutel',
    def: 'der Münzbeutel',
    nomDef: 'der Münzbeutel',
    akkDef: 'den Münzbeutel',
    bare: 'Münzbeutel',
  },
  // das Mittagessen (n).
  lunch: {
    indef: 'ein Mittagessen',
    def: 'das Mittagessen',
    akkDef: 'das Mittagessen',
    bare: 'Mittagessen',
  },
  // 'grue' is the untranslatable Zork monster (lexicon policy). der Grue (m).
  'lurking grue': {
    indef: 'ein Grue',
    def: 'der Grue',
    nomDef: 'der Grue',
    akkDef: 'den Grue',
    bare: 'Grue',
  },
  // die Maschine (f).
  machine: {
    indef: 'eine Maschine',
    def: 'die Maschine',
    akkDef: 'die Maschine',
    bare: 'Maschine',
  },
  // das Boot (n) + adjective 'magisch'. bare 'boot' is a lexicon token.
  'magic boat': {
    indef: 'ein magisches Boot',
    def: 'das magische Boot',
    akkDef: 'das magische Boot',
    bare: 'Boot',
  },
  // plural die Streichhölzer.
  matchbook: {
    indef: 'Streichhölzer',
    def: 'die Streichhölzer',
    akkDef: 'die Streichhölzer',
    bare: 'Streichhölzer',
  },
  // der Spiegel (m).
  mirror: {
    indef: 'ein Spiegel',
    def: 'der Spiegel',
    nomDef: 'der Spiegel',
    akkDef: 'den Spiegel',
    bare: 'Spiegel',
  },
  // plural die Berge.
  'mountain range': {
    indef: 'Berge',
    def: 'die Berge',
    akkDef: 'die Berge',
    bare: 'Berge',
  },
  // das Messer (n) + adjective 'übel'. bare 'messer' is a lexicon token.
  'nasty knife': {
    indef: 'ein übles Messer',
    def: 'das üble Messer',
    akkDef: 'das üble Messer',
    bare: 'Messer',
  },
  // plural die Geister.
  'number of ghosts': {
    indef: 'Geister',
    def: 'die Geister',
    akkDef: 'die Geister',
    bare: 'Geister',
  },
  // das Gemälde (n).
  painting: {
    indef: 'ein Gemälde',
    def: 'das Gemälde',
    akkDef: 'das Gemälde',
    bare: 'Gemälde',
  },
  // plural die Kerzen.
  'pair of candles': {
    indef: 'Kerzen',
    def: 'die Kerzen',
    akkDef: 'die Kerzen',
    bare: 'Kerzen',
  },
  // plural die Hände.
  'pair of hands': {
    indef: 'Hände',
    def: 'die Hände',
    akkDef: 'die Hände',
    bare: 'Hände',
  },
  // der Pfad (m).
  passage: {
    indef: 'ein Pfad',
    def: 'der Pfad',
    nomDef: 'der Pfad',
    akkDef: 'den Pfad',
    bare: 'Pfad',
  },
  // der Sockel (m).
  pedestal: {
    indef: 'ein Sockel',
    def: 'der Sockel',
    nomDef: 'der Sockel',
    akkDef: 'den Sockel',
    bare: 'Sockel',
  },
  // der Leichenhaufen (m).
  'pile of bodies': {
    indef: 'ein Leichenhaufen',
    def: 'der Leichenhaufen',
    nomDef: 'der Leichenhaufen',
    akkDef: 'den Leichenhaufen',
    bare: 'Leichenhaufen',
  },
  // der Laubhaufen (m).
  'pile of leaves': {
    indef: 'ein Laubhaufen',
    def: 'der Laubhaufen',
    nomDef: 'der Laubhaufen',
    akkDef: 'den Laubhaufen',
    bare: 'Laubhaufen',
  },
  // der Plastikhaufen (m).
  'pile of plastic': {
    indef: 'ein Plastikhaufen',
    def: 'der Plastikhaufen',
    nomDef: 'der Plastikhaufen',
    akkDef: 'den Plastikhaufen',
    bare: 'Plastikhaufen',
  },
  // der Platinbarren (m).
  'platinum bar': {
    indef: 'ein Platinbarren',
    def: 'der Platinbarren',
    nomDef: 'der Platinbarren',
    akkDef: 'den Platinbarren',
    bare: 'Platinbarren',
  },
  // der Goldtopf (m).
  'pot of gold': {
    indef: 'ein Goldtopf',
    def: 'der Goldtopf',
    nomDef: 'der Goldtopf',
    akkDef: 'den Goldtopf',
    bare: 'Goldtopf',
  },
  // das Gebet (n).
  prayer: {
    indef: 'ein Gebet',
    def: 'das Gebet',
    akkDef: 'das Gebet',
    bare: 'Gebet',
  },
  // das Boot (n) + adjective 'kaputt'. bare 'kaputtes boot' (the lexicon form).
  'punctured boat': {
    indef: 'ein kaputtes Boot',
    def: 'das kaputte Boot',
    akkDef: 'das kaputte Boot',
    bare: 'kaputtes Boot',
  },
  // das Wasser (n) — mass noun; indef carries no article.
  'quantity of water': {
    indef: 'Wasser',
    def: 'das Wasser',
    akkDef: 'das Wasser',
    bare: 'Wasser',
  },
  // der Regenbogen (m).
  rainbow: {
    indef: 'ein Regenbogen',
    def: 'der Regenbogen',
    nomDef: 'der Regenbogen',
    akkDef: 'den Regenbogen',
    bare: 'Regenbogen',
  },
  // die Boje (f) + adjective 'rot'. bare 'boje' is a lexicon token.
  'red buoy': {
    indef: 'eine rote Boje',
    def: 'die rote Boje',
    akkDef: 'die rote Boje',
    bare: 'Boje',
  },
  // der Knopf (m) + adjective 'rot'. bare 'knopf' is a lexicon token.
  'red button': {
    indef: 'ein roter Knopf',
    def: 'der rote Knopf',
    nomDef: 'der rote Knopf',
    akkDef: 'den roten Knopf',
    bare: 'Knopf',
  },
  // die Glocke (f) + adjective 'glühend'. bare 'glocke' is a lexicon token.
  'red hot brass bell': {
    indef: 'eine glühende Glocke',
    def: 'die glühende Glocke',
    akkDef: 'die glühende Glocke',
    bare: 'Glocke',
  },
  // der Fluss (m).
  river: {
    indef: 'ein Fluss',
    def: 'der Fluss',
    nomDef: 'der Fluss',
    akkDef: 'den Fluss',
    bare: 'Fluss',
  },
  // das Seil (n).
  rope: {
    indef: 'ein Seil',
    def: 'das Seil',
    akkDef: 'das Seil',
    bare: 'Seil',
  },
  // das Messer (n) + adjective 'rostig'. bare 'messer' is a lexicon token.
  'rusty knife': {
    indef: 'ein rostiges Messer',
    def: 'das rostige Messer',
    akkDef: 'das rostige Messer',
    bare: 'Messer',
  },
  // der Seemann (m).
  sailor: {
    indef: 'ein Seemann',
    def: 'der Seemann',
    nomDef: 'der Seemann',
    akkDef: 'den Seemann',
    bare: 'Seemann',
  },
  // der Sand (m) — mass noun; indef carries no article.
  sand: {
    indef: 'Sand',
    def: 'der Sand',
    nomDef: 'der Sand',
    akkDef: 'den Sand',
    bare: 'Sand',
  },
  // das Armband (n).
  'sapphire-encrusted bracelet': {
    indef: 'ein Armband',
    def: 'das Armband',
    akkDef: 'das Armband',
    bare: 'Armband',
  },
  // das Zepter (n).
  sceptre: {
    indef: 'ein Zepter',
    def: 'das Zepter',
    akkDef: 'das Zepter',
    bare: 'Zepter',
  },
  // der Schraubenzieher (m).
  screwdriver: {
    indef: 'ein Schraubenzieher',
    def: 'der Schraubenzieher',
    nomDef: 'der Schraubenzieher',
    akkDef: 'den Schraubenzieher',
    bare: 'Schraubenzieher',
  },
  // plural die Zähne.
  'set of teeth': {
    indef: 'Zähne',
    def: 'die Zähne',
    akkDef: 'die Zähne',
    bare: 'Zähne',
  },
  // die Schaufel (f).
  shovel: {
    indef: 'eine Schaufel',
    def: 'die Schaufel',
    akkDef: 'die Schaufel',
    bare: 'Schaufel',
  },
  // das Skelett (n).
  skeleton: {
    indef: 'ein Skelett',
    def: 'das Skelett',
    akkDef: 'das Skelett',
    bare: 'Skelett',
  },
  // der Schlüssel (m) — deliberately ambiguous with 'wrench' (lexicon policy).
  'skeleton key': {
    indef: 'ein Schlüssel',
    def: 'der Schlüssel',
    nomDef: 'der Schlüssel',
    akkDef: 'den Schlüssel',
    bare: 'Schlüssel',
  },
  // der Briefkasten (m) — needs a baked dative contraction for a bounded set.
  'small mailbox': {
    indef: 'ein Briefkasten',
    def: 'der Briefkasten',
    nomDef: 'der Briefkasten',
    akkDef: 'den Briefkasten',
    imDat: 'im Briefkasten',
    bare: 'Briefkasten',
  },
  // die Glasschlacke (f).
  'small piece of vitreous slag': {
    indef: 'eine Glasschlacke',
    def: 'die Glasschlacke',
    akkDef: 'die Glasschlacke',
    bare: 'Glasschlacke',
  },
  // der Kohlehaufen (m).
  'small pile of coal': {
    indef: 'ein Kohlehaufen',
    def: 'der Kohlehaufen',
    nomDef: 'der Kohlehaufen',
    akkDef: 'den Kohlehaufen',
    bare: 'Kohlehaufen',
  },
  // der Singvogel (m).
  songbird: {
    indef: 'ein Singvogel',
    def: 'der Singvogel',
    nomDef: 'der Singvogel',
    akkDef: 'den Singvogel',
    bare: 'Singvogel',
  },
  // die Treppe (f).
  stairs: {
    indef: 'eine Treppe',
    def: 'die Treppe',
    akkDef: 'die Treppe',
    bare: 'Treppe',
  },
  // das Stilett (n).
  stiletto: {
    indef: 'ein Stilett',
    def: 'das Stilett',
    akkDef: 'das Stilett',
    bare: 'Stilett',
  },
  // das Hügelgrab (n).
  'stone barrow': {
    indef: 'ein Hügelgrab',
    def: 'das Hügelgrab',
    akkDef: 'das Hügelgrab',
    bare: 'Hügelgrab',
  },
  // die Steintür (f).
  'stone door': {
    indef: 'eine Steintür',
    def: 'die Steintür',
    akkDef: 'die Steintür',
    bare: 'Steintür',
  },
  // die Mauer (f).
  'surrounding wall': {
    indef: 'eine Mauer',
    def: 'die Mauer',
    akkDef: 'die Mauer',
    bare: 'Mauer',
  },
  // der Schalter (m).
  switch: {
    indef: 'ein Schalter',
    def: 'der Schalter',
    nomDef: 'der Schalter',
    akkDef: 'den Schalter',
    bare: 'Schalter',
  },
  // das Schwert (n).
  sword: {
    indef: 'ein Schwert',
    def: 'das Schwert',
    akkDef: 'das Schwert',
    bare: 'Schwert',
  },
  // der Tisch (m).
  table: {
    indef: 'ein Tisch',
    def: 'der Tisch',
    nomDef: 'der Tisch',
    akkDef: 'den Tisch',
    bare: 'Tisch',
  },
  // das Etikett (n).
  'tan label': {
    indef: 'ein Etikett',
    def: 'das Etikett',
    akkDef: 'das Etikett',
    bare: 'Etikett',
  },
  // der Dieb (m).
  thief: {
    indef: 'ein Dieb',
    def: 'der Dieb',
    nomDef: 'der Dieb',
    akkDef: 'den Dieb',
    bare: 'Dieb',
  },
  // die Fackel (f).
  torch: {
    indef: 'eine Fackel',
    def: 'die Fackel',
    akkDef: 'die Fackel',
    bare: 'Fackel',
  },
  // der Reiseführer (m).
  'tour guidebook': {
    indef: 'ein Reiseführer',
    def: 'der Reiseführer',
    nomDef: 'der Reiseführer',
    akkDef: 'den Reiseführer',
    bare: 'Reiseführer',
  },
  // die Falltür (f).
  'trap door': {
    indef: 'eine Falltür',
    def: 'die Falltür',
    akkDef: 'die Falltür',
    bare: 'Falltür',
  },
  // der Baum (m).
  tree: {
    indef: 'ein Baum',
    def: 'der Baum',
    nomDef: 'der Baum',
    akkDef: 'den Baum',
    bare: 'Baum',
  },
  // der Troll (m).
  troll: {
    indef: 'ein Troll',
    def: 'der Troll',
    nomDef: 'der Troll',
    akkDef: 'den Troll',
    bare: 'Troll',
  },
  // die Vitrine (f).
  'trophy case': {
    indef: 'eine Vitrine',
    def: 'die Vitrine',
    akkDef: 'die Vitrine',
    bare: 'Vitrine',
  },
  // die Schatztruhe (f).
  'trunk of jewels': {
    indef: 'eine Schatztruhe',
    def: 'die Schatztruhe',
    akkDef: 'die Schatztruhe',
    bare: 'Schatztruhe',
  },
  // die Tube (f).
  tube: {
    indef: 'eine Tube',
    def: 'die Tube',
    akkDef: 'die Tube',
    bare: 'Tube',
  },
  // die Schmiere (f).
  'viscous material': {
    indef: 'eine Schmiere',
    def: 'die Schmiere',
    akkDef: 'die Schmiere',
    bare: 'Schmiere',
  },
  // die Wand (f) + 'mit Gravuren' — bare 'wand mit gravuren' (the lexicon form).
  'wall with engravings': {
    indef: 'eine Wand mit Gravuren',
    def: 'die Wand mit Gravuren',
    akkDef: 'die Wand mit Gravuren',
    bare: 'Wand mit Gravuren',
  },
  // das Wasser (n).
  water: {
    indef: 'Wasser',
    def: 'das Wasser',
    akkDef: 'das Wasser',
    bare: 'Wasser',
  },
  // plural die Klippen + adjective 'weiß'. bare 'klippen' is a lexicon token.
  'white cliffs': {
    indef: 'weiße Klippen',
    def: 'die weißen Klippen',
    akkDef: 'die weißen Klippen',
    bare: 'Klippen',
  },
  // das Haus (n) + adjective 'weiß'. bare 'haus' is a lexicon token.
  'white house': {
    indef: 'ein weißes Haus',
    def: 'das weiße Haus',
    akkDef: 'das weiße Haus',
    bare: 'Haus',
  },
  // die Holztür (f).
  'wooden door': {
    indef: 'eine Holztür',
    def: 'die Holztür',
    akkDef: 'die Holztür',
    bare: 'Holztür',
  },
  // die Holzleiter (f).
  'wooden ladder': {
    indef: 'eine Holzleiter',
    def: 'die Holzleiter',
    akkDef: 'die Holzleiter',
    bare: 'Holzleiter',
  },
  // das Geländer (n).
  'wooden railing': {
    indef: 'ein Geländer',
    def: 'das Geländer',
    akkDef: 'das Geländer',
    bare: 'Geländer',
  },
  // der Schraubenschlüssel (m).
  wrench: {
    indef: 'ein Schraubenschlüssel',
    def: 'der Schraubenschlüssel',
    nomDef: 'der Schraubenschlüssel',
    akkDef: 'den Schraubenschlüssel',
    bare: 'Schraubenschlüssel',
  },
  // der Knopf (m) + adjective 'gelb'. bare 'knopf' is a lexicon token.
  'yellow button': {
    indef: 'ein gelber Knopf',
    def: 'der gelbe Knopf',
    nomDef: 'der gelbe Knopf',
    akkDef: 'den gelben Knopf',
    bare: 'Knopf',
  },
  // Printed name keeps the game's "ZORK" capitalization; ZORK1_DE_CANONICAL
  // maps it onto the lowercase vocab canonical. The display drops the brand
  // ('Handbuch') so the lexicon never needs 'zork' as a German surface word.
  "ZORK owner's manual": {
    indef: 'ein Handbuch',
    def: 'das Handbuch',
    akkDef: 'das Handbuch',
    bare: 'Handbuch',
  },
  // der Zorkmid (m) — untranslatable currency proper noun.
  zorkmid: {
    indef: 'ein Zorkmid',
    def: 'der Zorkmid',
    nomDef: 'der Zorkmid',
    akkDef: 'den Zorkmid',
    bare: 'Zorkmid',
  },
}

/** Printed name → vocab canonical, for entries whose printed name differs from
 * the extracted-vocab canonical key in DE_ZORK1. Identity when absent.
 * Mirrors ZORK1_FR_CANONICAL / ZORK1_ES_CANONICAL. */
export const ZORK1_DE_CANONICAL: Readonly<Record<string, string>> = {
  "ZORK owner's manual": "zork owner's manual",
}
