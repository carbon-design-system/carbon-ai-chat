---
name: caic-adr
description: Propose an architecture decision as a numbered ADR in docs/adr/ — a request for feedback that leads with the problem and the proposal, drafted from the template, reviewed with fresh eyes, then opened as a PR and an RFC discussion. Use when the user asks to "write an ADR", "propose this decision", "record why we picked X", or when a plan decision turns out to be something a consumer can feel.
---

An ADR is a proposal first and a record second. It asks the people who build on this library for feedback on a decision they will feel, then stays as the record of what was decided and why.

The process rules (lifecycle, numbering, superseding, what happens to feedback) are in [docs/adr/README.md](../../../docs/adr/README.md). This skill is how you write one and get it in front of readers.

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
4. **Keep all eight `##` sections, in template order.** `npm run validate:adrs` fails anything else. Use `###` inside a section, and write "None." under a heading with nothing to say.

What each section has to settle:

| Section | Settles | The test |
| --- | --- | --- |
| Summary | Problem, proposal, 2–3 feedback questions | A stranger reading only this can say what's proposed and whether it concerns them |
| Motivation | Who hits the problem, and why now | Every cost is concrete and stated in consumer terms |
| Proposal | What a host writes, then `### Reference` with exact types and behavior | Precise enough to review a diff against |
| Consumer impact | Before and after code for every host that changes | Silent breaks (UI goes quiet, wrong data) come first |
| Drawbacks | Costs the proposal accepts | Not empty; a real proposal gives something up |
| Alternatives | Only ones someone proposed or a reader would raise | Each names the specific cost that lost it; none is valid |
| Open questions | What stays undecided or deferred | Each is a real question, not a to-do |
| Decision | "Not decided. Feedback by DATE in the RFC discussion linked above." | Filled in only when a maintainer decides |

## Set `feedback-by`

**Ask the user for the date.** It depends on who needs to weigh in. Recommend at least 10 working days. Argue for longer when the change reaches widely, when the people likely to object are outside the team, or when the window spans a holiday or a release freeze.

**A date passing decides nothing.** A maintainer decides on or after it.

## Review before the PR

**Review the draft with fresh eyes against [adr-review.md](references/adr-review.md).** Spawn a sub-agent when sub-agents are available; reviewing your own proposal produces a thumbs-up. Fold what it finds into the draft before the PR.

## Before anything reaches GitHub

**Never push, open the PR, or post a discussion until the user has read the ADR and said go.** A public repo makes it visible at once, and deleting it doesn't undo that.

- **Resolve the repo** with `git remote -v`. If there is more than one remote, ask which one.
- **Add no agent attribution** to the ADR, the PR, or the discussion.

## Open the PR

1. **Move the draft to `docs/adr/NNNN-<slug>.md`** and run `npm run sync:adrs` to add the index row.
2. **Run `npm run validate:adrs`** and fix what it reports.
3. **Draft the PR description with [caic-pr](../caic-pr/SKILL.md)**, titled `docs: ADR-NNNN <title>`. Put the claim citations from your investigation there.
4. **Merge once it reads clearly, not once everyone agrees.** It stays `proposed`.

## Open the RFC discussion, after merge

**Post it once the ADR is on `main`**, so the record link works. Match the [RFC Discussions form](../../../.github/DISCUSSION_TEMPLATE/rfc-discussions.yml): title `[RFC]: <ADR title>`, and `###` headings for **Record**, **Feedback by**, and **Summary**, with the Summary pasted verbatim.

```bash
gh api graphql -f query='{repository(owner:"carbon-design-system",name:"carbon-ai-chat"){id discussionCategories(first:25){nodes{id slug}}}}'
gh api graphql -F repositoryId=<id> -F categoryId=<rfc-discussions id> \
  -F title="[RFC]: <ADR title>" -F body=@<body-file> \
  -f query='mutation($repositoryId:ID!,$categoryId:ID!,$title:String!,$body:String!){createDiscussion(input:{repositoryId:$repositoryId,categoryId:$categoryId,title:$title,body:$body}){discussion{url}}}'
```

Then **set the ADR's `discussion` field to the URL in a follow-up PR.**

## Act on feedback

**Amend a `proposed` ADR in place.** Nothing is ratified yet, so editing it is finishing the draft.

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
- **Padding Alternatives.** An option nobody would propose makes the record look thorough and teaches nothing.
- **Splitting one surface across records that only make sense together.**
- **Writing it after the code.** An ADR filed to document a merged PR is a changelog.
- **A Consumer impact that lists only compile errors.** The silent break is the expensive one.
- **Restating the epic.** Work items and acceptance criteria belong to the epic; link it.

## Related guidance

- [docs/adr/README.md](../../../docs/adr/README.md) — lifecycle, numbering, superseding, and the index
- [adr-review.md](references/adr-review.md) — the fresh-eyes review before the PR
- [adr-prose.md](../caic-copy-writer/references/adr-prose.md) — how every section is worded
- [caic-plan](../caic-plan/SKILL.md) — where a decision starts as `D<n>`
- [caic-pr](../caic-pr/SKILL.md) — the PR description

Task input from the user, if any: $ARGUMENTS
