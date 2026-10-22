# AGENTS.md — examples/web-components

Deltas for web-component examples. See [../AGENTS.md](../AGENTS.md) for shared workflow (adding examples, smoke tests, Definition of done, Indexer contract).

## Canonical scaffolds

- **`<cds-aichat-container>` (built-in float layout)** — copy [`./basic-float/`](./basic-float/).
- **`<cds-aichat-custom-element>` (host the chat in your own DOM node)** — copy [`./basic-custom-element-fullscreen/`](./basic-custom-element-fullscreen/). This is the canonical baseline for non-float examples.

Workspace naming: `@carbon/ai-chat-examples-web-components-<slug>`.

**Carbon flavor**: `@carbon/web-components`; follow [code-patterns.md](../../references/code-patterns.md#carbon-flavor-by-area).

## APIs-and-props table headers

`Symbol | Kind | Role in this example` — entries are custom-element tags, attributes, properties, events, and slots. Example row: `\`<cds-aichat-container>\` | custom element | Mounts the chat UI.`
