# Jest (jsdom)

Baseline Jest + `jest-environment-jsdom` setup that verifies `ChatContainer` mounts its web-component wrapper. Kept intentionally simple because jsdom does not support shadow DOM.

## What this example shows

- Running `@carbon/ai-chat` React components under Jest with the default jsdom environment.
- Asserting the `cds-aichat-react` custom element mounts via `container.querySelector`.
- Rendering `ChatContainer` with an inline `customSendMessage` stub.
- Using `renderWriteableElements.headerBottomElement` with a `data-testid` to confirm React-rendered slot content.

## When to use this pattern

- You only need to assert that the chat mounts correctly (no shadow-DOM introspection).
- You prefer the default Jest DOM environment without extra dependencies.

## APIs and props demonstrated

| Symbol                                        | Package / kind              | Role in this example                                          |
| --------------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| `ChatContainer`                               | `@carbon/ai-chat` component | Mounted under test.                                           |
| `messaging.customSendMessage`                 | config prop                 | Inline no-op mock.                                            |
| `renderWriteableElements.headerBottomElement` | component prop              | React node inserted into the header bottom writeable element. |
| `data-testid`                                 | component prop              | Passed through to the root element for querying.              |
| `@testing-library/react`                      | test util                   | `render`, `act`, `waitFor`.                                   |
| `@testing-library/jest-dom`                   | test util                   | DOM matchers.                                                 |
| `jest-environment-jsdom`                      | jest env                    | Default Jest DOM environment (no shadow-DOM support).         |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run test --workspace=@carbon/ai-chat-examples-react-jest-jsdom
```

(Use `npm run test:watch --workspace=@carbon/ai-chat-examples-react-jest-jsdom` for watch mode.)

See [../README.md](../README.md) for the full setup walkthrough.
