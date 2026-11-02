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

The build writes `custom-elements.json` from source. When the API changes, edit the source types, JSDoc, and hand-authored [React wrapper](../src/react/).

### What the tools do

`npm run build --workspace=@carbon/ai-chat-components` builds the package, then writes the CEM. The clean step removes stale JSON first. `npm run custom-elements --workspace=@carbon/ai-chat-components` writes only the CEM.

The source build watcher does not rerun the CEM analyzer. After metadata edits, run `npm run custom-elements --workspace=@carbon/ai-chat-components`, then restart both Storybooks.

The tool reads tags from decorators and props from Lit. It hides internal members, maps local paths to shipped files, and resolves imported exports. It drops types erased by the build and keeps runtime enums. For source globs and files to skip, check [the analyzer config](../custom-elements-manifest.config.js).

The root `test:manifest-consumer` packs the built package. It checks that the discovery field and JSON export find the same file. It checks shipped local paths, exports, and type references. It imports each listed tagged class alone in a fresh browser context. It checks some toolbar and truncated-text props against the built classes.

Root `npm test`, `npm run ci-check`, and the GitHub components test job run this packed check. Run `npm run test:manifest-consumer` from the root after a fresh build for manifest changes.

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

- **One element per file**, named for the `aichat-*` tag suffix and exported from the family's `index.ts`.
- **Tag naming**: compose `${prefix}-aichat-<thing>` with the shared prefix value `cds`. Keep the `aichat` segment in chat-specific classes and custom properties too. Prefix discipline is build-breaking; see [code-patterns.md](../../../references/code-patterns.md#naming--prefix-discipline-build-breaking).
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
