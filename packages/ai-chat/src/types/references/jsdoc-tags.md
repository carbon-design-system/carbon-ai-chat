# jsdoc-tags.md — the TypeDoc tag catalog

Load this when you tag a public symbol, or when a symbol renders in the wrong place on the docs site.

## `@category` — required on every top-level export

`@category` places the symbol in the docs navigation. Allowed values are whatever `categoryOrder` lists in [../../../typedoc.json](../../../typedoc.json) — read them from there rather than from a copy that can drift. Today the vocabulary covers the React and Web-component entry points, `Config`, `Instance`, `Events`, `Service desk`, `Messaging`, `Testing`, and `Utilities`.

An untagged symbol falls into the `*` catchall. That bucket is not a valid destination — it is the sign that an author forgot.

## `@experimental`

Public API that may still change. Pair it with a short note on _why_ it is unstable, so a consumer can judge the risk. It renders as a visible badge on the docs site, and works on a property, an enum member, or a whole type.

## `@internal`

Symbols the build pipeline forces into the public types for mechanical reasons, but that consumers must never rely on — for example the plumbing adjacent to [../../chat/services/ChatActionsImpl.ts](../../chat/services/ChatActionsImpl.ts) reached through `ChatInstance.serviceManager`. TypeDoc strips `@internal` from its output, so the rule is simple: if a reader should never see it, tag it.

## `@deprecated`

Symbols scheduled for removal. Always name the replacement and the target major, so the tag is actionable on its own:

```ts
/** @deprecated Use {@link NewThing} — removed in 2.0.0. */
```

## Related guidance

- [src/types/AGENTS.md](../AGENTS.md) — the JSDoc bar these tags sit inside
- [cross-package-types.md](cross-package-types.md) — tagging a re-declared `@carbon/ai-chat-components` type
- [jsdoc-examples.md](jsdoc-examples.md) — worked good/bad examples
