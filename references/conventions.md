# conventions.md — repo & process conventions

Canonical home for repo-wide **process** conventions (commits, branches, license headers, hooks). Other AGENTS files link here instead of restating. Code-level patterns (naming, SCSS, component placement, comments) live in [code-patterns.md](code-patterns.md).

## Commits

Conventional-commits, enforced by commitlint.

- **Types**: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
- **Header** ≤ 72 chars (commitlint-enforced); body lines have no enforced limit.
- **Subject**: imperative present tense, lowercase, no trailing period.
- **Attribution**: the person running the session is the sole author. An agent never lists itself as author or co-author — no `Co-Authored-By` trailer, no "generated with" footer.

### Commit bodies

A body is copy, so its rules sit with the rest of them: [commit-bodies.md](../.bob/skills/caic-copy-writer/references/commit-bodies.md), type 8. Read it before writing one. commitlint enforces the header format above and never reads the body, so a reviewer is the only thing standing between a bad body and the branch.

### Commit sequencing

A branch is read commit by commit before it is read as one diff. Stage it for that read:

- **One problem per commit.** The body that won't compress to six lines is the tell — split it.
- **Every commit green.** Each builds and passes its tests alone, so the branch splits, reorders, and cherry-picks at any point.
- **Order for the reader.** Groundwork lands before the change that needs it, cleanup after the change that exposed it — not in the order the work happened.

Decompose early so commits group into PRs along the [reviewability boundaries](pr-reviewability.md#split-by-purpose-and-dependency).

## Branches & PR titles

- **Branches**: use descriptive kebab-case names, such as `2457-user-message-sender-profiles`. Never include LLM or coding-agent names anywhere in a branch name, including prefixes such as `codex/`, `claude/`, or `copilot/`.
- **PR title**: same Conventional Commit format as the eventual squash commit — the PR title _is_ the squash commit.

For PR scope and branch hosting, follow [pr-reviewability.md](pr-reviewability.md).

## License headers

Every source file needs the Apache-2.0 header. Enforced by `npm run lint:license` (part of `ci-check`). The pre-commit hook checks staged files too, but only refreshes the year on a header that already exists — a file with no header fails the hook rather than gaining one.

## Commit hooks

- `.husky/pre-commit` runs `lint-staged` only — prettier (+ eslint) on `*.{js,jsx,cjs,mjs,ts,tsx}`, prettier (+ stylelint) on `*.scss`, prettier on `*.md`.
- `.husky/commit-msg` runs commitlint.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo overview and pointer index
- [tone.md](tone.md) — voice & quick rules for developer-facing copy
