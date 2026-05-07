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

**Cross-package note**: many of these types are _declared_ in [@carbon/ai-chat-components](../../../ai-chat-components/) (or third-party packages like `@tiptap/core`) and surfaced here through a **local re-declaration**, not a transparent re-export. TypeDoc reads the JSDoc at the declaration site it sees — and the declaration site we want it to see is the local alias in this package, not the upstream source. The bar below therefore applies at the local declaration site you control. See [Cross-package re-exports](#cross-package-re-exports).

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

Some public types are declared in [@carbon/ai-chat-components](../../../ai-chat-components/) or third-party packages like `@tiptap/core`. JSDoc + `@category` live **here**, in `@carbon/ai-chat`, via a local re-declaration — not a transparent re-export. This way upstream packages don't need to carry our category vocabulary, and tiptap's types don't need us to claim editorial ownership over their shape.

### Anti-pattern (silently broken)

`export type { X } from 'pkg'` and `export { X } from 'pkg'` are **not** category-applying. TypeDoc resolves through to the upstream source and reads its JSDoc — any comment block above your `export type {` line is ignored. Symbols re-exported this way without a `@category` tag in their upstream declaration land in TypeDoc's `*` ("Other types") catchall.

### The pattern

Re-declare upstream symbols at a local site you own, then re-export from [../aiChatEntry.tsx](../aiChatEntry.tsx) / [../serverEntry.ts](../serverEntry.ts) using the local alias.

For sibling-package symbols (`@carbon/ai-chat-components`) — write **full** consumer-facing JSDoc:

```ts
import type { AutocompleteConfig as _AutocompleteConfig } from "@carbon/ai-chat-components/es/components/input/index.js";

/**
 * Live autocomplete config consumed by {@link InputConfig.autocomplete}.
 * Selection inserts plain text rather than a schema node; no chip is
 * rendered.
 *
 * @category Config
 */
export type AutocompleteConfig = _AutocompleteConfig;
```

For runtime values, use `export const`:

```ts
import { buildCarbonExtensions as _buildCarbonExtensions } from "@carbon/ai-chat-components/es/components/input/index.js";

/**
 * Translate the Carbon-curated configs surfaced on {@link InputConfig} into
 * a Tiptap {@link Extension} list. ...
 *
 * @category Utilities
 */
export const buildCarbonExtensions = _buildCarbonExtensions;
```

For an enum (need both runtime + type), declare both:

```ts
export const FileStatusValue = _FileStatusValue;
export type FileStatusValue = _FileStatusValue;
```

For third-party symbols (e.g. `@tiptap/core`) — write a **brief, pointer-style** JSDoc only. Don't re-document shape; link to the upstream's own docs as the canonical reference:

```ts
import type { Editor as _Editor } from "@tiptap/core";

/**
 * The Tiptap editor instance returned by {@link ChatInstanceInput.getEditor}.
 * Re-exported from `@tiptap/core` for ergonomic typing — see the
 * [Tiptap Editor docs](https://tiptap.dev/api/editor) for the full API.
 *
 * @category Utilities
 */
export type Editor = _Editor;
```

### Where local re-declarations live

Co-locate by topic:

- Tiptap-related symbols → [utilities/tiptapReexports.ts](utilities/tiptapReexports.ts) (the canonical example).
- Service-desk-related symbols → [config/ServiceDeskConfig.ts](config/ServiceDeskConfig.ts) (e.g. `FileUpload`, `FileStatusValue`).
- Header / toolbar symbols → [config/PublicConfig.ts](config/PublicConfig.ts) (e.g. `ToolbarAction`).

### Internal imports use the local alias too

When a property type inside this package references a cross-package symbol (e.g. `extensions?: Extension[]`), import the **local alias**, not the upstream source. This keeps TypeDoc's symbol resolution pointed at our JSDoc + `@category`:

```ts
// In PublicConfig.ts
import type { Extension } from "../utilities/tiptapReexports"; // ✓
// import type { Extension } from "@tiptap/core";                // ✗ resolves past our alias
```

### Other rules

- **No unexported symbols in the public surface.** If a type from an upstream package is referenced (even indirectly) by a public ai-chat type — as a property type, generic arg, or union member — it must have a local alias here that gets re-exported from [../aiChatEntry.tsx](../aiChatEntry.tsx). `validation.notExported: true` in [../../typedoc.json](../../typedoc.json) fails the build if you forget.
- **`@category` values come from `categoryOrder`** in [../../typedoc.json](../../typedoc.json). A category outside that list lands in the `*` catchall.

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

### Good — cross-package re-export (sibling)

```ts
import type { AutocompleteConfig as _AutocompleteConfig } from "@carbon/ai-chat-components/es/components/input/index.js";

/**
 * Live autocomplete config consumed by {@link InputConfig.autocomplete}.
 * Selection inserts plain text rather than a schema node; no chip is
 * rendered.
 *
 * @category Config
 */
export type AutocompleteConfig = _AutocompleteConfig;
```

Why it works: full consumer-facing JSDoc lives at the local declaration TypeDoc reads, the upstream `@carbon/ai-chat-components` source carries no `@category` of ours, and `{@link}` resolves to our local `InputConfig`.

### Good — cross-package re-export (third-party)

```ts
import type { Editor as _Editor } from "@tiptap/core";

/**
 * The Tiptap editor instance returned by {@link ChatInstanceInput.getEditor}.
 * Re-exported from `@tiptap/core` for ergonomic typing — see the
 * [Tiptap Editor docs](https://tiptap.dev/api/editor) for the full API.
 *
 * @category Utilities
 */
export type Editor = _Editor;
```

Why it works: the JSDoc tells the reader what `Editor` is in _our_ context and points back to tiptap's own docs as the canonical reference. No editorial claim over a type whose shape we can't change.

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

## Related Guidance

- **Parent guidance**: [packages/ai-chat/AGENTS.md](../../AGENTS.md)
- **Store patterns**: [../chat/store/AGENTS.md](../chat/store/AGENTS.md) - For action/state types
- **Documentation**: [../docs/AGENTS.md](../docs/AGENTS.md) - For public API docs
