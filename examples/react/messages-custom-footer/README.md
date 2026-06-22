# Custom message footer

Render your own content beneath an assistant message — here a copy button — with the `renderCustomMessageFooter` render prop.

## What this example shows

- Attaching a `custom_footer_slot` to an assistant message from `customSendMessage`, with `additional_data` that drives the footer.
- Rendering a footer with `renderCustomMessageFooter`, which returns a React component for the slot.
- Reading `additional_data` in the footer to decide whether to show the action (here, an `allow_copy` flag that enables the copy button).
- Hosting the chat full screen with `ChatCustomElement`, `layout.showFrame: false`, and `openChatByDefault`.

## When to use this pattern

- You want per-message actions (copy, share, rate) under assistant responses.
- Your backend decides, per message, which footer actions to offer.
- You need the footer UI to live in your own component, styled with your app's CSS.

## APIs and props demonstrated

| Symbol                                    | Package / kind                   | Role in this example                              |
| ----------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `ChatCustomElement`                       | `@carbon/ai-chat` component      | Mounts the chat into a host element you style.    |
| `renderCustomMessageFooter`               | `@carbon/ai-chat` component prop | Renders the footer for each `custom_footer_slot`. |
| `RenderCustomMessageFooter`               | `@carbon/ai-chat` type           | Types the footer render prop.                     |
| `messaging.customSendMessage`             | `@carbon/ai-chat` config prop    | Mock backend that attaches the footer slot.       |
| `message_item_options.custom_footer_slot` | `@carbon/ai-chat` message field  | Enables the footer and carries `additional_data`. |
| `layout.showFrame` / `openChatByDefault`  | `@carbon/ai-chat` config props   | Full-screen baseline.                             |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-react-messages-custom-footer
```

See [../README.md](../README.md) for the full setup walkthrough.
