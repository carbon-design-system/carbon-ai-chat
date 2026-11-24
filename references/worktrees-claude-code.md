# worktrees-claude-code.md: Claude Code's own worktrees

Read this before you use `--worktree`, the `EnterWorktree` tool, or a subagent or workflow with `isolation: "worktree"`. The rules for every worktree are in [worktrees.md](worktrees.md).

**Don't use them for this repo.** They create `.claude/worktrees/<name>` on branch `worktree-<name>`, inside the main checkout. Node and Nx both search parent folders, so code there resolves any package missing from its own `node_modules` from the main checkout's, and Nx builds the main checkout ([Nx workspace root](worktrees.md#nx-workspace-root)). A test there can run against the wrong dependencies and build output. No setting moves them: `worktree.location` is user-level and only the desktop app reads it ([settings reference](https://code.claude.com/docs/en/settings-reference.md)).

Instead:

- **For your own session**, [create the worktree with git](worktrees.md#create-one), then enter that path. Claude Code asks for approval when it enters a path outside `.claude/worktrees/` ([worktrees](https://code.claude.com/docs/en/worktrees.md)).
- **For a subagent that needs its own tree**, create the peer worktree with git first and give the subagent its absolute path in the brief. Don't pass `isolation: "worktree"`.
- **If you find yourself in one**, don't install, build, or test there. Commit or save the work, then [move it](worktrees.md#move-one) to the peer folder once the session that made it has ended and unlocked it.

## Opt in: redirect them to the peer folder

To keep using the harness features, a `WorktreeCreate` hook replaces their git step and returns the peer path instead ([hooks](https://code.claude.com/docs/en/hooks.md#worktreecreate)). It's an opt-in for your own `.claude/settings.local.json`, which git ignores, because it has costs ([worktrees](https://code.claude.com/docs/en/worktrees.md)):

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
