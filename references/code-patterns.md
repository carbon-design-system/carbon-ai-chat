# code-patterns.md — code-level patterns

Canonical home for repo-wide **code-authoring discipline** — how much code to write and how to shape it (the laziness ladder, simplicity principles), plus the concrete patterns (naming, SCSS, component placement, comments), and the complexity and coupling measurements that put a number on "simpler". Read it before writing or changing any code. Other AGENTS files link here instead of restating. Process conventions (commits, branches, license headers, hooks) live in [conventions.md](conventions.md).

## Writing the least code (laziness ladder)

Before adding code, write the **least** the task needs. Trace the whole flow first, then walk this ladder and stop at the first rung that solves it:

1. **Does it need to exist at all?** Speculative need → skip it and say so in one line (YAGNI).
2. **Already in this codebase?** Reuse the existing component, hook, helper, util, type, or pattern.
3. **Does the platform do it?** Prefer the browser — CSS over JS for layout, state, and animation; a native element or DOM/JS built-in (`dialog`, `URL`, `Intl`, `AbortController`, `structuredClone`) over a hand-rolled equivalent.
4. **Does Carbon or an already-installed dependency ship it?** Use the Carbon component, token, or existing dep; never add a new dependency for what a few lines can do.
5. **Can it be one line?** Write the one-liner.
6. **Only then**, the minimum code that works.

Heuristics:

- **Root cause over symptoms** — a guard in the shared function is a smaller diff than a guard in every caller.
- **Deletion beats addition** — removing code is the best fix when it works.
- **Boring over clever** — clever is what someone decodes at 3am.

**When NOT to be lazy** — never trade these for fewer lines: input validation, error handling that prevents data loss, security, and accessibility (see [accessibility.md](accessibility.md)). Understand the whole flow before picking a rung.

### Shaping the code you do write

- **Single-purpose functions** over large multi-job ones.
- **No hidden side effects** — a function's effects should be evident from its name and signature.
- **Flat control flow** — early returns / guard clauses; avoid nesting beyond ~2–3 levels.
- **Minimize state and mutation** — prefer pure functions and explicit inputs/outputs; avoid module-level or shared mutable state.
- **No premature abstraction** — no indirection, generality, config, or flag params for a single caller.
- **Avoid cleverness** — no dense one-liners or nested ternaries when a plain version reads clearer.

## Carbon flavor by area

Rung 4 above says reach for Carbon; this says **which** Carbon. Both primary packages are Web Components only. React is legitimate in the demo, the React examples, and React-wrapper stories — "use Web Components" is not a repo-wide rule, it is a per-directory one.

Pick by **the file you are editing**, never by the package's dependency list: `@carbon/ai-chat` peer-depends on `@carbon/web-components`, so that package appears in React examples that never import it directly.

| Editing…                                                               | Carbon flavor                                      | MCP `filters.component_type` |
| ---------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| `packages/ai-chat/src/`                                                | `@carbon/web-components` via `@lit/react` wrappers | `"Web Components"`           |
| `packages/ai-chat-components/src/` Lit elements                        | `@carbon/web-components`                           | `"Web Components"`           |
| `packages/ai-chat-components/**/__stories__/*-react.{stories.jsx,mdx}` | `@carbon/react` (Storybook only)                   | `"React"`                    |
| `demo/src/react/`                                                      | `@carbon/react`                                    | `"React"`                    |
| `demo/src/web-components/`                                             | `@carbon/web-components`                           | `"Web Components"`           |
| `examples/react/`                                                      | `@carbon/react`                                    | `"React"`                    |
| `examples/web-components/`                                             | `@carbon/web-components`                           | `"Web Components"`           |

**`@carbon/react` is not a runtime dependency of either primary package.** Never import it into `packages/ai-chat/src/` or into a Lit element. In `@carbon/ai-chat-components` it is a devDependency serving the `-react` stories alone.

`@carbon/web-components` lags `@carbon/react` for rarer and IBM Products components. When the component you need is missing, don't close the gap with a React import — substitute a supported Carbon component, compose from primitives in [packages/ai-chat-components/](../packages/ai-chat-components), or escalate to design.

### The `carbon-builder` skill defaults to React

The vendored `carbon-builder` skill instructs "Default to **React** unless the user specifies Web Components." That default is wrong for most of this repo, and the table above overrides it. Take its JSX verbatim only in the React rows; anywhere else treat a React snippet as a translation hint and rewrite it as Lit before saving. Pass `filters.component_type` on every Carbon MCP call, or results mix flavors and you adopt the wrong snippet.

## Naming & prefix discipline (build-breaking)

Never hardcode `cds--` in SCSS or TSX class strings — the `es-custom` build re-prefixes (`cds--custom`) and a literal `cds--` slips through unchanged, breaking that bundle.

- **SCSS**: use `#{$prefix}--` (resolves to `cds--`), never the literal.
- **TS/TSX**: use the prefix helpers, never a literal class string.
- **Lit**: tag strings come from the shared prefix constant, not inline literals.

## SCSS authoring

- **BEM** with the `#{$prefix}--` prefix.
- **No descendant nesting.** `&:hover`, `&--modifier`, and media queries are fine; `.a .b {}` is not.
- **CSS logical properties for RTL.** Use `padding-block-start`, `inset-inline-end`, etc. — never physical properties (`padding-left`, `right`, …). This is the single shared RTL rule; accessibility and review docs link here for it.

## Framework-agnostic logic

**Default to writing logic as plain functions in plain modules** — no React and no Lit import in the file. Components stay a thin layer that renders and wires things up.

- **Belongs in the component**: rendering, event/prop wiring, and the framework lifecycle it takes to _call_ the logic (hooks, reactive properties, effects).
- **Belongs outside it**: parsing, formatting, validation, state transitions, sorting/filtering, message and streaming assembly, timing and geometry math.
- **The test**: if you can only exercise it by rendering something, it's in the wrong place. Logic in a plain module is testable by calling it.
- **Framework-agnostic ≠ DOM-free.** Touching `document`, measuring an element, or reading a media query is fine in a plain module — see the existing `utils/` helpers. It's the framework coupling to avoid, not the browser.

Where it goes in `@carbon/ai-chat`: pure helpers in `src/chat/utils/`, stateful or side-effecting collaborators as services (see [packages/ai-chat/AGENTS.md](../packages/ai-chat/AGENTS.md)), state transitions in store reducers. In `@carbon/ai-chat-components`, prefer a sibling module over a method on the Lit element.

Beyond testability, this is directional: the React layer is meant to get thinner over time, and logic that never imported React moves for free.

## Component placement

- **New UI goes in `components/`**, never `packages/ai-chat/src/chat/components-legacy/` — that directory is closed to new components. Bug fixes and refactors that move components _out_ of it are welcome.
- **Lift reusable pieces to `@carbon/ai-chat-components`** when a component carries no chat-specific state.

## Comments

Repo default is **no comments**. Keep only the non-obvious _why_ — a hidden constraint, a subtle invariant, or a bug workaround. Delete comments that restate the code or reference the current task/PR/issue.

## Accessibility code patterns

The shared RTL / logical-property rule is canonicalized above. For everything else accessibility — the centralized announcer utilities, live-region politeness levels, ARIA pitfalls — see [accessibility.md](accessibility.md). Don't restate those patterns here.

## Measuring complexity

Two metrics, two jobs. **Cyclomatic** counts branches (`if`, `||`, loops, `case`). **Cognitive** counts how hard the flow is to read. Nesting and chained conditions cost extra. A wide render function can score low on one and high on the other. Both matter.

Current percentiles for this repo. The population is every function in `packages/*/src` and `demo/src`, tests and stories excluded (5,183 functions; 75 above cognitive 10, 33 above 15):

| Metric     | p50 | p90 | p95 | p99 | max |
| ---------- | --- | --- | --- | --- | --- |
| Cyclomatic | 1   | 4   | 7   | 13  | 76  |
| Cognitive  | 0   | 3   | 5   | 12  | 65  |

To regenerate the table, take percentiles over the cyc/cog columns of:

```sh
find packages/*/src demo/src -name '*.ts' -o -name '*.tsx' | grep -vE '__tests__|\.test\.|\.spec\.|\.stories\.|storybook' | xargs -n 300 npm run complexity -- --report 0
```

How to run:

- `npm run complexity -- <file>` — score a file.
- `npm run complexity -- --changed <base>` — score only the diff. Each row shows base→after (`cyc:54→55  cog:45→46`), or `new` when the function has no counterpart at `<base>`. Severity attaches only to functions that are new or scored worse.
- `--report <n>` — the print floor: functions at or above `n` on either metric appear (default 10).
- `--max <n>` — exit 1 when a function's cognitive score exceeds `n`.

Severity bands (applied to the after score):

- `packages/ai-chat`, `packages/ai-chat-components`, `packages/typedoc-theme`, `examples/**`: >15 Important, >25 Blocker.
- `demo/**`: >15 Nit, >25 Important.
- All other paths (scripts, unlisted packages): no label; scores still appear.

**Render-code blind spot.** `cond && <Panel />` adds a branch on both metrics but is not hard to read. A high score in a render function means read it, not file a finding.

## Measuring coupling

Two metrics, one score. **Ca** (fan-in) counts how many repo modules import a file. **Ce** (fan-out) counts how many repo modules a file imports; npm packages are not counted. **Instability** = Ce / (Ca + Ce): 0 is a stable hub everything depends on, 1 is a leaf that depends on everything. Watch a hub — low instability, high fan-in — whose fan-out grows. Each new import drags every dependent along with it.

This is the dimension that function-level complexity cannot see. A file can have simple functions and still be a structural bottleneck.

The population is `packages/`, `demo/`, `examples/`, and `scripts/`, with tests, stories, and SCSS excluded. Every run cruises the whole tree. Fan-in is a property of the graph, not of one file.

How to run:

- `npm run coupling -- <file>` — score a file.
- `npm run coupling -- --changed <base>` — score only the diff. Each row shows before→after (`fanin:12→13  fanout:20→22`), or `new`. Severity attaches only when fan-in or fan-out rose, or the file is new.
- `--report <n>` — the print floor: files at or above `n` on either metric appear (default 15).
- `--max-fanout <n>` / `--max-fanin <n>` — exit 1 when a file's Ce or Ca exceeds `n`.

Severity bands (applied to the after score):

- `packages/ai-chat`, `packages/ai-chat-components`, `packages/typedoc-theme`, `examples/**`: fan-out >15 Important, >30 Blocker; fan-in >20 Important, >40 Blocker.
- `demo/**`: one notch down — fan-out >15 Nit, >30 Important; fan-in >20 Nit, >40 Important.
- All other paths: no label; scores still appear.

**Entry points and barrels.** An entry point (`aiChatEntry.tsx`) imports everything, so its fan-out is high. A re-export `index.ts` is imported by many, so its fan-in is high. Both are structural. The script prints the note `(entry/barrel — structural, not judged)` in place of a label.

**Blind spot.** A path outside the cruised roots is an error, not a clean score. The script prints `not in the cruised tree` and exits 1 rather than reporting nothing.

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo overview and pointer index
- [conventions.md](conventions.md) — commits, branches, license headers, hooks
- [accessibility.md](accessibility.md) — announcer utilities and live-region patterns
- [definition-of-done.md](definition-of-done.md) — the gate to run before shipping a change
