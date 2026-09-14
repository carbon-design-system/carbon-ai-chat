# AGENTS.md — examples/web-components

Deltas for web-component examples. See [../AGENTS.md](../AGENTS.md) for shared workflow (adding examples, smoke tests, Definition of done, Indexer contract).

## Canonical scaffolds

- **`<cds-aichat-container>` (built-in float layout)** — copy [`./basic-float/`](./basic-float/).
- **`<cds-aichat-custom-element>` (host the chat in your own DOM node)** — copy [`./basic-custom-element-fullscreen/`](./basic-custom-element-fullscreen/). This is the canonical baseline for non-float examples.

Workspace naming: `@carbon/ai-chat-examples-web-components-<slug>`.

**Carbon flavor**: `@carbon/web-components`. No JSX and no `@carbon/react` — if a Carbon snippet arrives as React (the `carbon-builder` skill defaults to it), rewrite it as a custom element before saving. See [code-patterns.md](../../references/code-patterns.md#carbon-flavor-by-area).

## Smoke-test setup

Playwright is the smoke-test mechanism. Copy [`./basic-custom-element-fullscreen/`](./basic-custom-element-fullscreen/) — it is the web-component golden. Conventions and steps: [playwright.md](../references/playwright.md).

This tree has no Jest wiring and needs none. Jest and vitest integration are the subject of React examples, not a pattern to reproduce here.

## APIs-and-props table headers

`Symbol | Kind | Role in this example` — entries are custom-element tags, attributes, properties, events, and slots. Example row: `\`<cds-aichat-container>\` | custom element | Mounts the chat UI.`

## Related Guidance

- **Parent guidance**: [examples/AGENTS.md](../AGENTS.md) - Shared example rules
