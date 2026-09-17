# AGENTS.md — examples/react

Deltas for React examples. See [../AGENTS.md](../AGENTS.md) for shared workflow (adding examples, smoke tests, Definition of done, Indexer contract).

## Canonical scaffolds

- **`ChatContainer` (built-in float layout)** — copy [`./basic-float/`](./basic-float/).
- **`ChatCustomElement` (host the chat in your own DOM node)** — copy [`./basic-custom-element-fullscreen/`](./basic-custom-element-fullscreen/). This is the canonical baseline for non-float examples.

Workspace naming: `@carbon/ai-chat-examples-react-<slug>`.

**Carbon flavor**: `@carbon/react`. These examples are host applications, so JSX and `@carbon/react` are correct here — the Web-Components-only rule covers the two primary packages, not this directory. `@carbon/web-components` appears in `package.json` because `@carbon/ai-chat` peer-depends on it, not as an authoring signal. See [code-patterns.md](../../references/code-patterns.md#carbon-flavor-by-area).

## Smoke-test setup

Playwright is the smoke-test mechanism. Copy [`./basic-custom-element-fullscreen/`](./basic-custom-element-fullscreen/) — it is the React golden. Conventions and steps: [playwright.md](../references/playwright.md).

The other runners here are what their example demonstrates, not a pattern to copy:

- [`./tests-jest-jsdom/`](./tests-jest-jsdom/) and [`./tests-jest-happydom/`](./tests-jest-happydom/) show Jest integration. Both keep `test` for Jest, and both are skipped for Playwright — they have no page to serve.
- [`./frameworks-vite/`](./frameworks-vite/) shows Vite integration and keeps `test` for its vitest suite.

## APIs-and-props table headers

`Symbol | Package / kind | Role in this example`. Example row: `\`ChatContainer\` | \`@carbon/ai-chat\` component | Mounts the chat UI.`

## Related Guidance

- **Parent guidance**: [examples/AGENTS.md](../AGENTS.md) - Shared example rules
