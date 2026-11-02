# pr-reviewability.md — keep each PR easy to review

Read this when sizing a change, splitting work, or choosing between separate PRs and a stack.

Each PR has one coherent purpose and leaves the project working when merged. Keep related tests and necessary docs with the implementation. Split substantial refactoring from behavior changes when a useful boundary exists.

## Use size to find useful boundaries

| Counted changed lines | Action |
| --- | --- |
| Up to 200 | Preferred target. |
| 201–400 | Warn and consider a useful split. |
| Over 400 | Split by default, or explain why the change stays together. |

These are practical policy thresholds, not proven limits for review quality. A justified exception is the reviewer's decision. Do not make arbitrary chunks, ship incomplete work, or defer tests just to lower the count.

## Measure against the intended PR base

Fetch first; local `main` can lag:

```bash
git fetch upstream
npm run measure -- --changed upstream/main
```

The default `worktree` source suits work in progress. At submission, run `npm run measure -- --changed <PR base> --source head` for the committed scope. For a stacked layer, use its parent branch as `<PR base>`.

[measuring.md](measuring.md#measuring-pr-size) defines counted lines, exclusions, moves, and source selection. Excluded work still needs review. Treat size, file spread, affected areas, complexity, and coupling as separate signals; there is no combined score.

## Split by purpose and dependency

Decompose early, then order commits so they can form PRs along the same boundaries; follow [commit sequencing](conventions.md#commit-sequencing).

Useful seams include a behavior-preserving refactor before a feature, or a shared API before each consumer's changes. Keep each layer working, with its related tests and docs. A new API, its validation, and its implementation often belong together. Moving only its tests into a later PR leaves an incomplete layer.

Independent changes use separate PRs. For dependent changes, prefer a native stack hosted upstream when the contributor has write access. Fork contributors use sequential PRs or maintainer help, as described below.

## Choose a stack path that fits your access

### Native stacks need upstream-hosted branches

For a native stack targeting this repository, every branch must live in `carbon-design-system/carbon-ai-chat`. GitHub requires all branches in one repository; cross-fork stacks and GitHub Desktop are unsupported. Check upstream write access with `gh api repos/carbon-design-system/carbon-ai-chat --jq .permissions.push`.

Branching locally from `upstream/main` does not choose where the branch is hosted. The push remote does: `git push upstream <branch>` selects the upstream repository. This is hosting guidance for the person managing the stack; the authorization requirements below still apply.

Use the website or the `gh stack` extension, following GitHub's [stack management procedure](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/managing-stacked-pull-requests). Agents cannot run `gh stack modify`: it opens an interactive terminal UI.

For native stacks, required checks and Actions run as if every PR targets the stack base. The existing [CI filters](../.github/workflows/ci.yml) cover every layer when the stack base matches `main` or `release/v*`; stack #2545 also showed this in practice. See GitHub's [CI guide for stacks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/optimizing-ci-for-stacked-pull-requests).

### Fork contributors use sequential PRs or maintainer help

Open the first PR, wait for it to merge, then prepare the next against the updated upstream base. Or ask a maintainer with write access to host the dependent branches upstream. A local branch based on `upstream/main` is still fork-hosted if pushed to the fork.

### Manual chains can miss this repository's CI

A manually chained upper PR targets the lower topic branch without joining a native stack. When that topic branch matches none of the [CI base filters](../.github/workflows/ci.yml), this workflow does not run. Use a native stack or sequential PRs; this policy does not change CI.

### Get permission for stack pushes and rebases

Before pushing or rebasing a stack, obtain explicit user permission for that stack and destination. Permission must cover any required force-pushes. Reuse permission already granted for those operations; do not ask again within that scope.

`gh stack push` uses `--force-with-lease`, and the website's Rebase stack action force-pushes each rebased branch. The [PR submission rule](../.bob/skills/caic-pr/references/submitting.md) requires explicit permission for force-pushes. Without that permission, finish local preparation and provide the publishing or rebase handoff.

GitHub's [stack reference](https://docs.github.com/en/pull-requests/reference/stacked-pull-requests) says server rebases produce signed commits; its management how-to says they do not. This repository checks a DCO sign-off, rather than commit signatures, so that disagreement appears unrelated to the check. It remains unresolved in the source docs.

## Why these starting bands

The [Cisco case study](https://static0.smartbear.co/support/media/resources/cc/book/code-review-cisco-case-study.pdf) recommends reviewing fewer than 200 lines and no more than 400. It studied a specific review setting; it does not establish this repository's counting rules as universal limits.

[Google's small-change guidance](https://google.github.io/eng-practices/review/developer/small-cls.html) favors one self-contained change with related tests and a working system after check-in. It rejects a hard line-count rule and leaves judgment to reviewers.

## Related guidance

- [definition-of-done.md](definition-of-done.md) — evidence to include before requesting review
