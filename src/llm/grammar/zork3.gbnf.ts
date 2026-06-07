// src/llm/grammar/zork3.gbnf.ts
export const ZORK3_GBNF = `
root ::= command
command ::= action | abstain
abstain ::= "__UNKNOWN__"
action ::= movement | verb-only | verb-noun
movement ::= "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest" | "up" | "down" | "enter" | "exit"
verb-only ::= "look" | "inventory" | "wait" | "again" | "quit"
verb-noun ::= transitive " " noun
transitive ::= "take" | "drop" | "open" | "close" | "read" | "examine" | "turn on" | "turn off" | "give" | "push" | "kill"
noun ::= "lamp" | "staff" | "sword" | "hood" | "cloak" | "key" | "door" | "amulet" | "ring" | "chest" | "table" | "man"
`.trim()
