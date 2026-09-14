# internal-comments.md — comments in the source (type 2)

Load this before adding or editing a comment anywhere under `packages/*/src/**` that is not the public types tree, in either package. **[public-jsdoc.md](public-jsdoc.md) is the opposite instruction in the same source tree** — check which side of the types directory you are on before writing a word.

Structural owner: [code-patterns.md](../../../../references/code-patterns.md#comments), which sets the repo default at *no comments* — the code states what it does.

- **A comment earns its place by carrying a non-obvious _why_**: a hidden constraint, a subtle invariant, a bug workaround.
- **Note form is correct here.** Fragments, no ceremony. Type 1's complete-sentence bar does not reach this tree.
- **Where type 1 demands coverage, this demands restraint.** Delete a comment that restates the code, and delete one that points at the current task, PR, or issue.
- **A Lit component's public prop JSDoc is not this type.** It feeds the generated custom-elements manifest and the ArgTypes table a reader sees, so hold it to [storybook-mdx.md](storybook-mdx.md)'s bar.

## Before and after

- Before: `// increment the counter` above `counter += 1;` — delete it; the line says that already.
- After: `// Safari fires focusout before the click lands, so defer the close.` — the constraint is invisible in the code, so the comment is the only place it exists.

## Gate

Review. [caic-review](../../caic-review/SKILL.md) flags a comment that restates the code or points at the current task; what it will not do is ask you to add one.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [code-patterns.md](../../../../references/code-patterns.md) — the no-comment-by-default rule this type comes from
- [public-jsdoc.md](public-jsdoc.md) — the inverse rules, for the public types tree
