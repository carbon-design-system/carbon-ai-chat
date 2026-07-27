# code-patterns.md — code-level patterns

Canonical home for repo-wide **code-authoring discipline** — how much code to write and how to shape it (the laziness ladder, simplicity principles), plus the concrete patterns (naming, SCSS, component placement, comments). Read it before writing or changing any code. Other AGENTS files link here instead of restating. Process conventions (commits, branches, license headers, hooks) live in [conventions.md](conventions.md).

## Writing the least code (laziness ladder)

Before adding code, write the **least** the task needs. Trace the whole flow first, then walk this ladder and stop at the first rung that solves it:

1. **Does it need to exist at all?** Speculative need → skip it and say so in one line (YAGNI).
2. **Already in this codebase?** Reuse the existing helper, util, type, or pattern.
3. **Does the stdlib do it?** Use it.
4. **Native platform feature?** Prefer it — CSS over JS, a type/DB constraint over hand-rolled app code.
5. **Already-installed dependency?** Use it; never add a new dependency for what a few lines can do.
6. **Can it be one line?** Write the one-liner.
7. **Only then**, the minimum code that works.

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

## Naming & prefix discipline (build-breaking)

Never hardcode `cds--` in SCSS or TSX class strings — the `es-custom` build re-prefixes (`cds--custom`) and a literal `cds--` slips through unchanged, breaking that bundle.

- **SCSS**: use `#{$prefix}--` (resolves to `cds--`), never the literal.
- **TS/TSX**: use the prefix helpers, never a literal class string.
- **Lit**: tag strings come from the shared prefix constant, not inline literals.

## SCSS authoring

- **BEM** with the `#{$prefix}--` prefix.
- **No descendant nesting.** `&:hover`, `&--modifier`, and media queries are fine; `.a .b {}` is not.
- **CSS logical properties for RTL.** Use `padding-block-start`, `inset-inline-end`, etc. — never physical properties (`padding-left`, `right`, …). This is the single shared RTL rule; accessibility and review docs link here for it.

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
- [code-review.md](code-review.md) — review rubric that flags violations of these patterns
