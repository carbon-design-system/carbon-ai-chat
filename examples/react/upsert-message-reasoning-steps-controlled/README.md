# Upsert message / Reasoning steps (controlled)

Mocks a controlled reasoning-step flow delivered through `upsertMessage`: the parent reasoning panel stays collapsed via `reasoning.open_state: CLOSE`, every individual step is pre-expanded, and a custom "Thinking..." indicator driven by `instance.updateIsMessageLoadingCounter` replaces the default reasoning UI.

## What this example shows

- Controlling `reasoning.open_state` to keep the parent reasoning panel closed while the model is thinking.
- Marking every step `ReasoningStepOpenState.OPEN` so they are pre-expanded if the user opens the panel.
- Driving a custom in-progress affordance (`"Thinking..."`, then per-step labels) through `instance.updateIsMessageLoadingCounter`.
- Delivering each reasoning update as a full `MessageResponse` snapshot through `upsertMessage` (the snapshot replaces the stored message rather than appending; the streamed text is accumulated locally) and finalizing with a `MessageState.COMPLETE` upsert.
- Cancel handling via `CustomSendMessageOptions.signal`.

## When to use this pattern

- Your product wants a single global "Thinking..." indicator instead of the auto-opening reasoning UI.
- You want the user to opt in to seeing reasoning steps rather than seeing them stream by default.

## APIs and props demonstrated

| Symbol                                     | Package / kind              | Role in this example                                       |
| ------------------------------------------ | --------------------------- | ---------------------------------------------------------- |
| `ChatCustomElement`                        | `@carbon/ai-chat` component | Mounts the chat UI.                                        |
| `PublicConfig`                             | `@carbon/ai-chat` type      | Config shape.                                              |
| `customSendMessage`                        | `messaging` prop            | Runs the controlled reasoning scenario.                    |
| `ReasoningStep` / `ReasoningStepOpenState` | `@carbon/ai-chat` types     | Reasoning payloads + controlled open-state values.         |
| `MessageResponseOptions`                   | `@carbon/ai-chat` type      | `message_options` carrying `reasoning.{steps,open_state}`. |
| `MessageResponse`                          | `@carbon/ai-chat` type      | Full snapshot returned by each upsert updater.             |
| `MessageState`                             | `@carbon/ai-chat` enum      | `STREAMING` per update, `COMPLETE` on the final call.      |
| `instance.messaging.upsertMessage`         | `ChatInstance` API          | Inserts + updates the welcome and the reasoning in place.  |
| `instance.updateIsMessageLoadingCounter`   | `ChatInstance` API          | Custom loading label that replaces the default UI.         |
| `CustomSendMessageOptions.signal`          | `@carbon/ai-chat`           | Abort signal for cancellation.                             |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-upsert-message-reasoning-steps-controlled
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
