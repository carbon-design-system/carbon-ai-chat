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

**Cross-package note**: many of these types are _declared_ in [@carbon/ai-chat-components](../../../ai-chat-components/) and surfaced here through a **local re-declaration**, not a transparent re-export. TypeDoc reads the JSDoc at the declaration site it sees — and the declaration site we want it to see is the local alias in this package, not the upstream source. The bar below therefore applies at the local declaration site you control. See [Cross-package re-exports](#cross-package-re-exports).

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

Public types declared in [@carbon/ai-chat-components](../../../ai-chat-components/) are surfaced through a local re-declaration in this package, not a transparent re-export. JSDoc + `@category` live **here**, in `@carbon/ai-chat`, via that re-declaration. This way the upstream package doesn't need to carry our category vocabulary, and TypeDoc resolves to the JSDoc we own.

Third-party packages (`@tiptap/core`, etc.) are **never** re-declared or re-exported. Import them directly from the upstream package — both in this package's internal code and in consumer apps. See "External (third-party) types" in [Cross-linking](#cross-linking) for how to reference them in JSDoc.

### Anti-pattern (silently broken)

`export type { X } from 'pkg'` and `export { X } from 'pkg'` are **not** category-applying. TypeDoc resolves through to the upstream source and reads its JSDoc — any comment block above your `export type {` line is ignored. Symbols re-exported this way without a `@category` tag in their upstream declaration land in TypeDoc's `*` ("Other types") catchall.

### The pattern

Re-declare upstream symbols at a local site you own, then re-export from [../aiChatEntry.tsx](../aiChatEntry.tsx) / [../serverEntry.ts](../serverEntry.ts) using the local alias.

Write **full** consumer-facing JSDoc at the local re-declaration:

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
 * a Tiptap `Extension` list. ...
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

### Where local re-declarations live

Co-locate by topic — each re-declaration sits next to the public type that uses it:

- Carbon input extension factories + JSONContent / light-DOM helpers → [utilities/inputUtils.ts](utilities/inputUtils.ts).
- Carbon suggestion-config types (`SuggestionItem`, `TriggerSuggestionConfig`, ...) → [config/InputConfig.ts](config/InputConfig.ts), alongside `InputConfig`.
- Service-desk-related symbols → [config/ServiceDeskConfig.ts](config/ServiceDeskConfig.ts) (e.g. `FileUpload`, `FileStatusValue`).
- Header / toolbar symbols → [config/HeaderConfig.ts](config/HeaderConfig.ts) (e.g. `ToolbarAction`).

### Internal imports use the local alias too

When a property type inside this package references a **Carbon cross-package symbol**, import the **local re-declaration**, not the upstream source. This keeps TypeDoc's symbol resolution pointed at our JSDoc + `@category`:

```ts
// In a consumer of InputConfig.ts (e.g. useInputConfig.ts)
import type { TriggerSuggestionConfig } from "../../types/config/InputConfig"; // ✓
// import { TriggerSuggestionConfig } from "@carbon/ai-chat-components/...";    // ✗ resolves past our alias
```

### Other rules

- **Unexported Carbon symbols in the public surface produce a TypeDoc warning.** If a Carbon type is referenced (even indirectly) by a public ai-chat type — as a property type, generic arg, or union member — but isn't re-exported from [../aiChatEntry.tsx](../aiChatEntry.tsx), `validation.notExported: true` in [../../typedoc.json](../../typedoc.json) warns. (Third-party types like `@tiptap/core`'s show as external references and are fine to import directly; see [Cross-linking](#cross-linking) for how to reference them in JSDoc.)
- **`@category` values come from `categoryOrder`** in [../../typedoc.json](../../typedoc.json). A category outside that list lands in the `*` catchall.

## Property-level JSDoc

Every public property and enum member needs its own JSDoc — `?` in the signature is not an explanation.

## `@example` on public methods

Every public **instance method** ships at least one titled `@example`. Scope: [`ChatInstance`](instance/ChatInstance.ts) (and the `ChatActions` it extends), [`ChatInstanceInput`](instance/ChatInstanceInput.ts), [`EventHandlers`](instance/EventHandlers.ts) (`on` / `off` / `once`), and [`ChatInstanceServiceDeskActions`](instance/ChatInstanceServiceDeskActions.ts).

This is a **review gate**, not a build gate — TypeDoc validates `invalidLink` / `notExported`, not a missing `@example`, so a method with no example still compiles. Catch it in review and against the Definition of done below.

Write the block to the shared criteria in [code-examples.md](../../references/code-examples.md): self-contained, minimal, realistically-typed values, one titled `@example` per distinct case, show what comes back, model the production-safe pattern. `{@link}` targets inside an example _are_ build-validated, so they must resolve.

## Worked examples

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

### Good — linking back to the consumer

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

Why it works: the first sentence tells the reader where this type is reached from in the public API, so anyone landing on `AutocompleteConfig` in TypeDoc or the MCP index can jump straight to `InputConfig.autocomplete` to see it in context.

## Definition of done

When you change anything under [.](.) (or a type in `@carbon/ai-chat-components` that crosses into this package's public surface):

1. `npm run build --workspace=@carbon/ai-chat` — rollup + TypeDoc. The build fails on `validation.invalidLink` errors.
2. If you added a new public export, confirm it appears in both [../aiChatEntry.tsx](../aiChatEntry.tsx) and [../serverEntry.ts](../serverEntry.ts).
3. If you added or changed a public instance method, confirm it carries at least one titled `@example` that meets [code-examples.md](../../references/code-examples.md) (review gate — not build-enforced).
4. Semver: any change to a public type is a `feat` (additive) or a `fix!` / `BREAKING CHANGE` (non-additive). See [../../AGENTS.md](../../AGENTS.md) → _Authoring rules_ → _Public API changes_.

## Related Guidance

- **Parent guidance**: [packages/ai-chat/AGENTS.md](../../AGENTS.md)
- **Voice and tone**: [tone.md](../../../../references/tone.md) - Voice and word economy for all public copy
- **Store patterns**: [../chat/store/AGENTS.md](../chat/store/AGENTS.md) - For action/state types
- **Documentation**: [../../docs/AGENTS.md](../../docs/AGENTS.md) - For public API docs
