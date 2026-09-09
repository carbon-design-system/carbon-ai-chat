# pr-descriptions.md — the pull-request description (type 9)

Load this before filling in `.github/pr-drafts/<branch-name>.md`. Structural owner: [caic-pr](../../caic-pr/SKILL.md), which owns the template's sections, the commit range, and what each section takes.

**Brevity is the goal.** The reviewer is busy and the diff is the source of truth — the description points at what is non-obvious, it does not narrate the diff. Default to the shortest version that still conveys the change; err on the side of cutting.

It also outlives the branch. Commit bodies die at the squash ([commit-bodies.md](commit-bodies.md)), so anything a post-merge reader needs is worded here or nowhere.

- **Sentence fragments over full sentences.** Cut filler: "this PR", "in order to", "as well as", "note that", restated context.
- **One idea per line.** Don't stack parenthetical asides inside a bullet.
- **Say each thing once.** Don't repeat a change across Short description, Changelog, and Testing.
- **Omit empty or trivial sections** rather than padding them — no "None" placeholders.
- **A description favors fragments, so it scores low.** That is fine; it should read like a note to a busy teammate, not a technical manual.

## Gate

`npm run reading-level -- .github/pr-drafts/<branch-name>.md`, at grade 10 or below. Above it, split long sentences and cut clauses.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [caic-pr](../../caic-pr/SKILL.md) — the template, the commit range, and opening the PR
- [commit-bodies.md](commit-bodies.md) — the pre-merge copy this one has to outlive
