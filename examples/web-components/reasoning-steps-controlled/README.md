# Reasoning steps (controlled)

Mocks a controlled reasoning-step flow: the parent reasoning panel stays collapsed via `reasoning.open_state: CLOSE`, every individual step is pre-expanded, and a custom "Thinking..." indicator driven by `instance.updateIsMessageLoadingCounter` replaces the default reasoning UI.

## What this example shows

- Controlling `reasoning.open_state` to keep the parent reasoning panel closed while the model is thinking.
- Marking every step `ReasoningStepOpenState.OPEN` so they are pre-expanded if the user opens the panel.
- Driving a custom in-progress affordance (`"Thinking..."`, then per-step labels) through `instance.updateIsMessageLoadingCounter`.
- Cancel handling via `CustomSendMessageOptions.signal`.

## When to use this pattern

- Your product wants a single global "Thinking..." indicator instead of the auto-opening reasoning UI.
- You want the user to opt in to seeing reasoning steps rather than seeing them stream by default.

## APIs and props demonstrated

| Symbol                                     | Kind           | Role in this example                                       |
| ------------------------------------------ | -------------- | ---------------------------------------------------------- |
| `<cds-aichat-custom-element>`              | custom element | Mounts the chat UI.                                        |
| `messaging.customSendMessage`              | property       | Runs the controlled reasoning scenario.                    |
| `onBeforeRender`                           | property       | Captures the `ChatInstance`.                               |
| `ReasoningStep` / `ReasoningStepOpenState` | types          | Reasoning payloads + controlled open-state values.         |
| `MessageResponseOptions`                   | type           | `message_options` carrying `reasoning.{steps,open_state}`. |
| `instance.updateIsMessageLoadingCounter`   | API            | Custom loading label that replaces the default UI.         |
| `ChatInstance`                             | type           | Type of the instance handle.                               |
| `PublicConfig`                             | type           | Types the chat configuration object.                       |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-reasoning-steps-controlled
```

See [../README.md](../README.md) for the full setup walkthrough.
