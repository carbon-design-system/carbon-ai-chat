---
name: caic-review
description: Review a local diff, branch, or pull request with severity-tagged findings and verification gaps. Use for code-review requests and self-review before marking work complete. Publish feedback only when the user authorizes it; use caic-plan for plan reviews.
---

This rubric governs every code review in this repo — both user-requested reviews and the self-review an agent runs against its own diff before marking a task done (see [AGENTS.md](../../../AGENTS.md)).

## Scope the review first

**Use the requested scope.** Honor supplied paths, ranges, and revisions. Infer them from the task when clear; ask only about gaps that change the review.

- **Local changes:** start with `git status --short --untracked-files=all`. Read `git diff --cached` and `git diff` separately, scoped to the requested paths. Inspect relevant untracked files that status lists, while respecting generated-output exclusions. `git diff HEAD` alone can hide a staged change canceled by an unstaged edit. Report which index and working-tree states you reviewed. An empty requested scope is a valid no-changes result; do not widen it silently.
- **Committed branch:** use `git diff <base>...<head>` from the intended merge base, unless the user supplied a specific range. Keep unrelated local changes outside that scope.
- **Pull request:** read [reviewing-a-pr.md](references/reviewing-a-pr.md) for the actual base, head revision, and any authorized posting.

**Return feedback for a review request. Publish on GitHub only when the user authorizes it.** A review request alone does not authorize edits to the user's checkout. Existing edit or publication authorization still applies. A self-review is part of the active implementation task: fix defects within that task's scope.

**Use fresh eyes for self-review.** Brief a sub-agent on the requirement without defending the implementation. [review-passes.md](references/review-passes.md#hand-a-self-review-to-fresh-eyes) defines that brief.

## How to review

- Read the actual diff (`git diff`, `gh pr diff`, etc.) and referenced files — never a summary of what changed.
- When reading it all at one depth would mean reading all of it shallowly, rank the files by risk first — [large-diffs.md](references/large-diffs.md).
- **Score the diff against what it had to satisfy** — the issue's Done when, Constraints, and comments, the proofs, any API proposal, any ADR it cites. That check runs on every review, and [review-passes.md](references/review-passes.md#the-check-that-runs-every-time) carries each one and the severity a miss earns.
- **Verify what changed and reuse current evidence.** [repo-checks.md](references/repo-checks.md) selects the gates, coordinates builds, and lists conventions no gate catches.
- Tag every finding with a severity so real problems aren't buried under taste:
  - **Blocker** — must fix before merge: bug, regression, security issue, broken build/tests, violated repo convention, accidental edit to generated output.
  - **Important** — should fix: unclear naming, missing test for changed behavior, unhandled edge case, scope creep.
  - **Nit** — optional, and it still has to earn its place: a concrete one-edit fix a later reader benefits from. Everything else is noise — see [What isn't a finding](references/writing-findings.md#what-isnt-a-finding).
- Read enough to be sure before you call something a **Blocker**. A false Blocker costs the author as much as a missed one. If you have only read the happy path, file it as **Important** and say what you did not read.

## Run one dimension at a time

One pass over every check spends its attention on the first dimension and skims the rest. Split the review into independent passes, each holding the whole diff and one job, and pick them from the changed paths. Skip the split when a single reading holds the whole diff in view.

- [review-passes.md](references/review-passes.md) — read before the passes start: the pass-by-path table, the brief each one gets, and the refute-then-synthesize steps that merge them.
- [evaluating-changes.md](references/evaluating-changes.md) — read when a pass holds docs and text, code, or test coverage: the checklist for each, including `npm run measure` and the weakened-proof check.

## How to write a finding

One shape, one order — orientation, then severity, the defect, what it costs, the fix:

```
**<Orientation label>:** <what the code under discussion does, and when it runs.>

**<Severity>** — `path/to/file.ts:42` — <what is wrong>, so <what it costs>. <The fix.>
```

**The orientation line is what makes a finding readable a day later**, in a notification, with none of the code open — which is how the author reads it. [review-comments.md](../caic-copy-writer/references/review-comments.md) owns its wording and lists the four labels that work.

**Never post the objection without the fix**, and let the consequence name the input or path that reaches the defect. [writing-findings.md](references/writing-findings.md) carries both rules in full — read it before your first finding, with a worked finding at each severity, the three habits that weaken one, and what isn't a finding at all.

## Output expectations

- **Open with the verdict on one line** — ship, fix blockers, or rework. Nothing precedes it: no greeting, no "great work on this", no recap of what the PR does. The author wrote the diff and does not need it read back.
- **Then the defects, ahead of everything else** — at most three lines, carrying only what the verdict rests on, in this order: the blocking concerns, any design-level concern that outgrew a finding, then the dropped-finding count. What you checked and cleared, the gates you ran, and any strength all sit below them. A strength earns a line only when it was the risk and it landed — "the migration path handles the null case, which was the hard part." Generic praise is padding; cut it.
- List findings grouped by severity (**Blocker**, **Important**, **Nit**), each written to the shape above.
- **Never drop a Blocker.** List every one, however many there are. A Blocker reduced to a count in the summary blocks nothing, and merges.
- **Cap Important and Nit at ten between them**, no more than three of those Nits, highest severity first. Drop Nits before Importants, and name the drop in one summary line: "12 further Nits (naming, comment wording) not listed." A review nobody finishes fixes nothing, and a silent cut reads as full coverage. When the Blockers alone run past ten, drop the Importants and Nits entirely — the verdict is rework, and a tail of taste under that many must-fixes is noise.
- End with a **Test / verification gaps** section if the diff lacks coverage for changed behavior.

## Related guidance

Cross-reference these for the "why" behind what you enforce.

| Read when | Read |
| --- | --- |
| A pass needs its checklist — docs, code, or tests | [evaluating-changes.md](references/evaluating-changes.md) |
| Splitting the review into passes, or merging them | [review-passes.md](references/review-passes.md) |
| Filing a finding, or unsure an observation is one | [writing-findings.md](references/writing-findings.md) |
| Running the gates, or flagging a repo convention | [repo-checks.md](references/repo-checks.md) |
| The target is a PR, or the diff is too big to read evenly | [reviewing-a-pr.md](references/reviewing-a-pr.md), [large-diffs.md](references/large-diffs.md) |
| Wording your findings, or judging the diff's copy | [review-comments.md](../caic-copy-writer/references/review-comments.md) (type 14), [tone.md](../../../references/tone.md), [caic-copy-writer](../caic-copy-writer/SKILL.md) |
| Citing the rule a finding breaks, or reading a `measure` run | [code-patterns.md](../../../references/code-patterns.md), [conventions.md](../../../references/conventions.md), [measuring.md](../../../references/measuring.md) |
| Orienting in the monorepo, or finding a package's own rules | [AGENTS.md](../../../AGENTS.md), plus each package's own `AGENTS.md` |
| Drafting the PR description, or reviewing a plan instead | [caic-pr](../caic-pr/SKILL.md), [plan-review.md](../caic-plan/references/plan-review.md) |

Task input from the user, if any: $ARGUMENTS
