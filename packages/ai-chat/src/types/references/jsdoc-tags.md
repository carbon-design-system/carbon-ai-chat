# jsdoc-tags.md — the TypeDoc tag catalog

Load this when you tag a public symbol, or when a symbol renders in the wrong place on the docs site.

## `@category` — required on every top-level export

`@category` places the symbol in the docs navigation. Allowed values are whatever `categoryOrder` lists in [../../../typedoc.json](../../../typedoc.json) — read them from there rather than from a copy that can drift. Today the vocabulary covers the React, Web-component, and SDK entry points, plus `Config`, `Instance`, `Events`, `Service desk`, `Messaging`, `Testing`, and `Utilities`.

An untagged symbol falls into the `*` catchall. That bucket is not a valid destination — it is the sign that an author forgot.

**A symbol can carry more than one `@category`.** TypeDoc collects every tag on a symbol into a set, so the symbol is listed under each one, with no second copy to drift.

### `SDK`, and why a symbol lands in two categories

**Anything reachable from the headless SDK surface is tagged `SDK`**, so that one page is the whole surface and a reader never leaves it to find out what a value holds. A type that belongs to the conversation alone carries `SDK` by itself. A type shared with the prebuilt chat — `Message`, `StructuredData`, `ResponseUserProfile` — carries `SDK` alongside the category it already has.

**A type the SDK surface names is also named `ChatSDK…`**, and where that name already ships, today's name extends the SDK's rather than being renamed: `interface ChatInstanceMessaging extends ChatSDKInstanceMessaging {}`. The extension runs outward only — the prebuilt chat's types extend the SDK's, never the reverse. ADR-0002 decides both rules.

## `@experimental`

Public API that may still change. It renders as a visible badge on the docs site, and works on a property, an enum member, or a whole type. Add a note only when it tells a consumer something the badge does not, such as which part may change. A note that says the API is still settling restates the tag; leave the tag bare.

**When you do write a note, put the tag and note above every tag that takes text** — `@category`, `@param`, `@returns`, `@example`. TypeDoc reads `@experimental` as a flag with no text of its own, so the note joins whatever precedes it. Placed first, it becomes the last paragraph of the summary. Placed after `@category Utilities`, it becomes part of the category name, and the symbol moves to a sidebar section titled with the note.

## `@internal`

Symbols the build pipeline forces into the public types for mechanical reasons, but that consumers must never rely on — for example the plumbing adjacent to [../../chat/services/ChatInstanceService.ts](../../chat/services/ChatInstanceService.ts) reached through `ChatInstance.serviceManager`. TypeDoc strips `@internal` from its output, so the rule is simple: if a reader should never see it, tag it.

## `@deprecated`

Symbols scheduled for removal. Always name the replacement and the target major, so the tag is actionable on its own:

```ts
/** @deprecated Use {@link NewThing} — removed in 2.0.0. */
```

## Related guidance

- [src/types/AGENTS.md](../AGENTS.md) — the JSDoc bar these tags sit inside
- [cross-package-types.md](cross-package-types.md) — tagging a re-declared `@carbon/ai-chat-components` type
- [jsdoc-examples.md](jsdoc-examples.md) — worked good/bad examples
