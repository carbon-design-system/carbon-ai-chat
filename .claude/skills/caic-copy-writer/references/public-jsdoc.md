# public-jsdoc.md — JSDoc on the public types (type 1)

Load this before writing or editing a JSDoc block under `packages/ai-chat/src/types/`. **[internal-comments.md](internal-comments.md) is the opposite instruction in the same source tree** — check which side of the types directory you are on before writing a word.

Structural owner: [types/AGENTS.md](../../../../packages/ai-chat/src/types/AGENTS.md).

**Product copy for a reader who never opens the source.** See [types/AGENTS.md](../../../../packages/ai-chat/src/types/AGENTS.md#why-this-matters) for its consumers; write for someone reading cold, out of order, with none of the file around it.

- **Complete sentences that end in periods.** No note form, no internal jargon, no ticket refs, no TODOs.
- **State purpose, not shape.** The signature already shows the shape. Explain what it means and when to use it. Give a primitive its units and its constraint — `timeout: number` needs "milliseconds"; `id: string` needs "must be unique across X".
- **Every public property and enum member gets its own JSDoc.** A `?` is not an explanation.
- **`{@link Target}` over backticks** whenever the target is public — the reader gets a clickable jump and the MCP index gets a resolvable symbol. Third-party symbols stay in backticks; `{@link}` cannot resolve them and the build fails ([Cross-linking](../../../../packages/ai-chat/src/types/references/cross-linking.md#external-third-party-types)).
- **Keep the qualifiers.** "May return null", "only after the chat mounts" — here the hedge *is* the contract, so nothing in this skill licenses cutting it.

**Match the tone of existing types**, such as [Messages.ts](../../../../packages/ai-chat/src/types/messaging/Messages.ts) and [ChatInstance.ts](../../../../packages/ai-chat/src/types/instance/ChatInstance.ts). Follow [tone.md](../../../../references/tone.md) for voice and word economy.

One habit matters most for API docs. Refer to a symbol with a `{@link}`, then use plain words for it. The scorer strips `{@link}` links, so each reference is free. Carry the meaning in the plain words around it. A dotted name like `InputConfig.updateStructuredData` written as plain text or inline code still counts as one long word. Repeat it and you push the page toward a graduate reading level.

Keep the qualifiers during [revision-pass.md](revision-pass.md); its rules are softest for public JSDoc.

## Before and after

- Before: "This is the timeout value that will be used in order to determine how long we should wait before we cancel the request."
- After: "Time to wait before canceling the request, in milliseconds."

## Gate

The TypeDoc build, which fails on a broken `{@link}`. Review adds `@category` on every top-level export and at least one titled `@example` on every public instance method.

## Related guidance

- [caic-copy-writer](../SKILL.md) — the routing table and the draft-measure-revise loop
- [types/AGENTS.md](../../../../packages/ai-chat/src/types/AGENTS.md) — the JSDoc mechanics this type is held to
- [internal-comments.md](internal-comments.md) — the inverse rules, for everything outside the types tree
- [tone.md](../../../../references/tone.md) — the voice that does not vary by type
