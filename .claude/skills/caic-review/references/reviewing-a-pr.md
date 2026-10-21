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

## Ship fixes the author can apply

For a concrete, safe replacement within the PR diff, **include a real fenced `suggestion` block** in the line comment. This is the default in local review drafts and posted reviews. Prose explains the finding; it does not substitute for an available suggestion. A code fence labeled `ts` or a suggestion in the summary has no Apply suggestion button.

- **Match the anchor to the replacement.** Pin the reviewed head SHA and file path. For one line, set `line` and `side: "RIGHT"`. For a range, set `start_line` / `start_side` to its first line and `line` / `side` to its last. Use the head's line numbers and a range GitHub accepts in the diff. Use one suggestion block per range. Include the full replacement, including unchanged lines the range still needs.
- **Name dependencies beside each suggestion.** If two replacements only work together, identify both and tell the author to apply them together. Do not present a partial fix as safe to accept alone. Supply a complete patch when suggestions cannot carry the whole fix.
- **Keep unresolved design questions as questions.** State the missing decision or evidence and its consequence. Do not invent code or a patch to make an uncertain fix look actionable.
- **Count suggestions in the summary.** Count only actual inline suggestion blocks, not prose requests or patch hunks.

**Validate proposed edits locally where practical.** Use an isolated checkout at the reviewed SHA; preserve the user's work. Apply the proposed edits together and run relevant checks under [repo-checks.md](repo-checks.md), including build/watch coordination. Report the target revision, edits tested, commands, results, and gaps. Label untested proposals; passing checks for one fix do not validate another.

## When suggestions cannot carry the whole fix

For a settled fix, provide a **complete, applicable unified diff** if it needs edits outside the PR diff, changes across files, or rejected suggestion ranges. Put it in the review body and link inline findings to it. Include every necessary companion change and appropriate regression tests. If no test fits, explain why. Use a `<details>` section when the patch is large.

Generate the patch from an isolated checkout of the target PR head. Include new files in the diff; omit unrelated edits. Check it against a clean copy of that revision with `git apply --check`. Name the full target SHA, explain the behavior it changes, and report verification separately from applicability. Do not claim an untested patch is tested.

**Disclose overlap with inline suggestions.** Prefer a complete patch that applies to the named PR head on its own. If it includes inline fixes, list them and state that the complete patch supersedes those suggestions. The overlapping suggestions alone may omit required companion edits. Reconcile any already-applied overlap before applying the patch. Identify independent suggestions the patch does not include.

**Include these instructions beside every patch**, with the target SHA filled in:

1. Preserve existing work, then check out the target PR revision `<full-head-SHA>` in a clean worktree.
2. Copy the complete diff from the first `diff --git` into `fixes.patch`, excluding Markdown fences and surrounding text.
3. Run `git apply --check fixes.patch`, then `git apply fixes.patch` from the repository root. If the check fails, stop and reconcile the revision and any already-applied suggestions before proceeding.
4. Inspect the changes, run the listed relevant checks, and commit only the intended files. Do not commit `fixes.patch`.
5. This patch block has no GitHub **Apply suggestion** button; apply it locally with the commands above.

## Posting the review

When publication is authorized, build the whole review as one payload and submit it once. Line comments keep findings next to the code.

**Prepare the complete review before any permission request.** Write the payload to `.github/pr-drafts/review-<pr>.json` (git-ignored). A request to review supplies no publication permission. If the user also asks to publish, reuse that authorization and the supplied destination and event; do not ask again. If publication is not authorized and is needed to finish the task, show the payload and ask then. A feedback-only review ends with findings in the conversation.

```json
{
  "commit_id": "<headRefOid from gh pr view>",
  "event": "COMMENT",
  "body": "Fix blockers before merge. <concerns, suggestion count, complete patch when needed, then checks and gaps>",
  "comments": [
    {
      "path": "packages/ai-chat/src/foo.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**Context:** this early return is the already-closed guard, and the listener it skips past was registered a few lines above.\n\n**Blocker** — the early return skips teardown, so the listener leaks on every close. Call `dispose()` before returning.\n\n```suggestion\ndispose();\nreturn;\n```"
    }
  ]
}
```

```bash
gh api --method POST repos/<owner>/<repo>/pulls/<pr>/reviews --input .github/pr-drafts/review-<pr>.json
```

- **`event`** is `COMMENT` (feedback only), `APPROVE`, or `REQUEST_CHANGES`. Use the event the user authorized; a request to post feedback uses `COMMENT`. Ask only when the intended event is unclear. The verdict line still opens the body, per [Output expectations](../SKILL.md#output-expectations). GitHub rejects `APPROVE` and `REQUEST_CHANGES` on your own PR; explain that limit if it conflicts with the request.
- **`line`** is the line number in the file as of `commit_id`, and it must fall inside the diff. `side: "RIGHT"` is the post-change file; use `"LEFT"` for a removed line. For a range, add `start_line` (and `start_side`). These fields carry the citation, so drop `file:line` from the comment body and keep the rest of the finding's order — the orientation line still comes first, since a notification shows the body long before the code ([review-comments.md](../../caic-copy-writer/references/review-comments.md)).
- **Before submission, recheck the PR head.** If it moved, refresh the findings, anchors, patch, and affected checks against the new revision.
- **If GitHub rejects a range**, keep the finding and complete fix in the summary `body` as a patch with the instructions above. Do not drop the edit or substitute prose. After an uncertain submission result, inspect existing reviews before retrying to avoid duplicate feedback.

## Related guidance

- [caic-review](../SKILL.md) — the rubric that produces the findings posted here
- [caic-pr](../../caic-pr/SKILL.md) — drafting the PR description, and opening the PR itself
- [conventions.md](../../../../references/conventions.md) — commits, branches, PR titles
- [Root AGENTS.md](../../../../AGENTS.md) — repo overview and pointer index
