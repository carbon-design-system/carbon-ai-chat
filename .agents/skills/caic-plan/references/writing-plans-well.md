# writing-plans-well.md — criteria, style, and the failures to avoid

How to word an acceptance criterion, how a plan reads, and the anti-patterns that make a plan unexecutable.

Load this while writing a plan's words — the acceptance-criteria boxes especially — and again before handing the plan to a reviewer.

## Acceptance criteria

Each box is one observable outcome plus the proof it holds. Write the outcome, then how anyone checks it: a command that exits 0, a named spec, or demo steps with the expected result. An outcome nobody can check is a wish.

- **One outcome per box.** If it needs an "and", split it — a half-true box can't be ticked.
- **Observable from outside.** Say what the chat, the type surface, or the build does, not which function gets edited. "Route all three sites through the merged config" is a plan step; "a partial config still inherits the default field by field" is a criterion.
- **Attach cases to outcomes.** A `Specs cover: a, b, c…` box lists tests without saying what success means. Attach relevant cases to the criterion they prove. A case outside the agreed outcomes is not a reason to expand the plan silently.
- **Name the proof.** A spec path, a command, or demo steps. Reuse the spec that already owns the area; for new surface, name the spec that will own it — see the package testing guides ([ai-chat](../../../../packages/ai-chat/references/tests.md), [ai-chat-components](../../../../packages/ai-chat-components/references/testing.md)). Name the case that fails today, not the properties the proof will have: "a symbol of kind `Interface` with no members and no allowlist entry fails the run" is a proof; "a guard that runs in milliseconds and catches the next one too" is a description of one, and it passes the day it is written.
- **Nothing new here.** Every criterion projects a parent one level up — one of the issue's Done-when ids, or with no issue, a Done when item in `PLAN.md`. The rule is [the spine](../SKILL.md#the-spine).

## Style

- **Cite source evidence** for load-bearing claims about the current codebase. Use paths and line numbers where they help the executor or reviewer verify the claim.
- **Mark unverified assumptions.** "I believe X (not yet read)" is more useful than asserting X without checking. Flagging your own uncertainty saves the reviewer time and keeps the executor from inheriting a wrong premise.
- **Terse.** Plans are read in the middle of work; long prose buries the action items. Bullets, short paragraphs, code snippets only when pinning a decision. [tone.md](../../../../references/tone.md) applies here as much as to shipped docs, and so does [revision-pass.md](../../caic-copy-writer/references/revision-pass.md) — a plan is read under time pressure, so it matters more, not less. A plan has no copy type of its own; that pass is the whole of what reaches it.
- **Don't defer load-bearing decisions.** "We'll figure that out later" is acceptable for trivia but not for choices that block the executor (API shape, naming, deprecation behavior, error policy). Lock them now or list them as explicit open questions.

## Anti-patterns

- **Drafting `PLAN.md` without reading the code.** Load-bearing claims about "we already do X this way" will be wrong, and the per-step files inherit the mistake.
- **Vague file lists.** "Update the input shell" doesn't tell the executor where to look. Cite paths.
- **Per-step files that reproduce `PLAN.md`.** Cross-reference, don't duplicate. When `PLAN.md` changes, the per-step files should still be correct.
- **Missing the "out of scope" section.** Without it, every reviewer comment becomes a scope expansion request.
- **Bare numeric filenames** (`PLAN-1.md`). A number alone doesn't survive grep or a glance at the file tree. Always include the kebab-case title slug.
- **Ambiguous status.** Distinguish implemented, verified, and merged work. Record the evidence available; do not mark a step merged from a local diff alone. Retain the plan until cleanup is authorized.
- **Duplicating issue outcomes.** When an issue owns the outcomes, cite their IDs and keep proofs in the plan. Without an issue, the plan owns both Done when and its acceptance criteria.
- **Adopting a suggested fix unexamined.** Verify its premise and compare alternatives when the approach remains unsettled — see [Planning against an issue](../SKILL.md#planning-against-an-issue).
- **Weakening a proof instead of amending a criterion.** Once a plan is approved its criteria are frozen — correct one through the amendment route in [plan-files.md](plan-files.md#what-goes-in-plan-n-titlemd), never by making its proof weaker. Loosening an assertion, deleting a case, skipping a case, or regenerating a snapshot to match current output all turn the light green while leaving the criterion looking untouched, which is what makes this worse than missing the target outright. None of them is an amendment. Catching one in a diff is [caic-review](../../caic-review/SKILL.md)'s job.
- **Skipping the review phase.** An unreviewed plan hands its unverified assumptions straight to the executor.

## Related guidance

- [caic-plan](../SKILL.md) — the planning procedure these rules serve
- [plan-files.md](plan-files.md) — read when you need the section each criterion or rule belongs in
- [plan-review.md](plan-review.md) — read when closing the session: the fresh-eyes pass over what you wrote
- [revision-pass.md](../../caic-copy-writer/references/revision-pass.md) — read before hand-off: the tightening pass every plan takes
