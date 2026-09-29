# adr-prose.md — ADR prose (type 11)

Load this before writing the body of a numbered ADR under `docs/adr/`. Structural owner: [caic-adr](../../caic-adr/SKILL.md) and [docs/adr/template.md](../../../../docs/adr/template.md), which own the sections and what each settles.

**An ADR has two readers.** First, a host developer deciding from one screen whether a proposal concerns them. Later, a maintainer holding a diff up against what was decided. The top of the page is for the first reader and the Reference is for the second.

- **Open the Summary and Motivation with the problem, in plain language.** Say who is affected and what goes wrong before any type name, file path, or internal term. Write it for a developer who uses the chat but has never read its source.
- **State the proposal as a claim, not a history.** "The SDK ships as an entry point in `@carbon/ai-chat`," not "after considering several packaging options…". What was considered belongs in Alternatives, or in the discussion when the record leaves that section out.
- **Claim before scaffolding.** Summary and Proposal carry the ask. Together they stay larger than Motivation and the optional sections behind Proposal.
- **Show code before prose in Proposal, and in Consumer impact when a record has one.** A sample of what a host writes carries a surface faster than a paragraph about it. Words carry only what the code can't show.
- **Make Reference precise enough to review a diff against.** State defaults, failure paths, and timing as facts. A hedge here reads as two allowed behaviors.
- **Write Reference blocks as commented types**, per [caic-adr](../../caic-adr/SKILL.md). The wording rule that follows from it: `reading-level` can't see inside a fence, so hold that JSDoc to the same plainness by reading it yourself.
- **Describe costs as what a host experiences.** "Your build fails with a missing-module error," not "the peer dependency is no longer auto-installed." Evidence from the source goes in the PR description, never as file:line citations in the ADR.
- **Gloss an internal name on first use**, and in the clause that links another ADR, epic, or issue, say what it decided. Years later, half of those links are closed.
- **Address the reader as "you."** Per [tone.md](../../../../references/tone.md), write "this proposal", not "we propose".

## Gate

1. **`npm run reading-level -- docs/adr/<file>.md` at grade 10 or below.**
2. **Read the Summary alone, for order.** The score is blind to a buried proposal.
3. **Review against [adr-review.md](../../caic-adr/references/adr-review.md).**

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [caic-adr](../../caic-adr/SKILL.md) — the sections, the review, and opening the discussion
- [revision-pass.md](revision-pass.md) — the tightening pass, and the claim-before-scaffolding rule
- [issue-bodies.md](issue-bodies.md) — the same plain-language opening, for issues
