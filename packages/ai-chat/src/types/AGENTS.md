# AGENTS.md — `@carbon/ai-chat` public types

Guidance for authoring JSDoc on anything reachable from [../aiChatEntry.tsx](../aiChatEntry.tsx) or [../serverEntry.ts](../serverEntry.ts).

## Why this matters

JSDoc on these types is not internal annotation — it is product copy. It is consumed by three surfaces:

1. **The TypeDoc docs site** (`dist/docs/carbon-tsdocs/`, config in [../../typedoc.json](../../typedoc.json)) — our primary public developer docs.
2. **An Elasticsearch index** that backs search on that docs site.
3. **An MCP server** that answers questions for consumers of `@carbon/ai-chat`.

Write for a consumer who has never seen the codebase.

## Scope

In scope: anything exported from [../aiChatEntry.tsx](../aiChatEntry.tsx) or [../serverEntry.ts](../serverEntry.ts), or transitively referenced (property type, generic arg, union member).

Quick check: after a build, the symbol's rendered TypeDoc page under `dist/docs/carbon-tsdocs/` should list **its properties**, or the symbol name should appear in the rendered shape of something that does. A page that exists but renders no members is the failure mode this bar exists to catch — see [Object-shaped targets need `@interface`](references/cross-package-types.md#object-shaped-targets-need-interface).

`npm run docs --workspace=@carbon/ai-chat` is the fast loop — TypeDoc only, no rollup, because the entry point is TS source:

```bash
npm run docs --workspace=@carbon/ai-chat
grep -c 'tsd-index-heading' packages/ai-chat/dist/docs/carbon-tsdocs/interfaces/Type_reference.YourType.html
```

Don't reach for `npm run docs:api` to check this. It rewrites the committed [../../docs/api/](../../docs/api/), which is regenerated on a release or release candidate, not per PR.

**Cross-package note**: many of these types are _declared_ in [@carbon/ai-chat-components](../../../ai-chat-components/) and surfaced here through a **local re-declaration**, not a transparent re-export. TypeDoc reads the JSDoc at the declaration site it sees — and the declaration site we want it to see is the local alias in this package, not the upstream source. The bar below therefore applies at the local declaration site you control. See [cross-package-types.md](references/cross-package-types.md).

## Topic-specific guidance

Load only what you need:

- Tagging a symbol (`@category`, `@experimental`, `@internal`, `@deprecated`) → [jsdoc-tags.md](references/jsdoc-tags.md)
- Linking between public symbols or to third-party types → [cross-linking.md](references/cross-linking.md)
- Documenting a prop whose referential identity matters → [prop-stability.md](references/prop-stability.md)
- Re-declaring a type from `@carbon/ai-chat-components` → [cross-package-types.md](references/cross-package-types.md)
- Worked good/bad examples of every rule → [jsdoc-examples.md](references/jsdoc-examples.md)

## Comment content bar

- **State purpose, not shape.** The signature shows the shape; JSDoc explains what it _means_ and when to use it.
- **Document units and semantics of primitives.** `timeout: number` is useless without "milliseconds". `id: string` is useless without "must be unique across X".
- **Complete sentences, ending in periods.** No note-form, no internal jargon, no ticket refs, no TODOs.
- **Match the tone of existing types** ([messaging/Messages.ts](messaging/Messages.ts), [instance/ChatInstance.ts](instance/ChatInstance.ts)). JSDoc is product copy — follow [../../../../references/tone.md](../../../../references/tone.md) for voice and word economy.

## Property-level JSDoc

Every public property and enum member needs its own JSDoc — `?` in the signature is not an explanation.

## `@example` on public methods

Every public **instance method** ships at least one titled `@example`. Scope: [`ChatInstance`](instance/ChatInstance.ts) (and the `ChatActions` it extends), [`ChatInstanceInput`](instance/ChatInstanceInput.ts), [`EventHandlers`](instance/EventHandlers.ts) (`on` / `off` / `once`), and [`ChatInstanceServiceDeskActions`](instance/ChatInstanceServiceDeskActions.ts).

This is a **review gate**, not a build gate — TypeDoc validates `invalidLink` / `notExported`, not a missing `@example`, so a method with no example still compiles. Catch it in review and against the Definition of done below.

Write the block to the shared criteria in [code-examples.md](../../references/code-examples.md): self-contained, minimal, realistically-typed values, one titled `@example` per distinct case, show what comes back, model the production-safe pattern. `{@link}` targets inside an example _are_ build-validated, so they must resolve.

## Definition of done

When you change anything under [.](.) (or a type in `@carbon/ai-chat-components` that crosses into this package's public surface):

1. `npm run build --workspace=@carbon/ai-chat` — rollup + TypeDoc. The build fails on `validation.invalidLink` errors.
2. If you added a new public export, confirm it appears in both [../aiChatEntry.tsx](../aiChatEntry.tsx) and [../serverEntry.ts](../serverEntry.ts).
3. If you added or changed a [cross-package re-export](references/cross-package-types.md), confirm its rendered page lists the type's properties — see the quick check under [Scope](#scope). Leave [../../docs/api/](../../docs/api/) alone; it is regenerated at release time.
4. If you added or changed a public instance method, confirm it carries at least one titled `@example` that meets [code-examples.md](../../references/code-examples.md) (review gate — not build-enforced).
5. Semver: any change to a public type is a `feat` (additive) or a `fix!` / `BREAKING CHANGE` (non-additive). See [../../AGENTS.md](../../AGENTS.md) → _Authoring rules_ → _Public API changes_.

## Related Guidance

- **Parent guidance**: [packages/ai-chat/AGENTS.md](../../AGENTS.md)
- **Voice and tone**: [tone.md](../../../../references/tone.md) - Voice and word economy for all public copy
- **Store patterns**: [../chat/store/AGENTS.md](../chat/store/AGENTS.md) - For action/state types
- **Cross-package types**: [cross-package-types.md](references/cross-package-types.md) - Re-declaring `@carbon/ai-chat-components` types
- **Worked examples**: [jsdoc-examples.md](references/jsdoc-examples.md) - Good and bad JSDoc, side by side
- **Documentation**: [../../docs/AGENTS.md](../../docs/AGENTS.md) - For public API docs
