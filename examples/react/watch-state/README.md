# Watch / State

Shows how to read one public state field and keep a React component in sync with focused updates.

## What this example shows

- Calling `instance.state.get()` in `onBeforeRender` to seed local React state.
- Selecting `homeScreenState.isHomeScreenOpen` with `instance.state.select()`.
- Stopping the selection when the host unmounts or replaces the chat.
- Rendering the current view outside the chat UI.
- A `homescreen` config block with starter buttons to drive view transitions.

## When to use this pattern

- You need to mirror chat state into your own UI (badges, side panels, headers).
- You want to react to transitions between homescreen and chat view.

## APIs and props demonstrated

| Symbol | Package / kind | Role in this example |
| --- | --- | --- |
| `ChatContainer` | `@carbon/ai-chat` component | Mounts the chat UI as a float launcher. |
| `PublicConfig` | `@carbon/ai-chat` type | Config shape (includes `homescreen`). |
| `ChatInstance` | `@carbon/ai-chat` type | Provided in `onBeforeRender`. |
| `instance.state.get()` | `ChatInstance` method | Seeds the selected value. |
| `instance.state.select()` | `ChatInstance` method | Updates React when the selected value changes. |
| `homescreen.isOn` / `homescreen.greeting` / `homescreen.starters` | config | Starter buttons that trigger state transitions. |
| `customSendMessage` | `messaging` prop | Echoes a generic response back to the chat. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-watch-state
```

(Replace `start` with `dev` or `test` if this example's package.json defines those instead.)

See [../README.md](../README.md) for the full setup walkthrough.
