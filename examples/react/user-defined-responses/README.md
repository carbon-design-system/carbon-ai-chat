# User-defined responses

React example that renders `user_defined` responses through the `renderUserDefinedResponse` prop and tracks the most recent message via `STATE_CHANGE` and `activeResponseId`.

## What this example shows

- Mounting `ChatCustomElement`.
- Returning a React component from `renderUserDefinedResponse` for `user_defined` message items.
- Subscribing to `BusEventType.STATE_CHANGE` to track the chat's `activeResponseId` and re-render the user-defined view as the latest message changes.
- Memoizing the render function with `useMemo` so React only rebuilds it when `activeResponseId` flips.

## When to use this pattern

- Your backend emits `user_defined` response types and you want to render them with your own React components.
- You need to highlight or specially treat the latest response (e.g. show "in-progress" UI on the most recent message only).

## APIs and props demonstrated

| Symbol                              | Package / kind              | Role in this example                                                       |
| ----------------------------------- | --------------------------- | -------------------------------------------------------------------------- |
| `ChatCustomElement`                 | `@carbon/ai-chat` component | Mounts the chat as a fullscreen surface.                                   |
| `PublicConfig.layout.showFrame`     | config prop                 | Disables the default frame so the host element fills its container.        |
| `PublicConfig.openChatByDefault`    | config prop                 | Opens the chat on first paint.                                             |
| `messaging.customSendMessage`       | config prop                 | Mock backend that emits a `user_defined` response.                         |
| `renderUserDefinedResponse`         | component prop              | Returns a React component for `user_defined` items.                        |
| `RenderUserDefinedState`            | `@carbon/ai-chat` type      | Argument to the render function — exposes the `messageItem` to render.     |
| `BusEventType.STATE_CHANGE`         | `@carbon/ai-chat` enum      | Notifies on `activeResponseId` changes.                                    |
| `instance.getState`                 | instance method             | Reads the initial `activeResponseId`.                                      |
| `instance.on`                       | instance method             | Subscribes the `STATE_CHANGE` handler.                                     |
| `MessageResponseTypes.USER_DEFINED` | `@carbon/ai-chat` enum      | Response-type discriminator that routes the message to the render handler. |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-user-defined-responses
```

See [../README.md](../README.md) for the full setup walkthrough.
