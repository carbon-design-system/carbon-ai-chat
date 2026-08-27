# conventions.md — repo & process conventions

Canonical home for repo-wide **process** conventions (commits, branches, license headers, hooks). Other AGENTS files link here instead of restating. Code-level patterns (naming, SCSS, component placement, comments) live in [code-patterns.md](code-patterns.md).

## Commits

Conventional-commits, enforced by commitlint.

- **Types**: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
- **Header** ≤ 72 chars (commitlint-enforced); body lines have no enforced limit.
- **Subject**: imperative present tense, lowercase, no trailing period.

### Commit bodies

A body has two readers, both pre-merge: the reviewer walking the branch commit by commit, and whoever later splits, rebases, or cherry-picks it. Nothing survives the squash — the PR description is the durable record — so write for the review, not for history.

- **Open with the problem.** State the defect, constraint, or drift the commit answers, then what it does about it — a plain-English claim the reviewer verifies the diff against. Never narrate the diff; it speaks for itself.
- **Skip the what when the subject carries it.** Spend body only on what the diff can't show: why this approach over the obvious one, a cost accepted, an untested path and why.
- **Place the commit in its arc** in one clause when it has one — the trigger the issue declared in scope, the commit it cleans up after. Name sibling commits by subject, not hash; a rebase renumbers them.
- **3–6 lines covers most commits.** An empty body is right when the subject alone does; a body that won't compress to six lines is usually two commits.

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
- [tone.md](tone.md) — voice & word economy for developer-facing copy
