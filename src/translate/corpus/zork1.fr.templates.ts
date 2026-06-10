// Zork I × French composing patterns (spec §4.3). Tried in specificity order;
// {obj}-resolving templates beat {raw} ones of the same shape (match.ts owns
// the ordering — author in any order).
import type { Template } from '../types'

export const ZORK1_FR_TEMPLATES: readonly Template[] = []
