# plan-review.md — reviewing a plan before execution

How to review a plan before any code is written. The planning-phase analog of [code review](../../caic-review/SKILL.md).

Load this when closing out a planning session (the `caic-plan` skill ends here), or when the user asks you to "review the plan", "look over PLAN.md", "check the design", or "give feedback before I start".

## Choose the review mode

- **Feedback only:** a standalone review request returns findings and leaves plan files unchanged. Include unresolved decisions in the review; do not start a revision or interview unless requested.
- **Review and revise:** when the user asks for edits, or you are reviewing a plan you just authored, incorporate verified corrections. Preserve approved scope and choices.

Use the user's wording and prior instructions to choose. Ask only when the distinction remains unclear and affects the next action. Sub-agents assigned to review return findings unless their brief also authorizes edits.

## Which level are you reviewing?

A plan is two documents with different jobs, and reviewing one against the other's standard wastes everyone's time. Establish the level first:

| Level | Document | What a review is looking for |
| ----- | -------- | ----------------------------- |
| Shaping | `PLAN.md`, or an epic draft | Boundaries, traceability, and whether the work is carved right |
| Implementation | `PLAN-{N}-*.md` | Whether every claim about the codebase holds |
| Both | A single-step `PLAN.md` | The shaping questions, then Phases 1–3 on its implementation sections |

Phases 1–3 below are written at implementation depth. **For a shaping plan, use [the shaping pass](shaping-review.md#reviewing-a-shaping-plan)** instead. Phases 4 and 5 apply only in revision mode and only when a decision or edit remains.

Reviewing an ADR is a third thing again, with its own rubric: [adr-review.md](../../caic-adr/references/adr-review.md).

Demanding file-and-line verification of a shaping plan is the common mistake. At that level, "we will extend the existing config merge" is a direction, not yet a claim — asking it to cite line numbers forces the author to do implementation planning for steps that may not survive the review.

## The core principle

**Every claim in the plan is a hypothesis.** Plans are written with imperfect knowledge of the codebase as it actually is today. When a plan says "the codebase already has X," "this follows pattern Y," or "function Z does W" — that's a hypothesis. Verify against the code before commenting. Two failure modes are common:

1. **Believing the plan.** Reviewing a plan against itself produces a tautological thumbs-up. Every architectural recommendation built on an unverified assumption is wasted work.
2. **Confidently contradicting the plan based on a partial read.** If you skim a file and the plan looks wrong, read more before declaring a blocker. False blockers are as costly as missed ones.

The right posture: read the plan fully → identify its load-bearing claims → verify each against the code → write feedback that distinguishes verified facts, partial reads, and judgment calls.

## Phase 1 — Read the plan

- Read the overview and the plan files in the requested review scope, including dependencies that affect them. For a whole-plan review, read every step.
- Build a mental list of **load-bearing claims** — assertions about the existing codebase the plan depends on for correctness:
  - "Function/field X already exists with shape Y."
  - "The pattern in this area is Z, and we'll follow it."
  - "Component A integrates with B via mechanism C."
  - "File D is already structured the way we need."
- Distinguish **design judgments** from source facts. Evaluate choices such as API shape or error semantics against the outcomes and constraints. For a material, unresolved decision, an [ADR](../../caic-adr/SKILL.md) may help; the developer decides. Cite existing decisions for settled behavior. Preserve useful rationale in the eventual PR or documentation before requested plan cleanup.
- Check **behavior gaps** relevant to the change: for example, what produces a new public state or how overlapping calls behave. Flag an omission when it leaves a material choice to the executor. Routine copy corrections do not need a new API contract or an unrelated edge-case matrix.

  Propose a relevant criterion and proof for each material gap. In revision mode, incorporate agreed corrections in [Phase 5](#phase-5--update-the-plan-files). In feedback mode, the finding is the deliverable.

## Phase 2 — Verify the load-bearing claims

For each load-bearing claim, read the cited code and enough surrounding context to verify it. Use sub-agents for independent investigations when available and useful. Distinguish these results:

- **Verified.** Cite the source.
- **Partly verified.** Identify the unchecked detail or correction.
- **Contradicted.** State what the source shows and how the plan should change. Lead with these.

**When verifying integrations with components, libraries, or framework code: read enough to understand the actual contract before commenting.** Don't grep for a class name and conclude. If a plan integrates with a complex component (an editor, a routing layer, an event bus), read that component's render/lifecycle/event-emission paths in full. The cost of reading 200 extra lines beats the cost of a wrong architectural recommendation.

If you're not sure after reading, say so. "60% sure this is wrong; needs deeper read" is honest and useful. "This is a blocker" without verification isn't.

## Phase 3 — Write the review

For a substantial review, use the sections below. Omit empty sections and combine them for a small plan.

### 1. General API/design feedback (terse)

≤ 6 bullets covering the design-judgment items from Phase 1. Naming, API shape, deprecation behavior, error policies, abstraction boundaries. Anything that would change the public surface or the mental model. Don't bury this under verification detail — the plan author reads this section first.

Check the spine too — questions 1 and 7 of [the shaping pass](shaping-review.md#reviewing-a-shaping-plan) apply at this level as well.

### 2. Verified vs. contradicted claims

Lead with contradicted claims. Cite file paths and line numbers using clickable links. Identify the plan's claim, then state what the code actually does. Summarize successful verification rather than repeating the plan.

Each defect should propose a concrete fix.

### 3. Per-PR adjustments (or per-section)

For each PR / section / phase the plan defines, list the specific changes in scope or approach based on what verification surfaced. Keep these terse — bullets, not paragraphs.

### 4. Open questions for the user

List only unresolved decisions that affect scope, correctness, or execution. Give concrete options where useful. Reuse decisions already supplied, and resolve factual questions from the source.

## Phase 4 — Resolve decisions

**In feedback mode, stop after the review.** Open questions can remain listed for the author.

In revision mode, ask only for decisions you cannot resolve from the request, prior answers, or source. Group independent questions; ask dependent ones in sequence. Update settled parts while an answer is pending, leaving dependent changes unresolved. Record answers in the plan when editing is authorized.

## Phase 5 — Update the plan files

**This phase applies only in revision mode.** Once the relevant decisions are settled:

- Update each plan file to bake in the resolved decisions.
- Replace contradicted claims with verified facts.
- Tighten ambiguous sections.
- Add cross-references where decisions in one PR affect another.

Return the updated plan links, remaining blockers, and review evidence. The revised files should stand on their own. Do not imply that the review authorized implementation or publication.

## Style

- Terse. Lead with what's wrong; plan authors read for action items.
- File-and-line citations beat long quotes. The user can click through.
- Calibrate confidence. "Verified" / "Slightly off" / "60% sure" / "Speculative" mean different things; mark each finding accordingly.
- Apply the ambiguity test to every criterion: if two competent readers could satisfy it differently, it is not a criterion yet. This needs no code open.
- Don't dump verification detail into the general-feedback section. Keep that section short; push verification into its own section.

## Anti-patterns

- **Believing the plan.** Reviewing without verifying produces useless approval. Always check load-bearing claims.
- **Passing a criterion that restates the implementation.** "Returns the merged config" is the code the plan already asked for, so it cannot fail independently of it; "a partial config inherits the default field by field" is a behavior, and can. Over-specified criteria are how a plan locks in the bug it was about to write — the same distinction [writing-plans-well.md](writing-plans-well.md#acceptance-criteria) draws between a criterion and a plan step.
- **Partial reads producing confident blockers.** If you'd recommend an architectural change based on a 100-line skim of a 900-line file, read the rest first. False blockers waste as much time as missed ones.
- **Recommending changes to architecture you haven't verified exists.** If the plan says "we'll extend the existing X mechanism," verify X exists before commenting on the extension.
- **Burying defects in verification detail.** Lead with the changes the author needs to make.
- **Asking many questions at once when the answers depend on each other.** Sequential questions let each answer inform the next.
- **Editing a feedback-only review.** Findings fulfill that request; rewriting files exceeds its scope.
- **Leaving agreed revisions outside the plan.** In revision mode, incorporate the corrections rather than leaving a separate review the executor must reconcile.

## When the plan is small

Not every plan needs all five phases. A 1-paragraph design note doesn't need parallel agents. Apply judgment: the rubric scales down by collapsing phases (read → verify-the-one-claim → comment), but the core principle still holds — verify before recommending.

## Related guidance

- [shaping-review.md](shaping-review.md) — read instead of Phases 1–3 when the plan under review is a shaping plan
- [caic-plan](../SKILL.md) — the authoring rubric this review closes out
- [writing-plans-well.md](writing-plans-well.md) — read when a finding is about how a criterion or a section is worded
- [caic-review](../../caic-review/SKILL.md) — the same discipline applied to a diff
- [Root AGENTS.md](../../../../AGENTS.md) — repo overview and pointer index
