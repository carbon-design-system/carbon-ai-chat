---
name: caic-copy-writer
description: Write the copy this repo ships, routed by which kind it is — public JSDoc, internal comments, docs-site pages, Storybook MDX, package and example READMEs, end-user UI strings, agent guidance, commit bodies, PR descriptions, issue bodies, ADR prose, and the errors thrown at a host developer — each with its own audience, rules file, and gate, plus the draft-measure-revise loop every one of them ends with. Use when the user asks to "write the README for X", "document this type", "word this error message", or "tighten this doc". Load it unprompted too, before writing copy that rides along with another task — JSDoc on a new public type, a comment above non-obvious code, a new string in en.json, the text of a thrown error, or the body of a commit, PR, issue, or ADR — since those carry different rules and none of them arrives worded as a copy request.
---

This skill owns how the words go, for every surface this repo writes. Find your type in the table, open its rules file, then write.

**Each type has its own audience, rules, and gate**, and types 1 and 2 carry opposite instructions — so one set of rules applied to all thirteen is wrong in both directions at once. Routing first is the whole point of this skill.

Voice is the part that does not vary: read [tone.md](../../../references/tone.md) once for the mandate, the constant voice, and the quick rules.

## Which kind of copy?

| # | Type | Rules — read before writing | Lives in | Audience | Gate |
| --- | --- | --- | --- | --- | --- |
| 1 | Public JSDoc | [public-jsdoc.md](references/public-jsdoc.md) | `packages/ai-chat/src/types/` | Consumer developers, via TypeDoc and the MCP index | TypeDoc build |
| 2 | Internal comments | [internal-comments.md](references/internal-comments.md) | everything else under `packages/*/src/**`, both packages | Maintainers reading the source | Review |
| 3 | Docs-site pages | [docs-pages.md](references/docs-pages.md) | `packages/ai-chat/docs/` | Consumer developers | `reading-level`, and registered in `projectDocuments` |
| 4 | Storybook MDX | [storybook-mdx.md](references/storybook-mdx.md) | `__stories__/` in `packages/ai-chat-components/` | Developers evaluating a component | Clean `addon-a11y` on 6006 and 7007 |
| 5 | Example copy | [example-copy.md](references/example-copy.md) | READMEs and source comments under `examples/` | A developer copying a starting point | `npm run verify:example-readmes` |
| 6 | End-user UI strings | [ui-strings.md](references/ui-strings.md) | `packages/ai-chat/src/chat/languages/en.json` | **The person using the chat** | The public-types surface |
| 7 | Agent guidance | [agent-guidance.md](references/agent-guidance.md) | `AGENTS.md`, `references/`, `.bob/skills/` | Agents | `validate:agents`, `validate:skills` |
| 8 | Commit bodies | [commit-bodies.md](references/commit-bodies.md) | the commit message | The reviewer walking the branch | Review |
| 9 | PR descriptions | [pr-descriptions.md](references/pr-descriptions.md) | `.github/pr-drafts/` | The reviewer, then anyone reading post-merge | `reading-level` on the draft |
| 10 | Issue and epic bodies | [issue-bodies.md](references/issue-bodies.md) | `.github/issue-drafts/` | Anyone deciding whether it concerns them | `reading-level` on the draft |
| 11 | ADR prose | [adr-prose.md](references/adr-prose.md) | `docs/adr/` | A reader years later, who was not in the room | [adr-review.md](../caic-adr/references/adr-review.md) |
| 12 | Error and console strings | [error-strings.md](references/error-strings.md) | thrown `Error`s and `consoleError` calls in `packages/*/src/**` | A host developer at runtime, in a console | Review |
| 13 | Package and repo READMEs | [readme-copy.md](references/readme-copy.md) | `README.md`, `packages/*/README.md` | A developer sizing the package up on npm or GitHub | `reading-level` |

Each rules file names its **structural owner** — the document that decides which sections exist and what goes in them. Read that too for anything net-new. Types 8 through 11 split cleanly: the workflow skill owns the structure and the procedure, this skill owns the wording.

| Type | Structure and procedure | Wording |
| --- | --- | --- |
| 8 | [conventions.md](../../../references/conventions.md#commits) | [commit-bodies.md](references/commit-bodies.md) |
| 9 | [caic-pr](../caic-pr/SKILL.md) | [pr-descriptions.md](references/pr-descriptions.md) |
| 10 | [caic-issue](../caic-issue/SKILL.md) | [issue-bodies.md](references/issue-bodies.md) |
| 11 | [caic-adr](../caic-adr/SKILL.md) | [adr-prose.md](references/adr-prose.md) |

Plan files have no row. They are git-ignored working drafts, so [caic-plan](../caic-plan/SKILL.md) keeps them whole, and only [revision-pass.md](references/revision-pass.md) reaches them.

## The loop

Rules on their own produce a draft nobody measured. Run all five steps.

1. **Route.** Find your row above, open its rules file, and read the structural owner it names. Read [tone.md](../../../references/tone.md) for voice.
2. **Draft.** The fewest words that carry the idea.
3. **Measure, where a number exists.** Run `npm run reading-level -- <file>`. [tone.md](../../../references/tone.md) owns the ceiling and what a score means. Over it, shorten sentences and swap long words for short ones. Never buy the grade by cutting a qualifier that carries the contract.
4. **Revise.** [revision-pass.md](references/revision-pass.md), every time, including when step 3 came back green.
5. **Gate.** The command in your row, plus whatever [definition-of-done.md](../../../references/definition-of-done.md) lists for the area you touched.

**Types 3, 5, 7, 9, 10, 11, and 13 are where the number is trustworthy** — they are plain markdown. The scorer reads any file you hand it but strips only markdown, so a type-4 MDX file scores its JSX as prose and comes back inflated. Types 1, 2, 6, 8, and 12 are TypeScript, JSON, or not a file at all, so step 3 does not apply and step 4 does the whole job by hand.

## Related guidance

- [revision-pass.md](references/revision-pass.md) — the tightening pass and word economy that bind all thirteen types
- [tone.md](../../../references/tone.md) — the voice, quick rules, and grade ceiling that hold for every type
- [definition-of-done.md](../../../references/definition-of-done.md) — the gates for the area a copy change lands in
- [caic-review](../caic-review/SKILL.md) — holding a diff's copy to these rules

Task input from the user, if any: $ARGUMENTS
