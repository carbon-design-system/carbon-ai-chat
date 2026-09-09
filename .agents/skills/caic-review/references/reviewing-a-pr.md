# reviewing-a-pr.md — what changes when the target is a pull request

Load this when the review target is a PR rather than your own working diff — someone else's branch, or your own PR up for review. Both sections below need a PR number, so neither applies to a self-review; that path names its own range in [caic-review](../SKILL.md#scope-the-review-first).

The rubric itself doesn't change: score the diff with [caic-review](../SKILL.md), then come back here to post.

## Resolve the base branch before diffing

Never assume `main`. A PR usually targets `upstream/main`, but long-running integration branches are common here, and diffing against the wrong base buries the review under unrelated commits.

```bash
gh pr view <pr> --json baseRefName,headRefName,headRefOid,isCrossRepository,url
gh pr diff <pr>   # already scoped to the PR's real base
```

Use `gh pr diff`, or diff explicitly against the reported `baseRefName`. When the base is an integration branch rather than `main`, say so in the summary — it changes what is in scope and what counts as a regression.

## Posting the review

Line comments beat a wall of prose: they land next to the code they're about. Build the whole review as one payload and submit it once.

**Draft first, submit second. Never run a `gh` command that writes to GitHub before the user has seen the exact payload and said go.** Write it to `.github/pr-drafts/review-<pr>.json` (git-ignored), show the summary and findings, then wait.

```json
{
  "commit_id": "<headRefOid from gh pr view>",
  "event": "COMMENT",
  "body": "Fix blockers before merge. <assessment, highest-severity concerns, anything dropped>",
  "comments": [
    {
      "path": "packages/ai-chat/src/foo.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**Blocker** — the early return skips teardown, so the listener leaks on every close. Call `dispose()` before returning."
    }
  ]
}
```

```bash
gh api --method POST repos/<owner>/<repo>/pulls/<pr>/reviews --input .github/pr-drafts/review-<pr>.json
```

- **`event`** is `COMMENT` (feedback only), `APPROVE`, or `REQUEST_CHANGES`. Ask the user which — the review event is theirs, not yours. The verdict line still opens the body, per [Output expectations](../SKILL.md#output-expectations). GitHub rejects `APPROVE` and `REQUEST_CHANGES` on your own PR, so a self-authored PR can only take `COMMENT`.
- **`line`** is the line number in the file as of `commit_id`, and it must fall inside the diff. `side: "RIGHT"` is the post-change file; use `"LEFT"` for a removed line. For a range, add `start_line` (and `start_side`). These fields carry the citation, so drop `file:line` from the comment body and keep the rest of the finding's order.
- A comment outside the diff hunks returns 422. Put that finding in the summary `body` rather than forcing a line onto it.
- A fix that replaces a line range ships as a fenced `suggestion` block in the comment body, so the author commits it from the PR page. The block replaces exactly the commented range — set `start_line` to match. A fix spanning files stays prose.

## Related guidance

- [caic-review](../SKILL.md) — the rubric that produces the findings posted here
- [caic-pr](../../caic-pr/SKILL.md) — drafting the PR description, and opening the PR itself
- [conventions.md](../../../../references/conventions.md) — commits, branches, PR titles
- [Root AGENTS.md](../../../../AGENTS.md) — repo overview and pointer index
