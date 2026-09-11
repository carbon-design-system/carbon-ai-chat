# measuring.md — putting a number on "simpler"

Load this when a review or plan needs a measurement, not an adjective. The rules these numbers serve live in [code-patterns.md](code-patterns.md).

One command runs everything: `npm run measure -- --changed <base>`; the three tools also run alone. **No CI job runs these** and no build fails on a number — a score is not a finding, it picks what to read. [definition-of-done.md](definition-of-done.md) still asks you to run it on a diff and paste the rows.

## Measuring a diff

It runs the three tools below over the diff, then adds the rows they cannot see. Four blocks, in order: `== complexity`, `== coupling`, `== smells`, `== diff`.

How to run:

- `--report <n>` goes to complexity and coupling; `--max <n>` to complexity and smells; `--max-fanout <n>` and `--max-fanin <n>` to coupling.
- The exit code is the highest of the three, so a gate flag still gates.
- `--report` reaches complexity and coupling only. It is a score floor there but a findings-count floor in smells, where any value above 1 hides whole files — so raising it to cut complexity noise would have silenced the smells block. Raise the smells floor by running `npm run smells` directly.
- Bad usage, including an unknown flag, exits 2 before any tool runs.
- **Areas**, used by every band below: the primary areas are `packages/ai-chat`, `packages/ai-chat-components`, `packages/typedoc-theme`, and `examples/**`. `demo/**` drops each band one notch. Every other path gets a score and no label.
- `--changed <base>` scopes any of the three to the diff. Rows read before→after, or `new` when there is no counterpart at `<base>`, and severity attaches only to what is new or got worse.
- `--source <worktree|index|head>` picks what "after" means. It only makes sense with `--changed`; file mode reads the files you name.
- A diff with no code files prints each tool's `Nothing to report.` and `Diff: no new code files, no added lines`.

What the `diff` block's rows mean:

| Row | Says |
| --- | --- |
| `<file>  N lines, K× the <dir>/*<ext> median (M, n=P)` | a new file beside its neighbours at `<base>`. With no same-extension sibling it falls back to the top-level area, saying `(fallback)`, then to `no precedent`. |
| `added lines N, comments C (R%)` | the comment ratio of added lines, blanks included. Per-file density across `scripts/` and `tools/` sits at p50 19%. |
| `banners N` | added lines matching `^\s*// ?-{5,}` — a divider comment, which this repo does not use. |
| `task references N` | added comments matching `#\d{3,5}`, `PLAN`, or `RESEARCH` — a comment naming the task instead of the reason. |
| `new dependencies …` | names added to `dependencies` or `devDependencies`. |
| `<name>: 0 importers` or `1 importer, same directory` | an added export nothing else uses, or only its neighbour uses. Ten rows, then a count. |
| `TODO/FIXME`, `console.log`, `: any` | added under `packages/` and `demo/` only. |

A new file's own length is read at `HEAD`; the median population comes from `<base>`, so a file the diff adds never counts itself. The median is the middle file, or the rounded mean of the two middle.

**Blind spots.** The importer count is `git grep -lw`, a word match, so a name that is also a common word over-counts. The comment ratio counts lines, not usefulness. And a clean run of all four blocks proves shape only — never that the code is correct, or that the change was worth making.

## Which "after"

`--source` answers "after what?", and the three answers agree the moment your change is committed — so a review never has to think about it and a mid-change run does.

| `--source` | Reads | Use it for |
| --- | --- | --- |
| `worktree` (default) | the files on disk | what you are editing right now, staged or not |
| `index` | what is staged | what a commit would contain, or what a pre-commit hook would see |
| `head` | the last commit | the committed branch, ignoring work in progress |

`<base>` resolves to the merge base with `HEAD` before anything else runs, so a base branch that moved ahead does not read its own newer commits as your "before".

Only `worktree` sees an uncommitted rename or deletion. Under it, a file the diff names but the disk does not have prints `skipped <file>: not in the worktree` — the ordinary mid-rename state, not an error. `index` and `head` are laid down in a temp directory first, because the coupling cruise and the duplication index both read the filesystem rather than git. That archive is why all three sources cost about the same; reading ~1,400 files one `git show` at a time instead took 25s longer.

## Measuring complexity

Two metrics, two jobs. **Cyclomatic** counts branches (`if`, `||`, loops, `case`). **Cognitive** counts how hard the flow is to read. Nesting and chained conditions cost extra. A wide render function can score low on one and high on the other. Both matter.

Current percentiles for this repo. The population is every function in `packages/*/src` and `demo/src`, tests and stories excluded (5,183 functions; 75 above cognitive 10, 33 above 15):

| Metric | p50 | p90 | p95 | p99 | max |
| --- | --- | --- | --- | --- | --- |
| Cyclomatic | 1 | 4 | 7 | 13 | 76 |
| Cognitive | 0 | 3 | 5 | 12 | 65 |

To regenerate it, take percentiles over the cyc/cog columns of `npm run complexity -- --report 0` across that population.

How to run:

- `npm run complexity -- <file>` — score a file.
- `npm run complexity -- --changed <base>` — score only the diff, as `cyc:54→55  cog:45→46`.
- `--report <n>` — the print floor: functions at or above `n` on either metric appear (default 10).
- `--max <n>` — exit 1 when a function's cognitive score exceeds `n`.
- `--source <s>` — see [Which "after"](#which-after).

Severity bands, on the after score: in a primary area, above 15 is Important and above 25 a Blocker.

**Render column.** Every row carries `(render N)`: how many cyclomatic branches sit inside JSX or a Lit `html`/`svg` template. `cond && <Panel />` adds a branch on both metrics but is not hard to read, so a high score that is mostly render is markup, not logic. Position decides and the name never does — `renderWithStaticTag` is the tree's cyclomatic maximum at 76 with `render 0`. Markup context crosses into a callback, but the count follows the nearest function, so a `.map` callback's branches are its own.

**Per-file footer.** After each file's rows: `<file>: N code lines, cognitive total N, deepest block N, widest params N, top-level N`. `--report` filters rows, never footers. Counts on the tree when these were adopted:

| Number | What it is | On this tree |
| --- | --- | --- |
| code lines | `max-lines`, blanks and comments skipped | 26 files over 500 |
| cognitive total | every function in the file, summed | 5 files over 100 |
| deepest block | `max-depth` | 19 blocks deeper than 4, in 5 files |
| widest params | `max-params` | 9 functions over 5 |
| top-level | statements that run on import | 10 or more in 1 of the 615 files above; in 3 of 16 under `scripts/` and `tools/` |

Top-level counts what runs when the module loads. A binding does not count when its initializer is a literal, template, array, object, arrow, function, class, identifier, member access, or a `require()` — the CommonJS spelling of an import. Nor do imports, function, class, and type declarations. A bare call, a loop, an `if`, and a `const x = f()` do. `export` is unwrapped first, so `export const x = f()` counts exactly as the unexported line would.

The initializer is judged by its outermost node, so `const x = [f()]` reads as inert even though `f()` runs. That is the measure's one deliberate simplification: it asks what a statement *is*, not what it reaches.

**Blind spot.** The render count comes from a second parse, joined to the score rows by position. When that parse fails the file prints `render 0` on every row and `top-level 0` — low, never wrong.

## Measuring coupling

Two metrics, one score, both counting **runtime** imports. **Ca** (fan-in) counts how many repo modules import a file at runtime. **Ce** (fan-out) counts how many repo modules a file imports at runtime; npm packages are not counted. **Instability** = Ce / (Ca + Ce): 0 is a stable hub everything depends on, 1 is a leaf that depends on everything. Watch a hub — low instability, high fan-in — whose fan-out grows. Each new import drags every dependent along with it.

This is the dimension that function-level complexity cannot see. A file can have simple functions and still be a structural bottleneck.

The population is `packages/`, `demo/`, `examples/`, `scripts/`, and `tools/`, with tests, stories, and SCSS excluded. Every run cruises the whole tree. Fan-in is a property of the graph, not of one file.

How to run:

- `npm run coupling -- <file>` — score a file.
- `npm run coupling -- --changed <base>` — score only the diff, as `fanin:12→13  fanout:20→22`.
- `--report <n>` — the print floor: files at or above `n` on either metric appear (default 15).
- `--max-fanout <n>` / `--max-fanin <n>` — exit 1 when a file's Ce or Ca exceeds `n`.
- `--source <s>` — see [Which "after"](#which-after).

Severity bands, on the after score: in a primary area, fan-out above 15 is Important and above 30 a Blocker; fan-in above 20 and above 40.

**Entry points and barrels.** An entry point (`aiChatEntry.tsx`) imports everything, so its fan-out is high. A re-export `index.ts` is imported by many, so its fan-in is high. Both are structural. The script prints the note `(entry/barrel — structural, not judged)` in place of a label.

**Type edges.** Each cell carries `(type N)`: the imports `tsc` erases, taken as the difference between a pre-compilation cruise and the runtime one. `import type { X }` and a plain import of a type both count, because what matters is what compiles away, not how it was written. The two numbers answer different questions: `packages/ai-chat/src/types/state/AppState.ts` reads `fanin:11 (type 61)`, so 61 files depend on its shape and 11 on its code — a hub for readers, not for the bundle. Bands and `--max-*` use the runtime numbers alone. 162 modules here have a type edge.

**Joined a cycle.** `--changed <base>` adds `joined a cycle with <file>` to a changed file that is in a runtime cycle at HEAD and was not at `<base>`. It is a delta, not a census: a file already in a cycle prints nothing, and a cycle closed by a type import prints nothing, because it does not exist at runtime. File mode prints none of this. The existing tail is 7 modules, all of `demo/src/customSendMessage`. Counting type edges too would make it 162, which is why the row is scoped to runtime.

**Blind spot.** A path outside the cruised roots is an error, not a clean score. The script prints `not in the cruised tree` and exits 1 rather than reporting nothing. Nothing here reports the tree's existing cycles; only a diff that adds one.

## Measuring code smells

`npm run smells` runs seventeen rules for what a function score cannot see. Five carry their own row:

| Rule | Fires on |
| --- | --- |
| `max-lines-per-function` | a function over 80 non-blank lines (ESLint's core rule, so React components count) |
| `no-nested-functions` | a callback nested three or more functions deep |
| `no-identical-functions` | identical function bodies in one file |
| `no-duplicated-branches` | identical `if`/`else` branches |
| `no-dead-store` | a local assigned and never read |

How to run:

- `npm run smells -- <file>` — list every finding in a file.
- `npm run smells -- --changed <base>` — scope to the diff.
- `--report <n>` — print files with at least `n` findings (default 1).
- `--max <n>` — exit 1 when a file has more than `n` findings.
- `--source <s>` — see [Which "after"](#which-after).

Rows carry no severity: a row is a place to read, not a finding. A finding is present or absent, not scored.

**Duplication across files.** `--changed <base>` adds two rows the in-file rules cannot see:

| Row | Fires on |
| --- | --- |
| `duplicate-block  <file>:<line> ↔ <file>:<line> (N lines)` | an added run of ten or more normalised lines that already exists elsewhere |
| `duplicate-function  <name> ↔ <file>:<line>` | an added function whose normalised body, five lines or more, exists elsewhere |

Normalising trims and collapses whitespace and drops blank lines, lone punctuation, comments, imports, and a bare `return`. Windows are six lines and consecutive matches merge. The tree side skips entry files, `index.*` barrels, tests, and stories: two entry files share 136 re-export lines and mean nothing by it. A shared *name* is not a match — every script here has a `main`. On this tree, 46 blocks are duplicated across 102 files, 4.9% of all lines.

**The redundancy bundle.** Twelve rules, each a one-line removal, with their counts at adoption: `no-nested-ternary` 26, `no-unneeded-ternary` 14, `no-param-reassign` 10, `prefer-immediate-return` 8, `no-useless-return` 6, `no-else-return` 5, `no-collapsible-if` 5, `no-small-switch` 4, `prefer-single-boolean-return` 2, `no-lonely-if` 1, `no-redundant-boolean` 1, `no-redundant-jump` 1.

**Blind spot.** Duplication is a `--changed` check only. File mode never runs it, and nothing reports the tree's existing 46 blocks. A copy matches by body rather than by name, so a renamed copy is found; a copied class method is not, because the function pass reads declarations only — the block check still catches one over ten lines.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo overview and pointer index
- [code-patterns.md](code-patterns.md) — the laziness ladder and the rules these numbers measure
- [definition-of-done.md](definition-of-done.md) — when to run this before shipping
