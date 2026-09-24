# artifact-choice.md — plan, epic, ADR, or nothing

Which artifact upcoming work produces, and the fork that decides where the acceptance criteria live.

Load this when the requested artifact is unclear: a local plan, an epic projected from one, or an ADR alongside either.

## Pick the artifact first

Plans and epics shape upcoming work; an issue states the problem a plan answers. Decide what you are producing before writing anything:

| The work                                                                      | Artifact                                                                                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| An issue you're picking up                                                    | A plan against it, per [Planning against an issue](../SKILL.md#planning-against-an-issue) — or just build when the approach is obvious.       |
| One PR, one obvious approach, no issue yet                                    | Implement if requested; write a short plan if the user asks for one. An issue is optional. |
| Multiple PRs, packages, or sessions; interlocking design decisions            | `PLAN.md` plus per-step files, per [plan-files.md](plan-files.md).                                                                                 |
| A requested epic or work breakdown for others | Shape the plan, then draft the epic — see [epic-authoring.md](../../caic-issue/references/epic-authoring.md). Publish only when authorized. |
| A choice a consumer can feel, not yet settled — which shape, whether to remove it at all | Consider an ADR alongside the plan — see [caic-adr](../../caic-adr/SKILL.md). The developer decides whether to write one. |

Then settle the fork, before opening a single step file. A plan produces one of two things, and which one decides where the acceptance criteria live:

| Fork          | Consumed by                          | Criteria live in                                                                | Step files    |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------- | ------------- |
| Plan → issues | Producing an epic and its sub-issues | Nowhere yet — each child carries Done when, and whoever picks it up plans its criteria | None |
| Plan → work   | Producing the PRs directly, usually against an issue | `PLAN.md` for a single step, or each `PLAN-{N}` step file, above its implementation steps | One per step, when more than one |

**Outcomes in the issue, criteria in the plan.** An issue's Done when says what has to hold; a plan's acceptance criteria say how each is proven. Copy the outcomes into the plan, or the proofs into the issue, and the two lists drift until neither is trusted. A plan on the issues fork writes no criteria at all: its children have no owner yet, and criteria written now are design decisions made for someone else.

This is not the single-step carve-out under [File layout](plan-files.md#file-layout). That one is about _how many_ step files a plan needs; the fork is about whether step files are the deliverable at all.

A local plan needs no epic. When the user also requests GitHub tracking, the epic projects the plan's step breakdown.

An ADR answers a different question: why a proposed decision merits adoption. It can accompany a plan or epic and preserve the decision beyond execution.

**It is not a phase before the plan, either.** The two interleave: you shape the work far enough to know the options are real and what each costs, and that shaping is what makes the ADR writable. Usually the ADR is a promotion — a `D<n>` in a plan already underway turns out to be something a consumer can feel, so it may graduate. What an ADR needs from the plan is _feasibility_, not sequencing. If you are drafting per-step files to justify an option, stop: you are planning the losing option too.

## Related guidance

- [caic-plan](../SKILL.md) — the planning procedure this choice opens
- [plan-files.md](plan-files.md) — read once you've picked a plan: where its files live and what each one holds
- [caic-adr](../../caic-adr/SKILL.md) — read when a decision is one a consumer can feel
- [epic-authoring.md](../../caic-issue/references/epic-authoring.md) — read when projecting the plan's breakdown onto a GitHub epic
