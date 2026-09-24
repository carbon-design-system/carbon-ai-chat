---
name: caic-adr
description: Draft or revise a proposal-first ADR for an unresolved architecture choice. Use when asked to write an ADR or propose a decision; suggest it when a public design choice merits a lasting record. Historical explanations use existing records or ordinary documentation.
---

An ADR is a proposal first and a record second. It asks the people who build on this library for feedback on a decision they will feel, then stays as the record of what was decided and why.

The process rules (lifecycle, numbering, superseding, what happens to feedback) are in [docs/adr/README.md](../../../docs/adr/README.md). This skill is how you write one and get it in front of readers.

If the user asks why an existing decision was made, read its record and explain the evidence. If no record exists, write the requested historical explanation as ordinary documentation. Do not invent a new proposal or maintainer approval to fit this template.

## First: does this need an ADR?

**Apply README's [When to write one](../../../docs/adr/README.md#when-to-write-one) test, then let the developer decide.** Passing the test is a reason to suggest an ADR, not an obligation.

- **When the developer skips it, put the reasoning in the PR description**, or in the epic's Details when a plan shapes an epic. It must not live only in a plan file, which gets deleted.
- **When a plan decision turns out to pass the test partway through**, suggest promoting it. If an ADR gets written, shrink the plan's `D<n>` to a pointer at it — see [caic-plan](../caic-plan/SKILL.md#what-goes-in-planmd).

## Investigate for feasibility, not sequencing

**Answer three questions per option, then stop:** can it be built, what breaks for whom, and is it one PR or ten? If you are writing per-step files or a Files touched list to justify an option, you are planning, not proposing.

**Verify every claim against today's code**, not against an older ADR, issue, or plan. Keep file:line citations in your notes and the PR description. They never go in the ADR, where they go stale within a sprint.

**Look for the alternative nobody raised.** The middle path — deprecate now and remove later, ship the type and defer the runtime — and the option you dismissed in the first minute are the ones a reader will raise.

## Scope: one proposal a reader can accept or reject whole

**Put a surface that only makes sense as a whole in one ADR.** A reader has to understand the proposal from one record. Records that cross-link to explain one shape fail that test, and a reader gives up before finding the why.

**Split only when each half reads alone and could land while the other is argued.** Link related ADRs from Motivation or Open questions, and say in the clause what the other one proposes.

## Draft it

1. **Draft into `.github/adr-drafts/<kebab-case-slug>.md`**, which is git-ignored. Copy [docs/adr/template.md](../../../docs/adr/template.md); its comments say what each section settles.
2. **Claim the number** with `ls docs/adr/`: the next free four-digit number.
3. **Write the words with [caic-copy-writer](../caic-copy-writer/SKILL.md)'s loop, type 11** — route, draft, measure, revise, gate. The rules are [adr-prose.md](../caic-copy-writer/references/adr-prose.md).
4. **Keep the five required `##` sections, in template order.** Consumer impact, Drawbacks, and Alternatives are optional: add one when it carries an argument a reader needs, and delete the heading rather than writing "None." under it. `npm run validate:adrs` fails an unknown section, a missing required one, or the wrong order. Use `###` inside a section.

What each section has to settle:

| Section | Settles | The test |
| --- | --- | --- |
| Summary | Problem, proposal, 2–3 feedback questions | A stranger reading only this can say what's proposed and whether it concerns them |
| Motivation | Who hits the problem, and why now | Every cost is concrete and stated in consumer terms |
| Proposal | What a host writes, then `### Reference` with exact types and behavior, explained in JSDoc on the types | Precise enough to review a diff against, and each block readable on its own |
| Consumer impact _(optional)_ | Before and after code for every host that changes | Silent breaks (UI goes quiet, wrong data) come first. A deprecation isn't impact: the record that retires the thing owns that |
| Drawbacks _(optional)_ | Costs the proposal accepts, that nothing else in the record already names | Each is a cost of this decision, not a restatement of Consumer impact or packaging |
| Alternatives _(optional)_ | Only ones someone proposed or a reader would raise | Each names the specific cost that lost it |
| Open questions | What stays undecided or deferred | Each is a real question, not a to-do |
| Decision | "Not decided. Feedback by DATE in the RFC discussion linked above." | Filled in only when a maintainer decides |

## Write Reference sections as commented types

**Put the explanation in JSDoc on the type it describes.** A reader can then lift the block into an editor and still have everything. The alternative — a comment or two in the code, then bullets underneath repeating the rest — makes a reader hold two halves at once, and the halves drift as the proposal changes.

```ts
// Don't: half in the code, half underneath.
interface ChatStore<T> {
  get: () => T; // current value
  subscribe: (listener: (value: T) => void) => () => void;
}
```

- **`subscribe` fires only on change**, never on subscribe.
- **`get()` returns the same reference** until the next change.

```ts
// Do: the block explains itself.
/**
 * One value a host can read and watch. `get` and `subscribe` are bound functions, so
 * they can be passed as bare references.
 */
interface ChatStore<T> {
  /** The current value. Returns the same frozen reference until the next change. */
  get: () => T;
  /**
   * Runs the listener when the value changes, and never on subscribe. Returns the
   * function that stops it.
   */
  subscribe: (listener: (value: T) => void) => () => void;
}
```

- **Comment what the type can't say**: defaults, what a call rejects on, timing, repeat calls, what clears a value, and which release removes it.
- **Keep prose after a block for what isn't a type**: packaging, timing, a table of who owns what, a verification note such as a `tsc --strict` check.
- **`reading-level` strips fenced code**, so the gate cannot see a word of your JSDoc. Read it yourself, and hold it to the same plainness as the prose around it.

## Set `feedback-by`

**Use the supplied feedback date.** If it is missing, draft the proposal first and ask before publication. Recommend at least 10 working days, with more time for a broad audience or a holiday period.

**A date passing decides nothing.** A maintainer decides on or after it.

## Review before the PR

**Review the draft with fresh eyes against [adr-review.md](references/adr-review.md).** Spawn a sub-agent when sub-agents are available; reviewing your own proposal produces a thumbs-up. Fold what it finds into the draft before the PR.

## Before anything reaches GitHub

Finish and review the draft before publication. Publish only the actions the user requested, using the selected destination and authorization already given. A request to draft an ADR does not authorize a PR, merge, or discussion.

## Open the PR

When the user requests a PR, read [publishing.md](references/publishing.md). It covers destination resolution, validation, and the PR. Opening a PR does not authorize merging it.

## Open the RFC discussion, after merge

When posting is requested and the merged record link works, follow the discussion procedure in [publishing.md](references/publishing.md#open-the-rfc-discussion). The repository lookup and mutation must use the same selected destination.

## Act on feedback

**Amend a `proposed` ADR in place.** Nothing is ratified yet, so editing it is finishing the draft.

Prepare requested updates locally. Posting replies, editing discussions, and opening follow-up PRs each need authorization for that action; reuse authorization already given.

- **A change to the Proposal pushes `feedback-by` out**, because earlier readers agreed to something else. Rewording and added drawbacks don't.
- **Edit the discussion's Summary when the ADR's Summary changes**, so readers aren't arguing with a stale copy.
- **Reply to every substantive comment**, with a link to the amending PR if there is one. When a point doesn't win, say why, and add it to Alternatives if a later reader would raise it too.
- **When the title no longer describes the proposal, stop amending.** Set `status: rejected`, say in Decision what replaced it, and write a new ADR.

## Decide

**Nothing happens automatically.** On or after `feedback-by`, someone on `@carbon-design-system/carbon-ai-chat-developers` sets `status`, writes the Decision section (what was decided, when, and what feedback changed), and closes the discussion. A rejected ADR gets the same Decision write-up as an accepted one.

**If asked whether a `proposed` ADR past its date is settled, the answer is no.** The fix is to decide it.

**Supersede an accepted ADR; never rewrite its decision.** The rules are in [README.md](../../../docs/adr/README.md#superseding).

## Anti-patterns

- **Burying the proposal.** If a reader must pass evidence or history to learn what's proposed, move the Summary's claim up and cut the scaffolding.
- **Arguing from line numbers.** Say what a host experiences; keep citations in the PR.
- **Padding the optional sections.** An option nobody would propose, or a drawback the record already states elsewhere, makes it look thorough and teaches nothing. Delete the heading instead.
- **Splitting one surface across records that only make sense together.**
- **Writing it after the code.** An ADR filed to document a merged PR is a changelog.
- **A Consumer impact that lists only compile errors.** The silent break is the expensive one. A section that only reassures is one to delete.
- **Restating the epic.** Work items and acceptance criteria belong to the epic; link it.

## Related guidance

- [docs/adr/README.md](../../../docs/adr/README.md) — lifecycle, numbering, superseding, and the index
- [adr-review.md](references/adr-review.md) — the fresh-eyes review before the PR
- [adr-prose.md](../caic-copy-writer/references/adr-prose.md) — how every section is worded
- [caic-plan](../caic-plan/SKILL.md) — where a decision starts as `D<n>`
- [caic-pr](../caic-pr/SKILL.md) — the PR description

Task input from the user, if any: $ARGUMENTS
