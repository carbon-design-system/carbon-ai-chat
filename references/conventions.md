# conventions.md — repo & process conventions

Canonical home for repo-wide **process** conventions (commits, branches, license headers, hooks). Other AGENTS files link here instead of restating. Code-level patterns (naming, SCSS, component placement, comments) live in [code-patterns.md](code-patterns.md).

## Commits

Conventional-commits, enforced by commitlint.

- **Types**: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
- **Header** ≤ 72 chars; **body** lines ≤ 90.
- **Subject**: imperative present tense, lowercase, no trailing period.

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
- [code-review.md](code-review.md) — review rubric that flags violations of these conventions
- [pr.md](pr.md) — drafting PR descriptions
