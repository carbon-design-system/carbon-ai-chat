# Jest (happy-dom)

Jest + `@happy-dom/jest-environment` setup that exercises `ChatContainer` end-to-end, including shadow-DOM queries via `PageObjectId` selectors.

## What this example shows

- Running `@carbon/ai-chat` React components under Jest with `@happy-dom/jest-environment`.
- Querying inside web-component shadow DOM (which happy-dom supports) using `PageObjectId` selectors exposed by `@carbon/ai-chat`.
- Rendering `ChatContainer` with an inline `customSendMessage` that injects deterministic assistant replies via `instance.messaging.addMessage`.
- Using `@testing-library/react` + `@testing-library/jest-dom` helpers (`waitFor`, etc.) against the shadow DOM.

## When to use this pattern

- You need shadow-DOM-aware Jest tests (e.g., assertions on rendered chat bubbles, buttons, etc.).
- You want a reference for writing `PageObjectId`-driven integration tests for Carbon AI Chat.

## APIs and props demonstrated

| Symbol                          | Package / kind              | Role in this example                                                |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `ChatContainer`                 | `@carbon/ai-chat` component | Mounted under test.                                                 |
| `PageObjectId`                  | `@carbon/ai-chat`           | Stable selector IDs used to query shadow-DOM elements.              |
| `MessageResponseTypes`          | `@carbon/ai-chat` enum      | `TEXT` used when injecting deterministic replies.                   |
| `messaging.customSendMessage`   | config prop                 | Inline mock that injects `instance.messaging.addMessage` responses. |
| `instance.messaging.addMessage` | instance method             | Used inside the inline mock to stage assistant output.              |
| `@testing-library/react`        | test util                   | `waitFor` + a `renderChatContainer` helper.                         |
| `@testing-library/jest-dom`     | test util                   | DOM matchers.                                                       |
| `@happy-dom/jest-environment`   | jest env                    | Shadow-DOM-capable DOM environment.                                 |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run test --workspace=@carbon/ai-chat-examples-react-jest-happydom
```

(Use `npm run test:watch --workspace=@carbon/ai-chat-examples-react-jest-happydom` for watch mode.)

See [../README.md](../README.md) for the full setup walkthrough.
