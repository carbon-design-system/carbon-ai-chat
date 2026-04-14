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

Quick check: after a build, the rendered TypeDoc page for the symbol should exist under `dist/docs/carbon-tsdocs/` or the symbol name should appear in the rendered shape of something that does.

**Cross-package note**: many of these types are _declared_ in [@carbon/ai-chat-components](../../../ai-chat-components/) and re-exported here. TypeDoc reads the JSDoc at the **declaration site**, not the re-export, so the bar below applies wherever the type is written — see [Cross-package re-exports](#cross-package-re-exports).

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
- **Match the tone of existing types** ([messaging/Messages.ts](messaging/Messages.ts), [instance/ChatInstance.ts](instance/ChatInstance.ts)).

## Cross-linking

Use `{@link SymbolName}` for references to other exported symbols. TypeDoc runs with `validation.invalidLink: true` (see [../../typedoc.json](../../typedoc.json)), so a broken `{@link}` fails the build.

Prefer a `{@link}` over a plain backtick reference when the target is itself public — consumers get a clickable jump in the rendered docs and a resolvable symbol in the MCP index.

## Cross-package re-exports

Some public types are declared in [@carbon/ai-chat-components](../../../ai-chat-components/) and re-exported unchanged through [../aiChatEntry.tsx](../aiChatEntry.tsx). Concrete example:

- Declaration: [../../../ai-chat-components/src/components/chain-of-thought/defs.ts](../../../ai-chat-components/src/components/chain-of-thought/defs.ts) declares `ChainOfThoughtStepStatus` with `@category Messaging` and per-member JSDoc.
- Used through: [messaging/Messages.ts](messaging/Messages.ts) imports it from `@carbon/ai-chat-components/es/components/chain-of-thought/defs.js`.
- Re-exported: [../aiChatEntry.tsx](../aiChatEntry.tsx) and [../serverEntry.ts](../serverEntry.ts) list it in the public export block.

Rules:

1. **JSDoc lives with the declaration**, in `@carbon/ai-chat-components`. TypeDoc picks it up from there. The re-export in [../aiChatEntry.tsx](../aiChatEntry.tsx) is a bare `export { X }` with no JSDoc of its own — a comment on the re-export line is ignored.
2. **`@category` values are owned by this package.** Even though the tag is written in the components package, the allowed values are the `categoryOrder` list in [../../typedoc.json](../../typedoc.json). Cross-package categories that don't match fall into `*`.
3. **No unexported symbols in the public surface.** If a type from `@carbon/ai-chat-components` is referenced (even indirectly) by a public ai-chat type — as a property type, generic arg, or union member — it must also be re-exported from [../aiChatEntry.tsx](../aiChatEntry.tsx) so TypeDoc produces a page for it. Today's gap: `ToolbarAction` ([config/PublicConfig.ts](config/PublicConfig.ts)) and `CHAT_BUTTON_KIND` / `CHAT_BUTTON_SIZE` ([messaging/Messages.ts](messaging/Messages.ts)) are referenced but not re-exported — closing these is the correct move when touching the relevant files.
4. **Scope covers everything exported from `@carbon/ai-chat-components`.** That package is independently published and any of its exports can become re-exported here at any time; treat all of its exported types as if they're in the public docs already. The rules above apply equally when editing there.

## Property-level JSDoc

Every public property and enum member needs its own JSDoc — `?` in the signature is not an explanation.

## Examples

### Good — top-level type

```ts
/**
 * Status of the chain of thought step.
 *
 * @category Messaging
 */
enum ChainOfThoughtStepStatus {
  /**
   * The tool call is currently processing.
   */
  PROCESSING = "processing",

  /**
   * The tool call failed.
   */
  FAILURE = "failure",

  /**
   * The tool call succeeded.
   */
  SUCCESS = "success",
}
```

Why it works: `@category` is valid, sentences end in periods, each member is documented individually, no internal jargon.

### Bad — top-level type

```ts
// BAD
/** step status — see #4821 for context */
enum ChainOfThoughtStepStatus {
  PROCESSING = "processing", // TODO rename?
  FAILURE = "failure",
  SUCCESS = "success",
}
```

Why it fails: no `@category` (lands in `*`), no member-level JSDoc, note-form rather than sentences, internal ticket reference, TODO in public copy.

### Good — property referencing another public symbol

```ts
/**
 * The time to wait for a response from the back-end before cancelling the
 * request, in milliseconds. Defaults to the value returned by
 * {@link DefaultMessagingTimeouts.response}.
 */
responseUserProfileTimeoutMS?: number;
```

Why it works: units stated, default documented, `{@link}` resolves and will fail the build if it breaks.

## Definition of done

When you change anything under [.](.) (or a type in `@carbon/ai-chat-components` that crosses into this package's public surface):

1. `npm run build --workspace=@carbon/ai-chat` — rollup + TypeDoc. The build fails on `validation.invalidLink` errors.
2. If you added a new public export, confirm it appears in both [../aiChatEntry.tsx](../aiChatEntry.tsx) and [../serverEntry.ts](../serverEntry.ts).
3. Semver: any change to a public type is a `feat` (additive) or a `fix!` / `BREAKING CHANGE` (non-additive). See [../../AGENTS.md](../../AGENTS.md) → _Authoring rules_ → _Public API changes_.
