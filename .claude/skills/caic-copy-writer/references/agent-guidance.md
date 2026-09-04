# agent-guidance.md — AGENTS.md, references/, and skills (type 7)

Load this before writing an `AGENTS.md`, a file under any `references/`, or a skill. Structural owner: [authoring-agents-md.md](../../../../references/authoring-agents-md.md). It owns the file budget, one-topic-per-file, the "read when…" triggers, the Related-guidance footer, and the skill-versus-reference split. Read it for the shape, and this for the words.

**An agent loads this copy top-down, and every token you spend is a token it spends.** Density is the standard.

- **Open each rule with a bolded imperative.** An agent skimming reads the first three words of a bullet, so put the instruction there and the qualification after it.
- **Write a rule that can only be applied one way.** A hedge reads as nuance to a person and as a choice to an agent, and two agents will choose differently.
- **Say what to do, not only what to avoid.** A bare prohibition leaves the correct action unstated, so pair it with the positive form.
- **Put the trigger in the link text.** "Read when adding a locale key" tells the reader whether to open the file; a topic name does not.

This type is plain markdown, so the score in step 3 of the loop is trustworthy.

## Gate

`npm run validate:agents` and `npm run validate:skills`.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [authoring-agents-md.md](../../../../references/authoring-agents-md.md) — file budgets, routing, and the skill-vs-reference split
- [.bob/skills/README.md](../../README.md) — the skill collection and its mirror rules
