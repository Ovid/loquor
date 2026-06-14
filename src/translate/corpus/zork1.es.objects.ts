// Zork I × Spanish object forms (spec §4.2). Keys are EN printed names (same
// keys as zork1.fr.objects.ts). Spanish form keys: indef ("una botella"),
// def ("la botella"), bare ("botella"); add alDef/delDef ONLY where a template
// needs the a+el→al / de+el→del contraction (Task 6). Authored in Task 5.
import type { ObjectsTable } from '../types'

export const ZORK1_ES_OBJECTS: ObjectsTable = {}

/** Printed name → vocab canonical, for entries whose printed name differs from
 * the extracted-vocab canonical key in ES_ZORK1. Identity when absent. */
export const ZORK1_ES_CANONICAL: Readonly<Record<string, string>> = {}
