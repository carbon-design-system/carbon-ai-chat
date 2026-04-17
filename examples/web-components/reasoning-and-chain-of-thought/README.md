# Reasoning and Chain of Thought

Demonstrates mocked reasoning-step and chain-of-thought flows (streamed, controlled, and default behaviors) through a `customSendMessage` implementation.

## What this example shows

- Mocking reasoning steps streamed from `customSendMessage` so the chat surfaces the reasoning UI.
- Exercising chain-of-thought message items alongside standard text replies.
- Capturing the `ChatInstance` via `onBeforeRender` for reference in the host element.
- A single `cds-aichat-container` wired to the mock scenarios in `scenarios.ts`.

## When to use this pattern

- Backends that emit reasoning steps or chain-of-thought traces and want to preview the UX locally.
- Validating how streamed/controlled reasoning flows render before integrating a live model.

## APIs and props demonstrated

| Symbol                        | Kind           | Role in this example                                   |
| ----------------------------- | -------------- | ------------------------------------------------------ |
| `<cds-aichat-container>`      | custom element | Mounts the chat UI.                                    |
| `messaging.customSendMessage` | property       | Emits mocked reasoning and chain-of-thought scenarios. |
| `onBeforeRender`              | property       | Captures the `ChatInstance`.                           |
| `ChatInstance`                | type           | Type of the instance handle.                           |
| `PublicConfig`                | type           | Types the chat configuration object.                   |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-reasoning-and-chain-of-thought
```

See [../README.md](../README.md) for the full setup walkthrough.
