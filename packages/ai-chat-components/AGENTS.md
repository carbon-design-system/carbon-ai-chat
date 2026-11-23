# AGENTS.md — `@carbon/ai-chat-components`

Guidance for authoring inside [packages/ai-chat-components/](.). Read this before adding or editing components.

A library of Lit-based custom elements plus hand-authored React wrappers. Consumed as a workspace dep by `@carbon/ai-chat` and published to npm (versioned via Lerna alongside `@carbon/ai-chat`). See root [AGENTS.md](../../AGENTS.md) for build outputs and the `aiChat:start` watcher rule.

## Topic-specific guidance

Load only what you need:

- Component file layout, the custom-elements manifest, React wrappers, naming, public API & deprecation → [component-authoring.md](references/component-authoring.md)
- Authoring or editing a Storybook story or Overview MDX → [storybook.md](references/storybook.md)
- Writing or running a test (Vitest: browser for Lit, happy-dom for React wrappers) → [tests.md](references/tests.md)
- Shipping any UI change (WCAG 2.1 AA) → [root accessibility.md](../../references/accessibility.md)

## Build, test, Storybook

From this package directory (test detail → [tests.md](references/tests.md); story detail → [storybook.md](references/storybook.md)):

```bash
npm run build                   # clean + tasks/build.js + tasks/build-dist.js + cem analyze
npm run custom-elements         # regenerate custom-elements.json only
npm start                       # watch build + both Storybooks in parallel
npm run storybook               # Lit storybook (6006)
npm run storybook:react         # React wrapper storybook (7007)
npm test                        # every Vitest project (see tests.md)
```

## Gotchas

- Follow [component-authoring.md](references/component-authoring.md#manifest-and-react-wrappers) when updating the manifest or React wrappers.
- **Carbon flavor**: use the [area rules and skill override](../../references/code-patterns.md#carbon-flavor-by-area) for Lit elements and React stories.
- **ESM `.js` extensions** apply here: relative imports use `.js` even for `.ts` source.
- The two Vitest projects and the dependency-inlining rule live in [tests.md](references/tests.md).

## Definition of done

For guidance-only edits, use the [guidance gate](../../references/definition-of-done.md#minimum-gate-by-area-edited). For component changes:

- `npm run build --workspace=@carbon/ai-chat-components`, then `npm run test --workspace=@carbon/ai-chat-components` (runs every Vitest project). Build first: the React wrapper tests read `es/`. Read [tests.md](references/tests.md#debugging-failures) when a test fails against correct source.
- For JSDoc, prop, slot, event, or CSS-part changes, follow the [manifest and wrapper workflow](references/component-authoring.md#manifest-and-react-wrappers).
