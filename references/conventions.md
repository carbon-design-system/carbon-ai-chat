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

## Branches & PR titles

- **Branches**: kebab-case, descriptive.
- **PR title**: same Conventional Commit format as the eventual squash commit — the PR title _is_ the squash commit.

## License headers

Every source file needs the Apache-2.0 header. Enforced by `npm run lint:license` (part of `ci-check`) — **not** by a commit hook, so it can still fail CI even after a clean commit.

## Commit hooks

- `.husky/pre-commit` runs `lint-staged` only — prettier (+ eslint) on `*.{js,jsx,ts,tsx}`, prettier (+ stylelint) on `*.scss`, prettier on `*.md`.
- `.husky/commit-msg` runs commitlint.

Because pre-commit only touches staged files and skips license headers, run `npm run lint` + `npm run lint:license` before opening a PR if you touched more than one file.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo overview and pointer index
- [code-patterns.md](code-patterns.md) — naming, SCSS, component placement, comments
- [tone.md](tone.md) — voice & quick rules for developer-facing copy
