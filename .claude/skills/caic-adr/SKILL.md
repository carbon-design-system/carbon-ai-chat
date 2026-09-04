---
name: caic-adr
description: Record an architecture decision as a numbered ADR in docs/adr/ — the promotion test, the trimmed-MADR sections, the comment window, and superseding. Use when the user asks to "write an ADR", "record this decision", "document why we picked X", or when a plan decision turns out to be something a consumer can feel.
---

An ADR records one decision: what you chose, what you turned down, and what it costs the people who ship on this library. It is committed and permanent, which is what separates it from a plan.

The process — numbering, status, how the window closes — is in [docs/adr/README.md](../../../docs/adr/README.md). This skill is how you write one.

## First: does this need an ADR at all?

Most decisions don't. A folder of records nobody reads is worse than no folder, so apply the test before writing anything.

An ADR is warranted when **either** holds:

- **A consumer can feel it.** It changes public API, changes behavior a host depends on, or changes what a migration costs.
- **Someone will re-propose the option that lost.** Without the reasoning written down, the same debate reopens in a year and nobody remembers why it closed.

Everything else stays a numbered decision in the plan — see [caic-plan](../caic-plan/SKILL.md#what-goes-in-planmd). Mechanical choices (file layout, a helper's name, which of two equivalent spellings) are `D<n>` and nothing more.

**The promotion case.** A plan decision often turns out to meet the test partway through. When it does, write the ADR and shrink `D<n>` to a pointer at it. Don't leave the reasoning in a file that gets deleted.

## How much do you plan first?

Enough to know the options are real. You cannot write Considered options without having costed each one, and costing means reading code — so some of this looks like planning. The line:

**An ADR needs feasibility, not sequencing.** Per option, answer three questions and stop:

- Can it be built, or is there something that kills it outright?
- What breaks — who calls this today, what compiles now that won't after?
- Is it one PR or ten? The order of magnitude, not the breakdown.

Stop investigating an option when you know what would kill it. If you are drafting per-step files or a `Files touched` list to justify a choice, you have gone too far — you are now planning the option that is about to lose.

**Surfacing the options is the harder half.** Two usually present themselves: what exists today, and the thing someone already proposed. Look for the two that don't:

- **The middle path.** Most decisions arrive framed as a binary. Ask what the cheap half looks like — deprecate now and remove later, fix the shape and leave the naming, ship the type and defer the runtime.
- **The one you rejected before you started.** Whatever you dismissed in the first minute is usually the option a reader will raise. Write it down and say why, or spend the comment window saying it out loud.

## Two ways in

**Decision first.** Investigate → write the ADR → merge as `proposed` → plan the winner only. The plan's `Decisions` list cites the ADR rather than re-deriving it, and the epic and issues project from the plan as usual.

**Promotion, which is more common.** The plan is already underway. `D3` turns out to be something a consumer can feel, so it graduates: write the ADR, shrink `D3` to a pointer, keep going. Most of the investigation is already done — that is why this path is cheaper, and why it is worth reaching for the promotion test during plan review rather than at the start.

Either way, if the comment window changes the decision, the spine's propagation rule fires downward — Done when first, then whichever artifact the plan's fork produces. See [caic-plan](../caic-plan/SKILL.md#the-spine).

## One decision per ADR

If the Decision outcome section needs an "and", you have two ADRs. Split them.

The tell is the comment window: two decisions in one file means an objection to either half blocks both. Splitting lets one land while the other argues.

Related decisions still get separate files, cross-linked through `More information`. A single ADR covering "the whole messaging contract" is a design doc wearing an ADR's frontmatter.

## Drafting

Draft into `.github/adr-drafts/<kebab-case-slug>.md`, which is git-ignored — same convention as plan, issue, and PR drafts. Rename to the real `NNNN-<slug>.md` when you move it into `docs/adr/`.

Claim the number with `ls docs/adr/` and take the next free one. Four digits, starting at `0001`. If two ADRs are in flight at once, whoever merges second rebases and renumbers.

Copy [docs/adr/template.md](../../../docs/adr/template.md) rather than writing the sections from memory — it carries the authoring comments for each one.

## Filling in the sections

**Context and problem statement.** Why this is on the table now, and what stays broken if nothing changes. Link the epic and issues; don't restate them. Two or three paragraphs. Cite real evidence from the codebase — a type that can't narrow, a field with zero read sites, a TODO naming an upstream package. A context section built from assertions produces a decision nobody can check.

**Considered options.** The reason the file exists. One subsection per option, winner marked. Pros and cons live with the option, not in a second list.

Write each rejected option well enough that a reader who has the same idea next year recognizes it and knows it was already weighed. "Rejected because it was worse" is not a record. Name the specific cost that killed it.

Two rejected options is usually right. One means you didn't look; five means you're padding.

**Decision outcome.** Present tense, active voice, one decision. This is the sentence people will quote back at you in review — make it precise enough to review a diff against.

**Consequences.** What gets easier, what gets harder, what becomes impossible. Include the costs you took knowingly. An ADR listing only upsides is a pitch, not a record, and it reads as one.

**For consumers.** Required, and the section most likely to be written badly. Before and after code, not prose about migration.

State plainly how a consumer finds out they're affected. A compile error is cheap. A UI that silently goes quiet is expensive, and if that's the case it belongs in the first line of this section. When the honest answer is "nothing changes for consumers", write that — an ADR about internal structure is allowed to say so.

**More information.** The epic, the issues, any ADR this supersedes, external references. The epic's Expected outcomes are how anyone confirms the decision shipped: link them, never copy them. Duplicated outcomes drift.

## Setting the window

`comments-by` is the earliest date the decision should be ratified. **Ask the user what it should be** — it is a judgment about who needs to weigh in and how long that takes, and it differs per ADR.

Recommend **at least 10 working days**. Argue for longer when:

- The blast radius is wide, or the migration is expensive.
- The people who would object are outside the team, so they have to notice the tracking issue first.
- The window would span a holiday or a release freeze.

**Silence is not agreement.** The date does not accept the ADR; a person does. `comments-by` gates when that can happen, so a short window buys nothing except an earlier opportunity to decide.

An ADR that merges already decided — a process ADR, or one ratifying something long since shipped — merges as `status: accepted` with `comments-by` empty. Say in the ADR why it skipped the window, so it doesn't read as precedent.

## Review before opening the PR

An ADR is not done when it is written. Close every ADR session by reviewing it with fresh eyes against [adr-review.md](references/adr-review.md) — spawn a sub-agent when sub-agents are available, since reviewing your own options against themselves produces a tautological thumbs-up.

The review looks for different things than a plan review does: strawman alternatives, an option nobody listed, and a consumer-cost section that covers only the breakage a compiler catches. Resolve what it surfaces and bake the resolutions in before the PR.

**The comment window is not the review.** It is for people who were not in the room. An ADR should be right before it merges.

## Before anything reaches GitHub

Drafting ends at the file. **Never push a branch, open the PR, or file the tracking issue before the user has read the ADR and said go.** A public repo makes it visible immediately, and deleting it doesn't undo that.

Then, before the commands:

- **Resolve the repo.** Run `git remote -v`. If more than one remote is configured, or any points somewhere other than where this ADR belongs, ask rather than letting `gh` pick a default.
- **No agent attribution** in the ADR, the PR, or the issue.

## Opening the PR and the tracking issue

The tracking issue is the comment venue, because GitHub Discussions is off for this repo and review comments on a merged PR stop being findable.

Draft the PR description with [caic-pr](../caic-pr/SKILL.md) and open it from there — the repo's PR template is Changelog-and-Testing shaped, and an ADR PR needs that adapted, not filled in literally. Title it `docs: ADR-NNNN <title>`.

Then the tracking issue, once the PR exists:

```bash
gh issue create --repo <owner>/<repo> \
  --title "Comment on ADR-NNNN: <title>" --body-file <file>
```

The body comes from the [ADR_COMMENT.yaml](../../../.github/ISSUE_TEMPLATE/ADR_COMMENT.yaml) form — **not** the development-task form, whose fields are all about work to be done and this issue builds nothing. Use `###` headings matching that form's labels, so a `gh`-filed issue and a form-filed one read identically:

- **Decision** — the ADR's Decision outcome in one sentence, then a link to the record.
- **Comments by** — the `comments-by` date.
- **The feedback that helps most** — the form's default prompts, edited if this ADR needs different ones.
- **Outcome** — left empty until the decision is made.

**One sentence of the ADR, and no more.** Anything else you copy drifts, and people end up arguing with the stale version.

The prompts under the third heading are the public half of [adr-review.md](references/adr-review.md). Asking them outright is what gets a useful comment from someone who has not followed the work; an open-ended "thoughts?" gets naming opinions.

**No label.** The form pins the title prefix, so `is:issue is:open in:title "Comment on ADR"` is already the list of undecided ADRs — a label would be a second copy of what the title says. Keep the title exactly as the form writes it when filing with `gh`, because that search is the only thing holding the set together.

When the ADR is decided, fill in Outcome and close the issue. A closed tracking issue with an empty Outcome tells the next reader nothing.

Put the issue number in the ADR's `discussion` field and push that change before merge — an ADR on `main` pointing at nothing sends readers to the PR, which is where the comments go to die.

Expect the PR to be red until you do. `validate:adrs` fails a `proposed` record with no `comments-by` or `discussion`, and the issue can only be filed after the PR exists. That ordering is deliberate: it is what stops an ADR reaching `main` with nowhere to comment.

Add a row to the index table at the bottom of [docs/adr/README.md](../../../docs/adr/README.md) in the same PR. It carries titles only; status lives in frontmatter and nowhere else. `npm run validate:adrs` fails on a missing row.

Merge once the ADR reads clearly, not once everyone agrees. Status stays `proposed`.

## Closing the window

On or after `comments-by`, someone on `@carbon-design-system/carbon-ai-chat-developers` sets `status` and closes the tracking issue.

**Nothing happens automatically.** A window that has closed on a `proposed` ADR means the decision is ready to be made, not that it was made. If you are asked whether such an ADR is settled, the answer is no — and the fix is to go decide it, not to assume.

An objection pushes `comments-by` out. It does not reject the ADR. **Rejection is its own outcome and takes the same write-up as acceptance** — set `status: rejected` and make sure Considered options explains what beat it, so the next person to have the idea learns something.

## Acting on a comment

**A `proposed` ADR is amended in place. An `accepted` one is superseded.** Nothing was ratified while it was `proposed`, so editing it is finishing the draft, not rewriting history.

What a comment earns depends on what it is:

| The comment | What changes | Window |
| ----------- | ------------- | ------ |
| The text is unclear | Reword it | Unchanged |
| An option is missing, and it still loses | Add it to Considered options, with why it lost | Unchanged |
| An option is missing, and it wins | Rewrite Decision outcome, Consequences, and For consumers | **Extend** |
| A consumer case is missing from For consumers | Add it | Extend if the decision moves |
| A constraint nobody knew about | Usually rewrites the decision | **Extend** |

Extend by pushing `comments-by` out, because everyone who already read it agreed to something else. A change that leaves the Decision outcome standing does not need one.

Amend in a normal PR against the ADR. **Then reply on the tracking issue** saying what changed and linking the PR — otherwise the thread reads as though the commenter was ignored, and the next reader cannot tell that a point was taken. Don't add a changelog section to the ADR: git history and the issue thread already carry it, and the record should read as the decision, not as an audit trail.

**Answer every substantive comment, adopted or not.** A "considered this, here is why it still loses" is what gets that person to comment on the next one. Feedback that vanishes into a void does not come back.

If the amendment turns it into a different decision — the title no longer describes it — stop amending. Set `status: rejected`, say in Considered options what replaced it, and write a new ADR.

**After acceptance, supersede instead.** The old reasoning is the record; a reader needs to see what you believed then and what changed. Write a new ADR, set its `supersedes`, then on the old one set `superseded-by` and `status: superseded` — the only edit an accepted ADR takes, beyond a typo or a broken link. Reopening the closed tracking issue is fine for working out whether it is worth one.

## Anti-patterns

- **Restating the epic.** If the ADR lists work items or acceptance criteria, it's drifting into the epic's job. The ADR justifies; the epic tracks. Link, don't copy.
- **A strawman rejected option.** An option nobody seriously proposed makes the record look thorough and teaches nothing. Two real alternatives beat four with padding.
- **Writing it after the code.** An ADR filed to document a merged PR is a changelog. The point is to be reviewable while the decision is still reversible.
- **Skipping `For consumers` on a breaking change.** It's the section a reader opens first and the one most often left as a stub.
- **An ADR per issue.** One decision can govern a whole epic. If a sub-issue needs its own ADR, check that it isn't just implementing the parent's.

## Related guidance

- [docs/adr/README.md](../../../docs/adr/README.md) — process, numbering, status, and the index
- [adr-review.md](references/adr-review.md) — the review this skill closes with
- [caic-plan](../caic-plan/SKILL.md) — where a decision starts life as `D<n>`, and the spine an ADR sits on top of
- [caic-issue](../caic-issue/SKILL.md) — filing the tracking issue, and the same approval gate
- [tone.md](../../../references/tone.md) — voice and word economy for developer-facing copy

Task input from the user, if any: $ARGUMENTS
