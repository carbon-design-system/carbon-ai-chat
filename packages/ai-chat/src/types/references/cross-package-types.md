# cross-package-types.md — surfacing `@carbon/ai-chat-components` types

Load this when you re-declare a type from [@carbon/ai-chat-components](../../../../ai-chat-components/), or when the docs build fails naming a cross-package symbol.

Public types declared in [@carbon/ai-chat-components](../../../../ai-chat-components/) are surfaced through a local re-declaration in this package, not a transparent re-export. JSDoc + `@category` live **here**, in `@carbon/ai-chat`, via that re-declaration. This way the upstream package doesn't need to carry our category vocabulary, and TypeDoc resolves to the JSDoc we own.

Third-party packages (`@tiptap/core`, etc.) are **never** re-declared or re-exported. Import them directly from the upstream package — both in this package's internal code and in consumer apps. See "External (third-party) types" in [Cross-linking](../AGENTS.md#cross-linking) for how to reference them in JSDoc.

### Anti-pattern (silently broken)

`export type { X } from 'pkg'` and `export { X } from 'pkg'` are **not** category-applying. TypeDoc resolves through to the upstream source and reads its JSDoc — any comment block above your `export type {` line is ignored. Symbols re-exported this way without a `@category` tag in their upstream declaration land in TypeDoc's `*` ("Other types") catchall.

### The pattern

Re-declare upstream symbols at a local site you own, then re-export from [../aiChatEntry.tsx](../../aiChatEntry.tsx) / [../serverEntry.ts](../../serverEntry.ts) using the local alias.

Write **full** consumer-facing JSDoc at the local re-declaration:

```ts
import type { AutocompleteConfig as _AutocompleteConfig } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';

/**
 * Live autocomplete config consumed by {@link InputConfig.autocomplete}.
 * Selection inserts plain text rather than a schema node; no chip is
 * rendered.
 *
 * @category Config
 * @interface
 */
export type AutocompleteConfig = _AutocompleteConfig;
```

#### Object-shaped targets need `@interface`

Without it, the alias renders as a Type Alias page with **no properties**. TypeDoc documents the alias, not what it resolves to — so `trigger`, `items`, `onSelect` and the rest are absent from the docs site, the search index, and the MCP server, while the build still exits 0.

`@interface` makes TypeDoc ask the type checker for the resolved member list, so `Omit<>` / `Pick<>` and inherited members all render flat, each carrying the upstream property's own JSDoc. Your prose and `@category` still win — they are read from the alias, not the target.

Branch on the shape of the upstream target:

| Upstream target | Local re-declaration |
| --- | --- |
| `interface` or object type | `export type X = _X;` **with `@interface`** |
| union, function type, tuple | `export type X = _X;` — **no `@interface`** |
| enum | `export const X = _X;` + `export type X = _X;` — **no `@interface`** |

`@interface` on a union emits a `converting_union_as_interface` warning and keeps only the members common to every branch, so reach for it only when the target is object-shaped.

The tag moves the generated page from `types/` to `interfaces/`. That is a one-time URL change per symbol; `{@link}` references update themselves.

**Convert interlinked types together.** Property-level JSDoc is not parsed at all until properties exist, so a `{@link OtherType.someProp}` in an upstream comment only resolves once `OtherType` is also converted. Adding `@interface` to one half of a linked pair can turn a green build red under `validation.invalidLink`.

For runtime values, use `export const`:

```ts
import { buildCarbonExtensions as _buildCarbonExtensions } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';

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

### Signature links come from a plugin

The local alias is transparent to the type checker. `export type X = _X` creates no `aliasSymbol`. TypeDoc resolves the reference to the upstream declaration and keeps your name only as display text. Left alone, a property typed `X` renders as plain text — right beside the page built for `X`.

[crossPackageLinksPlugin.js](../../../docs/typedoc/crossPackageLinksPlugin.js) re-points those references at the local page. Follow the pattern above and there is nothing extra to tag.

The plugin is also the gate. A `@carbon/ai-chat-components` type that reaches the public surface with no local re-declaration fails the docs build. The error names the symbol and the reflection that reaches it. There is no allowlist — write the re-declaration. That error also suppresses all output, so a red build leaves no site at all.

The match is by name, so the plugin checks two more things. Your name must be one it can see re-declared in `src/types/`; a local type that merely shares a name with an upstream one is not a page for it. And one name must not arrive from two upstream files at once, because only one of them owns the page.

**Expect a cascade.** `@interface` asks the checker for the member list. A new re-declaration therefore reaches its property types for the first time, and those can surface as fresh errors. Re-declare them too. Repeat until the build is green.

### Where local re-declarations live

Co-locate by topic — each re-declaration sits next to the public type that uses it:

- Carbon input extension factories + JSONContent / light-DOM helpers → [utilities/inputUtils.ts](../utilities/inputUtils.ts).
- Carbon suggestion-config types (`SuggestionItem`, `TriggerSuggestionConfig`, ...) → [config/InputConfig.ts](../config/InputConfig.ts), alongside `InputConfig`.
- Service-desk-related symbols → [config/ServiceDeskConfig.ts](../config/ServiceDeskConfig.ts) (e.g. `FileUpload`, `FileStatusValue`).
- Header / toolbar symbols → [config/HeaderConfig.ts](../config/HeaderConfig.ts) (e.g. `ToolbarAction`).

### Internal imports use the local alias too

When a property type inside this package references a **Carbon cross-package symbol**, import the **local re-declaration**, not the upstream source. This keeps TypeDoc's symbol resolution pointed at our JSDoc + `@category`:

```ts
// In a consumer of InputConfig.ts (e.g. useInputConfig.ts)
import type { TriggerSuggestionConfig } from '../../types/config/InputConfig'; // ✓
// import { TriggerSuggestionConfig } from "@carbon/ai-chat-components/...";    // ✗ resolves past our alias
```

### Other rules

- **`validation.notExported` does not cover cross-package symbols.** It returns early on any reference whose package differs from the project's own, so it catches only symbols declared in this package. [Signature links come from a plugin](#signature-links-come-from-a-plugin) gates the rest. (Third-party types like `@tiptap/core`'s stay external and are fine to import directly; see [Cross-linking](../AGENTS.md#cross-linking) for how to reference them in JSDoc.)
- **`@category` values come from `categoryOrder`** in [../../typedoc.json](../../../typedoc.json). A category outside that list lands in the `*` catchall.
- **A missing `@interface` is build-green but caught by a test.** [tests/typedoc/spec/alias_members_spec.ts](../../../tests/typedoc/spec/alias_members_spec.ts) parses this directory and fails on any `export type X = _X` alias missing the tag, with an allowlist for the targets that are genuinely not object-shaped. Add your exemption there, with a reason, or add the tag.

## Related guidance

- [src/types/AGENTS.md](../AGENTS.md) — the JSDoc bar these re-declarations have to clear
- [tone.md](../../../../../references/tone.md) — voice and word economy for the copy you write
- [jsdoc-examples.md](jsdoc-examples.md) — worked good/bad examples
