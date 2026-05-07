# User-defined responses

Lit example that renders `user_defined` responses through the `renderUserDefinedResponse` callback and tracks the most recent message via `STATE_CHANGE` and `activeResponseId`.

## What this example shows

- Mounting `<cds-aichat-custom-element>`.
- Returning an `HTMLElement` from `renderUserDefinedResponse` for `user_defined` message items.
- Subscribing to `BusEventType.STATE_CHANGE` to track the chat's `activeResponseId` and update tracked DOM nodes when the latest message changes.
- Tracking the rendered nodes in a `Map` so the parent component can mutate their content as `activeResponseId` flips.

## When to use this pattern

- Your backend emits `user_defined` response types and you want to render them with your own DOM (or another web component).
- You need to highlight or specially treat the latest response (e.g. show "in-progress" UI on the most recent message only).

## APIs and props demonstrated

| Symbol                              | Kind                   | Role in this example                                                       |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `<cds-aichat-custom-element>`       | custom element         | Mounts the chat as a fullscreen surface.                                   |
| `PublicConfig.layout.showFrame`     | config prop            | Disables the default frame so the host element fills its container.        |
| `PublicConfig.openChatByDefault`    | config prop            | Opens the chat on first paint.                                             |
| `messaging.customSendMessage`       | property               | Mock backend that emits a `user_defined` response.                         |
| `renderUserDefinedResponse`         | property               | Callback returning an `HTMLElement` for `user_defined` items.              |
| `RenderUserDefinedState`            | `@carbon/ai-chat` type | Argument to the render callback — exposes the `messageItem` to render.     |
| `BusEventType.STATE_CHANGE`         | `@carbon/ai-chat` enum | Notifies on `activeResponseId` changes.                                    |
| `instance.getState`                 | instance method        | Reads the initial `activeResponseId`.                                      |
| `instance.on`                       | instance method        | Subscribes the `STATE_CHANGE` handler.                                     |
| `MessageResponseTypes.USER_DEFINED` | `@carbon/ai-chat` enum | Response-type discriminator that routes the message to the render handler. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-user-defined-responses
```

See [../README.md](../README.md) for the full setup walkthrough.
