# worktrees-claude-code.md: worktrees that Claude Code creates

Read this before you use `--worktree`, the `EnterWorktree` tool, or a subagent or workflow with `isolation: "worktree"`, or when you work in a folder under `.claude/worktrees/`. The rules for every worktree are in [worktrees.md](worktrees.md).

`--worktree`, the `EnterWorktree` tool, and subagents with `isolation: "worktree"` create `.claude/worktrees/<name>` on branch `worktree-<name>`, inside the checkout. No setting moves them: `worktree.location` is user-level and only the desktop app reads it ([settings reference](https://code.claude.com/docs/en/settings-reference.md)).

For work you'll keep, [create the worktree with git](worktrees.md#create-one), then enter that path. Claude Code asks for approval when it enters a path outside `.claude/worktrees/` ([worktrees](https://code.claude.com/docs/en/worktrees.md)). Inside a harness-made worktree, set `NX_WORKSPACE_ROOT_PATH` before any build ([Nx workspace root](worktrees.md#nx-workspace-root)).

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
