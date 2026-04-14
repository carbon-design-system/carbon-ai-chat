# AGENTS.md — examples/react

Deltas for React examples. See [../AGENTS.md](../AGENTS.md) for shared workflow (adding examples, smoke tests, Definition of done, Indexer contract).

## Canonical scaffolds

- **`ChatContainer` (built-in float layout)** — copy [`./basic/`](./basic/).
- **`ChatCustomElement` (host the chat in your own DOM node)** — copy [`./custom-element/`](./custom-element/).

Workspace naming: `@carbon/ai-chat-examples-react-<slug>`.

## Smoke-test setup

Reference setups: [`./jest-jsdom/`](./jest-jsdom/) and [`./jest-happydom/`](./jest-happydom/) — `jest.config.js`, `babel.config.js`, plus a spec under `src/`. **Default to jsdom**; use happy-dom only when the example's APIs need it (layout measurement, certain form behaviors).

A sufficient spec mounts root, asserts no error, and exercises the main claimed API (e.g. one message via `customSendMessage`).

## APIs-and-props table headers

`Symbol | Package / kind | Role in this example`. Example row: `\`ChatContainer\` | \`@carbon/ai-chat\` component | Mounts the chat UI.`
