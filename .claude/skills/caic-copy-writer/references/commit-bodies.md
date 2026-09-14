# commit-bodies.md — the commit message body (type 8)

Load this before writing a commit body. Structural owner: [conventions.md](../../../../references/conventions.md#commits), which carries the conventional-commit format, the 72-character header limit, and the sequencing rules that decide how many commits you write in the first place.

**Two readers, both pre-merge**: the reviewer walking the branch commit by commit, and whoever later splits, rebases, or cherry-picks it. Nothing survives the squash — [pr-descriptions.md](pr-descriptions.md) is the durable record — so write for the review, not for history.

- **Open with the problem.** State the defect, constraint, or drift the commit answers, then what it does about it — a plain-English claim the reviewer verifies the diff against.
- **Never narrate the diff.** It speaks for itself, and a body that lists the changed files has said nothing the reviewer could not read.
- **Skip the what when the subject carries it.** Spend body only on what the diff can't show: why this approach over the obvious one, a cost accepted, an untested path and why.
- **Place the commit in its arc** in one clause when it has one — the trigger the issue declared in scope, the commit it cleans up after. Name sibling commits by subject, not hash; a rebase renumbers them.
- **3–6 lines covers most commits.** An empty body is right when the subject alone does; a body that won't compress to six lines is usually two commits, which is [conventions.md](../../../../references/conventions.md#commit-sequencing)'s call, not a wording problem.

## Before and after

- Before: "Updates fooReducer.ts and the accompanying spec, and also touches the store index to export the new selector."
- After: "One changed message re-rendered the whole list, because the reducer rebuilt every item. Copy the array and replace the one index."

## Gate

Review. commitlint checks the header's format and never reads the body, so nothing but a reader catches a body that narrates the diff — [caic-review](../../caic-review/SKILL.md) files that as a Nit.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [conventions.md](../../../../references/conventions.md#commits) — commit format, hooks, and sequencing
- [pr-descriptions.md](pr-descriptions.md) — where anything a post-merge reader needs has to live instead
