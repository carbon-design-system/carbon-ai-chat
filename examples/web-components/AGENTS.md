# AGENTS.md — examples/web-components

Deltas for web-component examples. See [../AGENTS.md](../AGENTS.md) for shared workflow (adding examples, smoke tests, Definition of done, Indexer contract).

## Canonical scaffolds

- **`<cds-aichat-container>` (built-in float layout)** — copy [`./basic/`](./basic/).
- **`<cds-aichat-custom-element>` (host the chat in your own DOM node)** — copy [`./custom-element/`](./custom-element/).

Workspace naming: `@carbon/ai-chat-examples-web-components-<slug>`.

## Smoke-test setup

Reuse Jest wiring from [`../react/jest-jsdom/`](../react/jest-jsdom/) — nearest reference for workspace-dep resolution. A sufficient spec instantiates the custom element, asserts it upgrades without error, and does one round-trip behavior (e.g. send one message via `customSendMessage`).

## APIs-and-props table headers

`Symbol | Kind | Role in this example` — entries are custom-element tags, attributes, properties, events, and slots. Example row: `\`<cds-aichat-container>\` | custom element | Mounts the chat UI.`
