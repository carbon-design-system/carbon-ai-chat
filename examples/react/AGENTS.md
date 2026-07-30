# AGENTS.md — examples/react

Deltas for React examples. See [../AGENTS.md](../AGENTS.md) for shared workflow (adding examples, smoke tests, Definition of done, Indexer contract).

## Canonical scaffolds

- **`ChatContainer` (built-in float layout)** — copy [`./basic-float/`](./basic-float/).
- **`ChatCustomElement` (host the chat in your own DOM node)** — copy [`./basic-custom-element-fullscreen/`](./basic-custom-element-fullscreen/). This is the canonical baseline for non-float examples.

Workspace naming: `@carbon/ai-chat-examples-react-<slug>`.

**Carbon flavor**: `@carbon/react`. These examples are host applications, so JSX and `@carbon/react` are correct here — the Web-Components-only rule covers the two primary packages, not this directory. `@carbon/web-components` appears in `package.json` because `@carbon/ai-chat` peer-depends on it, not as an authoring signal. See [code-patterns.md](../../references/code-patterns.md#carbon-flavor-by-area).

## Smoke-test setup

Reference setups: [`./tests-jest-jsdom/`](./tests-jest-jsdom/) and [`./tests-jest-happydom/`](./tests-jest-happydom/) — `jest.config.js`, `babel.config.js`, plus a spec under `src/`. **Default to jsdom**; use happy-dom only when the example's APIs need it (layout measurement, certain form behaviors).

A sufficient spec mounts root, asserts no error, and exercises the main claimed API (e.g. one message via `customSendMessage`).

## APIs-and-props table headers

`Symbol | Package / kind | Role in this example`. Example row: `\`ChatContainer\` | \`@carbon/ai-chat\` component | Mounts the chat UI.`

## Related Guidance

- **Parent guidance**: [examples/AGENTS.md](../AGENTS.md) - Shared example rules
