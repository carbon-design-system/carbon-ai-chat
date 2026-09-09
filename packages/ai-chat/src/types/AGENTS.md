# AGENTS.md — `@carbon/ai-chat` public types

Guidance for authoring JSDoc on this package's public type surface.

## Why this matters

JSDoc on these types is not internal annotation — it is product copy. It is consumed by three surfaces:

1. **The TypeDoc docs site** (`dist/docs/carbon-tsdocs/`, config in [../../typedoc.json](../../typedoc.json)) — our primary public developer docs.
2. **An Elasticsearch index** that backs search on that docs site.
3. **An MCP server** that answers questions for consumers of `@carbon/ai-chat`.

Write for a consumer who has never seen the codebase.

## Scope

In scope: anything exported from [../aiChatEntry.tsx](../aiChatEntry.tsx) or [../serverEntry.ts](../serverEntry.ts), or transitively referenced (property type, generic arg, union member).

Quick check: after a build, the symbol's rendered page under `dist/docs/carbon-tsdocs/` should list **its properties**, or appear in the rendered shape of something that does. A page that renders no members is the failure this bar exists to catch — see [Object-shaped targets need `@interface`](references/cross-package-types.md#object-shaped-targets-need-interface).

`npm run docs --workspace=@carbon/ai-chat` is the fast loop — TypeDoc only, no rollup, because the entry point is TS source. Grep the rendered page for `tsd-index-heading` to confirm it lists members. Don't reach for `npm run docs:api`: it rewrites the committed [../../docs/api/](../../docs/api/), which is generated on a release or release candidate, not per PR.

## Required tags

Every top-level export needs `@category`; `@experimental`, `@internal`, and `@deprecated` carry their own rules. The catalog — allowed values, what each tag does to the rendered output, and the shape of a `@deprecated` note — is in [jsdoc-tags.md](references/jsdoc-tags.md). Read it when you tag a symbol.

## Comment content bar

- **State purpose, not shape.** The signature shows the shape; JSDoc explains what it _means_ and when to use it.
- **Document units and semantics of primitives.** `timeout: number` is useless without "milliseconds". `id: string` is useless without "must be unique across X".
- **Complete sentences, ending in periods.** No note-form, no internal jargon, no ticket refs, no TODOs.
- **Match the tone of existing types** ([messaging/Messages.ts](messaging/Messages.ts), [instance/ChatInstance.ts](instance/ChatInstance.ts)). JSDoc is product copy — follow [../../../../references/tone.md](../../../../references/tone.md) for voice and quick rules.

## Cross-linking

Use `{@link SymbolName}` for references to other exported symbols. TypeDoc runs with `validation.invalidLink: true`, so a broken one fails the build. Read [cross-linking.md](references/cross-linking.md) when you write a link: it covers when to prefer `{@link}` over backticks, how to link a leaf type back to the consumer that reaches it, and why third-party symbols have to stay in backticks.

## Cross-package re-exports

Many public types are _declared_ in [@carbon/ai-chat-components](../../../ai-chat-components/) and surfaced here through a local re-declaration, so the JSDoc and `@category` you write live in this package. Read [cross-package-types.md](references/cross-package-types.md) when you add or change one: it carries the pattern, the `@interface` rule for object-shaped targets, where each re-declaration lives, and what the docs build does when one is missing.

Third-party packages (`@tiptap/core`, etc.) are **never** re-declared or re-exported. Import them directly, and reference them in JSDoc per [External (third-party) types](references/cross-linking.md#external-third-party-types).

## Property-level JSDoc

Every public property and enum member needs its own JSDoc — `?` in the signature is not an explanation.

## `@example` on public methods

Every public **instance method** ships at least one titled `@example`. Scope: [`ChatInstance`](instance/ChatInstance.ts) (and the `ChatActions` it extends), [`ChatInstanceInput`](instance/ChatInstanceInput.ts), [`EventHandlers`](instance/EventHandlers.ts) (`on` / `off` / `once`), and [`ChatInstanceServiceDeskActions`](instance/ChatInstanceServiceDeskActions.ts).

This is a **review gate**, not a build gate — TypeDoc validates `invalidLink` / `notExported`, not a missing `@example`, so a method with no example still compiles. Catch it in review and against the Definition of done below.

Write the block to the shared criteria in [code-examples.md](../../references/code-examples.md): self-contained, minimal, realistically-typed values, one titled `@example` per distinct case, show what comes back, model the production-safe pattern. `{@link}` targets inside an example _are_ build-validated, so they must resolve.

## Prop stability

When a prop's identity matters — because the chat compares it by reference, or rebuilds something from it — its JSDoc has to say so, or a consumer has no way to know they must memoize. Read [prop-stability.md](references/prop-stability.md) when you add or change such a prop.

## Examples

Worked good and bad examples of every rule above — top-level types, properties, and cross-package re-declarations — are in [jsdoc-examples.md](references/jsdoc-examples.md). Read it when you want a model to copy rather than a rule to apply.

## Definition of done

When you change anything under [.](.) (or a type in `@carbon/ai-chat-components` that crosses into this package's public surface):

1. `npm run build --workspace=@carbon/ai-chat` — rollup + TypeDoc.
2. If you added a new public export, confirm it appears in both [../aiChatEntry.tsx](../aiChatEntry.tsx) and [../serverEntry.ts](../serverEntry.ts).
3. If you added or changed a [cross-package re-export](references/cross-package-types.md), confirm its rendered page lists the type's properties — the quick check under [Scope](#scope).
4. If you added or changed a public instance method, confirm it carries at least one titled `@example` that meets [code-examples.md](../../references/code-examples.md) (review gate — not build-enforced).
5. Semver: a public-type change is a `feat` (additive) or a `fix!` / `BREAKING CHANGE` (not). See [../../AGENTS.md](../../AGENTS.md) → _Authoring rules_.

## Related Guidance

- **Parent guidance**: [packages/ai-chat/AGENTS.md](../../AGENTS.md)
- **Voice and tone**: [tone.md](../../../../references/tone.md) - Voice and quick rules for all public copy
- **Copy rules**: [public-jsdoc.md](../../../../.bob/skills/caic-copy-writer/references/public-jsdoc.md) - What a JSDoc block owes a reader who never opens the source (type 1)
- **Store patterns**: [../chat/store/AGENTS.md](../chat/store/AGENTS.md) - For action/state types
- **Tag catalog**: [jsdoc-tags.md](references/jsdoc-tags.md) - The four TypeDoc tags
- **Cross-linking**: [cross-linking.md](references/cross-linking.md) - `{@link}` rules, and third-party symbols
- **Cross-package types**: [cross-package-types.md](references/cross-package-types.md) - Re-declaring `@carbon/ai-chat-components` types
- **Prop stability**: [prop-stability.md](references/prop-stability.md) - When a prop's identity matters
- **Worked examples**: [jsdoc-examples.md](references/jsdoc-examples.md) - Good and bad JSDoc, side by side
- **Documentation**: [../../docs/AGENTS.md](../../docs/AGENTS.md) - For public API docs
