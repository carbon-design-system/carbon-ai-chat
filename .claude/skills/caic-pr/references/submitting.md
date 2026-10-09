# submitting.md — publish a prepared PR description

Load this when the user requests opening or updating a PR. Finish the [drafting workflow](../SKILL.md) and applicable checks first. Use authorization already given; ask only about missing scope or a new external action.

## Resolve the destination and branch

- **Use the selected repository.** Read `git remote -v`. Honor an explicit target even when both a fork and upstream exist. If the destination remains ambiguous, ask before publication.
- **Check the full PR scope.** Resolve the base and head branches. Compare their merge-base diff with the draft. If a requested commit subset differs, resolve that mismatch before publishing; prose cannot change a PR's diff.
- **Use a distinct head branch.** Drafting on the base branch is valid; publishing the base onto itself is not. Create a descriptive branch when needed for the authorized PR, preserving unrelated work.
- **Verify the remote head.** Push the intended branch to its selected remote when necessary for the requested PR. Do not force-push or include unrelated local changes.
- **Set the title explicitly.** Use the conventional-commit format from [conventions.md](../../../../references/conventions.md). Add no agent attribution.

## Create and verify

For a fork PR, `<HEAD>` is `<fork-owner>:<branch>`. For a same-repository PR, use the branch name. Resolve every placeholder before running the command.

```bash
gh pr create \
  --repo <target-owner>/<target-repo> \
  --base <BASE> \
  --head <HEAD> \
  --title "<type>: <subject>" \
  --body-file .github/pr-drafts/<scope-slug>.md
```

Verify the created PR with `gh pr view <number> --repo <owner>/<repo> --json url,baseRefName,headRefName,closingIssuesReferences`. Report its URL and any scope mismatch. If the request failed with an uncertain result, look for the PR before retrying creation.

Once a PR exists, editing the local draft alone changes nothing on GitHub. For a requested update, use `gh pr edit <number> --repo <owner>/<repo> --body-file <path>` and verify it.

## Related guidance

- [caic-pr](../SKILL.md) — read when preparing or revising the description
- [conventions.md](../../../../references/conventions.md) — read when choosing the title and branch name
