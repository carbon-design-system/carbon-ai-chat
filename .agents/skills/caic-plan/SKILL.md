---
name: caic-plan
description: Draft, revise, or review an implementation plan, including plans against GitHub issues and effort breakdowns for epics. Use for requests to plan work, design an approach, lay out PRs, or review a plan; ordinary fixes with a settled approach need no planning artifact.
---

Produce the requested plan or review. Keep planning local unless the user authorizes publication. Planning alone does not authorize implementation.

## Pick the artifact first

- **Draft or revise a plan:** follow the workflow below.
- **Review an existing plan:** read [plan-review.md](references/plan-review.md). Feedback-only requests return findings without editing files. Review-and-revise requests may update the plan.
- **Shape an epic:** prepare outcomes and step boundaries; the issue authoring skill handles authorized filing. Read [artifact-choice.md](references/artifact-choice.md) when the destination is unclear.

Use choices and authorization already supplied. Ask only about missing information that materially changes scope, design, or the next action. Continue independent work while a needed answer is pending.

## When to write a plan

Write a plan when the user requests one, when work spans sessions or PRs, or when unresolved decisions need a shared record. For a routine fix with a settled approach, proceed within the user's implementation request. Routine wording fixes, approved contracts, and fixes that restore promised behavior need no new proposal.

**Propose material public behavior that remains unsettled**, such as a new public method or a changed default. Read [api-contract.md](references/api-contract.md) for the proposal; it can stay local.

## Before starting a new plan

Inspect `.github/plan-drafts/` for related work. Extend the current plan when it fits; otherwise create a separate folder. Preserve unrelated and stale drafts. Their presence does not block planning, and cleanup needs its own authorization.

Read the source needed to verify the approach before making claims about it. Mark assumptions you cannot check.

## Planning against an issue

When the user names an issue, read its body and comments with `gh issue view <N> --repo <owner>/<repo> --comments`. Resolve the repository from the task and remotes. If access fails, use supplied content and identify what remains unverified.

- Cite Done-when items by positional IDs and short labels, such as `O1 | Partial config inherits defaults`. Do not duplicate the full outcome text.
- Respect Constraints. Route material changes to agreed outcomes through [the amendment procedure](../caic-issue/SKILL.md#amending-an-outcome); draft locally before any authorized publication.
- Verify a suggested fix against the code. Compare alternatives when the choice is unsettled, and record the deciding evidence under `D<n>`.
- Resolve questions that block implementation. Carry nonblocking uncertainty as a risk with a next step.
- Prefix the plan folder with the issue number: `<N>-<slug>`.

Without an issue, write the user's outcomes in the plan itself. Do not create an issue or require a comment to continue local planning.

## The spine

Keep outcomes and proofs distinct:

| Artifact | Carries |
| --- | --- |
| Optional ADR | A proposed decision, its rationale, and consumer costs |
| Shaping plan / epic | Outcomes and boundaries |
| Issue | Done-when outcomes and settled constraints |
| Implementation plan / step | Acceptance criteria, each tied to an outcome and its proof |
| PR / review | Evidence that the change satisfies those criteria |

A criterion traces to an issue outcome, or to the plan's own Done when when there is no issue. If an outcome changes, update affected local artifacts and identify external records needing an authorized amendment. An optional ADR does not replace the plan or require every plan to have an epic.

## Two phases, two stopping rules

Shape `PLAN.md` first: outcomes, decisions, boundaries, and dependencies. On the **plan → issues** fork, stop at the reviewed shaping plan and requested issue drafts. Child issues carry outcomes; their implementers choose proofs.

On the **plan → work** fork, add implementation detail once the step boundaries are stable. A single step stays in `PLAN.md`; multiple steps use `PLAN-{N}-{slug}.md`. Stop when an executor can proceed without an unresolved design choice and can verify the result.

## What goes in `PLAN.md`

Use `.github/plan-drafts/{name}/`; drafts are ignored and never committed. Include Context, Done when, stable numbered Decisions, the step breakdown, relevant risks, and Out of scope. Add Public API surface when the plan changes or depends on a consumer contract.

Before creating files, read [plan-files.md](references/plan-files.md) for section details and step-file structure. Load [api-contract.md](references/api-contract.md) only for material, unresolved public behavior. Routine wording fixes and restoring an agreed contract use existing decisions and normal verification.

A required proposal can live in the plan. Publication is a separate action, not a prerequisite for local planning or already-authorized implementation.

## Acceptance criteria

Write one observable outcome and its proof per criterion, tied to an `O<n>`. Use a named test, command with an expected result, or a manual check suited to the change. Include relevant regression cases without turning every small task into an exhaustive test matrix.

For detailed criteria or wording questions, read [writing-plans-well.md](references/writing-plans-well.md#acceptance-criteria). Keep proofs in implementation plans, not issue outcomes or epic drafts.

## Review before executing

Review a drafted or revised plan with fresh eyes using [plan-review.md](references/plan-review.md). Use a sub-agent when available; ask it for findings, then incorporate verified corrections as the author. A feedback-only review of someone else's plan ends with findings.

Hand back the plan link, material decisions, remaining blockers, and review evidence. Continue implementation only when the user's request authorizes it. Preserve drafts unless cleanup is requested.

## Related guidance

- [artifact-choice.md](references/artifact-choice.md) — when the output could be a plan, epic, or ADR
- [plan-files.md](references/plan-files.md) — when creating plan files or preserving their decisions after execution
- [api-contract.md](references/api-contract.md) — when material public behavior remains undecided
- [plan-review.md](references/plan-review.md) — when reviewing a plan
- [writing-plans-well.md](references/writing-plans-well.md) — when refining criteria or plan prose

Task input from the user, if any: $ARGUMENTS
