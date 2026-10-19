# AGENTS.md — `@carbon/ai-chat-components`

Guidance for authoring inside [packages/ai-chat-components/](.). Read this before adding or editing components.

A library of Lit-based custom elements plus hand-authored React wrappers. Consumed as a workspace dep by `@carbon/ai-chat` and published to npm (versioned via Lerna alongside `@carbon/ai-chat`). See root [AGENTS.md](../../AGENTS.md) for build outputs and the `aiChat:start` watcher rule.

## Topic-specific guidance

Load only what you need:

- Component file layout, the custom-elements manifest, React wrappers, naming, public API & deprecation → [component-authoring.md](references/component-authoring.md)
- Authoring or editing a Storybook story or Overview MDX → [storybook.md](references/storybook.md)
- Writing or running a test (WTR for Lit, Jest for React wrappers) → [testing.md](references/testing.md)
- Shipping any UI change (WCAG 2.1 AA) → [root accessibility.md](../../references/accessibility.md)

## Build, test, Storybook

From this package directory (test detail → [testing.md](references/testing.md); story detail → [storybook.md](references/storybook.md)):

```bash
npm run build                   # clean + tasks/build.js + tasks/build-dist.js + cem analyze
npm run custom-elements         # regenerate custom-elements.json only
npm start                       # watch build + both Storybooks in parallel
npm run storybook               # Lit storybook (6006)
npm run storybook:react         # React wrapper storybook (7007)
npm test                        # both test suites (see testing.md)
```

## Gotchas

- Follow [component-authoring.md](references/component-authoring.md#manifest-and-react-wrappers) when updating the manifest or React wrappers.
- **Carbon flavor**: use the [area rules and skill override](../../references/code-patterns.md#carbon-flavor-by-area) for Lit elements and React stories.
- **ESM `.js` extensions** apply here: relative imports use `.js` even for `.ts` source.
- The two test runners and the ESM-dep `transformIgnorePatterns` rule live in [testing.md](references/testing.md).

## Related guidance

- **Parent guidance**: [Root AGENTS.md](../../AGENTS.md)
- **Component structure**: [component-authoring.md](references/component-authoring.md) — layout, manifest, wrappers, public API
- **Stories & docs**: [storybook.md](references/storybook.md) — templates, story-vs-control ruleset
- **Tests**: [testing.md](references/testing.md) — WTR (Lit) + Jest (React)
- **Voice and tone**: [tone.md](../../references/tone.md) — voice for everything here
- **Copy rules**: [storybook-mdx.md](../../.bob/skills/caic-copy-writer/references/storybook-mdx.md) — MDX and Lit prop JSDoc (type 4); other source comments are [internal-comments.md](../../.bob/skills/caic-copy-writer/references/internal-comments.md) (type 2)
- **Consumer package**: [../ai-chat/AGENTS.md](../ai-chat/AGENTS.md) — how the React app uses these components
- **Shipping gate**: [definition-of-done.md](../../references/definition-of-done.md)

## Definition of done

For guidance-only edits, use the [guidance gate](../../references/definition-of-done.md#minimum-gate-by-area-edited). For component changes:

- `npm run build --workspace=@carbon/ai-chat-components`, then `npm run test --workspace=@carbon/ai-chat-components` (runs both suites). Build first; read [testing.md](references/testing.md#gotchas) when a WTR test fails against correct source.
- For JSDoc, prop, slot, event, or CSS-part changes, follow the [manifest and wrapper workflow](references/component-authoring.md#manifest-and-react-wrappers).
