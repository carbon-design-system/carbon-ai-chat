---
name: caic-review
description: Review a working diff or a pull request against this repo's rubric — severity-tagged findings with file:line citations, repo-specific convention checks, test-coverage gaps, and optional line comments posted back to the PR. Use when the user asks to "review my diff", "review this branch", "review this PR", or "self-review before done", and for the self-review an agent runs on its own work before marking a task complete.
---

This rubric governs every code review in this repo — both user-requested reviews and the self-review an agent runs against its own diff before marking a task done (see [AGENTS.md](../../../AGENTS.md)).

## Scope the review first

Two jobs share this rubric. Settle which one you're doing before reading any code — ask the user when the request doesn't make it obvious:

- **Own work** — a self-review of the working diff before marking a task done. Findings come back as text; nothing is posted anywhere.
  - **Name the range first.** `git diff` while the work is uncommitted, `git diff <base>...HEAD` once it is committed, where `<base>` is the branch you will merge into. An empty range means you picked the wrong one, not that the work is clean.
  - **Hand it to a sub-agent when you have one, and brief it on the requirement without your defense of it.** [review-passes.md](references/review-passes.md#hand-a-self-review-to-fresh-eyes) says what the sub-agent gets, what you withhold, and why.
- **A pull request** — someone else's branch, or your own PR up for review. Findings can be posted as line comments with a verdict. Read [reviewing-a-pr.md](references/reviewing-a-pr.md) before you diff: it carries base-branch resolution and the posting payload.

## How to review

- Read the actual diff (`git diff`, `gh pr diff`, etc.) and referenced files — never a summary of what changed.
- When reading it all at one depth would mean reading all of it shallowly, rank the files by risk first — [large-diffs.md](references/large-diffs.md).
- **Score the diff against what it had to satisfy** — the issue's Done when, Constraints, and comments, the proofs, any API proposal, any ADR it cites. That check runs on every review, and [review-passes.md](references/review-passes.md#the-check-that-runs-every-time) carries each one and the severity a miss earns.
- **Run the read-only gates for what changed before you write anything, and start no build without asking** — [repo-checks.md](references/repo-checks.md) carries the gate list, when to ask about a build, and the conventions to flag by hand that no gate catches.
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
