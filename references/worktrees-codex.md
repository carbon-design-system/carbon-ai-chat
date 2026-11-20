# worktrees-codex.md: worktrees that the Codex app creates

Read this when the Codex app made your worktree, or before you change its worktree settings. The rules for every worktree are in [worktrees.md](worktrees.md).

The Codex app creates worktrees in `$CODEX_HOME/worktrees` (default `~/.codex/worktrees/<id>/<repo>`). That's outside the checkout, so the [Nx root problem](worktrees.md#nx-workspace-root) doesn't apply. The app keeps the 15 newest and deletes older ones ([Codex worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)).

The root is `git-worktree-root` in the `[desktop]` table of your user `~/.codex/config.toml`, or **Settings > Worktrees** in the app. It takes an absolute path, applies to every repo, and still adds an `<id>/<repo>` layer ([`settings.rs`](https://github.com/openai/codex/blob/main/codex-rs/worktree/src/settings.rs), [`paths.rs`](https://github.com/openai/codex/blob/main/codex-rs/worktree/src/paths.rs)). Leave it at the default; don't point it at `<repo>.worktrees`. The committed [.codex/config.toml](../.codex/config.toml) doesn't set it.
