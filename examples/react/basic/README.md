# Basic

Minimal React integration of `@carbon/ai-chat` that wires a mock backend, listens to bus events, and renders a user-defined response.

## What this example shows

- Mounting `ChatContainer` with a `PublicConfig` object defined outside the component to avoid re-mount churn.
- Implementing a mock backend via `customSendMessage` that sends and receives messages.
- Capturing the `ChatInstance` in `onBeforeRender` and subscribing to `STATE_CHANGE` and `FEEDBACK` bus events.
- Rendering custom response content with `renderUserDefinedResponse`, re-computed off `activeResponseId`.
- Surfacing feedback submissions to the page via a `FeedbackInteractionType.SUBMITTED` handler.

## When to use this pattern

- You want the simplest possible starting point for a React + Carbon AI Chat app.
- You need a reference for hooking into the chat instance's event bus and state.
- You're exploring how `renderUserDefinedResponse` and `customSendMessage` fit together.

## APIs and props demonstrated

| Symbol                        | Package / kind              | Role in this example                                             |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `ChatContainer`               | `@carbon/ai-chat` component | Mounts the chat UI.                                              |
| `PublicConfig`                | `@carbon/ai-chat` type      | Types the config object passed to `ChatContainer`.               |
| `ChatInstance`                | `@carbon/ai-chat` type      | Typed reference captured in `onBeforeRender`.                    |
| `BusEventType`                | `@carbon/ai-chat` enum      | Subscribes to `STATE_CHANGE` and `FEEDBACK`.                     |
| `FeedbackInteractionType`     | `@carbon/ai-chat` enum      | Detects `SUBMITTED` feedback interactions.                       |
| `messaging.customSendMessage` | config prop                 | Mock backend that echoes user input.                             |
| `onBeforeRender`              | component prop              | Captures the `ChatInstance` and attaches event listeners.        |
| `renderUserDefinedResponse`   | component prop              | Renders custom response content for user-defined response types. |
| `instance.getState`           | instance method             | Reads the initial `activeResponseId`.                            |
| `instance.on`                 | instance method             | Attaches bus event handlers.                                     |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-basic
```

See [../README.md](../README.md) for the full setup walkthrough.
