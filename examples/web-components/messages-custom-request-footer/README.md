# Custom request footer

Render your own content beneath a user message — here a copy button — with the `renderCustomRequestFooter` callback.

## What this example shows

- Rendering a footer under every user message with `renderCustomRequestFooter`, which returns an element for the slot.
- Reading `message.input.text` to copy what the user submitted, so they can reuse or edit an earlier request.
- A mock backend that sends nothing special. Outbound footers need no field on the wire, so `customSendMessage` here only replies with text.
- Leaving `renderCustomMessageFooter` unset, so assistant replies get no footer and the two callbacks stay independent.
- Hosting the chat full screen with `<cds-aichat-custom-element>`, `layout.showFrame: false`, and `openChatByDefault`.

## When to use this pattern

- You want per-message actions under what the user sent — copy, edit, resend, or report.
- You want those actions on user messages only, and none on assistant replies.
- You need the footer UI to live in your own element, styled with your app's CSS.

## APIs and props demonstrated

| Symbol | Kind | Role in this example |
| --- | --- | --- |
| `<cds-aichat-custom-element>` | custom element | Mounts the chat into a host element you style. |
| `renderCustomRequestFooter` | property | Renders the footer under each user message. |
| `RenderCustomRequestFooterState` | type | The per-slot state handed to the callback. |
| `MessageRequest` | type | Carries `input.text`, the message as the user submitted it. |
| `messaging` | property | Mock backend that replies with text. |
| `layout` / `openChatByDefault` | properties | Full-screen baseline. |
| `<cds-copy-button>` | custom element | Copies the text and shows a "Copied" confirmation. |

## Announcing the copy

Carbon's copy button swaps its own label to show "Copied", which sighted users see but a screen reader does not reliably report. The example pairs it with a `role="status"` element so the confirmation is announced too.

## Copying needs a secure context

`navigator.clipboard` works only in a secure context. `localhost` is one, so the copy button works as soon as you start the dev server. Serve the same code over plain HTTP from another host and the copy silently fails.

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server will fail with missing-module errors. Rebuild whenever you change anything under `packages/`.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=@carbon/ai-chat-examples-web-components-messages-custom-request-footer
```

Send a message. A copy button appears beneath it; the assistant's reply has none. Click it and the text is on your clipboard.

See [../README.md](../README.md) for the full setup walkthrough.
