# Basic

Minimal Lit example that mounts `<cds-aichat-container>` with a mock `customSendMessage` backend and demonstrates text, streaming text, user-defined responses, and feedback handling.

## What this example shows

- Mounting the chat UI via `<cds-aichat-container>` with a `PublicConfig`.
- A mock `customSendMessage` that handles `text`, `stream text`, and `user_defined` prompts.
- Rendering a `user_defined` response through the `renderUserDefinedResponse` callback and keeping it in sync with `activeResponseId` via `STATE_CHANGE` events.
- Observing the `FEEDBACK` bus event and surfacing the submitted report.
- Injecting a Carbon theme via `injectCarbonTheme`.

## When to use this pattern

- You want a full-width, inline chat container driven by your own transport function.
- You need a starting point to experiment with user-defined responses, streaming, or feedback hooks.

## APIs and props demonstrated

| Symbol                               | Kind           | Role in this example                                              |
| ------------------------------------ | -------------- | ----------------------------------------------------------------- |
| `<cds-aichat-container>`             | custom element | Mounts the chat UI.                                               |
| `messaging.customSendMessage`        | property       | Mock backend that handles demo prompts.                           |
| `onBeforeRender`                     | property       | Captures the `ChatInstance` and subscribes to bus events.         |
| `renderUserDefinedResponse`          | property       | Callback returning an `HTMLElement` for `user_defined` responses. |
| `BusEventType.STATE_CHANGE`          | event          | Tracks `activeResponseId` changes.                                |
| `BusEventType.FEEDBACK`              | event          | Surfaces submitted feedback via `window.alert`.                   |
| `instance.messaging.addMessage`      | method         | Emits non-streaming responses.                                    |
| `instance.messaging.addMessageChunk` | method         | Streams partial/complete/final chunks for `stream text`.          |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-basic
```

See [../README.md](../README.md) for the full setup walkthrough.
