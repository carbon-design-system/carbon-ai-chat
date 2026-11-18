# worktrees.md: where git worktrees live, and how to clean them up

Read this before you create, name, move, or remove a git worktree for this repo, by hand or through a tool.

- **Path:** `../carbon-ai-chat.worktrees/<slug>`, relative to the main checkout.
- **Never** in `/tmp`, a session scratchpad, or anywhere inside the main checkout.
- **Remove** with `git worktree remove` after you check for unsaved work. Never `rm -rf`.

## Location and naming

Every worktree sits in one sibling folder next to the main checkout:

```text
<parent>/
  carbon-ai-chat/             # main checkout
  carbon-ai-chat.worktrees/   # every worktree
    <slug>/
```

The parent folder can hold other clones, such as `carbon-ai-chat-fork`. The single `.worktrees` folder keeps your worktrees apart from them. Don't create loose `carbon-ai-chat-<slug>` folders.

The slug is an issue or PR number plus a short purpose, in kebab-case: `2349-sdk`, `pr2668-review`, `1857-citation-cards`. It doesn't have to match the branch name.

`/tmp` and scratchpads get wiped by the OS or the harness. That loses uncommitted work and leaves broken worktree records behind.

From inside any worktree, this prints the main checkout's path:

```bash
dirname "$(git rev-parse --path-format=absolute --git-common-dir)"
```

## Create one

Run from the main checkout:

```bash
git worktree add ../carbon-ai-chat.worktrees/<slug> -b <branch> [<start-point>]
```

For a branch that already exists, drop `-b`: `git worktree add ../carbon-ai-chat.worktrees/<slug> <branch>`. To review a PR head without a branch, pass `--detach <sha>`, and see the detached HEAD check below before you remove it.

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
git worktree remove ../carbon-ai-chat.worktrees/<slug>
git branch -d <branch>    # optional; -d refuses an unmerged branch
```

Don't add `--force` unless the user says to discard the changes. A locked worktree also refuses removal. Claude Code locks an agent's worktree while the agent runs ([worktrees](https://code.claude.com/docs/en/worktrees.md)). Leave it.

### Records left by a deleted folder

When you or the OS delete a worktree folder, git keeps its record. `git worktree list` marks it `prunable`. The uncommitted work is gone, but a detached HEAD's commits survive until you prune, or until `git gc` prunes the record after three months:

1. `git worktree list --porcelain` gives the record's `HEAD <sha>` and shows `detached` or `branch`.
2. For a detached record, run `git log --oneline <sha> --not --branches --remotes`. If it prints commits, save them with `git branch <name> <sha>` first. Pruning deletes the record's reflog, so the commits become hard to find.
3. `git worktree prune --dry-run`, then `git worktree prune`.

### Move one

`git worktree move <old-path> ../carbon-ai-chat.worktrees/<slug>` keeps the branch, commits, and uncommitted files. Run the clean-up checks first, and treat the moved folder as a new worktree for build evidence. `move` refuses a locked worktree.

## Per-tool defaults

None of the three tools can put its own worktrees in the peer folder from a committed file. Agents that run `git worktree add` themselves follow this file whatever the tool.

### Claude Code

`--worktree`, the `EnterWorktree` tool, and subagents with `isolation: "worktree"` create `.claude/worktrees/<name>` on branch `worktree-<name>`, inside the checkout. No setting moves them: `worktree.location` is user-level and only the desktop app reads it ([settings reference](https://code.claude.com/docs/en/settings-reference.md)).

For work you'll keep, create the worktree with git as above, then enter that path. Claude Code asks for approval when it enters a path outside `.claude/worktrees/` ([worktrees](https://code.claude.com/docs/en/worktrees.md)). Inside a harness-made worktree, set `NX_WORKSPACE_ROOT_PATH` before any build.

A `WorktreeCreate` hook replaces the git step and can return the peer path ([hooks](https://code.claude.com/docs/en/hooks.md#worktreecreate)). It's an opt-in for your own `.claude/settings.local.json`, which git ignores, because it has costs ([worktrees](https://code.claude.com/docs/en/worktrees.md)):

- Subagent and workflow worktrees are never removed for you, and the periodic sweep skips hook-made worktrees.
- With no `WorktreeRemove` hook, exiting a session or `ExitWorktree` removes the worktree as `git worktree remove --force` would, dirty files included.
- Claude Code never deletes the `worktree-<name>` branch.
- `worktree.baseRef`, `.worktreeinclude`, and `--worktree '#<PR>'` stop working.

The snippet needs `jq`. It branches from your local `origin/HEAD`, so run `git fetch` first:

```json
{
  "hooks": {
    "WorktreeCreate": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'set -e; n=$(jq -r .name); m=$(dirname \"$(git rev-parse --path-format=absolute --git-common-dir)\"); d=\"$(dirname \"$m\")/$(basename \"$m\").worktrees/$n\"; git -C \"$m\" worktree add --no-track -b \"worktree-$n\" \"$d\" origin/HEAD >&2; echo \"$d\"'"
          }
        ]
      }
    ]
  }
}
```

### Codex

The Codex app creates worktrees in `$CODEX_HOME/worktrees` (default `~/.codex/worktrees/<id>/carbon-ai-chat`). That's outside the checkout, so the Nx problem doesn't apply. The app keeps the 15 newest and deletes older ones ([Codex worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)).

The root is `git-worktree-root` in the `[desktop]` table of your user `~/.codex/config.toml`, or **Settings > Worktrees** in the app. It takes an absolute path, applies to every repo, and still adds an `<id>/<repo>` layer ([`settings.rs`](https://github.com/openai/codex/blob/main/codex-rs/worktree/src/settings.rs), [`paths.rs`](https://github.com/openai/codex/blob/main/codex-rs/worktree/src/paths.rs)). Leave it at the default; don't point it at `carbon-ai-chat.worktrees`. The committed [.codex/config.toml](../.codex/config.toml) doesn't set it.

### IBM Bob

The installed Bob IDE has no worktree feature or setting, and the [Bob Shell configuration](https://bob.ibm.com/docs/shell/configuration/configuring) lists none. Nothing to configure.
