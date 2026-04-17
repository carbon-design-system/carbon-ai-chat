# Vite

Vite-powered React example that mirrors the `basic` mocked messaging flow and adds a Vitest + happy-dom test suite.

## What this example shows

- Mounting `ChatContainer` from a Vite dev server with React 19.
- Mocked streaming, plain text, and `user_defined` response branches in `customSendMessage`, including stream-stop handling.
- Subscribing to `BusEventType.FEEDBACK` in `onBeforeRender` and alerting the submitted payload.
- Rendering user-defined responses through `renderUserDefinedResponse`.
- Running the same app under Vitest with a happy-dom environment (`vitest.setup.ts`, `src/__tests__`).

## When to use this pattern

- You want a Vite-native React scaffold instead of webpack.
- You want an example that also exercises Vitest for your component tests.

## APIs and props demonstrated

| Symbol                                                        | Package / kind              | Role in this example                                   |
| ------------------------------------------------------------- | --------------------------- | ------------------------------------------------------ |
| `ChatContainer`                                               | `@carbon/ai-chat` component | Mounts the chat UI.                                    |
| `PublicConfig`                                                | `@carbon/ai-chat` type      | Config shape.                                          |
| `ChatInstance`                                                | `@carbon/ai-chat` type      | Received in `onBeforeRender`.                          |
| `BusEventType.FEEDBACK` / `FeedbackInteractionType.SUBMITTED` | `@carbon/ai-chat`           | Feedback subscription + branch.                        |
| `customSendMessage`                                           | `messaging` prop            | Mock streaming backend.                                |
| `MessageResponseTypes`, `StreamChunk`                         | `@carbon/ai-chat`           | Response + stream chunk shapes.                        |
| `renderUserDefinedResponse`                                   | prop                        | Renders `my_unique_identifier` user-defined responses. |
| `onBeforeRender`                                              | prop                        | Subscribes to feedback events.                         |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run dev --workspace=@carbon/ai-chat-examples-react-vite
```

(Use `npm run test --workspace=@carbon/ai-chat-examples-react-vite` for the Vitest suite, or `test:watch` for watch mode. `build` and `preview` are also available.)

See [../README.md](../README.md) for the full setup walkthrough.
