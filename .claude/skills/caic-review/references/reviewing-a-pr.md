# reviewing-a-pr.md — what changes when the target is a pull request

Load this when the review target is a PR rather than your own working diff — someone else's branch, or your own PR up for review. Every section below needs a PR number, so none of them applies to a self-review; that path names its own range in [caic-review](../SKILL.md#scope-the-review-first).

The rubric itself doesn't change: score the diff with [caic-review](../SKILL.md), then come back here to post.

## Resolve the base branch before diffing

Never assume `main`. A PR usually targets `upstream/main`, but long-running integration branches are common here, and diffing against the wrong base buries the review under unrelated commits.

```bash
gh pr view <pr> --json baseRefName,headRefName,headRefOid,isCrossRepository,url
gh pr diff <pr>   # already scoped to the PR's real base
```

Use `gh pr diff`, or diff explicitly against the reported `baseRefName`. When the base is an integration branch rather than `main`, say so in the summary — it changes what is in scope and what counts as a regression.

## Ship fixes the author can accept, not fixes they have to write

On someone else's PR, a fix the author has to re-type is a fix they may skip. When the fix replaces a line range that sits inside the diff, post it as a fenced `suggestion` block in the comment body, so the author commits it from the PR page in one click. Prose is for the fixes that can't be one — a change spanning files, a design direction, a fix whose right shape depends on something only the author knows.

- **One block per commented range.** It replaces exactly the lines the comment is anchored to, so set `start_line` to match. A block that covers less than the edit needs produces broken code on accept.
- **Suggestions that depend on each other say so.** Two blocks that only work applied together — a renamed language-pack key and its one reader — each name the other. Otherwise the author accepts one and the build breaks.
- **Count them in the summary.** "Eight of the fixes are suggestions you can apply from this page" tells the author how much of the review costs them nothing.

**Ask the user whether to apply the suggestions locally and test them before you submit.** A suggestion asserts that the code builds and the tests pass with it applied, and a wrong one costs the author more than prose would have. Verifying it means checking out the PR branch and running gates — a branch switch and a possible race with the watcher, so it is the user's call and not yours. Ask, and when the answer is no, say in the summary that the suggestions are untested.

## Posting the review

Line comments beat a wall of prose: they land next to the code they're about. Build the whole review as one payload and submit it once.

**Draft first, submit second. Never run a `gh` command that writes to GitHub before the user has seen the exact payload and said go.** Write it to `.github/pr-drafts/review-<pr>.json` (git-ignored), show the summary and findings, then wait.

```json
{
  "commit_id": "<headRefOid from gh pr view>",
  "event": "COMMENT",
  "body": "Fix blockers before merge. <highest-severity concerns, anything dropped, then any assessment>",
  "comments": [
    {
      "path": "packages/ai-chat/src/foo.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**Context:** this early return is the already-closed guard, and the listener it skips past was registered a few lines above.\n\n**Blocker** — the early return skips teardown, so the listener leaks on every close. Call `dispose()` before returning."
    }
  ]
}
```

```bash
gh api --method POST repos/<owner>/<repo>/pulls/<pr>/reviews --input .github/pr-drafts/review-<pr>.json
```

- **`event`** is `COMMENT` (feedback only), `APPROVE`, or `REQUEST_CHANGES`. Ask the user which — the review event is theirs, not yours. The verdict line still opens the body, per [Output expectations](../SKILL.md#output-expectations). GitHub rejects `APPROVE` and `REQUEST_CHANGES` on your own PR, so a self-authored PR can only take `COMMENT`.
- **`line`** is the line number in the file as of `commit_id`, and it must fall inside the diff. `side: "RIGHT"` is the post-change file; use `"LEFT"` for a removed line. For a range, add `start_line` (and `start_side`). These fields carry the citation, so drop `file:line` from the comment body and keep the rest of the finding's order — the orientation line still comes first, since a notification shows the body long before the code ([review-comments.md](../../caic-copy-writer/references/review-comments.md)).
- A comment outside the diff hunks returns 422. Put that finding in the summary `body` rather than forcing a line onto it.

## Related guidance

- [caic-review](../SKILL.md) — the rubric that produces the findings posted here
- [caic-pr](../../caic-pr/SKILL.md) — drafting the PR description, and opening the PR itself
- [conventions.md](../../../../references/conventions.md) — commits, branches, PR titles
- [Root AGENTS.md](../../../../AGENTS.md) — repo overview and pointer index
