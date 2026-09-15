# adr-review.md — reviewing an ADR before its PR

Load this when closing out an ADR draft (the [caic-adr](../SKILL.md) skill ends here), or when the user asks you to review an ADR.

An ADR is a request for feedback. Its expensive failures are a proposal a reader can't find or can't act on, and a Consumer impact that misses the silent break. Wording is cheap to fix after merge. Those aren't.

## Phase 1 — Read only the Summary

**Stop after the Summary and write down three things:** the problem, the proposal, and who it concerns. Then read the rest.

- **If you couldn't write all three, that's the top finding.** The Summary fails its one job.
- **If the rest of the ADR contradicts what you wrote,** the Summary is wrong or the Proposal drifted.
- **If a Feedback wanted question can be answered "yes" without reading further,** it's too vague to draw a useful reply.
- **Include your restatement in the write-up.** It goes in the PR description as evidence the Summary works on its own.

## Phase 2 — Sort the claims

Put every assertion in one bucket. They get different treatment.

- **Evidence**: checkable statements about today's code. "Every entry point boots React." "Nothing persists the transcript." **Verify each against the code**, not against an older ADR, issue, or plan. A wrong one usually invalidates a cost.
- **Cost**: what breaks for whom. **Verify by finding who actually breaks.** Grep the examples, the demo, and the docs snippets.
- **Judgment**: which way to go. Not verifiable. **Argue with it directly**, and label it as opinion so the author can tell it from fact.

## Phase 3 — Check the proposal holds together

- **Can someone review a diff against the Proposal?** If it can be satisfied two incompatible ways, it needs tightening.
- **Does the Reference cover the behavior the types can't carry?** Look for defaults, failure paths, timing, and repeat calls.
- **Is the code real?** It should use types that exist or that the Proposal defines. Invented shapes in before/after code get copied.
- **Does Consumer impact lead with the silent break?** Ask directly whether any host finds out from its UI, or from wrong data, rather than from its build.
- **Are the Drawbacks honest?** An empty or token list means the author is selling.
- **Is every Alternative real?** Would someone who wanted it recognize their own argument? Is an obvious one missing, especially the middle path?
- **Are the Open questions real questions?** A to-do list or "none" on a contested proposal is a finding.

## Phase 4 — Check the shape

- **No file:line citations or line-number evidence in the ADR.** Those go in the PR description.
- **It reads alone.** A reader shouldn't have to open another ADR to understand this proposal.
- **The Motivation opening and the Summary use no type names or paths before the problem is stated.**
- **Run `npm run validate:adrs` and `npm run reading-level -- <file>`.** Report a grade above 10.

## Phase 5 — Write it up

Four sections, in this order:

1. **Summary restatement**: your three-line restatement from Phase 1, and whether it matched the rest.
2. **Proposal and impact**: ambiguities, missing silent breaks, invented code.
3. **Evidence**: ✅ / ⚠️ / ❌ per claim, with file:line citations. Lead with ❌.
4. **Open questions**: at most 5, each with concrete options.

Then fold the resolutions into the draft. The deliverable is a mergeable ADR, not a critique beside it.

## Anti-patterns

- **Reviewing it as a plan.** Asking for file paths and step order pushes work into the ADR that belongs to a plan.
- **Approving because the proposal is right.** A right proposal that nobody can find in the document still fails.
- **Treating the RFC discussion as the review.** It's for people who weren't in the room. The ADR should be right before it merges.

## Related guidance

- [caic-adr](../SKILL.md) — the authoring workflow this review closes out
- [adr-prose.md](../../caic-copy-writer/references/adr-prose.md) — the wording rules the prose is held to
- [plan-review.md](../../caic-plan/references/plan-review.md) — the same discipline for a plan
