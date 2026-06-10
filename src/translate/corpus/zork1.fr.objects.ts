// Zork I × French object forms (spec §4.2). Keys are EN printed names as they
// appear in output. French form keys: indef ("une bouteille en verre"),
// def ("la bouteille en verre"), bare ("bouteille en verre"). Gender and
// elision live entirely in the pre-composed strings — there is no grammar
// code. Base noun phrases are SOURCED FROM the FR input lexicon
// (src/llm/lexicon/fr.zork1.ts); the round-trip gate (roundtrip.test.ts)
// enforces alignment.
import type { ObjectsTable } from '../types'

export const ZORK1_FR_OBJECTS: ObjectsTable = {}

/** Printed name → vocab canonical, for entries whose printed name differs
 * from the extracted-vocab canonical key in FR_ZORK1. Identity when absent. */
export const ZORK1_FR_CANONICAL: Readonly<Record<string, string>> = {}
