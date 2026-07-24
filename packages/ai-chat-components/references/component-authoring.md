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
