# Watch State

Subscribes to the chat's `STATE_CHANGE` bus event to mirror homescreen visibility and active-response id into the host UI, and keeps `user_defined` response elements updated when `activeResponseId` changes.

## What this example shows

- Capturing the `ChatInstance` via `onBeforeRender`, reading `instance.getState()`, and subscribing to `BusEventType.STATE_CHANGE`.
- Reflecting `homeScreenState.isHomeScreenOpen` and `activeResponseId` into Lit `@state` accessors displayed above the chat.
- Configuring a homescreen with greeting and starter buttons.
- Rendering a `user_defined` response via `renderUserDefinedResponse` and updating its DOM when the active response changes.

## When to use this pattern

- Hosts that need to react to chat view/state changes (e.g. toggle external panels when the homescreen closes).
- User-defined response elements whose content must stay in sync with which message is currently active.

## APIs and props demonstrated

| Symbol                        | Kind           | Role in this example                                  |
| ----------------------------- | -------------- | ----------------------------------------------------- |
| `<cds-aichat-container>`      | custom element | Mounts the chat UI.                                   |
| `messaging.customSendMessage` | property       | Mock backend.                                         |
| `homescreen.isOn`             | property       | Enables the homescreen.                               |
| `homescreen.greeting`         | property       | Greeting text on the homescreen.                      |
| `homescreen.starters`         | property       | Starter buttons.                                      |
| `onBeforeRender`              | property       | Captures the `ChatInstance` and subscribes to events. |
| `renderUserDefinedResponse`   | property       | Renders the `my_unique_identifier` user-defined item. |
| `instance.getState`           | method         | Reads initial homescreen and active-response state.   |
| `instance.on`                 | method         | Subscribes to `STATE_CHANGE`.                         |
| `BusEventType.STATE_CHANGE`   | enum           | Event type observed for state diffs.                  |
| `RenderUserDefinedState`      | type           | Argument passed to the render callback.               |
| `UserDefinedItem`             | type           | Shape of user-defined message items.                  |
| `ChatInstance`                | type           | Type of the instance handle.                          |
| `PublicConfig`                | type           | Types the chat configuration object.                  |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-watch-state
```

See [../README.md](../README.md) for the full setup walkthrough.
