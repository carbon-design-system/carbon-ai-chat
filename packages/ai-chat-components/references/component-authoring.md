# component-authoring.md — `@carbon/ai-chat-components` component structure

Load this when adding, renaming, or restructuring a component — its files, its public API, or its React wrapper. For stories/docs see [storybook.md](storybook.md); for tests see [testing.md](testing.md).

## Directory shape

Every component under [../src/components/](../src/components/) follows this layout:

```
aichat-component-name/
  index.ts                       # registers and exports the family
  aichat-component-name.ts        # pure Lit element class
  aichat-component-name.scss      # co-located styles (imported via lit-scss)
  aichat-component-name-part.ts   # pure child element class
```

Shared pieces: [../src/components/shared/](../src/components/shared/); design tokens / utilities: [../src/globals/](../src/globals/); test helpers: [../src/testing/](../src/testing/); ambient types: [../src/typings/](../src/typings/).

### Registration belongs in the barrel

Give each class a `static get is()` that returns its tag. Class and support modules must not register local chat elements, including child elements. Carbon dependency imports may still register Carbon tags.

The family's `index.ts` imports its classes, registers each with `defineCustomElement` from `globals/register.js`, and exports the classes by name. Import any other local families' registering barrels needed by rendered children there. React wrappers import those named classes from the registering barrel; pure-class imports are for explicit registration and inheritance.

Standalone families use sibling `aichat-*` directories, including [aichat-autocomplete/](../src/components/aichat-autocomplete/). Keep shared types in plain support modules and use type-only imports where possible. The older component paths are compatibility reexports; existing stories and tests remain in their original folders. New families colocate `__stories__/` and `__tests__/` beside the class.

**Experimental components** use a `preview-*` prefix and a `Preview/` story title. Their APIs may change without a deprecation window and are not recommended for production; they graduate to the main directory (and `Components/` group) when stable.

## Manifest and React wrappers

React wrappers live under [../src/react/](../src/react/) — thin, hand-authored `createComponent` bindings kept in sync with `custom-elements.json`. After changing JSDoc, props, slots, events, or CSS parts:

- run `npm run custom-elements` — this regenerates only `custom-elements.json`; it does not touch `src/react/`;
- inspect only the changed component's entries in the regenerated `custom-elements.json`, then update its `src/react/<name>.ts` wrapper for new prop types;
- `custom-elements.json` is **generated, never committed** — it's gitignored and rebuilt on every `npm run build` (or `npm run custom-elements`), so don't hand-edit it or expect it in git. The `src/react/` wrappers are the opposite: checked in **and** hand-authored.

Storybook `<ArgTypes>` reads the manifest; React wrappers need matching hand edits. Regenerate telemetry too (`npm run telemetry:config`) after adding components; don't hand-edit `telemetry.yml`.

## Naming

- **One element per file**, named for the `aichat-*` tag suffix and exported from the family's `index.ts`.
- **Tag naming**: compose `${prefix}-aichat-<thing>` with the shared prefix value `cds`. Keep the `aichat` segment in chat-specific classes and custom properties too. Prefix discipline is build-breaking; see [root AGENTS.md Conventions](../../../AGENTS.md#conventions).
- **Attributes** are kebab-case (`has-footer`, not `hasFooter`); React wrappers expose the element's camelCase properties.
- **Events** follow `cds-aichat-<thing>-<verb>` (e.g. `cds-aichat-card-expand`).
- **Slots** use plain names; reserve `default` for primary content.
- **Styles**: co-locate `.scss` next to the `.ts`; use Carbon tokens from `@carbon/styles` (no hardcoded colors/spacing/type). SCSS/RTL conventions live in [root AGENTS.md Conventions](../../../AGENTS.md#conventions).

## Public API & deprecation

- Anything exported from a component's `index.ts` is public. Props, slots, events, and CSS custom properties are the contract; mark internal helpers so the CEM analyzer doesn't publish them.
- **Types are public docs**: every exported type ships through `@carbon/ai-chat`'s TypeDoc to the docs site, Elasticsearch index, and MCP server. Follow [../../ai-chat/src/types/AGENTS.md](../../ai-chat/src/types/AGENTS.md). Package rule: `@category` tags must use a value from `categoryOrder` in [../../ai-chat/typedoc.json](../../ai-chat/typedoc.json).
- **Deprecating or deleting**: mark `@deprecated` in JSDoc, ship a major version, then delete. Removing an exported element without a deprecation window breaks external consumers.
- **React wrappers stay minimal** — no behavior beyond `createComponent`; behavior belongs in the Lit element.

## Related guidance

- [../AGENTS.md](../AGENTS.md) — package authoring rules (parent router)
- [storybook.md](storybook.md) — stories & docs for each element
- [testing.md](testing.md) — WTR (Lit) + Jest (React) test setup
- [../../../references/accessibility.md](../../../references/accessibility.md) — WCAG 2.1 AA checklist for every element
