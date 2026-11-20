# worktrees.md: where git worktrees live, and how to clean them up

Read this before you create, name, move, or remove a git worktree for this repo, by hand or through a tool.

- **Path:** `../<repo>.worktrees/<slug>`, relative to the main checkout. `<repo>` is the main checkout's folder name, such as `carbon-ai-chat`.
- **Never** in `/tmp`, a session scratchpad, or anywhere inside the main checkout.
- **Remove** with `git worktree remove` after you check for unsaved work. Never `rm -rf`.

## Location and naming

Every worktree sits in one sibling folder next to the main checkout. The folder takes the main checkout's name, whatever you cloned it as, plus `.worktrees`:

```text
<parent>/
  <repo>/             # main checkout, e.g. carbon-ai-chat
  <repo>.worktrees/   # every worktree
    <slug>/
```

The parent folder can hold other clones, such as `<repo>-fork`. Each clone gets its own `.worktrees` folder, which keeps its worktrees apart from the others. Don't create loose `<repo>-<slug>` folders.

The slug is an issue or PR number plus a short purpose, in kebab-case: `2349-sdk`, `pr2668-review`, `1857-citation-cards`. It doesn't have to match the branch name.

`/tmp` and scratchpads get wiped by the OS or the harness. That loses uncommitted work and leaves broken worktree records behind.

Don't hard-code the folder name. From the main checkout or any worktree, this sets `$main` to the main checkout's path:

```bash
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

The commands below use `"$main.worktrees/<slug>"`, so they work from any worktree and under any clone name.

## Create one

```bash
git worktree add "$main.worktrees/<slug>" -b <branch> [<start-point>]
```

For a branch that already exists, drop `-b`: `git worktree add "$main.worktrees/<slug>" <branch>`. To review a PR head without a branch, pass `--detach <sha>`, and see the detached HEAD check below before you remove it.

A new worktree has no `node_modules` and no build output. Set it up as the [build preflight](commands.md#what-invalidates-earlier-evidence) requires for a new worktree before you run anything that reads built output.

## Nx workspace root

The repo has no nx.json, nx, or nx.bat file, so Nx takes the highest folder with `node_modules/nx` as its root. A peer worktree has no such ancestor and builds itself. A worktree nested in the main checkout builds the main checkout instead, unless every `lerna`/`aiChat:*` command sets `NX_WORKSPACE_ROOT_PATH=<worktree path>`.

## Clean up

Check for work before you remove anything. Run each check against the worktree path:

| Check | Command | Empty output means |
| --- | --- | --- |
| Uncommitted or untracked files | `git -C <path> status --porcelain` | nothing to save |
| Git-ignored drafts (plans, PR, issue, and ADR drafts) | `git -C <path> status --porcelain --ignored -- .github/` | no drafts to lose |
| Commits on no remote | `git -C <path> log --oneline HEAD --not --remotes` | everything is pushed |
| If the row above prints: commits on no branch either | `git -C <path> log --oneline HEAD --not --branches --remotes` | the commits are on a local branch |

`git worktree remove` deletes ignored files without asking, so copy any draft to the main checkout first. If a check prints anything else, stop. Push, or save the commits with `git branch <name> <sha>`, or ask the user. Then:

```bash
git worktree remove "$main.worktrees/<slug>"
git branch -d <branch>    # optional; -d refuses an unmerged branch
```

Don't add `--force` unless the user says to discard the changes. A locked worktree also refuses removal. Claude Code locks an agent's worktree while the agent runs ([worktrees](https://code.claude.com/docs/en/worktrees.md)). Leave it.

### Records left by a deleted folder

When you or the OS delete a worktree folder, git keeps its record. `git worktree list` marks it `prunable`. The uncommitted work is gone, but a detached HEAD's commits survive until you prune, or until `git gc` prunes the record after three months:

1. `git worktree list --porcelain` gives the record's `HEAD <sha>` and shows `detached` or `branch`.
2. For a detached record, run `git log --oneline <sha> --not --branches --remotes`. If it prints commits, save them with `git branch <name> <sha>` first. Pruning deletes the record's reflog, so the commits become hard to find.
3. `git worktree prune --dry-run`, then `git worktree prune`.

### Move one

`git worktree move <old-path> "$main.worktrees/<slug>"` keeps the branch, commits, and uncommitted files. Run the clean-up checks first, and treat the moved folder as a new worktree for build evidence. `move` refuses a locked worktree.

## Per-tool defaults

None of the three tools can put its own worktrees in the peer folder from a committed file. Agents that run `git worktree add` themselves follow this file whatever the tool. When a tool makes the worktree for you, read its file too:

| Tool | Read when |
| --- | --- |
| [Claude Code](worktrees-claude-code.md) | you use `--worktree`, `EnterWorktree`, or `isolation: "worktree"`, or work under `.claude/worktrees/` |
| [Codex](worktrees-codex.md) | the Codex app made the worktree, or you'd change its worktree root |
| [IBM Bob](worktrees-bob.md) | you look for a Bob worktree setting |
