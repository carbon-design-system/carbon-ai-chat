# cross-linking.md — `{@link}` between public symbols

Load this when you reference one symbol from another symbol's JSDoc, or when the docs build fails on a link it cannot resolve.

Use `{@link SymbolName}` for references to other exported symbols. TypeDoc runs with `validation.invalidLink: true` (see [../../../typedoc.json](../../../typedoc.json)), so a broken `{@link}` fails the build.

Prefer a `{@link}` over a plain backtick reference when the target is itself public — consumers get a clickable jump in the rendered docs, and a resolvable symbol in the MCP index.

## Link back to the consumer

When you declare a type that is only reachable through another public symbol — a leaf config consumed by a parent config, an enum surfaced on a single property, a callback signature attached to one event — open the JSDoc with a sentence that `{@link}`s the consumer entry point. A reader who lands on the leaf in TypeDoc or the MCP index can then jump straight to where it is actually used.

The existing `AutocompleteConfig` is the template:

```ts
/** Live autocomplete config consumed by {@link InputConfig.autocomplete}. */
```

## External (third-party) types

Symbols from `@tiptap/core` (`Editor`, `Extension`, `JSONContent`, `Node`, ...) are not exported from this package, so `{@link}` cannot resolve them and the build will fail. Reference them with plain backticks (e.g. `` `JSONContent` ``) and, where useful, link to tiptap's own docs by URL.

This is why third-party packages are never re-declared or re-exported to make them linkable — see [cross-package-types.md](cross-package-types.md).

## Related guidance

- [src/types/AGENTS.md](../AGENTS.md) — the JSDoc bar these links sit inside
- [cross-package-types.md](cross-package-types.md) — re-declaring `@carbon/ai-chat-components` types
- [jsdoc-examples.md](jsdoc-examples.md) — worked good/bad examples
