// src/llm/grammar/zork2.gbnf.ts
export const ZORK2_GBNF = `
root ::= command
command ::= action | abstain
abstain ::= "__UNKNOWN__"
action ::= movement | verb-only | verb-noun
movement ::= "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest" | "up" | "down" | "enter" | "exit"
verb-only ::= "look" | "inventory" | "wait" | "again" | "quit"
verb-noun ::= transitive " " noun
transitive ::= "take" | "drop" | "open" | "close" | "read" | "examine" | "turn on" | "turn off" | "move" | "push" | "press" | "kill"
noun ::= "lamp" | "sword" | "wand" | "key" | "door" | "candle" | "book" | "balloon" | "dragon" | "unicorn" | "robot" | "button" | "cake"
`.trim()
