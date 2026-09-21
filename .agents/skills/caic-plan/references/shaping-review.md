# shaping-review.md — the eight questions for a shaping plan

The short review pass that fits a `PLAN.md` or an epic draft, where the shape is still open and the steps may not survive.

Load this when the plan under review is a shaping plan, in place of Phases 1–3 of [plan-review.md](plan-review.md).

## Reviewing a shaping plan

Eight questions. None of them needs the codebase open for long.

1. **Does the plan have its sections, Done when first?** Check before anything else, because the questions below assume them. A plan with no Done when list cannot be reviewed for traceability at all — every step is an orphan, so question 2 returns a wall of findings that all share one cause. Name the missing section as the finding instead. The rubric already reaches this case transitively; the reviewer should not have to reason backwards from the orphans to get there.
2. **Does every step trace up, and every outcome trace down?** Every Done when item has a step that delivers it; every step traces to one. An orphan on either side is a scope bug. See [the spine](../SKILL.md#the-spine).
3. **Is each step one PR's worth?** A step whose scope needs more than one line, or whose file list would sprawl, is two steps. Splitting is cheap now and expensive later.
4. **Is the boundary real?** Read Out of scope and ask whether a reviewer three weeks in could use it to reject a scope expansion. "Other improvements" is not a boundary.
5. **Is the ordering forced, or invented?** For each dependency the plan asserts between steps, ask what actually breaks if they run in the other order. Invented sequencing is the most common reason a plan takes longer than it should.
6. **Is a consumer-visible decision sitting in the Decisions list with no ADR?** That reasoning is deleted with the plan file. Suggest an ADR as a note — see [caic-adr](../../caic-adr/SKILL.md). Whether to write one is the developer's call; what is a finding is reasoning with nowhere to land — no ADR, and no line in the PR description or, for a shaping plan, the epic's Details.
7. **Does every new code file have a precedent it fits?** A step that names none is a finding. So is one whose new file is above 2× its precedent, or shares more than a third of its lines with it. The fix is to extract the shared part, or to split. Both counts sit in a step's Files touched; check the precedent's with `wc -l`. No tool sees duplication across files, so read the shared part rather than measuring it.
8. **Does the plan answer its issue?** For a plan against an issue: every Done-when id has at least one acceptance criterion, no Constraint is broken, every Open question is closed or carried as a Risk, and any outcome the plan changed went through the issue's amendment route. Then the suggested fix, if the issue had one: did the plan check its premise against the code and weigh at least one alternative before adopting it? An adopted suggestion with no `D<n>` naming what lost is a finding — see [Planning against an issue](../SKILL.md#planning-against-an-issue).

Verify only the claims that decide a boundary. If the plan says a step is separable because two modules do not import each other, check that — it changes the breakdown. A precedent's line count is another, since it decides whether question 7 returns a finding. So is the premise of a fix the plan adopted from its issue, since question 8 turns on it. Leave everything else for the implementation-level pass.

Write the findings up, then continue at [Phase 4](plan-review.md#phase-4--resolve-decisions). A shaping review that stops at eight questions leaves the author with homework, which is the anti-pattern [plan-review.md](plan-review.md#anti-patterns) closes with.

## Related guidance

- [plan-review.md](plan-review.md) — read for Phases 4 and 5, and for the implementation-depth pass once the shape settles
- [caic-plan](../SKILL.md) — the authoring rubric these questions check a plan against
- [artifact-choice.md](artifact-choice.md) — read when the review finds the plan is the wrong artifact for the work
- [adr-review.md](../../caic-adr/references/adr-review.md) — read when what you're reviewing is an ADR instead
