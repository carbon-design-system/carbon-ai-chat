# public-jsdoc.md — JSDoc on the public types (type 1)

Load this before writing or editing a JSDoc block under `packages/ai-chat/src/types/`. **[internal-comments.md](internal-comments.md) is the opposite instruction in the same source tree** — check which side of the types directory you are on before writing a word.

Structural owner: [types/AGENTS.md](../../../../packages/ai-chat/src/types/AGENTS.md).

**Product copy for a reader who never opens the source.** TypeDoc renders it on the docs site, an Elasticsearch index serves it, and the Carbon MCP server answers from it — so it is read cold, out of order, with none of the file around it.

- **Complete sentences that end in periods.** No note form, no internal jargon, no ticket refs, no TODOs ([types/AGENTS.md](../../../../packages/ai-chat/src/types/AGENTS.md#comment-content-bar)).
- **State purpose, not shape.** The signature already shows the shape. Give a primitive its units and its constraint — `timeout: number` means nothing without "milliseconds".
- **Every public property and enum member gets its own JSDoc.** A `?` is not an explanation.
- **`{@link Target}` over backticks** whenever the target is public — the reader gets a clickable jump, the MCP index gets a resolvable symbol, and the scorer strips it for free. Third-party symbols stay in backticks; `{@link}` cannot resolve them and the build fails ([Cross-linking](../../../../packages/ai-chat/src/types/references/cross-linking.md#external-third-party-types)).
- **Keep the qualifiers.** "May return null", "only after the chat mounts" — here the hedge *is* the contract, so nothing in this skill licenses cutting it.

This is the type where [revision-pass.md](revision-pass.md) is softest, for that reason.

## Before and after

- Before: "This is the timeout value that will be used in order to determine how long we should wait before we cancel the request."
- After: "Time to wait before cancelling the request, in milliseconds."

## Gate

The TypeDoc build, which fails on a broken `{@link}`. Review adds `@category` on every top-level export and at least one titled `@example` on every public instance method.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [types/AGENTS.md](../../../../packages/ai-chat/src/types/AGENTS.md) — the JSDoc mechanics this type is held to
- [internal-comments.md](internal-comments.md) — the inverse rules, for everything outside the types tree
- [tone.md](../../../../references/tone.md) — the voice that does not vary by type
