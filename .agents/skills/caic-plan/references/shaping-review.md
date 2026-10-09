# shaping-review.md — the eight questions for a shaping plan

The short review pass that fits a `PLAN.md` or an epic draft, where the shape is still open and the steps may not survive.

Load this when the plan under review is a shaping plan, in place of Phases 1–3 of [plan-review.md](plan-review.md).

## Reviewing a shaping plan

Eight questions. None of them needs the codebase open for long.

1. **Does the plan have its sections, Done when first?** Check before anything else, because the questions below assume them. A plan with no Done when list cannot be reviewed for traceability at all — every step is an orphan, so question 2 returns a wall of findings that all share one cause. Name the missing section as the finding instead. The rubric already reaches this case transitively; the reviewer should not have to reason backwards from the orphans to get there.
2. **Does every step trace up, and every outcome trace down?** Every Done when item has a step that delivers it; every step traces to one. An orphan on either side is a scope bug. See [the spine](../SKILL.md#the-spine).
3. **Is each step a coherent, reviewable change?** A sprawling scope can signal a useful split. Base the boundary on dependencies and verification, not the length of its description.
4. **Is the boundary real?** Read Out of scope and ask whether a reviewer three weeks in could use it to reject a scope expansion. "Other improvements" is not a boundary.
5. **Is the ordering forced, or invented?** For each dependency the plan asserts between steps, ask what actually breaks if they run in the other order. Invented sequencing is the most common reason a plan takes longer than it should.
6. **Will lasting decisions remain discoverable?** Cite existing decisions for settled behavior. A material, unresolved choice may benefit from an [ADR](../../caic-adr/SKILL.md); the developer decides. Otherwise retain its rationale in the eventual PR or documentation before plan cleanup.
7. **Does new code reuse the relevant precedent?** Read nearby code when a new abstraction or file drives the design. A large size difference is a reason to inspect the boundary, not a defect by itself. Report duplicated responsibilities or unnecessary machinery with source evidence.
8. **Does the plan answer its issue or request?** Each outcome needs a step; implementation plans also need criteria and proofs. Shaping plans on the issues fork stop at outcomes. Respect settled constraints, resolve blocking questions, and identify any required outcome amendment. Verify the premise of an adopted suggestion; compare alternatives when the design remains unsettled.

Verify claims that decide a boundary. If a step is separable because two modules do not import each other, check that. Leave unrelated implementation detail for the later pass.

Return the findings in feedback mode and leave the plan unchanged. In revision mode, continue at [Phase 4](plan-review.md#phase-4--resolve-decisions) only for unresolved decisions, then incorporate authorized corrections. Use [the selected review mode](plan-review.md#choose-the-review-mode) at either planning level.

## Related guidance

- [plan-review.md](plan-review.md) — read for Phases 4 and 5, and for the implementation-depth pass once the shape settles
- [caic-plan](../SKILL.md) — the authoring rubric these questions check a plan against
- [artifact-choice.md](artifact-choice.md) — read when the review finds the plan is the wrong artifact for the work
- [adr-review.md](../../caic-adr/references/adr-review.md) — read when what you're reviewing is an ADR instead
