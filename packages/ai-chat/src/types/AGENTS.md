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

Don't reach for `npm run docs:api` to check this. It rewrites the committed [../../docs/api/](../../docs/api/), which is generated on a release or release candidate, not per PR.

**Cross-package note**: many of these types are _declared_ in [@carbon/ai-chat-components](../../../ai-chat-components/) and surfaced here through a **local re-declaration**, not a transparent re-export. TypeDoc reads the JSDoc at the declaration site it sees — and the declaration site we want it to see is the local alias in this package, not the upstream source. The bar below therefore applies at the local declaration site you control. See [cross-package-types.md](references/cross-package-types.md).

## Required tags

### `@category` (required on every top-level export)

`@category` places the symbol in the docs navigation. Allowed values come from `categoryOrder` in [../../typedoc.json](../../typedoc.json):

- `React`
- `Web component`
- `Config`
- `Instance`
- `Events`
- `Service desk`
- `Messaging`
- `Testing`
- `Utilities`

Untagged symbols fall into the `*` bucket — a sign the author forgot.

### `@experimental`

Public API that may still change. Pair with a short note on why it's unstable. Renders with a visible badge on the docs site. Use on a property, enum member, or whole type.

### `@internal`

Symbols the build pipeline forces into the public types for mechanical reasons but that consumers must never rely on (example: [../chat/services/ChatActionsImpl.ts](../chat/services/ChatActionsImpl.ts)-adjacent plumbing reached via `ChatInstance.serviceManager`). `@internal` is stripped from TypeDoc output — if a reader should never see it, tag it.

### `@deprecated`

Symbols scheduled for removal. Include the replacement and target major: `@deprecated Use {@link NewThing} — removed in 2.0.0.`

## Comment content bar

- **State purpose, not shape.** The signature shows the shape; JSDoc explains what it _means_ and when to use it.
- **Document units and semantics of primitives.** `timeout: number` is useless without "milliseconds". `id: string` is useless without "must be unique across X".
- **Complete sentences, ending in periods.** No note-form, no internal jargon, no ticket refs, no TODOs.
- **Match the tone of existing types** ([messaging/Messages.ts](messaging/Messages.ts), [instance/ChatInstance.ts](instance/ChatInstance.ts)). JSDoc is product copy — follow [../../../../references/tone.md](../../../../references/tone.md) for voice and word economy.

## Cross-linking

Use `{@link SymbolName}` for references to other exported symbols. TypeDoc runs with `validation.invalidLink: true` (see [../../typedoc.json](../../typedoc.json)), so a broken `{@link}` fails the build.

Prefer a `{@link}` over a plain backtick reference when the target is itself public — consumers get a clickable jump in the rendered docs and a resolvable symbol in the MCP index.

**Link back to the consumer.** When you declare a type that is only reachable through another public symbol — a leaf config consumed by a parent config, an enum surfaced on a single property, a callback signature attached to one event — open the JSDoc with a sentence that `{@link}`s the consumer entry point. A reader who lands on the leaf in TypeDoc or the MCP index can then jump straight to where it's actually used. The existing `AutocompleteConfig` ("Live autocomplete config consumed by {@link InputConfig.autocomplete}") is the template.

**External (third-party) types.** Symbols from `@tiptap/core` (`Editor`, `Extension`, `JSONContent`, `Node`, ...) are not exported from this package, so `{@link}` cannot resolve them and the build will fail. Reference them with plain backticks (e.g. `` `JSONContent` ``) and, where useful, link to tiptap's own docs by URL.

## Cross-package re-exports

Public types declared in [@carbon/ai-chat-components](../../../ai-chat-components/) are surfaced through a local re-declaration in this package, not a transparent re-export. JSDoc + `@category` live **here**, via that re-declaration.

Read [cross-package-types.md](references/cross-package-types.md) when you add or change one: it carries the pattern, the `@interface` rule for object-shaped targets, where each re-declaration lives, and what the docs build does when one is missing.

Third-party packages (`@tiptap/core`, etc.) are **never** re-declared or re-exported. Import them directly. See "External (third-party) types" in [Cross-linking](#cross-linking).

## Property-level JSDoc

Every public property and enum member needs its own JSDoc — `?` in the signature is not an explanation.

## `@example` on public methods

Every public **instance method** ships at least one titled `@example`. Scope: [`ChatInstance`](instance/ChatInstance.ts) (and the `ChatActions` it extends), [`ChatInstanceInput`](instance/ChatInstanceInput.ts), [`EventHandlers`](instance/EventHandlers.ts) (`on` / `off` / `once`), and [`ChatInstanceServiceDeskActions`](instance/ChatInstanceServiceDeskActions.ts).

This is a **review gate**, not a build gate — TypeDoc validates `invalidLink` / `notExported`, not a missing `@example`, so a method with no example still compiles. Catch it in review and against the Definition of done below.

Write the block to the shared criteria in [code-examples.md](../../references/code-examples.md): self-contained, minimal, realistically-typed values, one titled `@example` per distinct case, show what comes back, model the production-safe pattern. `{@link}` targets inside an example _are_ build-validated, so they must resolve.

## Prop stability

The chat re-render hardening assumes most config/render props are referentially stable across host renders. When a prop's identity matters — because the chat compares it by reference, or rebuilds something from it — say so in its JSDoc so a consumer knows to memoize it. Two cases:

- **Compared by reference** (a change of identity is treated as a real change): e.g. `serviceDeskFactory`. Document that the consumer must pass a stable reference (module-level function or `useCallback`) and what an unstable one costs.
- **Rebuilt from on change** (a new identity reruns expensive work even with equal content): e.g. `markdownItPlugins`. Document that the value should be memoized.

Props the framework already diffs by value (`config`, `strings`, `markdown`) tolerate inline objects, but a fresh identity every render still costs a no-op reconciliation pass; in `debug` mode the chat warns once per such prop. Object/array props that feed expensive work should still carry a "memoize this" note.

## Examples

Worked good and bad examples of every rule above — top-level types, properties, and cross-package re-declarations — are in [jsdoc-examples.md](references/jsdoc-examples.md). Read it when you want a model to copy rather than a rule to apply.

## Definition of done

When you change anything under [.](.) (or a type in `@carbon/ai-chat-components` that crosses into this package's public surface):

1. `npm run build --workspace=@carbon/ai-chat` — rollup only. Use `npm run build:docs --workspace=@carbon/ai-chat` to also generate TypeDoc; the build fails on `validation.invalidLink` errors.
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
