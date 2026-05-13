# Plan-review rubric

This file tells agents how to review an implementation plan before any code is written. It is the planning-phase analog of [AGENTS_CODE_REVIEW.md](AGENTS_CODE_REVIEW.md).

Use this rubric when the user asks you to "review the plan", "look over PLAN.md", "check the design", "give feedback before I start", or anything similar — for any plan document or set of plan documents (PLAN.md, design docs, multi-PR series, RFC drafts).

## The core principle

**Every claim in the plan is a hypothesis.** Plans are written with imperfect knowledge of the codebase as it actually is today. When a plan says "the codebase already has X," "this follows pattern Y," or "function Z does W" — that's a hypothesis. Verify against the code before commenting. Two failure modes are common:

1. **Believing the plan.** Reviewing a plan against itself produces a tautological thumbs-up. Every architectural recommendation built on an unverified assumption is wasted work.
2. **Confidently contradicting the plan based on a partial read.** If you skim a file and the plan looks wrong, read more before declaring a blocker. False blockers are as costly as missed ones.

The right posture: read the plan fully → identify its load-bearing claims → verify each against the code → write feedback that distinguishes verified facts, partial reads, and judgment calls.

## Phase 1 — Read the plan

- Read every plan file end-to-end before commenting. Multi-PR plans (PLAN.md + PLAN-N.md) are designed to be read together; commenting on PLAN-3 without PLAN.md context produces noise.
- Build a mental list of **load-bearing claims** — assertions about the existing codebase the plan depends on for correctness:
  - "Function/field X already exists with shape Y."
  - "The pattern in this area is Z, and we'll follow it."
  - "Component A integrates with B via mechanism C."
  - "File D is already structured the way we need."
- Build a separate list of **design judgments** — choices the plan makes that don't depend on existing code (naming, API shape, deprecation policy, error-handling defaults). These need feedback but don't need verification.

## Phase 2 — Verify the load-bearing claims

For each claim from Phase 1, read the cited code. Spawn `Explore` subagents in parallel for breadth (3 max in one message), or read directly when scope is narrow. For each claim, mark one of:

- ✅ **Verified.** Cite the file and line range. Move on.
- ⚠️ **Slightly off.** The claim is mostly right but has a detail wrong (e.g., the function exists but its signature differs). Note the correction.
- ❌ **Contradicted.** The claim is wrong — the function/field/pattern doesn't exist or works differently. This is what changes the plan. Lead with these.

**When verifying integrations with components, libraries, or framework code: read enough to understand the actual contract before commenting.** Don't grep for a class name and conclude. If a plan integrates with a complex component (an editor, a routing layer, an event bus), read that component's render/lifecycle/event-emission paths in full. The cost of reading 200 extra lines beats the cost of a wrong architectural recommendation.

If you're not sure after reading, say so. "60% sure this is wrong; needs deeper read" is honest and useful. "This is a blocker" without verification isn't.

## Phase 3 — Write the review

Output structure (use this; don't improvise):

### 1. General API/design feedback (terse)

≤ 6 bullets covering the design-judgment items from Phase 1. Naming, API shape, deprecation behavior, error policies, abstraction boundaries. Anything that would change the public surface or the mental model. Don't bury this under verification detail — the plan author reads this section first.

### 2. Verified vs. contradicted claims

One subsection per claim, marked ✅ / ⚠️ / ❌. Lead with ❌. Cite file paths and line numbers (use markdown link format so the user can click through). Quote the plan's claim, then state what the code actually does.

❌ items are the ones that change the plan. Each should propose a concrete fix.

### 3. Per-PR adjustments (or per-section)

For each PR / section / phase the plan defines, list the specific changes in scope or approach based on what verification surfaced. Keep these terse — bullets, not paragraphs.

### 4. Open questions for the user

Decisions that should be locked before code is written. Aim for ≤ 7. Each with concrete options. Don't ask things you can answer yourself by reading the code.

## Phase 4 — Resolve decisions

After presenting the review, ask the open questions **one at a time**. Each question should be multiple-choice with 2–4 distinct options; the recommended option goes first with `(Recommended)` in the label. Sequential asking lets each answer inform the next — interdependent questions answered together produce inconsistent picks.

After each answer, save it to a working notes file (e.g., the plan file you've been editing). Do not start updating the plan files mid-questioning — finish all questions first.

## Phase 5 — Update the plan files

The deliverable of a plan review is **executable plan files**, not a separate critique document. Once decisions are locked:

- Update each plan file to bake in the resolved decisions.
- Replace contradicted claims with verified facts.
- Tighten ambiguous sections.
- Add cross-references where decisions in one PR affect another.

The original critique document can stay as a record of what changed and why, but the plan files themselves should now stand on their own — a fresh executor reading PLAN.md should not need the review to follow what to build.

## Style

- Terse. Lead with what's wrong; plan authors read for action items.
- File-and-line citations beat long quotes. The user can click through.
- Calibrate confidence. "Verified" / "Slightly off" / "60% sure" / "Speculative" mean different things; mark each finding accordingly.
- Don't dump verification detail into the general-feedback section. Keep that section short; push verification into its own section.

## Anti-patterns

- **Believing the plan.** Reviewing without verifying produces useless approval. Always check load-bearing claims.
- **Partial reads producing confident blockers.** If you'd recommend an architectural change based on a 100-line skim of a 900-line file, read the rest first. False blockers waste as much time as missed ones.
- **Recommending changes to architecture you haven't verified exists.** If the plan says "we'll extend the existing X mechanism," verify X exists before commenting on the extension.
- **Dumping everything into one section.** General feedback, verification, per-PR notes, and open questions each have their own section. Mixing them buries the action items.
- **Asking many questions at once when the answers depend on each other.** Sequential questions let each answer inform the next.
- **Producing a critique document instead of updated plan files.** The deliverable is a plan that can be executed without referring back to the review.
- **Skipping Phase 5.** A review that ends at "here are the decisions" leaves the plan author with homework. Bake the decisions in.

## When the plan is small

Not every plan needs all five phases. A 1-paragraph design note doesn't need parallel agents. Apply judgment: the rubric scales down by collapsing phases (read → verify-the-one-claim → comment), but the core principle still holds — verify before recommending.
