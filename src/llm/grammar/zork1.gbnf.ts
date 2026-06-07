// src/llm/grammar/zork1.gbnf.ts
// Hand-curated GBNF for Zork I (ZIL-derived vocabulary is future work).
// ALWAYS includes the abstain production. Expand the noun/verb sets against
// zork1.corpus.ts until the gate passes.
export const ZORK1_GBNF = `
root ::= command
command ::= action | abstain
abstain ::= "__UNKNOWN__"
action ::= movement | verb-only | verb-noun
movement ::= "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest" | "up" | "down" | "enter" | "exit"
verb-only ::= "look" | "inventory" | "wait" | "again" | "quit"
verb-noun ::= transitive " " noun
transitive ::= "take" | "drop" | "open" | "close" | "read" | "examine" | "turn on" | "turn off" | "move" | "push" | "eat" | "drink" | "kill"
noun ::= "lantern" | "lamp" | "sword" | "mailbox" | "leaflet" | "door" | "window" | "egg" | "rug" | "trap door" | "grating" | "bottle" | "water" | "garlic" | "rope" | "knife" | "troll" | "thief"
`.trim()
