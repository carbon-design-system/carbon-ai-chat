# component-authoring.md — `@carbon/ai-chat-components` component structure

Load this when adding, renaming, or restructuring a component — its files, its public API, or its generated React wrapper. For stories/docs see [storybook.md](storybook.md); for tests see [testing.md](testing.md).

## Directory shape

Every component under [../src/components/](../src/components/) follows this layout:

```
component-name/
  index.ts            # public entry: `import "./src/<part>"` for each element
  src/
    component-name.ts         # Lit element class
    component-name.scss       # co-located styles (imported via lit-scss)
    component-name-<part>.ts  # sub-elements (e.g. card-footer, card-steps)
  __stories__/                # see storybook.md
  __tests__/
    component-name.test.ts    # @web/test-runner, with __snapshots__/
```

Shared pieces: [../src/components/shared/](../src/components/shared/); design tokens / utilities: [../src/globals/](../src/globals/); test helpers: [../src/testing/](../src/testing/); ambient types: [../src/typings/](../src/typings/).

### Nested sub-component directories

When a component grows a logically independent child element that can be used standalone (e.g. [`prompt-line/autocomplete/`](../src/components/prompt-line/autocomplete/)), that child lives as a **sibling directory** next to `src/` and `__stories__/` rather than as another file under `src/`:

```
component-name/
  index.ts              # re-exports parent elements AND the sub-component's public API
  src/                  # parent element implementation (unchanged)
  __stories__/          # parent stories (unchanged)
  __tests__/            # parent tests (unchanged)
  sub-component/
    index.ts            # sub-component's own public entry
    src/
      sub-component.ts
      sub-component.scss
    __stories__/        # stories specific to the sub-component
    __tests__/
      sub-component.test.ts
```

Rules for this pattern:

- **Use it when** the child element has meaningful standalone use and its own story set. A helper element that only ever exists inside the parent belongs in `src/` instead.
- **Both `index.ts` files matter.** The parent's `index.ts` re-exports the sub-component so consumers have one import path; the sub-component's own `index.ts` exists so it can also be imported directly.
- **Types may flow upward.** If the sub-component's types are shared with the parent (e.g. `SuggestionItem` defined in `src/components/prompt-line/src/tiptap/types.ts` and re-used by `autocomplete/src/autocomplete.ts`), import from the parent rather than duplicating them.
- **Stories are scoped to the sub-component directory.** The sub-component's `__stories__/` produces its own Storybook group; the parent's `__stories__/` does not need to duplicate those stories.
- **Tests mirror the same split.** `__tests__/` directories exist at both levels; tests for the sub-component's element live under `sub-component/__tests__/`, not alongside the parent's tests.

**Experimental components** use a `preview-*` prefix and a `Preview/` story title. Their APIs may change without a deprecation window and are not recommended for production; they graduate to the main directory (and `Components/` group) when stable.

## Generated artifacts — never hand-edit

React wrappers live under [../src/react/](../src/react/) — thin, hand-authored `createComponent` bindings kept in sync with `custom-elements.json`. After changing JSDoc, props, slots, events, or CSS parts:

- run `npm run custom-elements` — this regenerates only `custom-elements.json`; it does not touch `src/react/`;
- inspect the regenerated `custom-elements.json`, then hand-edit the matching `src/react/<name>.ts` wrapper for new prop types;
- `custom-elements.json` is **generated, never committed** — it's gitignored and rebuilt on every `npm run build` (or `npm run custom-elements`), so don't hand-edit it or expect it in git. The `src/react/` wrappers are the opposite: checked in **and** hand-authored.

Storybook `<ArgTypes>` and the wrappers both read the manifest, so a stale manifest produces confusing docs and missing React props. Regenerate telemetry too (`npm run telemetry:config`) after adding components; don't hand-edit `telemetry.yml`.

## Naming

- **One element per file** under `src/`, re-exported from `index.ts`; sub-parts get their own file and `import` line.
- **Tag naming**: Lit tags are `cds-aichat-<thing>` in the default build. Don't hand-write the tag string in multiple places — read it from the shared prefix constant so the `es-custom` rewrite applies. Prefix discipline is build-breaking; see [root AGENTS.md Conventions](../../../AGENTS.md#conventions).
- **Attributes** are kebab-case (`has-footer`, not `hasFooter`); the CEM analyzer + wrapper generator handle camelCase conversion.
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
