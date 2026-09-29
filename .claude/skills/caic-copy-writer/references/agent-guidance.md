# agent-guidance.md — AGENTS.md, references/, and skills (type 7)

Load this before writing an `AGENTS.md`, a file under any `references/`, or a skill. Structural owner: [authoring-agents-md.md](../../../../references/authoring-agents-md.md). It owns the file budget, one-topic-per-file, the "read when…" triggers, the Related-guidance footer, and the skill-versus-reference split. Read it for the shape, and this for the words.

Give the agent the facts, choices, and constraints it needs for this task. Keep the reading path short without dropping a required check.

- **Lead with the action.** Put the condition beside the instruction it limits.
- **Make constraints precise.** Use exact commands for fragile operations. When judgment is intended, state the outcome and the factors that guide it.
- **Say what to do, not only what to avoid.** A bare prohibition leaves the correct action unstated, so pair it with the positive form.
- **Put the trigger in the link text.** "Read when adding a locale key" tells the reader whether to open the file; a topic name does not.

Use the reading-level score to spot dense prose. Read the workflow too: a low score cannot prove that its instructions preserve the requested scope.

## Gate

`npm run validate:agents` and `npm run validate:skills`.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [authoring-agents-md.md](../../../../references/authoring-agents-md.md) — file budgets, routing, and the skill-vs-reference split
- [.bob/skills/README.md](../../README.md) — the skill collection and its mirror rules
