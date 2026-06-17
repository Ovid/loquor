Need a proper responsive run.

---

Sound effects?

---

Map?

---

need a "help" command to give general instructions and list special commands.
Those special commands should also have foreign language equivalents, so that
users who speak different languages can understand them. It should also
explain the "quoted english" fallback, so that the user understands that if
they type a command in their native language and it fails, they can try typing
the command in English (enclosed in quotes) to see if it works.

---

if a command fails in another language, there should be help text in that
language to explain the "quoted english" fallback that the user can try
instead.

---

```
you arriba

> up
```

We need a "preferences" panel where users can turn on "debug" to see this.
Otherwise, they only should see `> arriba` and not the fallback `> up`.

---

Is there a test we can write which validates that all text in each zork is
properly translated into each language, including all words allowed, for every
language?

---

"it" doesn't always work as expected:

ZORK I: The Great Underground Empire

Infocom interactive fiction - a fantasy story

Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.

ZORK is a registered trademark of Infocom, Inc.

Release 119 / Serial number 880429

West of House

You are standing in an open field west of a white house, with a boarded front door.

There is a small mailbox here.

you open it

> open mailbox

Opening the small mailbox reveals a leaflet.

you read it and drop it

> read advertisement

(Taken)

"WELCOME TO ZORK!

ZORK is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals. No computer should be without one!"

> drop advertisement

Dropped.

> east

The door is boarded and you can't remove the boards.

> west

Forest

This is a forest, with trees in all directions. To the east, there appears to be sunlight.

> east

Forest Path

This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the edge of the path.

> south

North of House

You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.

> south

The windows are all boarded.

> east

Behind House

You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.

you open it

> open advertisement

You can't see any advertisement here!

---

Another parsing issue

RK I: The Great Underground Empire

Infocom interactive fiction - a fantasy story

Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.

ZORK is a registered trademark of Infocom, Inc.

Release 119 / Serial number 880429

West of House

You are standing in an open field west of a white house, with a boarded front door.

There is a small mailbox here.

> open it, take the paper, and read it

Opening the small mailbox reveals a leaflet.

There seems to be a noun missing in that sentence!

>
