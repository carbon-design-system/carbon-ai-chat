# tone.md — voice and tone for Carbon AI Chat docs

Read this before writing any copy this repo ships — every surface in [caic-copy-writer](../.bob/skills/caic-copy-writer/SKILL.md)'s table, from JSDoc to a commit body. It governs how the words sound, and only that: markdown structure is [doc-style.md](../packages/ai-chat/docs/references/doc-style.md), JSDoc mechanics are [types/AGENTS.md](../packages/ai-chat/src/types/AGENTS.md), and anything that changes with the copy type belongs to the skill.

We mirror the voice of [carbondesignsystem.com](https://carbondesignsystem.com/guidelines/content/overview/).

## The mandate

Write the fewest words that convey the idea. Every word a reader skips is a word you should have cut. **Audience varies by copy type** — a JSDoc block, a docs page, and a string in the chat UI are read by three different people — so take the audience, the rules, and the gate for what you are writing from [caic-copy-writer](../.bob/skills/caic-copy-writer/SKILL.md). If you can explain a concept with code instead of prose, prefer code.

Write so a developer gets it on the first read. **Grade 10 is the ceiling, and there is no floor.** A page that scores 6 because it is plain is a good page. The levers are sentence length and word choice; [revision-pass.md](../.bob/skills/caic-copy-writer/references/revision-pass.md) carries both. Keep most sentences short and one-idea, but let a sentence run when the idea needs it. Never pad a sentence to raise a score. One habit matters most for API docs. Refer to a symbol with a `{@link}`, then use plain words for it. The scorer strips `{@link}` links, so each reference is free. Carry the meaning in the plain words around it. A dotted name like `InputConfig.updateStructuredData` written as plain text or inline code still counts as one long word. Repeat it and you push the page toward a graduate reading level.

Measure any doc with `npm run reading-level -- <file>`. It reports the Flesch-Kincaid grade. Treat a score above 10 as a defect to fix. No score is too low to ship.

## Voice — constant

Voice is who we are; it never changes. Carbon's voice:

- Has a clear point of view. Say the one thing the reader needs, plainly.
- Is simple and logical. One idea leads to the next.
- Is persuasive, not poetic. No flourishes, no hype.
- Is confident, but not boastful. State what the thing does, not how great it is.
- Speaks like the reader, not at them. Everyday words a developer already uses.

## Quick rules

Apply these mechanically — you don't have to be a wordsmith to follow them.

- **Active voice.** "The chat fires an event," not "an event is fired by the chat."
- **Present tense.** "`addMessage` inserts a message," not "will insert." Avoid tense built on _have, has, had, been, should, would, will_.
- **Second person.** Address the reader as "you." Never "we," "our," or "I" — the reader cares what _they_ can do.
- **Sentence case.** Capitalize only the first word and proper nouns, in headings and body alike. Exceptions: product, service, and trademarked names.
- **Short, everyday words.** "use," not "utilize." "to," not "in order to." Short words read faster.
- **Contractions are fine.** "it's," "you'll," "don't" — they keep the tone human.
- **No marketing language and no emoji.** Describe; don't sell.
- **Gloss an internal name on first use.** `projectDocuments`, `es-custom`, `PublicConfig.strings` — when your reader may not know the name, say what it is in a few words the first time it appears. Otherwise it is a stop-and-search.
- **Lead with the task.** Open a section with what the reader does, then the mechanism. The same rule at document scale — the claim ahead of its scaffolding and larger than it — is [claim before scaffolding](../.bob/skills/caic-copy-writer/references/revision-pass.md#claim-before-scaffolding), which owns it and is checked at revise time.

## Tone — flexes with context

Voice stays constant; tone shifts to fit the moment.

- **Terse for terse moments.** Empty states and labels are short and direct — fragments over sentences. "No conversations yet." not "There are currently no conversations to display." Errors a developer reads in a console go the other way: [error-strings.md](../.bob/skills/caic-copy-writer/references/error-strings.md) wants a full sentence.
- **Warmer for onboarding and concepts.** A guide's overview or a getting-started README can use full, friendly sentences to orient a newcomer.

## Related guidance

- [../packages/ai-chat/docs/references/doc-style.md](../packages/ai-chat/docs/references/doc-style.md) — markdown structure for the docs site.
- [packages/ai-chat/src/types/AGENTS.md](../packages/ai-chat/src/types/AGENTS.md) — JSDoc mechanics for public types.
- [caic-copy-writer](../.bob/skills/caic-copy-writer/SKILL.md) — which rules, audience, and gate apply to the kind of copy you're writing, from JSDoc to a commit body.
- [revision-pass.md](../.bob/skills/caic-copy-writer/references/revision-pass.md) — the tightening pass and word economy under every one of them.
- [AGENTS.md](../AGENTS.md) — repository-wide guidance.
