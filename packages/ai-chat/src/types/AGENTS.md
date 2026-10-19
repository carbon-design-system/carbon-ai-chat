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

For the release-owned API artifacts, follow [docs/AGENTS.md](../../docs/AGENTS.md).

**Cross-package note**: many of these types are _declared_ in [@carbon/ai-chat-components](../../../ai-chat-components/) and surfaced here through a **local re-declaration**, not a transparent re-export. TypeDoc reads the JSDoc at the declaration site it sees — and the declaration site we want it to see is the local alias in this package, not the upstream source. The JSDoc rules apply at the local declaration site you control. See [cross-package-types.md](references/cross-package-types.md).

## Topic-specific guidance

Load only what you need:

- Tagging a symbol (`@category`, `@experimental`, `@internal`, `@deprecated`) → [jsdoc-tags.md](references/jsdoc-tags.md)
- Linking between public symbols or to third-party types → [cross-linking.md](references/cross-linking.md)
- Documenting a prop whose referential identity matters → [prop-stability.md](references/prop-stability.md)
- Re-declaring a type from `@carbon/ai-chat-components` → [cross-package-types.md](references/cross-package-types.md)
- Writing public JSDoc → [public-jsdoc.md](../../../../.bob/skills/caic-copy-writer/references/public-jsdoc.md)

## `@example` on public methods

Every public **instance method** ships at least one titled `@example`. Scope: [`ChatInstance`](instance/ChatInstance.ts) (and the `ChatActions` it extends), [`ChatInstanceInput`](instance/ChatInstanceInput.ts), [`EventHandlers`](instance/EventHandlers.ts) (`on` / `off` / `once`), and [`ChatInstanceServiceDeskActions`](instance/ChatInstanceServiceDeskActions.ts).

This is a **review gate**, not a build gate — TypeDoc validates `invalidLink` / `notExported`, not a missing `@example`, so a method with no example still compiles. Catch it in review and against the Definition of done below.

Write the block to the shared criteria in [code-examples.md](../../references/code-examples.md): self-contained, minimal, realistically-typed values, one titled `@example` per distinct case, show what comes back, model the production-safe pattern. `{@link}` targets inside an example _are_ build-validated, so they must resolve.

## Definition of done

For guidance-only edits, use the [guidance gate](../../../../references/definition-of-done.md#minimum-gate-by-area-edited). When you change a public type or its JSDoc here (including types surfaced from `@carbon/ai-chat-components`):

1. `npm run build --workspace=@carbon/ai-chat` — rollup only. Use `npm run build:docs --workspace=@carbon/ai-chat` to also generate TypeDoc; the build fails on `validation.invalidLink` errors.
2. If you added a new public export, confirm it appears in both [../aiChatEntry.tsx](../aiChatEntry.tsx) and [../serverEntry.ts](../serverEntry.ts).
3. For a changed cross-package re-declaration, run the [rendered-properties check](#scope).
4. For a changed public instance method, check the [`@example` review gate](#example-on-public-methods).
5. Apply the [public-API semver rules](../../AGENTS.md#authoring-rules).
