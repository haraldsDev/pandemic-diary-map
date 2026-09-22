# What annotators are allowed to use

Annotators may infer presence if the entry text contains internal evidence such as:

- first-person embodied actions (“I went”, “I sat”, “I walked”, “I was there”)
- sensory experience tied to the place (“it was cold in the church”, “the smell in the café”)
- movement sequences (“I took the tram to X and stayed there”)
- deixis grounded in the entry (“here”, “inside”, “outside”) when anchored by context

All of this is legitimate inference — because it comes from the entry itself.

# What annotators must not use

Annotators must not rely on:

- general knowledge about the place (“people usually go there”)
- plausibility or stereotypes (“sounds like they must have been there”)
- assumptions about habits (“they live in Riga, so probably…”)
- knowledge from other diary entries (only the current entry_text counts)

This keeps the annotation:

- local
- reproducible
- fair to both humans and LLMs

# The final decision rule

Label YES if the diary entry provides sufficient internal textual evidence that the author is physically present at the mentioned location at the time of narration.

Label NO if:

- the author is clearly not present, or
- the entry does not provide enough internal evidence to determine presence.

That preserves the original intent exactly.
