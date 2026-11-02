# measuring.md — putting a number on "simpler"

Load when measuring a review or plan. The rules live in [code-patterns.md](code-patterns.md).

Run `npm run measure -- --changed <base>` before review and paste its rows per [definition-of-done.md](definition-of-done.md). **No CI job runs these.** Scores pick what to read; they are not findings. Optional gate flags can raise the exit code.

## Measuring a diff

The wrapper prints five blocks: `== complexity`, `== coupling`, `== smells`, `== diff`, `== size`.

See [measure.mjs](../scripts/measure.mjs)'s header for flags. The exit code is the highest of the three tools; bad usage exits 2 before any runs.

`--report` is a score floor in complexity/coupling and a findings-count floor in smells. The wrapper passes it only to the first two to avoid hiding files in smells. Raise the smells floor with `npm run smells` directly.

**Areas:** the primary areas are `packages/ai-chat`, `packages/ai-chat-components`, `packages/typedoc-theme`, and `examples/**`. `demo/**` drops each band one notch. Other paths get a score and no label.

`--changed <base>` scopes tools to the diff. Rows read before→after, or `new` without a counterpart; severity attaches only to new or worse scores. `--source` selects the after side below and requires `--changed`. File mode reads the named files. With no code files, tools print `Nothing to report.` and `Diff: no new code files, no added lines`.

The `diff` rows:

| Row | Says |
| --- | --- |
| `<file>  N lines, K× the <dir>/*<ext> median (M, n=P)` | a new file beside its neighbors at `<base>`. With no same-extension sibling it falls back to the top-level area, saying `(fallback)`, then to `no precedent`. |
| `added lines N, comments C (R%)` | the comment ratio of added lines, blanks included. Per-file density across `scripts/` and `tools/` sits at p50 19%. |
| `banners N` | added lines matching `^\s*// ?-{5,}` — a divider comment, which this repo does not use. |
| `task references N` | added comments matching `#\d{3,5}`, `PLAN`, or `RESEARCH` — a comment naming the task instead of the reason. |
| `new dependencies …` | names added to `dependencies` or `devDependencies`. |
| `<name>: 0 importers` or `1 importer, same directory` | an added export nothing else uses, or only its neighbor uses. Ten rows, then a count. |
| `TODO/FIXME`, `console.log`, `: any` | added under `packages/` and `demo/` only. |

New-file length comes from the selected source; neighbors come from `<base>`, excluding the new file. The median is the middle length or rounded mean of the middle pair.

**Blind spots.** Importers use `git grep -lw`; common words over-count. Comment ratios measure lines, not value. A clean run proves shape, not correctness or the need for a change.

## Measuring PR size

The fifth block, `== size`, counts additions plus deletions. It reports the counted lines, additions, deletions, and file count. Size is advisory; it never changes the exit code. Keep size, file spread, affected areas, complexity, and coupling as separate signals.

Use the [reviewability policy](pr-reviewability.md) for the size bands. Rules apply in order; the first match wins. Unmatched hand-authored files count.

| Category | Paths | In threshold |
| --- | --- | --- |
| lockfiles | `**/package-lock.json` | No |
| generated | `.claude/skills/**`, `.agents/skills/**`, vendored `.bob/skills/carbon-builder/**`; release-owned `packages/ai-chat/docs/api/markdown/**` and `packages/ai-chat/docs/api/symbol-index.json`; `packages/*/telemetry.yml`; root `versions.js` | No |
| snapshots | `**/__snapshots__/**`, `**/*.snap` | No |
| fixtures | `**/fixtures/**`, `**/__fixtures__/**` | No |
| test cases | Basenames matching `*_spec.*`, `*.test.*`, `*.spec.*` | No |
| shared test infrastructure | `examples/shared/playwright/**`; outside `examples/`: `{jest,web-test-runner,playwright,vitest}.config.*`, `packages/ai-chat/tests/{setup.ts,test_helpers.ts}`, `packages/ai-chat-components/src/testing/**`, non-spec files in `**/__tests__/` or `demo/tests/` | Yes |
| examples and demo | Remaining `examples/**`, `demo/**`, including example-local configs and helpers | No |
| docs | `.md` and `.mdx` at any depth, plus root `docs/**` | No |
| code | Everything else: production code, public types, styles, tooling, CI, manifests, and stories | Yes |

Excluded categories still show their lines and files. The hand-authored `packages/ai-chat/docs/api/README.md` is docs; code in `packages/ai-chat/docs/typedoc/` counts. Areas use the first path segment, or two under `packages/`; root files use `(root)`.

Git's `--numstat -z -M` handles deleted files, spaces in names, and renames. A rename within one category counts only edited lines; pure renames count zero and stay visible. A move across categories counts the old file as deleted and the new file as added, and lists both paths. Binary files count zero lines and are listed by category.

In `worktree` mode, non-ignored untracked files count as additions and are marked untracked. The other four blocks do not include them. At submission, use `--source head` to measure committed work. Git may report a heavily edited move as a deletion plus an addition; rename detection uses its default similarity threshold.

Run `git fetch upstream`, then `npm run measure -- --changed upstream/main`; local `main` can lag. For a stacked layer, pass `--changed <parent-branch>` so the report measures only that layer against its merge base.

## Which "after"

`--source` picks the after side. All three agree once the change is committed.

| `--source` | Reads | Use it for |
| --- | --- | --- |
| `worktree` (default) | the files on disk | what you are editing right now, staged or not |
| `index` | what is staged | what a commit would contain, or what a pre-commit hook would see |
| `head` | the last commit | the committed branch, ignoring work in progress |

`<base>` resolves to its merge base with `HEAD`, excluding newer commits on the base branch. If that fails, every script names the requested ref and exits 2.

Only `worktree` sees an unstaged rename or deletion; `index` also sees staged changes. A file named by the diff but absent on disk prints `skipped <file>: not in the worktree`; this is not an error. `index` and `head` cost about the same as `worktree`.

## Measuring complexity

**Cyclomatic** counts branches (`if`, `||`, loops, `case`). **Cognitive** adds cost for nesting and chained conditions. A render function can be low on one and high on the other; read both.

Repo percentiles for functions in `packages/*/src` and `demo/src`, excluding tests/stories:

| Metric | p50 | p90 | p95 | p99 | max |
| --- | --- | --- | --- | --- | --- |
| Cyclomatic | 1 | 4 | 7 | 13 | 76 |
| Cognitive | 0 | 3 | 5 | 12 | 65 |

Regenerate from the cyc/cog columns of `npm run complexity -- --report 0` across that population.

See [complexity.mjs](../scripts/complexity.mjs)'s header for usage and flags.

Severity bands, on the after score: in a primary area, above 15 is Important and above 25 a Blocker.

**Render column.** `(render N)` counts cyclomatic branches inside JSX or Lit `html`/`svg` templates. `cond && <Panel />` raises both scores, but a score dominated by render comes from markup. Position decides: `renderWithStaticTag` has `render 0` despite its name. Markup context crosses callbacks; branches count toward the nearest function, including a `.map` callback.

**Per-file footer.** After each file's rows: `<file>: N code lines, cognitive total N, deepest block N, widest params N, top-level N`. `--report` filters rows, never footers.

| Number | What it is |
| --- | --- |
| code lines | `max-lines`, blanks and comments skipped |
| cognitive total | every function in the file, summed |
| deepest block | `max-depth` |
| widest params | `max-params` |
| top-level | statements that run on import |

Top-level counts calls, loops, conditionals, and call-initialized bindings on import. Imports and declarations do not count. Bindings are inert when their outer initializer is a literal, template, array, object, function, class, identifier, member access, or `require()`. `export` is unwrapped. This deliberately treats `const x = [f()]` as inert despite its nested call.

**Blind spot.** A failed render parse prints `render 0` on every row and `top-level 0` — low, never wrong.

## Measuring coupling

**Ca** (fan-in) counts repo modules importing a file at runtime. **Ce** (fan-out) counts repo modules it imports; npm packages are excluded. **Instability** = Ce / (Ca + Ce): 0 is a hub, 1 a dependent leaf. Growing fan-out in a hub adds dependencies for all its callers, even when its functions stay simple.

Each run cruises `packages/`, `demo/`, `examples/`, `scripts/`, and `tools/`, excluding tests, stories, and SCSS. Fan-in needs the whole graph.

See [coupling.mjs](../scripts/coupling.mjs)'s header for usage and flags.

Severity bands, on the after score: in a primary area, fan-out above 15 is Important and above 30 a Blocker; fan-in above 20 and above 40.

**Entry points and barrels.** High fan-out in `aiChatEntry.tsx` and high fan-in in re-export `index.ts` files are structural. They print `(entry/barrel — structural, not judged)` instead of a label.

**Type edges.** `(type N)` is the difference between pre-compilation and runtime cruises: imports `tsc` erases, whether spelled `import type` or plain imports. `fanin:11 (type 61)` means 11 modules depend on code and 61 on shape. Bands and `--max-*` use runtime numbers only.

**Joined a cycle.** In diff mode, `joined a cycle with <file>` marks a changed file entering a runtime cycle. Existing cycles and cycles closed only by type imports print nothing. File mode has no cycle rows.

**Blind spot.** Paths outside the cruised roots print `not in the cruised tree` and exit 1. Only newly joined cycles are reported.

## Measuring code smells

`npm run smells` runs seventeen rules for what a function score cannot see. Five carry their own row:

| Rule | Fires on |
| --- | --- |
| `max-lines-per-function` | a function over 80 non-blank lines (ESLint's core rule, so React components count) |
| `no-nested-functions` | a callback nested three or more functions deep |
| `no-identical-functions` | identical function bodies in one file |
| `no-duplicated-branches` | identical `if`/`else` branches |
| `no-dead-store` | a local assigned and never read |

See [smells.mjs](../scripts/smells.mjs)'s header for usage and flags.

Rows carry no severity; read them to decide whether a finding exists.

**Duplication across files.** `--changed <base>` adds two rows the in-file rules cannot see:

| Row | Fires on |
| --- | --- |
| `duplicate-block  <file>:<line> ↔ <file>:<line> (N lines)` | an added run of ten or more normalised lines that already exists elsewhere |
| `duplicate-function  <name> ↔ <file>:<line>` | an added function whose normalised body, five lines or more, exists elsewhere |

Normalising trims and collapses whitespace and drops blank lines, lone punctuation, comments, imports, and a bare `return`. Windows are six lines and consecutive matches merge. The tree side skips entry files, `index.*` barrels, tests, and stories. A shared *name* is not a match — every script here has a `main`.

**The redundancy bundle.** The remaining rules flag one-line removals; see the rule names in [smells.mjs](../scripts/smells.mjs).

**Blind spot.** Duplication is a `--changed` check only. File mode never runs it, and nothing reports the tree's existing copies. A copy matches by body rather than by name, so a renamed copy is found; a copied class method is not, because the function pass reads declarations only — the block check still catches one over ten lines.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo overview and pointer index
