# code-patterns.md — code-level patterns

Canonical home for repo-wide **code-authoring discipline** — how much code to write and how to shape it (the laziness ladder, simplicity principles), plus the concrete patterns (naming, SCSS, component placement, comments). Read it before writing or changing any code. Other AGENTS files link here instead of restating. Process conventions (commits, branches, license headers, hooks) live in [conventions.md](conventions.md).

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

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo overview and pointer index
- [conventions.md](conventions.md) — commits, branches, license headers, hooks
- [accessibility.md](accessibility.md) — announcer utilities and live-region patterns
- [definition-of-done.md](definition-of-done.md) — the gate to run before shipping a change
