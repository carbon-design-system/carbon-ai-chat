# reviewing-a-pr.md — what changes when the target is a pull request

Load this when reviewing a pull request, including your own. For a local diff or branch review, use [caic-review's scope rules](../SKILL.md#scope-the-review-first).

Apply [caic-review](../SKILL.md)'s rubric. Return findings in the conversation unless the user has authorized publication.

## Resolve the base branch before diffing

Never assume `main`. A PR usually targets `upstream/main`, but long-running integration branches are common here, and diffing against the wrong base buries the review under unrelated commits.

```bash
gh pr view <pr> --json baseRefName,headRefName,headRefOid,isCrossRepository,url
gh pr diff <pr>   # already scoped to the PR's real base
```

Use `gh pr diff`, or `git diff <resolved-base>...<headRefOid>` after resolving the reported base ref. Preserve any narrower range the user requested. Name an integration base in the summary because it changes the review's scope.

## Ship fixes the author can accept, not fixes they have to write

When a fix replaces a line range inside the diff, draft a fenced `suggestion` block for that range. If publication is authorized, the author can apply it from the PR page. Use prose for fixes spanning files or decisions that need the author's input.

- **One block per commented range.** It replaces exactly the lines the comment is anchored to, so set `start_line` to match. A block that covers less than the edit needs produces broken code on accept.
- **Suggestions that depend on each other say so.** Two blocks that only work applied together — a renamed language-pack key and its one reader — each name the other. Otherwise the author accepts one and the build breaks.
- **Count them in the summary.** "Eight of the fixes are suggestions you can apply from this page" tells the author how much of the review costs them nothing.

**Verify suggestions when useful to the requested review.** Use an isolated worktree or temporary checkout at the reviewed revision. Keep the user's branch and working tree intact. Run relevant checks under [repo-checks.md](repo-checks.md), including build/watch coordination. Report the checks you ran and label untested suggestions; a suggestion block alone does not claim they passed.

## Posting the review

When publication is authorized, build the whole review as one payload and submit it once. Line comments keep findings next to the code.

**Prepare the complete review before any permission request.** Write the payload to `.github/pr-drafts/review-<pr>.json` (git-ignored). A request to review supplies no publication permission. If the user also asks to publish, reuse that authorization and the supplied destination and event; do not ask again. If publication is not authorized and is needed to finish the task, show the payload and ask then. A feedback-only review ends with findings in the conversation.

```json
{
  "commit_id": "<headRefOid from gh pr view>",
  "event": "COMMENT",
  "body": "Fix blockers before merge. <highest-severity concerns, anything dropped, then what you checked and cleared>",
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

- **`event`** is `COMMENT` (feedback only), `APPROVE`, or `REQUEST_CHANGES`. Use the event the user authorized; a request to post feedback uses `COMMENT`. Ask only when the intended event is unclear. The verdict line still opens the body, per [Output expectations](../SKILL.md#output-expectations). GitHub rejects `APPROVE` and `REQUEST_CHANGES` on your own PR; explain that limit if it conflicts with the request.
- **`line`** is the line number in the file as of `commit_id`, and it must fall inside the diff. `side: "RIGHT"` is the post-change file; use `"LEFT"` for a removed line. For a range, add `start_line` (and `start_side`). These fields carry the citation, so drop `file:line` from the comment body and keep the rest of the finding's order — the orientation line still comes first, since a notification shows the body long before the code ([review-comments.md](../../caic-copy-writer/references/review-comments.md)).
- A comment outside the diff hunks returns 422. Put that finding in the summary `body` rather than forcing a line onto it.

## Related guidance

- [caic-review](../SKILL.md) — the rubric that produces the findings posted here
- [caic-pr](../../caic-pr/SKILL.md) — drafting the PR description, and opening the PR itself
- [conventions.md](../../../../references/conventions.md) — commits, branches, PR titles
- [Root AGENTS.md](../../../../AGENTS.md) — repo overview and pointer index
