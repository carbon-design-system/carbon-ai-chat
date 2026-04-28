# AGENTS.md — `@carbon/ai-chat-components`

Guidance for authoring inside [packages/ai-chat-components/](.). Read this before adding or editing components.

A library of Lit-based custom elements plus auto-generated React wrappers. Consumed as a workspace dep by `@carbon/ai-chat` and published to npm (versioned via Lerna alongside `@carbon/ai-chat`). See root [AGENTS.md](../../AGENTS.md) for build outputs and Storybook ports.

** Before running any build commands**: Ask the user if `npm run aiChat:start` is already running. Most developers keep it running continuously. Running a parallel build will cause race conditions and intermittent failures.

## Component directory shape

Every component under [src/components/](src/components/) follows this layout:

```
component-name/
  index.ts            # public entry: `import "./src/<part>"` for each element
  src/
    component-name.ts         # Lit element class
    component-name.scss       # co-located styles (imported via lit-scss)
    component-name-<part>.ts  # sub-elements (e.g. card-footer, card-steps)
  __stories__/
    component-name.mdx                # Lit docs
    component-name.stories.js         # Lit stories
    component-name-react.mdx          # React wrapper docs
    component-name-react.stories.jsx  # React stories (uses the wrapper from src/react/)
    preview-*.stories.*               # preview variants (experimental components not yet stable)
                                      # - Components here are under active development
                                      # - APIs may change without deprecation warnings
                                      # - Not recommended for production use
                                      # - Will graduate to main directory when stable
                                      # - Example: preview/cds-aichat-experimental-feature.ts
    story-data.js, story-styles.scss  # shared story fixtures
  __tests__/
    component-name.test.ts      # @web/test-runner, with __snapshots__/
```

React wrappers live under [src/react/](src/react/) — thin `createComponent` bindings produced from `custom-elements.json`. After modifying JSDoc / props / slots / events, run `npm run custom-elements`; the manifest and React wrappers regenerate together. Both are checked in (so consumers don't need to rebuild) but are generated artifacts — never hand-edit.

Shared pieces: [src/components/shared/](src/components/shared/); design tokens / utilities: [src/globals/](src/globals/); test helpers: [src/testing/](src/testing/); ambient types: [src/typings/](src/typings/).

## Authoring rules

- **Prefix via tokens, never literals**: class names go through the `$prefix` / `prefix` helpers in SCSS and TS so both the `es` and `es-custom` builds work. A literal `cds-` or `cds--` in source is a bug.
- **Tag naming**: Lit tags are `cds-<thing>` in the default build; don't hand-write the tag string in multiple places — read it from the shared prefix constant so the `es-custom` rewrite applies.
- **One element per file** under `src/`, re-exported from `index.ts`. Sub-parts (footer, step, etc.) get their own file and `import` line.
- **Styles**: co-locate `.scss` next to the `.ts`. Use Carbon tokens from `@carbon/styles`; don't hardcode colors, spacing, or type. Use logical properties for RTL.
- **Custom elements manifest**: after changing JSDoc, props, slots, events, or CSS parts, run `npm run custom-elements`. Storybook docs and the generated React wrappers read from it — stale manifests produce confusing Storybook output.
- **Stories**: every new element needs a Lit `.stories.js` + `.mdx`, and its React wrapper needs `-react.stories.jsx` + `-react.mdx`. Co-locate shared fixtures in `<component>/__stories__/story-data.js` (see `card/__stories__/story-data.js` for the pattern).
- **Props / events / slots**: use kebab-case attribute names on Lit elements (`has-footer`, not `hasFooter`); the CEM analyzer + React wrapper generator handle camelCase conversion. Custom events follow `cds-<thing>-<verb>` (e.g. `cds-card-expand`). Slots use plain names; reserve `default` for primary content.
- **Deprecating or deleting a component**: mark `@deprecated` in JSDoc first, ship a major version, then delete. Deleting an exported element without a deprecation window breaks external consumers.
- **Tests**: every element gets a `__tests__/<name>.test.ts` WTR test. React wrappers get Jest tests under [src/react/**tests**/](src/react/__tests__/). WTR snapshots live in `__snapshots__/` — regenerate with `test:updateSnapshot` and review diffs.
- **Public API**: anything exported from a component's `index.ts` is public. Props, slots, events, and CSS custom properties are the contract; mark internal helpers accordingly so the CEM analyzer doesn't publish them.
- **Types are public docs**: every exported type here ships through `@carbon/ai-chat`'s TypeDoc to the docs site, Elasticsearch index, and MCP server. Follow the full rules in [packages/ai-chat/src/types/AGENTS.md](../ai-chat/src/types/AGENTS.md). One package-specific rule: `@category` tags must use a value from `categoryOrder` in [packages/ai-chat/typedoc.json](../ai-chat/typedoc.json) — categories are owned by the ai-chat docs site, not this package.
- **React wrappers are generated-style code**: keep them minimal — no behavior beyond `createComponent`. Behavior belongs in the Lit element.
- **Telemetry**: regenerate with `npm run telemetry:config` after adding new components; don't hand-edit `telemetry.yml`.

## Build, test, Storybook

From this package directory:

```bash
npm run build                   # clean + tasks/build.js + tasks/build-dist.js + cem analyze
npm run custom-elements         # regenerate custom-elements.json only
npm start                       # watch build + both Storybooks in parallel
npm run storybook               # Lit storybook (6006)
npm run storybook:react         # React wrapper storybook (7007)

npm test                        # runs both suites
npm run test:web-components     # @web/test-runner (Lit)
npm run test:react              # jest (React wrappers)
npm run test:updateSnapshot     # refresh WTR snapshots

# Single web-component test
npm run test:web-components -- src/components/card/__tests__/card.test.ts

# Single react-wrapper test
npm run test:react -- src/react/__tests__/<file>.test.ts
```

## Gotchas

- **Two test runners**: Lit components use `@web/test-runner` (`npm run test:web-components`); React wrappers use Jest (`npm run test:react`). `npm test` runs both. Use the right runner for the right file.
- **New ESM-only dep?** Add its package name to `transformIgnorePatterns` in the Jest config. The existing list already covers lit, @carbon packages, lodash-es, @floating-ui, uuid, @formatjs, @codemirror, etc. — missing entries cause cryptic "Unexpected token 'export'" failures in React tests.
- **ESM `.js` extensions** apply here too: relative imports use `.js` even for `.ts` source.

## Related Guidance

- **Parent guidance**: [Root AGENTS.md](../../AGENTS.md)
- **Consumer package**: [../ai-chat/AGENTS.md](../ai-chat/AGENTS.md) - How React app uses these components
- **Code reviews**: [../../AGENTS_CODE_REVIEW.md](../../AGENTS_CODE_REVIEW.md)

## Definition of done

- `npm run test --workspace=@carbon/ai-chat-components` (runs both suites) + `npm run build --workspace=@carbon/ai-chat-components`.
- If you changed JSDoc, props, slots, events, or CSS parts: rerun `npm run custom-elements`, inspect the `custom-elements.json` diff, restart Storybook to verify the component docs, and check the regenerated React wrapper in `src/react/` for new prop types.
