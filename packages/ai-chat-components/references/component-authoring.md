# component-authoring.md — `@carbon/ai-chat-components` component structure

Load this when adding, renaming, or restructuring a component — its files, its public API, or its React wrapper. For stories/docs see [storybook.md](storybook.md); for tests see [testing.md](testing.md).

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

## Manifest and React wrappers

The build writes `custom-elements.json` from source. When the API changes, edit the source types, JSDoc, and hand-authored [React wrapper](../src/react/).

### What the tools do

`npm run build --workspace=@carbon/ai-chat-components` builds the package, then writes the CEM. The clean step removes stale JSON first. `npm run custom-elements --workspace=@carbon/ai-chat-components` writes only the CEM.

The source build watcher does not rerun the CEM analyzer. After metadata edits, run `npm run custom-elements --workspace=@carbon/ai-chat-components`, then restart both Storybooks.

The tool reads tags from decorators and props from Lit. It hides internal members, maps local paths to shipped files, and resolves imported exports. It drops types erased by the build and keeps runtime enums. For source globs and files to skip, check [the analyzer config](../custom-elements-manifest.config.js).

The root `test:manifest-consumer` packs the built package. It checks that the discovery field and JSON export find the same file. It checks shipped local paths, exports, and type references. It imports each listed tagged class alone in a fresh browser context for both `es` and `es-custom`. It checks some toolbar and truncated-text props against the built classes.

Root `npm test` and `npm run ci-check` run this packed check. The current GitHub split test matrix does not. Run `npm run test:manifest-consumer` from the root for manifest changes.

The check does not cover all props, events, slots, or style hooks. Broader guards belong to [#2287](https://github.com/carbon-design-system/carbon-ai-chat/issues/2287). Checks of external type symbols and styles remain with [#2551](https://github.com/carbon-design-system/carbon-ai-chat/issues/2551).

### What to do when the API changes

1. Keep each new public element in the source globs, with a module the build ships. Use supported decorator syntax. If new syntax is unsupported, extend the parser and its pure tests before relying on the CEM entry.
2. Check each `@property` option against the public contract. Use `attribute: false` for property-only values. Without an explicit attribute name, Lit lowercases the property name. Keep existing attribute names; choose explicit names for new kebab-case attributes. Mark private or internal members in source so they stay out of public tables.
3. Update the source types and JSDoc for changed props, events, slots, and CSS parts. Update the matching wrapper in `src/react/` by hand; the CEM tool does not edit wrappers.
4. Rebuild the CEM and inspect only the changed component's entries. Restart both Storybooks and inspect the changed `<ArgTypes>` rows. Use the [Storybook guide](storybook.md) for launch commands.
5. Establish a fresh build with the [build preflight](../../../references/commands.md#build-preflight), then run these checks from the root:

   ```bash
   npm run test:manifest --workspace=@carbon/ai-chat-components
   npm run test:manifest-consumer
   ```

The JSON is generated and ignored: never hand-edit or commit it. The wrappers are checked in and hand-authored. After adding components, regenerate telemetry with `npm run telemetry:config --workspace=@carbon/ai-chat-components`; do not hand-edit `telemetry.yml`.

## Naming

- **One element per file** under `src/`, re-exported from `index.ts`; sub-parts get their own file and `import` line.
- **Tag naming**: Lit tags are `cds-aichat-<thing>` in the default build. Don't hand-write the tag string in multiple places — read it from the shared prefix constant so the `es-custom` rewrite applies. Prefix discipline is build-breaking; see [code-patterns.md](../../../references/code-patterns.md#naming--prefix-discipline-build-breaking).
- **Attributes** are kebab-case (`has-footer`, not `hasFooter`); React wrappers expose the element's camelCase properties.
- **Events** follow `cds-aichat-<thing>-<verb>` (e.g. `cds-aichat-card-expand`).
- **Slots** use plain names; reserve `default` for primary content.
- **Styles**: co-locate `.scss` next to the `.ts`; use Carbon tokens from `@carbon/styles` (no hardcoded colors/spacing/type). SCSS/RTL conventions live in [code-patterns.md](../../../references/code-patterns.md#scss-authoring).

## Public API & deprecation

- Anything exported from a component's `index.ts` is public. Props, slots, events, and CSS custom properties are the contract; mark internal helpers so the CEM analyzer doesn't publish them.
- **Types are public docs**: follow [types/AGENTS.md](../../ai-chat/src/types/AGENTS.md) for their published surfaces and JSDoc rules; `@category` must match `categoryOrder` in [typedoc.json](../../ai-chat/typedoc.json).
- **Deprecating or deleting**: mark `@deprecated` in JSDoc, ship a major version, then delete. Removing an exported element without a deprecation window breaks external consumers.
- **React wrappers stay minimal** — no behavior beyond `createComponent`; behavior belongs in the Lit element.

## Related guidance

- [../AGENTS.md](../AGENTS.md) — package authoring rules (parent router)
- [../../../references/accessibility.md](../../../references/accessibility.md) — WCAG 2.1 AA checklist for every element
