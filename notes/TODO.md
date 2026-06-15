agentic-a11y

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

Is there a script we can write which can programatically validate that all
text in each zork is properly translated into each language, including all
words allowed?
