# Custom message footer

Render your own content beneath an assistant message — here a copy button — with the `renderCustomMessageFooter` callback.

## What this example shows

- Attaching a `custom_footer_slot` to an assistant message from `customSendMessage`, with `additional_data` that drives the footer.
- Rendering a footer with the `renderCustomMessageFooter` callback, which returns an `HTMLElement` for the slot.
- A `<custom-footer-example>` Lit element that reads `additional_data` to decide whether to show the action (here, an `allow_copy` flag that enables the copy button).
- Hosting the chat full screen with `<cds-aichat-custom-element>`, `layout.showFrame: false`, and `openChatByDefault`.

## When to use this pattern

- You want per-message actions (copy, share, rate) under assistant responses.
- Your backend decides, per message, which footer actions to offer.
- You need the footer UI to live in your own custom element.

## APIs and props demonstrated

| Symbol                                    | Kind           | Role in this example                              |
| ----------------------------------------- | -------------- | ------------------------------------------------- |
| `<cds-aichat-custom-element>`             | custom element | Mounts the chat into a host element you style.    |
| `renderCustomMessageFooter`               | property       | Returns the footer element for each footer slot.  |
| `RenderCustomMessageFooterState`          | type           | Shape passed to the footer callback.              |
| `messaging.customSendMessage`             | config prop    | Mock backend that attaches the footer slot.       |
| `message_item_options.custom_footer_slot` | message field  | Enables the footer and carries `additional_data`. |
| `<custom-footer-example>`                 | custom element | Footer UI rendered into the slot.                 |
| `layout.showFrame` / `openChatByDefault`  | config props   | Full-screen baseline.                             |

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-messages-custom-footer
```

See [../README.md](../README.md) for the full setup walkthrough.
