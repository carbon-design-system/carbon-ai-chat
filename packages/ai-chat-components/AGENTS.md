# AGENTS.md — `@carbon/ai-chat-components`

Guidance for authoring inside [packages/ai-chat-components/](.). Read this before adding or editing components.

A library of Lit-based custom elements plus auto-generated React wrappers. Consumed as a workspace dep by `@carbon/ai-chat` and published to npm (versioned via Lerna alongside `@carbon/ai-chat`). See root [AGENTS.md](../../AGENTS.md) for build outputs, Storybook ports, and the `aiChat:start` watcher rule.

## Topic-specific guidance

Load only what you need:

- Component file layout, the custom-elements manifest, React-wrapper generation, naming, public API & deprecation → [component-authoring.md](references/component-authoring.md)
- Authoring or editing a Storybook story or Overview MDX → [storybook.md](references/storybook.md)
- Writing or running a test (WTR for Lit, Jest for React wrappers) → [testing.md](references/testing.md)
- Shipping any UI change (WCAG 2.1 AA) → [root accessibility.md](../../references/accessibility.md), plus the package points below

## Accessibility

Every Lit element shipped here must hold WCAG 2.1 AA — see [root accessibility.md](../../references/accessibility.md) for the full checklist, politeness rules, and pitfalls (don't combine `role="status"` with `aria-live="polite"`; default `aria-atomic` off).

Package-specific points:

- **Shadow DOM hides implicit semantics** from some assistive tech. Declare `role` and labels on the host element explicitly rather than relying on the browser to infer from internals.
- **Announcements** go through [`AriaAnnouncerManager`](src/globals/utils/aria-announcer-manager.ts) (also consumed by `@carbon/ai-chat`'s React announcer). Render visually-hidden regions in `render()`, call `connect(regions)` in `firstUpdated`, `announce(text)` to speak, and `disconnect()` in `disconnectedCallback`. Don't roll your own `aria-live` regions.
- **Icon-only buttons need `aria-label`**; decorative slotted content needs `aria-hidden="true"`.

When the component announces or has dynamic state changes, verify with NVDA + VoiceOver before marking done.

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

- **`custom-elements.json` is generated, never committed** — it's gitignored and rebuilt by `npm run custom-elements` (and every `npm run build`). Don't expect it in git, and don't flag it as missing from a diff; regenerate it locally so Storybook `<ArgTypes>` and the React wrappers reflect prop/slot/event changes.
- **ESM `.js` extensions** apply here: relative imports use `.js` even for `.ts` source.
- The two test runners and the ESM-dep `transformIgnorePatterns` rule live in [testing.md](references/testing.md).

## Related guidance

- **Parent guidance**: [Root AGENTS.md](../../AGENTS.md)
- **Component structure**: [component-authoring.md](references/component-authoring.md) — layout, manifest, wrappers, public API
- **Stories & docs**: [storybook.md](references/storybook.md) — templates, story-vs-control ruleset
- **Tests**: [testing.md](references/testing.md) — WTR (Lit) + Jest (React)
- **Voice and tone**: [tone.md](../../references/tone.md) — for Storybook MDX and JSDoc
- **Consumer package**: [../ai-chat/AGENTS.md](../ai-chat/AGENTS.md) — how the React app uses these components
- **Code reviews**: [../../references/code-review.md](../../references/code-review.md)

## Definition of done

- `npm run test --workspace=@carbon/ai-chat-components` (runs both suites) + `npm run build --workspace=@carbon/ai-chat-components`.
- If you changed JSDoc, props, slots, events, or CSS parts: rerun `npm run custom-elements`, inspect the regenerated `custom-elements.json` (it's gitignored — a local rebuild, not a committed diff), restart Storybook to verify the component docs, and hand-edit the matching wrapper in `src/react/` for new prop types.
