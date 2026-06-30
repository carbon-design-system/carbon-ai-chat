# tone.md — voice and tone for Carbon AI Chat docs

Read this before writing any developer-facing copy: README files, JSDoc on public types, Storybook MDX, and the docs in [packages/ai-chat/docs/](../packages/ai-chat/docs). It governs how the words sound. It does not cover markdown structure (see [../packages/ai-chat/docs/references/doc-style.md](../packages/ai-chat/docs/references/doc-style.md)) or JSDoc mechanics (see [packages/ai-chat/src/types/AGENTS.md](../packages/ai-chat/src/types/AGENTS.md)).

We mirror the voice of [carbondesignsystem.com](https://carbondesignsystem.com/guidelines/content/overview/).

## The mandate

Write the fewest words that convey the idea. Every word a reader skips is a word you should have cut. Your primary audience is mid-level front-end developers. If you can explain a concept with code instead of prose, prefer code.

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
- **Lead with the task.** Open a section with what the reader does, then explain the mechanism.

## Word economy

Length hides the idea. Cut until only the idea is left.

- **One idea per sentence.** If a sentence has two "and"s, split it.
- **Delete filler.** Common offenders and their fixes:

  | Wordy                           | Tight       |
  | ------------------------------- | ----------- |
  | in order to                     | to          |
  | is able to / has the ability to | can         |
  | there is an X that              | X           |
  | due to the fact that            | because     |
  | please note that                | _(delete)_  |
  | utilize / make use of           | use         |
  | in the event that               | if          |
  | a number of                     | some / many |

- **Cut throat-clearing.** "It is important to note," "as you can see," "basically," "simply" — delete them and the sentence is stronger.
- **Prefer the verb over the noun phrase.** "configure the launcher," not "perform configuration of the launcher."

## Tone — flexes with context

Voice stays constant; tone shifts to fit the moment.

- **Terse for terse moments.** Error messages, empty states, and labels are short and direct — fragments over sentences. "No conversations yet." not "There are currently no conversations to display."
- **Warmer for onboarding and concepts.** A guide's overview or a getting-started README can use full, friendly sentences to orient a newcomer.

## Before and after

**JSDoc property**

- Before: "This is the timeout value that will be used in order to determine how long we should wait before we cancel the request."
- After: "Time to wait before cancelling the request, in milliseconds."

**Doc sentence**

- Before: "It is possible for you to make use of this method in the event that you would like to update a message."
- After: "Use this method to update a message."

**Storybook blurb**

- Before: "This component provides the ability for users to be able to render a wide variety of different custom content."
- After: "Render your own content in any slot."

## Related guidance

- [../packages/ai-chat/docs/references/doc-style.md](../packages/ai-chat/docs/references/doc-style.md) — markdown structure for the docs site.
- [packages/ai-chat/src/types/AGENTS.md](../packages/ai-chat/src/types/AGENTS.md) — JSDoc mechanics for public types.
- [AGENTS.md](../AGENTS.md) — repository-wide guidance.
