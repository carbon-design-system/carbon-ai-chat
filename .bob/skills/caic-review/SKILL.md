---
name: caic-review
description: Review a local diff, branch, or pull request with severity-tagged findings and verification gaps. Use for code-review requests and self-review before marking work complete. Publish feedback only when the user authorizes it; use caic-plan for plan reviews.
---

This rubric governs every code review in this repo — both user-requested reviews and the self-review an agent runs against its own diff before marking a task done (see [AGENTS.md](../../../AGENTS.md)).

**Before drafting any copy**, read [caic-copy-writer](../caic-copy-writer/SKILL.md) and apply its shared skim-reading rule and workflow. This includes local drafts and final artifacts. Reuse it if already loaded.

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
- Tag every finding by **what it costs if it merges as written**:
  - **Blocker** — something ships broken, or a commitment breaks: wrong behavior on a path you can name, a regression, a security hole, a broken build or tests, an edit to generated output, or a missed Done when, proof, or ADR. Fix before merge.
  - **Important** — nothing ships broken, but someone pays later: a missing test for changed behavior, a defect you couldn't confirm past the happy path, needless work such as whole-list re-renders, a misleading name or doc, scope creep, or unrelated work bundled in. The author fixes it in this PR or replies with why not; a reply is enough to merge.
  - **If nobody pays, it isn't a finding**, however small the edit — see [What isn't a finding](references/writing-findings.md#what-isnt-a-finding).
- **A convention break costs what its consequence costs.** It is not a Blocker by default.
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

**The summary — the review body above the findings — has a fixed layout.** Only the verdict is required. Drop any other section with nothing in it; never write "None."

````markdown
### AI Review

**Fix blockers before merge.** 1 Blocker, 2 Important; 3 inline suggestions.

**Blocking**
- `foo.ts:42` — the early return leaks the listener on every close.

**Across the diff**
- Four reducers rebuild the whole list for one changed item; fix the pattern, not only the two flagged lines.

**Not verified**
- The retry branch of the upload queue; read the happy path only.

<details><summary>Checked</summary>

`npm run lint` and the `ai-chat` tests passed at `abc1234`. Read the store and public types in full; skimmed 14 fixture updates.

</details>
````

- **`### AI Review` opens every review posted to GitHub**, so the PR's other readers know who wrote it. A review returned in the conversation skips it.
- **The verdict line comes next, and nothing else precedes it**: no greeting, no "great work on this", no recap of what the PR does. The author wrote the diff and does not need it read back. Pick **Ship.** when there are no findings, **Fix or answer the Importants, then ship.** when only Importants remain, **Fix blockers before merge.** when something blocks, or **Rework.** when the approach has to change and fixing the findings one by one won't get there. Then count the findings by severity, any inline suggestions, and any dropped findings, so the author can size the job.
- **One line per bullet.** It names the defect and where; the finding carries the why and the fix. A bullet that needs a second line is a finding.
- **Blocking** lists every Blocker. **Never drop one**, however many there are — a Blocker reduced to a count blocks nothing, and merges.
- **Across the diff** holds what no line comment can: a pattern across files, a design concern that outgrew a finding, or a PR that should have been several ([large-diffs.md](references/large-diffs.md#size-is-a-finding)). Flag two or three instances of a pattern as findings and ask for the rest here.
- **Not verified** names what limits the verdict: changed behavior with no test, a gate you couldn't run, code you skimmed.
- **A strength earns one line** above **Checked**, and only when it was the risk and it landed — "the migration path handles the null case, which was the hard part." Generic praise is padding; cut it.
- **Checked** collapses the logistics: a base other than `main`, the gates and their results, and what you read in full. The author opens it only to question the verdict.
- **Keep the visible part on one screen.** Past that, move the detail into a finding or into **Checked**.

**The findings follow the summary**, Blockers first, then Important, each written to the shape above. On a posted review they are line comments, so the summary names only the Blockers and counts the rest.

**Cap Important at ten**, highest cost first, and count the drop in the verdict line: "6 further Important not listed." A review nobody finishes fixes nothing, and a silent cut reads as full coverage. When the Blockers alone run past ten, drop the Importants entirely — the verdict is rework, and a tail of should-fixes under that many must-fixes is noise.

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
